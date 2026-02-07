"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useParams } from "next/navigation";
import { ChevronLeft, Shield, Zap, Settings, Trash2, Plus, Save, X, Package, Scroll, Pencil, Award } from "lucide-react";
import { Character, CharacterStats, Ability, Item, Badge } from "@/types/supabase";

export default function CharacterSheetPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const supabase = createClient();

  // Estados de Datos
  const [character, setCharacter] = useState<Character | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'stats' | 'abilities' | 'inventory' | 'badges'>('stats');

  // Estados de Modales
  const [isEditing, setIsEditing] = useState(false); // Modal Config Personaje
  const [isAbilityModalOpen, setIsAbilityModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);

  // Estados de Edición
  const [editingAbilityIndex, setEditingAbilityIndex] = useState<number | null>(null);
  const [editingItemData, setEditingItemData] = useState<Item | null>(null);

  // Formularios
  const [editForm, setEditForm] = useState<Partial<Character>>({});
  const [abilityForm, setAbilityForm] = useState<Ability>({ title: "", desc: "" });
  const [itemForm, setItemForm] = useState({ name: "", description: "" });

  // --- CARGA DE DATOS ---
  const fetchData = async () => {
    if (!id) return;

    // 1. Cargar Personaje
    const { data: charData, error: charError } = await supabase
      .from("characters")
      .select("*")
      .eq("id", id)
      .single() as any;

    if (charError) {
      console.error("Error personaje:", charError);
    } else {
      const safeChar: Character = {
        ...charData,
        stats: (charData.stats as CharacterStats) || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
        abilities: (charData.abilities as Ability[]) || []
      };
      setCharacter(safeChar);
      setEditForm(safeChar);
    }

    // 2. Cargar Items
    const { data: itemData } = await supabase
      .from("items")
      .select("*")
      .eq("character_id", id)
      .order('created_at', { ascending: true });

    if (itemData) setItems(itemData as Item[]);

    // 3. Cargar Insignias (Badges)
    // Join manually since strict types can be tricky with deep nesting inference
    const { data: badgeData } = await supabase
      .from("character_badges")
      .select(`
            *,
            badges (*)
        `)
      .eq("character_id", id);

    if (badgeData) {
      // Map to flat Badges array
      const flatBadges = badgeData.map((b: any) => b.badges as Badge).filter(b => b !== null);
      setBadges(flatBadges);
    }

    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [id]);

  // --- FUNCIONES GENERALES ---

  const updateHP = async (amount: number) => {
    if (!character) return;
    const finalHP = Math.min(Math.max(character.hp_current + amount, 0), character.hp_max);

    // Optimistic Update
    setCharacter({ ...character, hp_current: finalHP });

    await supabase.from("characters").update({ hp_current: finalHP }).eq("id", id);
  };

  const saveCharacterEdits = async () => {
    if (!character) return;
    const updates: Partial<Character> = { ...editForm };
    const { error } = await supabase.from("characters").update(updates).eq("id", id);
    if (!error) {
      setCharacter({ ...character, ...editForm } as Character);
      setIsEditing(false);
    } else {
      alert("Error al guardar: " + error.message);
    }
  };

  const deleteCharacter = async () => {
    if (!confirm("¿ESTÁS SEGURO? Se borrará permanentemente.")) return;
    const { error } = await supabase.from("characters").delete().eq("id", id);
    if (!error) router.push("/dashboard");
    else alert("Error al borrar: " + error.message);
  };

  // --- GESTIÓN DE HABILIDADES ---

  const openAbilityModal = (index: number | null = null) => {
    if (index !== null && character) {
      setEditingAbilityIndex(index);
      setAbilityForm(character.abilities[index]);
    } else {
      setEditingAbilityIndex(null);
      setAbilityForm({ title: "", desc: "" });
    }
    setIsAbilityModalOpen(true);
  };

  const handleSaveAbility = async () => {
    if (!character || !abilityForm.title) return;
    let updatedAbilities = [...character.abilities];

    if (editingAbilityIndex !== null) updatedAbilities[editingAbilityIndex] = abilityForm;
    else updatedAbilities.push(abilityForm);

    setCharacter({ ...character, abilities: updatedAbilities });
    await supabase.from("characters").update({ abilities: updatedAbilities as any }).eq("id", id);
    setIsAbilityModalOpen(false);
  };

  const deleteAbility = async (index: number) => {
    if (!confirm("¿Borrar esta habilidad?") || !character) return;
    const updatedAbilities = character.abilities.filter((_, i) => i !== index);
    setCharacter({ ...character, abilities: updatedAbilities });
    await supabase.from("characters").update({ abilities: updatedAbilities as any }).eq("id", id);
  };

  // --- GESTIÓN DE ITEMS ---

  const openItemModal = (item: Item | null = null) => {
    if (item) {
      setEditingItemData(item);
      setItemForm({ name: item.name, description: item.description || "" });
    } else {
      setEditingItemData(null);
      setItemForm({ name: "", description: "" });
    }
    setIsItemModalOpen(true);
  };

  const handleSaveItem = async () => {
    if (!character || !itemForm.name) return;

    if (editingItemData) {
      const { error } = await supabase.from("items").update({ name: itemForm.name, description: itemForm.description }).eq("id", editingItemData.id);
      if (!error) setItems(items.map(i => i.id === editingItemData.id ? { ...i, ...itemForm } : i));
    } else {
      const { data, error } = await supabase.from("items").insert({
        character_id: id,
        name: itemForm.name,
        description: itemForm.description,
        type: "general", quantity: 1, is_official: false
      }).select().single();

      if (!error && data) setItems([...items, data as Item]);
    }
    setIsItemModalOpen(false);
  };

  const deleteItem = async (itemId: string) => {
    if (!confirm("¿Borrar este objeto?")) return;
    setItems(items.filter(i => i.id !== itemId));
    await supabase.from("items").delete().eq("id", itemId);
  };

  const getMod = (score: number) => {
    const mod = Math.floor((score - 10) / 2);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  };

  if (loading || !character) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white"><div className="animate-pulse">Cargando Legend...</div></div>;

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-24 font-sans selection:bg-amber-500/30">

      {/* HEADER */}
      <div className="bg-slate-900/80 backdrop-blur p-4 sticky top-0 z-20 border-b border-slate-800 shadow-lg flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/dashboard")} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
            <ChevronLeft />
          </button>
          <div className="overflow-hidden">
            <h1 className="font-bold text-lg leading-tight truncate text-white">{character.name}</h1>
            <p className="text-xs text-slate-400 font-medium">Nvl {character.level} {character.class}</p>
          </div>
        </div>
        <button onClick={() => setIsEditing(true)} className="p-2 bg-slate-800 rounded-full hover:text-amber-500 transition border border-slate-700 hover:border-amber-500/50">
          <Settings size={20} />
        </button>
      </div>

      {/* --- MODALES --- */}
      {/* (Manteniendo modales existentes simplificados visualmente) */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 w-full max-w-md rounded-2xl border border-slate-700 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-xl font-bold text-amber-500">Editando Personaje</h2>
              <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-white"><X /></button>
            </div>
            {/* Campos de edición rápida */}
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-[10px] uppercase font-bold text-slate-500">Nivel</label><input type="number" className="w-full bg-slate-950 p-2 rounded border border-slate-700 focus:border-amber-500 outline-none" value={editForm.level} onChange={e => setEditForm({ ...editForm, level: Number(e.target.value) })} /></div>
              <div><label className="text-[10px] uppercase font-bold text-slate-500">HP Max</label><input type="number" className="w-full bg-slate-950 p-2 rounded border border-slate-700 focus:border-amber-500 outline-none" value={editForm.hp_max} onChange={e => setEditForm({ ...editForm, hp_max: Number(e.target.value) })} /></div>
              <div><label className="text-[10px] uppercase font-bold text-slate-500">CA</label><input type="number" className="w-full bg-slate-950 p-2 rounded border border-slate-700 focus:border-amber-500 outline-none" value={editForm.armor_class} onChange={e => setEditForm({ ...editForm, armor_class: Number(e.target.value) })} /></div>
              <div><label className="text-[10px] uppercase font-bold text-slate-500">Speed</label><input type="text" className="w-full bg-slate-950 p-2 rounded border border-slate-700 focus:border-amber-500 outline-none" value={editForm.speed} onChange={e => setEditForm({ ...editForm, speed: e.target.value })} /></div>
            </div>
            {/* Stats */}
            <div className="border-t border-slate-800 pt-4">
              <h3 className="text-sm font-bold text-slate-400 mb-3">Atributos</h3>
              <div className="grid grid-cols-3 gap-2">
                {['str', 'dex', 'con', 'int', 'wis', 'cha'].map(stat => (
                  <div key={stat}>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">{stat}</label>
                    <input type="number" className="w-full bg-slate-950 p-2 rounded border border-slate-700 text-center font-bold"
                      //@ts-ignore
                      value={editForm.stats ? editForm.stats[stat as keyof CharacterStats] : 10}
                      onChange={(e) => setEditForm({ ...editForm, stats: { ...editForm.stats as CharacterStats, [stat]: Number(e.target.value) } })}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="pt-4 space-y-3">
              <button onClick={saveCharacterEdits} className="w-full bg-emerald-600 hover:bg-emerald-500 py-3 rounded-lg font-bold flex justify-center gap-2"><Save size={20} /> Guardar</button>
              <button onClick={deleteCharacter} className="w-full bg-red-900/20 text-red-500 border border-red-900/50 py-3 rounded-lg font-bold flex justify-center gap-2"><Trash2 size={20} /> Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL HABILIDAD (Simplificado) */}
      {isAbilityModalOpen && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 w-full max-w-md rounded-2xl border border-slate-700 p-6 space-y-4">
            <h2 className="text-xl font-bold text-white mb-4">{editingAbilityIndex !== null ? "Editar" : "Nueva"} Habilidad</h2>
            <input placeholder="Nombre" className="w-full bg-slate-950 border border-slate-800 p-3 rounded outline-none focus:border-amber-500" value={abilityForm.title} onChange={e => setAbilityForm({ ...abilityForm, title: e.target.value })} autoFocus />
            <textarea placeholder="Descripción..." className="w-full bg-slate-950 border border-slate-800 p-3 rounded h-32 outline-none focus:border-amber-500 resize-none" value={abilityForm.desc} onChange={e => setAbilityForm({ ...abilityForm, desc: e.target.value })} />
            <div className="flex gap-2">
              <button onClick={() => setIsAbilityModalOpen(false)} className="flex-1 py-3 bg-slate-800 rounded-lg font-bold text-slate-400">Cancelar</button>
              <button onClick={handleSaveAbility} className="flex-1 py-3 bg-amber-600 rounded-lg font-bold text-white">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ITEM (Simplificado) */}
      {isItemModalOpen && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 w-full max-w-md rounded-2xl border border-slate-700 p-6 space-y-4">
            <h2 className="text-xl font-bold text-white mb-4">{editingItemData ? "Editar" : "Nuevo"} Objeto</h2>
            <input placeholder="Nombre" className="w-full bg-slate-950 border border-slate-800 p-3 rounded outline-none focus:border-amber-500" value={itemForm.name} onChange={e => setItemForm({ ...itemForm, name: e.target.value })} autoFocus />
            <textarea placeholder="Descripción..." className="w-full bg-slate-950 border border-slate-800 p-3 rounded h-32 outline-none focus:border-amber-500 resize-none" value={itemForm.description} onChange={e => setItemForm({ ...itemForm, description: e.target.value })} />
            <div className="flex gap-2">
              <button onClick={() => setIsItemModalOpen(false)} className="flex-1 py-3 bg-slate-800 rounded-lg font-bold text-slate-400">Cancelar</button>
              <button onClick={handleSaveItem} className="flex-1 py-3 bg-amber-600 rounded-lg font-bold text-white">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* CONTENIDO PRINCIPAL */}
      <div className="p-4 max-w-2xl mx-auto space-y-6">

        {/* TABS */}
        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 overflow-x-auto no-scrollbar">
          <button onClick={() => setActiveTab('stats')} className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition whitespace-nowrap ${activeTab === 'stats' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>Combate</button>
          <button onClick={() => setActiveTab('abilities')} className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition whitespace-nowrap ${activeTab === 'abilities' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>Habilidades</button>
          <button onClick={() => setActiveTab('inventory')} className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition whitespace-nowrap ${activeTab === 'inventory' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>Mochila</button>
          <button onClick={() => setActiveTab('badges')} className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition whitespace-nowrap ${activeTab === 'badges' ? 'bg-purple-900/50 text-purple-200 border border-purple-500/30' : 'text-slate-500 hover:text-purple-400'}`}>Logros</button>
        </div>

        {/* TAB 1: COMBATE */}
        {activeTab === 'stats' && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex gap-4">
              <div className="flex-1 bg-slate-900/50 p-4 rounded-2xl border border-slate-800 text-center flex flex-col items-center shadow-lg">
                <Shield className="text-slate-400 mb-2" size={24} />
                <span className="text-3xl font-black">{character.armor_class || 10}</span>
                <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-1">Armadura</span>
              </div>
              <div className="flex-1 bg-slate-900/50 p-4 rounded-2xl border border-slate-800 text-center flex flex-col items-center shadow-lg">
                <Zap className="text-amber-500 mb-2" size={24} />
                <span className="text-3xl font-black">{character.speed || "30 ft"}</span>
                <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-1">Velocidad</span>
              </div>
            </div>

            <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 text-center relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-800">
                <div className={`h-full transition-all duration-500 ${character.hp_current < character.hp_max / 3 ? 'bg-red-500 shadow-[0_0_10px_red]' : 'bg-emerald-500 shadow-[0_0_10px_emerald]'}`} style={{ width: `${(character.hp_current / character.hp_max) * 100}%` }} />
              </div>
              <div className="text-7xl font-black mb-6 font-mono mt-4 tracking-tighter text-white">
                {character.hp_current} <span className="text-2xl text-slate-600 font-sans font-bold">/ {character.hp_max}</span>
              </div>
              <button
                onClick={() => updateHP(character.hp_max - character.hp_current)}
                className="text-xs font-bold text-slate-600 uppercase mb-6 hover:text-emerald-500 transition"
              >
                Descanso Largo (Recuperar Todo)
              </button>
              <div className="grid grid-cols-4 gap-3 max-w-xs mx-auto">
                <button onClick={() => updateHP(-1)} className="bg-slate-800 text-red-500 py-3 rounded-xl font-black hover:bg-red-900/20 border border-slate-700 transition">-1</button>
                <button onClick={() => updateHP(-5)} className="bg-slate-800 text-red-500 py-3 rounded-xl font-black hover:bg-red-900/20 border border-slate-700 transition">-5</button>
                <button onClick={() => updateHP(1)} className="bg-slate-800 text-emerald-500 py-3 rounded-xl font-black hover:bg-emerald-900/20 border border-slate-700 transition">+1</button>
                <button onClick={() => updateHP(5)} className="bg-slate-800 text-emerald-500 py-3 rounded-xl font-black hover:bg-emerald-900/20 border border-slate-700 transition">+5</button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {['str', 'dex', 'con', 'int', 'wis', 'cha'].map((stat) => {
                const name = stat as keyof CharacterStats;
                const value = character.stats[name];
                return (
                  <div key={stat} className="bg-slate-900 p-3 rounded-2xl border border-slate-800 text-center relative overflow-hidden group hover:border-slate-600 transition">
                    <div className="text-[10px] uppercase text-slate-500 font-black tracking-widest mb-1">{stat}</div>
                    <div className="text-2xl font-black">{getMod(value)}</div>
                    <div className="text-[10px] font-bold text-slate-600 bg-slate-950 rounded-full py-0.5 mt-1 inline-block px-2 group-hover:text-slate-400">{value}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: HABILIDADES */}
        {activeTab === 'abilities' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            {character.abilities.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-slate-600">
                <Scroll className="mb-2 opacity-50" size={48} />
                <p>Tu libro de hechizos está vacío.</p>
              </div>
            )}
            {(character.abilities || []).map((ab, idx) => (
              <div key={idx} className="bg-slate-900 border border-slate-800 p-5 rounded-xl relative group hover:border-slate-600 transition shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg text-amber-500">{ab.title}</h3>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                    <button onClick={() => openAbilityModal(idx)}><Pencil size={16} className="text-slate-500 hover:text-white" /></button>
                    <button onClick={() => deleteAbility(idx)}><Trash2 size={16} className="text-slate-500 hover:text-red-500" /></button>
                  </div>
                </div>
                <p className="text-slate-400 text-sm whitespace-pre-wrap leading-relaxed">{ab.desc}</p>
              </div>
            ))}
            <button onClick={() => openAbilityModal(null)} className="w-full border-2 border-dashed border-slate-800 p-4 rounded-xl flex items-center justify-center gap-2 text-slate-500 hover:text-amber-500 hover:border-amber-500 transition hover:bg-slate-900">
              <Plus /> Agregar Habilidad
            </button>
          </div>
        )}

        {/* TAB 3: INVENTARIO */}
        {activeTab === 'inventory' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            {items.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-slate-600">
                <Package className="mb-2 opacity-50" size={48} />
                <p>Tu mochila está vacía.</p>
              </div>
            )}
            {items.map((item) => (
              <div key={item.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl group relative hover:border-slate-600 transition flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center text-slate-500 font-bold">
                  {item.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-white leading-tight">{item.name} <span className="text-slate-500 text-xs font-normal">x{item.quantity}</span></h3>
                  <p className="text-slate-500 text-xs mt-0.5 line-clamp-1">{item.description || "..."}</p>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                  <button onClick={() => openItemModal(item)}><Pencil size={16} className="text-slate-500 hover:text-white" /></button>
                  <button onClick={() => deleteItem(item.id)}><Trash2 size={16} className="text-slate-500 hover:text-red-500" /></button>
                </div>
              </div>
            ))}
            <button onClick={() => openItemModal(null)} className="w-full border-2 border-dashed border-slate-800 p-4 rounded-xl flex items-center justify-center gap-2 text-slate-500 hover:text-emerald-500 hover:border-emerald-500 transition hover:bg-slate-900">
              <Plus /> Agregar Objeto
            </button>
          </div>
        )}

        {/* TAB 4: LOGROS (Nuevo) */}
        {activeTab === 'badges' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="bg-gradient-to-br from-purple-900/20 to-slate-900 border border-purple-500/20 rounded-2xl p-6 mb-6 text-center">
              <h2 className="text-xl font-black text-purple-400 flex items-center justify-center gap-2 mb-2">
                <Award /> Sala de Trofeos
              </h2>
              <p className="text-sm text-slate-400">Reconocimientos otorgados por el Dungeon Master.</p>
            </div>

            {badges.length === 0 ? (
              <div className="text-center py-12 text-slate-600 border-2 border-dashed border-slate-800 rounded-2xl">
                <Award className="mx-auto h-12 w-12 mb-3 opacity-20" />
                <p className="text-sm">Aún no has ganado ninguna insignia.</p>
                <p className="text-xs mt-1 text-slate-700">¡Sigue jugando para impresionar al DM!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {badges.map(badge => (
                  <div key={badge.id} className="bg-slate-900 border border-slate-800 p-6 rounded-xl flex flex-col items-center text-center hover:border-purple-500/50 transition duration-300 group hover:bg-slate-900/80">
                    <div className="text-5xl mb-4 transform group-hover:scale-110 transition duration-300 drop-shadow-lg">{badge.icon_key || "🏆"}</div>
                    <h3 className="font-bold text-white text-sm leading-tight mb-2 group-hover:text-purple-400 transition">{badge.name}</h3>
                    <p className="text-xs text-slate-500 leading-snug">{badge.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}