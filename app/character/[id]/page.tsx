"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter, useParams } from "next/navigation";
import { ChevronLeft, Heart, Shield, Zap, Settings, Trash2, Plus, Save, X, Package, Scroll, Pencil } from "lucide-react";

// --- TIPOS DE DATOS ---
interface Ability {
  title: string;
  desc: string;
}

interface Item {
  id: string;
  name: string;
  description: string;
}

interface Stats {
  str: number; dex: number; con: number; int: number; wis: number; cha: number;
}

interface Character {
  id: string;
  name: string;
  class: string;
  race: string;
  level: number;
  hp_current: number;
  hp_max: number;
  armor_class: number;
  speed: number;
  stats: Stats;
  abilities: Ability[];
}

export default function CharacterSheetPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const supabase = createClient();

  // Estados de Datos
  const [character, setCharacter] = useState<Character | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'stats' | 'abilities' | 'inventory'>('stats');
  
  // Estados de Modales
  const [isEditing, setIsEditing] = useState(false); // Modal Config Personaje
  const [isAbilityModalOpen, setIsAbilityModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);

  // Estados de Edición (Para saber qué estamos editando)
  const [editingAbilityIndex, setEditingAbilityIndex] = useState<number | null>(null);
  const [editingItemData, setEditingItemData] = useState<Item | null>(null);

  // Formularios
  const [editForm, setEditForm] = useState<Partial<Character>>({});
  const [abilityForm, setAbilityForm] = useState({ title: "", desc: "" });
  const [itemForm, setItemForm] = useState({ name: "", description: "" });

  // --- CARGA DE DATOS ---
  const fetchData = async () => {
    if (!id) return;
    
    // 1. Cargar Personaje
    const { data: charData, error: charError } = await supabase
      .from("characters")
      .select("*")
      .eq("id", id)
      .single();

    if (charError) {
        console.error("Error personaje:", charError);
    } else {
      setCharacter(charData);
      setEditForm(charData); 
    }

    // 2. Cargar Items
    const { data: itemData, error: itemError } = await supabase
      .from("items")
      .select("*")
      .eq("character_id", id)
      .order('created_at', { ascending: true });
      
    if (!itemError && itemData) setItems(itemData);
    
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [id]);

  // --- FUNCIONES GENERALES ---

  const updateHP = async (amount: number) => {
    if (!character) return;
    const finalHP = Math.min(Math.max(character.hp_current + amount, 0), character.hp_max);
    setCharacter({ ...character, hp_current: finalHP });
    await supabase.from("characters").update({ hp_current: finalHP }).eq("id", id);
  };

  const saveCharacterEdits = async () => {
    if (!character) return;
    const { error } = await supabase.from("characters").update(editForm).eq("id", id);
    if (!error) {
      setCharacter({ ...character, ...editForm } as Character);
      setIsEditing(false);
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
    
    let updatedAbilities = [...(character.abilities || [])];

    if (editingAbilityIndex !== null) {
        updatedAbilities[editingAbilityIndex] = abilityForm;
    } else {
        updatedAbilities.push(abilityForm);
    }
    
    setCharacter({ ...character, abilities: updatedAbilities });
    await supabase.from("characters").update({ abilities: updatedAbilities }).eq("id", id);
    setIsAbilityModalOpen(false);
  };

  const deleteAbility = async (index: number) => {
    if (!confirm("¿Borrar esta habilidad?") || !character) return;
    const updatedAbilities = character.abilities.filter((_, i) => i !== index);
    setCharacter({ ...character, abilities: updatedAbilities });
    await supabase.from("characters").update({ abilities: updatedAbilities }).eq("id", id);
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
        const { error } = await supabase
            .from("items")
            .update({ name: itemForm.name, description: itemForm.description })
            .eq("id", editingItemData.id);

        if (!error) {
            setItems(items.map(i => i.id === editingItemData.id ? { ...i, ...itemForm } : i));
        }
    } else {
        const { data, error } = await supabase.from("items").insert({
            character_id: id,
            name: itemForm.name,
            description: itemForm.description,
            is_official: false
        }).select().single();

        if (!error && data) {
            setItems([...items, data]);
        }
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

  if (loading || !character) return <div className="p-10 text-white text-center">Cargando datos...</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-24">
      
      {/* HEADER */}
      <div className="bg-slate-900 p-4 sticky top-0 z-20 border-b border-slate-800 shadow-md flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/dashboard")} className="p-2 hover:bg-slate-800 rounded-full">
            <ChevronLeft />
          </button>
          <div className="overflow-hidden">
            <h1 className="font-bold text-lg leading-tight truncate">{character.name}</h1>
            <p className="text-xs text-slate-400">Nvl {character.level} {character.class}</p>
          </div>
        </div>
        <button onClick={() => setIsEditing(true)} className="p-2 bg-slate-800 rounded-full hover:text-amber-500 transition">
          <Settings size={20} />
        </button>
      </div>

      {/* --- MODALES --- */}

      {/* 1. MODAL AJUSTES PERSONAJE (AHORA CON STATS) */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 w-full max-w-md rounded-2xl border border-slate-700 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-amber-500">Ajustes</h2>
              <button onClick={() => setIsEditing(false)}><X /></button>
            </div>
            
            {/* Sección General */}
            <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs text-slate-400">Nivel</label><input type="number" className="w-full bg-slate-950 p-2 rounded border border-slate-700" value={editForm.level} onChange={e => setEditForm({...editForm, level: Number(e.target.value)})} /></div>
                <div><label className="text-xs text-slate-400">HP Max</label><input type="number" className="w-full bg-slate-950 p-2 rounded border border-slate-700" value={editForm.hp_max} onChange={e => setEditForm({...editForm, hp_max: Number(e.target.value)})} /></div>
                <div><label className="text-xs text-slate-400">CA</label><input type="number" className="w-full bg-slate-950 p-2 rounded border border-slate-700" value={editForm.armor_class} onChange={e => setEditForm({...editForm, armor_class: Number(e.target.value)})} /></div>
                <div><label className="text-xs text-slate-400">Speed</label><input type="number" className="w-full bg-slate-950 p-2 rounded border border-slate-700" value={editForm.speed} onChange={e => setEditForm({...editForm, speed: Number(e.target.value)})} /></div>
            </div>

            {/* Nueva Sección: Stats / Atributos */}
            <div className="border-t border-slate-800 pt-4">
                <h3 className="text-sm font-bold text-slate-400 mb-3">Atributos Base (ASI)</h3>
                <div className="grid grid-cols-3 gap-2">
                    {['str', 'dex', 'con', 'int', 'wis', 'cha'].map((stat) => (
                        <div key={stat}>
                            <label className="block text-xs uppercase font-bold text-slate-500 mb-1">{stat}</label>
                            <input 
                                type="number" 
                                className="w-full bg-slate-950 p-2 rounded border border-slate-700 text-center font-bold text-white"
                                //@ts-ignore
                                value={editForm.stats ? editForm.stats[stat as keyof Stats] : 10}
                                onChange={(e) => setEditForm({
                                    ...editForm,
                                    stats: {
                                        ...editForm.stats as Stats,
                                        [stat]: Number(e.target.value)
                                    }
                                })}
                            />
                        </div>
                    ))}
                </div>
            </div>

            <div className="pt-2 space-y-3">
                <button onClick={saveCharacterEdits} className="w-full bg-emerald-600 hover:bg-emerald-500 py-3 rounded-lg font-bold flex justify-center gap-2"><Save size={20} /> Guardar Cambios</button>
                <button onClick={deleteCharacter} className="w-full bg-red-900/20 text-red-500 hover:bg-red-900/40 py-3 rounded-lg font-bold flex justify-center gap-2 border border-red-900/50"><Trash2 size={20} /> Eliminar Héroe</button>
            </div>
          </div>
        </div>
      )}

      {/* 2. MODAL HABILIDAD */}
      {isAbilityModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 w-full max-w-md rounded-2xl border border-slate-700 shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-amber-500 flex gap-2">
                  <Scroll size={24}/> {editingAbilityIndex !== null ? "Editar Habilidad" : "Nueva Habilidad"}
              </h2>
              <button onClick={() => setIsAbilityModalOpen(false)}><X /></button>
            </div>
            <input placeholder="Nombre" className="w-full bg-slate-950 border border-slate-800 p-3 rounded outline-none focus:border-amber-500" value={abilityForm.title} onChange={e => setAbilityForm({...abilityForm, title: e.target.value})} />
            <textarea placeholder="Descripción..." className="w-full bg-slate-950 border border-slate-800 p-3 rounded h-32 outline-none focus:border-amber-500 resize-none" value={abilityForm.desc} onChange={e => setAbilityForm({...abilityForm, desc: e.target.value})} />
            <button onClick={handleSaveAbility} disabled={!abilityForm.title} className="w-full bg-amber-600 hover:bg-amber-500 py-3 rounded-lg font-bold text-white disabled:opacity-50">
                {editingAbilityIndex !== null ? "Guardar Cambios" : "Agregar Habilidad"}
            </button>
          </div>
        </div>
      )}

      {/* 3. MODAL ITEM */}
      {isItemModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 w-full max-w-md rounded-2xl border border-slate-700 shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-amber-500 flex gap-2">
                  <Package size={24}/> {editingItemData ? "Editar Objeto" : "Nuevo Objeto"}
              </h2>
              <button onClick={() => setIsItemModalOpen(false)}><X /></button>
            </div>
            <input placeholder="Nombre" className="w-full bg-slate-950 border border-slate-800 p-3 rounded outline-none focus:border-amber-500" value={itemForm.name} onChange={e => setItemForm({...itemForm, name: e.target.value})} />
            <textarea placeholder="Descripción..." className="w-full bg-slate-950 border border-slate-800 p-3 rounded h-32 outline-none focus:border-amber-500 resize-none" value={itemForm.description} onChange={e => setItemForm({...itemForm, description: e.target.value})} />
            <button onClick={handleSaveItem} disabled={!itemForm.name} className="w-full bg-amber-600 hover:bg-amber-500 py-3 rounded-lg font-bold text-white disabled:opacity-50">
                {editingItemData ? "Guardar Cambios" : "Guardar en Mochila"}
            </button>
          </div>
        </div>
      )}

      {/* CONTENIDO PRINCIPAL */}
      <div className="p-4 max-w-xl mx-auto space-y-6">

        {/* TABS */}
        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button onClick={() => setActiveTab('stats')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${activeTab === 'stats' ? 'bg-slate-700 text-white' : 'text-slate-500'}`}>Combate</button>
          <button onClick={() => setActiveTab('abilities')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${activeTab === 'abilities' ? 'bg-slate-700 text-white' : 'text-slate-500'}`}>Habilidades</button>
          <button onClick={() => setActiveTab('inventory')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${activeTab === 'inventory' ? 'bg-slate-700 text-white' : 'text-slate-500'}`}>Mochila</button>
        </div>

        {/* TAB 1: COMBATE */}
        {activeTab === 'stats' && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex gap-4">
              <div className="flex-1 bg-slate-800 p-3 rounded-xl border border-slate-700 text-center flex flex-col items-center">
                <Shield className="text-slate-400 mb-1" size={20} />
                <span className="text-2xl font-bold">{character.armor_class || 10}</span>
                <span className="text-[10px] text-slate-500 uppercase font-bold">Armadura</span>
              </div>
              <div className="flex-1 bg-slate-800 p-3 rounded-xl border border-slate-700 text-center flex flex-col items-center">
                <Zap className="text-amber-400 mb-1" size={20} />
                <span className="text-2xl font-bold">{character.speed || 30}</span>
                <span className="text-[10px] text-slate-500 uppercase font-bold">Velocidad</span>
              </div>
            </div>

            <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-slate-800">
                <div className="h-full bg-red-500 transition-all duration-300" style={{ width: `${(character.hp_current / character.hp_max) * 100}%` }} />
              </div>
              <div className="text-6xl font-bold mb-6 font-mono mt-4">
                {character.hp_current} <span className="text-xl text-slate-500">/ {character.hp_max}</span>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <button onClick={() => updateHP(-1)} className="bg-red-900/30 text-red-500 p-3 rounded-xl font-bold">-1</button>
                <button onClick={() => updateHP(-5)} className="bg-red-900/30 text-red-500 p-3 rounded-xl font-bold">-5</button>
                <button onClick={() => updateHP(1)} className="bg-emerald-900/30 text-emerald-500 p-3 rounded-xl font-bold">+1</button>
                <button onClick={() => updateHP(5)} className="bg-emerald-900/30 text-emerald-500 p-3 rounded-xl font-bold">+5</button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {Object.entries(character.stats).map(([statName, value]) => (
                <div key={statName} className="bg-slate-900 p-3 rounded-xl border border-slate-800 text-center">
                  <div className="text-xs uppercase text-slate-500 font-bold mb-1">{statName}</div>
                  <div className="text-xl font-bold">{getMod(value as number)}</div>
                  <div className="text-xs text-slate-600 bg-slate-950 rounded-full py-0.5 mt-1">{value as number}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: HABILIDADES */}
        {activeTab === 'abilities' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            {(character.abilities || []).map((ab, idx) => (
              <div key={idx} className="bg-slate-900 border border-slate-800 p-4 rounded-xl relative group">
                <div className="pr-16">
                    <h3 className="font-bold text-amber-500">{ab.title}</h3>
                    <p className="text-slate-400 text-sm mt-1 break-words whitespace-pre-wrap leading-relaxed">
                        {ab.desc}
                    </p>
                </div>
                {/* Botones de acción */}
                <div className="absolute top-4 right-4 flex gap-2">
                    <button onClick={() => openAbilityModal(idx)} className="text-slate-600 hover:text-amber-500 transition">
                        <Pencil size={18} />
                    </button>
                    <button onClick={() => deleteAbility(idx)} className="text-slate-600 hover:text-red-500 transition">
                        <Trash2 size={18} />
                    </button>
                </div>
              </div>
            ))}
            
            <button onClick={() => openAbilityModal(null)} className="w-full border-2 border-dashed border-slate-700 p-4 rounded-xl flex items-center justify-center gap-2 text-slate-500 hover:text-amber-500 hover:border-amber-500 transition">
                <Plus /> Agregar Habilidad
            </button>
          </div>
        )}

        {/* TAB 3: INVENTARIO */}
        {activeTab === 'inventory' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            {items.map((item) => (
              <div key={item.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl group relative">
                <div className="pr-16">
                    <h3 className="font-bold text-white">{item.name}</h3>
                    <p className="text-slate-500 text-sm mt-1 break-words whitespace-pre-wrap">
                        {item.description || "Sin descripción"}
                    </p>
                </div>
                {/* Botones de acción */}
                <div className="absolute top-4 right-4 flex gap-2">
                    <button onClick={() => openItemModal(item)} className="text-slate-600 hover:text-amber-500 transition">
                        <Pencil size={18} />
                    </button>
                    <button onClick={() => deleteItem(item.id)} className="text-slate-600 hover:text-red-500 transition">
                        <Trash2 size={18} />
                    </button>
                </div>
              </div>
            ))}

            <button onClick={() => openItemModal(null)} className="w-full border-2 border-dashed border-slate-700 p-4 rounded-xl flex items-center justify-center gap-2 text-slate-500 hover:text-emerald-500 hover:border-emerald-500 transition">
                <Plus /> Agregar Objeto
            </button>
          </div>
        )}

      </div>
    </div>
  );
}