"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Character, Item, Ability } from "@/types/supabase";
import { X, Shield, Zap, Package, Scroll, Pencil, Trash2, Plus, Save } from "lucide-react";

interface CampaignCharacterModalProps {
    character: Character;
    currentUser: string; // ID del usuario actual
    onClose: () => void;
}

export default function CampaignCharacterModal({ character, currentUser, onClose }: CampaignCharacterModalProps) {
    const supabase = createClient();
    const isOwner = character.user_id === currentUser;

    const [activeTab, setActiveTab] = useState<'stats' | 'abilities' | 'inventory' | 'temporal'>('stats');
    const [items, setItems] = useState<Item[]>([]);
    const [loadingItems, setLoadingItems] = useState(false);

    // Initiative Local State
    const [localInitiative, setLocalInitiative] = useState(character.initiative);

    // Estados para Modales internos (Agregar/Editar)
    const [isAbilityFormOpen, setIsAbilityFormOpen] = useState(false);
    const [abilityForm, setAbilityForm] = useState<Ability>({ title: "", desc: "" });
    const [editingAbilityIndex, setEditingAbilityIndex] = useState<number | null>(null);

    const [isItemFormOpen, setIsItemFormOpen] = useState(false);
    const [itemForm, setItemForm] = useState({ name: "", description: "" });
    const [editingItem, setEditingItem] = useState<Item | null>(null);

    // Cargar Items al montar
    useEffect(() => {
        const fetchItems = async () => {
            setLoadingItems(true);
            const { data } = await supabase
                .from("items")
                .select("*")
                .eq("character_id", character.id)
                .order('created_at', { ascending: true });

            if (data) setItems(data as Item[]);
            setLoadingItems(false);
        };
        fetchItems();
    }, [character.id, supabase]);

    // Update Initiative
    const updateInitiative = async (val: number) => {
        setLocalInitiative(val);
        await (supabase.from("characters") as any).update({ initiative: val }).eq("id", character.id);
    };

    // Helper for modifiers
    const getMod = (score: number) => {
        const mod = Math.floor((score - 10) / 2);
        return mod >= 0 ? `+${mod}` : `${mod}`;
    };

    // --- LOGICA HABILIDADES ---
    const handleSaveAbility = async () => {
        if (!abilityForm.title) return;
        const updatedAbilities = [...character.abilities];

        if (editingAbilityIndex !== null) {
            updatedAbilities[editingAbilityIndex] = abilityForm;
        } else {
            updatedAbilities.push(abilityForm);
        }

        // Actualizamos en Supabase (El componente padre recibirá el update por Realtime y nos pasará la nueva prop character)
        await (supabase.from("characters") as any).update({ abilities: updatedAbilities as any }).eq("id", character.id);

        setIsAbilityFormOpen(false);
        setEditingAbilityIndex(null);
        setAbilityForm({ title: "", desc: "" });
    };

    const handleDeleteAbility = async (index: number) => {
        if (!confirm("¿Borrar habilidad?")) return;
        const updatedAbilities = character.abilities.filter((_, i) => i !== index);
        await (supabase.from("characters") as any).update({ abilities: updatedAbilities as any }).eq("id", character.id);
    };

    const openAbilityForm = (ability: Ability | null = null, index: number | null = null) => {
        if (ability && index !== null) {
            setAbilityForm(ability);
            setEditingAbilityIndex(index);
        } else {
            setAbilityForm({ title: "", desc: "" });
            setEditingAbilityIndex(null);
        }
        setIsAbilityFormOpen(true);
    };

    // --- LOGICA ITEMS ---
    const handleSaveItem = async () => {
        if (!itemForm.name) return;

        if (editingItem) {
            const { error } = await (supabase.from("items") as any).update({ name: itemForm.name, description: itemForm.description }).eq("id", editingItem.id);
            if (!error) {
                setItems(prev => prev.map(i => i.id === editingItem.id ? { ...i, ...itemForm } : i));
            }
        } else {
            const { data, error } = await (supabase.from("items") as any).insert({
                character_id: character.id,
                name: itemForm.name,
                description: itemForm.description,
                type: "general", quantity: 1, is_official: false
            }).select().single();

            if (!error && data) {
                setItems(prev => [...prev, data as Item]);
            }
        }
        setIsItemFormOpen(false);
        setEditingItem(null);
        setItemForm({ name: "", description: "" });
    };

    const handleDeleteItem = async (itemId: string) => {
        if (!confirm("¿Borrar objeto?")) return;
        setItems(prev => prev.filter(i => i.id !== itemId));
        await (supabase.from("items") as any).delete().eq("id", itemId);
    };

    const openItemForm = (item: Item | null = null) => {
        if (item) {
            setEditingItem(item);
            setItemForm({ name: item.name, description: item.description || "" });
        } else {
            setEditingItem(null);
            setItemForm({ name: "", description: "" });
        }
        setIsItemFormOpen(true);
    };


    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>

                {/* HEADER MODAL */}
                <div className="p-6 bg-slate-950 border-b border-slate-800 flex justify-between items-start relative">
                    <div className="flex gap-4 items-center">
                        <div className="w-16 h-16 rounded-xl bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-3xl shadow-lg">
                            {character.race === 'Dracónido' ? '🐲' : '👤'}
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white leading-none">{character.name}</h2>
                            <p className="text-slate-400 font-medium mt-1">Nvl {character.level} {character.class}</p>
                            <div className="flex flex-wrap gap-4 mt-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
                                <span className="flex items-center gap-1"><Shield size={12} /> CA {character.armor_class}</span>
                                <span className="flex items-center gap-1"><Zap size={12} /> VEL {character.speed}</span>
                                <span className={`flex items-center gap-1 ${character.hp_temp ? 'text-emerald-400' : ''}`}>
                                    ❤️ HP {character.hp_current} {character.hp_temp ? `(+${character.hp_temp})` : ''} / {character.hp_max}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* INITIATIVE WIDGET (Top Right, Next to Close) */}
                    <div className="flex gap-4 items-center">
                        <div className="bg-slate-900 p-2 rounded-lg border border-slate-800 flex flex-col items-center group">
                            <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1 mb-1">
                                <Zap size={10} className="text-yellow-500" /> INIC
                            </label>
                            {isOwner ? (
                                <input
                                    type="number"
                                    className="w-12 bg-transparent text-center font-mono font-bold text-xl text-white outline-none focus:text-yellow-400"
                                    value={localInitiative}
                                    onChange={(e) => setLocalInitiative(Number(e.target.value))}
                                    onBlur={(e) => updateInitiative(Number(e.target.value))}
                                />
                            ) : (
                                <span className="font-mono font-bold text-xl text-white px-2">
                                    {localInitiative >= 0 ? `+${localInitiative}` : localInitiative}
                                </span>
                            )}
                        </div>

                        <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* TABS SCROLLABLE */}
                <div className="flex-none bg-slate-950 px-4 pt-2 border-b border-slate-800 overflow-x-auto no-scrollbar scroll-smooth">
                    <div className="flex gap-2 min-w-max">
                        <button
                            onClick={() => setActiveTab('stats')}
                            className={`pb-3 px-3 text-sm font-bold uppercase tracking-wider border-b-2 transition whitespace-nowrap ${activeTab === 'stats' ? 'border-amber-500 text-amber-500' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                        >
                            Atributos
                        </button>
                        <button
                            onClick={() => setActiveTab('abilities')}
                            className={`pb-3 px-3 text-sm font-bold uppercase tracking-wider border-b-2 transition whitespace-nowrap ${activeTab === 'abilities' ? 'border-amber-500 text-amber-500' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                        >
                            Habilidades
                        </button>
                        <button
                            onClick={() => setActiveTab('inventory')}
                            className={`pb-3 px-3 text-sm font-bold uppercase tracking-wider border-b-2 transition whitespace-nowrap ${activeTab === 'inventory' ? 'border-amber-500 text-amber-500' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                        >
                            Inventario
                        </button>
                        <button
                            onClick={() => setActiveTab('temporal')}
                            className={`pb-3 px-3 text-sm font-bold uppercase tracking-wider border-b-2 transition whitespace-nowrap ${activeTab === 'temporal' ? 'border-amber-500 text-amber-500' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                        >
                            Temporal
                        </button>
                    </div>
                </div>

                {/* CONTENT */}
                <div className="flex-1 overflow-y-auto p-6 pb-24 bg-slate-800/50">

                    {/* TAB STATS */}
                    {activeTab === 'stats' && (
                        <div className="grid grid-cols-3 gap-3">
                            {character.stats && ['str', 'dex', 'con', 'int', 'wis', 'cha'].map((stat) => {
                                const val = character.stats[stat as keyof typeof character.stats] || 10;
                                return (
                                    <div key={stat} className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex flex-col items-center">
                                        <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">{stat}</div>
                                        <div className="text-2xl font-black text-white">{getMod(val)}</div>
                                        <div className="text-xs font-bold text-slate-600 bg-slate-950 px-2 rounded-full mt-1 border border-slate-800">{val}</div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* TAB TEMPORAL (NUEVO) */}
                    {activeTab === 'temporal' && (
                        <div className="space-y-6">
                            <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl">
                                <h3 className="text-lg font-bold text-amber-500 mb-2 flex items-center gap-2">
                                    <Shield className="text-amber-500" size={20} /> Puntos de Golpe Temporales
                                </h3>
                                <p className="text-sm text-slate-400 mb-4">
                                    Los puntos de golpe temporales absorben daño antes de que este afecte a tus puntos de golpe reales.
                                </p>
                                <div className="flex items-center gap-4">
                                    <div className="flex-1 bg-slate-950 p-3 rounded-lg border border-slate-800 text-center">
                                        <div className="text-xs font-bold text-slate-500 uppercase mb-1">HP Temporal Actual</div>
                                        <div className="text-3xl font-black text-white">{character.hp_temp || 0}</div>
                                    </div>
                                    {isOwner && (
                                        <div className="flex flex-col gap-2">
                                            <div className="flex gap-2">
                                                <input
                                                    type="number"
                                                    placeholder="Cantidad"
                                                    className="w-24 bg-slate-950 border border-slate-700 p-2 rounded text-white text-center"
                                                    id="tempHpInput"
                                                />
                                                <button
                                                    onClick={async () => {
                                                        const input = document.getElementById('tempHpInput') as HTMLInputElement;
                                                        const val = Number(input.value);
                                                        if (val > 0) {
                                                            await (supabase.from("characters") as any).update({ hp_temp: val }).eq("id", character.id);
                                                            input.value = "";
                                                        }
                                                    }}
                                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded font-bold text-white transition"
                                                >
                                                    Fijar
                                                </button>
                                            </div>
                                            <button
                                                onClick={async () => {
                                                    await (supabase.from("characters") as any).update({ hp_temp: 0 }).eq("id", character.id);
                                                }}
                                                className="px-4 py-2 bg-red-900/30 hover:bg-red-900 border border-red-800 rounded font-bold text-red-200 transition text-sm"
                                            >
                                                Eliminar HP Temp
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl opacity-50 pointer-events-none">
                                <h3 className="text-lg font-bold text-slate-500 mb-2 flex items-center gap-2">
                                    <Shield className="text-slate-500" size={20} /> Bonus de CA Temporal
                                </h3>
                                <p className="text-sm text-slate-500">
                                    Próximamente: Podrás añadir bonificadores temporales a tu Clase de Armadura (ej: Escudo de Fe).
                                </p>
                            </div>
                        </div>
                    )}

                    {/* TAB HABILIDADES */}
                    {activeTab === 'abilities' && (
                        <div className="space-y-4">
                            {character.abilities.length === 0 && (
                                <div className="text-center py-12 text-slate-500">
                                    <Scroll className="mx-auto mb-2 opacity-30" size={48} />
                                    <p>No hay habilidades registradas.</p>
                                </div>
                            )}
                            {character.abilities.map((ab, idx) => (
                                <div key={idx} className="bg-slate-900 border border-slate-800 p-4 rounded-xl relative group">
                                    <div className="flex justify-between items-start mb-1">
                                        <h3 className="font-bold text-amber-500">{ab.title}</h3>
                                        {isOwner && (
                                            <div className="flex gap-2">
                                                <button onClick={() => openAbilityForm(ab, idx)} className="text-slate-600 hover:text-white"><Pencil size={14} /></button>
                                                <button onClick={() => handleDeleteAbility(idx)} className="text-slate-600 hover:text-red-500"><Trash2 size={14} /></button>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-sm text-slate-400 whitespace-pre-wrap">{ab.desc}</p>
                                </div>
                            ))}

                            {isOwner && (
                                <button ref={null} onClick={() => openAbilityForm()} className="w-full py-3 border-2 border-dashed border-slate-700 rounded-xl text-slate-500 font-bold hover:border-amber-500 hover:text-amber-500 hover:bg-slate-900/50 transition flex items-center justify-center gap-2">
                                    <Plus size={16} /> Nueva Habilidad
                                </button>
                            )}
                        </div>
                    )}

                    {/* TAB INVENTARIO */}
                    {activeTab === 'inventory' && (
                        <div className="space-y-4">
                            {loadingItems ? (
                                <div className="text-center py-10 text-amber-500">Cargando objetos...</div>
                            ) : (
                                <>
                                    {items.length === 0 && (
                                        <div className="text-center py-12 text-slate-500">
                                            <Package className="mx-auto mb-2 opacity-30" size={48} />
                                            <p>Inventario vacío.</p>
                                        </div>
                                    )}
                                    {items.map((item) => (
                                        <div key={item.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-4 group">
                                            <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center text-slate-500 font-bold font-mono text-lg">
                                                {item.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="font-bold text-white">{item.name}</h3>
                                                <p className="text-xs text-slate-500 line-clamp-1">{item.description}</p>
                                            </div>
                                            {isOwner && (
                                                <div className="flex gap-2 opacity-50 group-hover:opacity-100 transition">
                                                    <button onClick={() => openItemForm(item)} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"><Pencil size={14} /></button>
                                                    <button onClick={() => handleDeleteItem(item.id)} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    {isOwner && (
                                        <button onClick={() => openItemForm()} className="w-full py-3 border-2 border-dashed border-slate-700 rounded-xl text-slate-500 font-bold hover:border-emerald-500 hover:text-emerald-500 hover:bg-slate-900/50 transition flex items-center justify-center gap-2">
                                            <Plus size={16} /> Nuevo Objeto
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* MODAL EDITAR HABILIDAD (DENTRO DEL MODAL) */}
                {isAbilityFormOpen && (
                    <div className="absolute inset-0 z-50 bg-black/90 flex items-center justify-center p-6 animate-in fade-in">
                        <div className="bg-slate-950 w-full max-w-sm p-6 rounded-2xl border border-slate-800 space-y-4 shadow-2xl">
                            <h3 className="text-white font-bold">{editingAbilityIndex !== null ? 'Editar' : 'Nueva'} Habilidad</h3>
                            <input autoFocus className="w-full bg-slate-900 border border-slate-700 p-2 rounded text-white" placeholder="Nombre" value={abilityForm.title} onChange={e => setAbilityForm({ ...abilityForm, title: e.target.value })} />
                            <textarea className="w-full bg-slate-900 border border-slate-700 p-2 rounded text-white h-32 resize-none" placeholder="Descripción" value={abilityForm.desc} onChange={e => setAbilityForm({ ...abilityForm, desc: e.target.value })} />
                            <div className="flex gap-2">
                                <button onClick={() => setIsAbilityFormOpen(false)} className="flex-1 py-2 bg-slate-800 rounded text-slate-400 font-bold">Cancelar</button>
                                <button onClick={handleSaveAbility} className="flex-1 py-2 bg-amber-600 rounded text-white font-bold">Guardar</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODAL EDITAR ITEM (DENTRO DEL MODAL) */}
                {isItemFormOpen && (
                    <div className="absolute inset-0 z-50 bg-black/90 flex items-center justify-center p-6 animate-in fade-in">
                        <div className="bg-slate-950 w-full max-w-sm p-6 rounded-2xl border border-slate-800 space-y-4 shadow-2xl">
                            <h3 className="text-white font-bold">{editingItem ? 'Editar' : 'Nuevo'} Objeto</h3>
                            <input autoFocus className="w-full bg-slate-900 border border-slate-700 p-2 rounded text-white" placeholder="Nombre" value={itemForm.name} onChange={e => setItemForm({ ...itemForm, name: e.target.value })} />
                            <textarea className="w-full bg-slate-900 border border-slate-700 p-2 rounded text-white h-32 resize-none" placeholder="Descripción" value={itemForm.description} onChange={e => setItemForm({ ...itemForm, description: e.target.value })} />
                            <div className="flex gap-2">
                                <button onClick={() => setIsItemFormOpen(false)} className="flex-1 py-2 bg-slate-800 rounded text-slate-400 font-bold">Cancelar</button>
                                <button onClick={handleSaveItem} className="flex-1 py-2 bg-emerald-600 rounded text-white font-bold">Guardar</button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
