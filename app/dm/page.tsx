"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Shield, Award, Users, PlusCircle, CheckCircle, Search, Save } from "lucide-react";
import { Badge, Character } from "@/types/supabase";

export default function DMToolsPage() {
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'create' | 'award'>('create');

    // Data State
    const [badges, setBadges] = useState<Badge[]>([]);
    const [characters, setCharacters] = useState<Character[]>([]);

    // Create Badge Form
    const [newBadge, setNewBadge] = useState({ name: "", description: "", icon_key: "🏆" });

    // Award Badge Form
    const [selectedChar, setSelectedChar] = useState<string>("");
    const [selectedBadge, setSelectedBadge] = useState<string>("");

    useEffect(() => {
        const checkAccess = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return router.push("/auth/login");

            const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

            if (!profile || (profile.role !== 'dm' && profile.role !== 'admin')) {
                alert("Acceso Restringido: Solo para Dungeon Masters.");
                return router.push("/dashboard");
            }

            // Fetch Data
            const { data: badgesData } = await supabase.from("badges").select("*").order("created_at", { ascending: false });
            const { data: charsData } = await supabase.from("characters").select("*").order("name");

            if (badgesData) setBadges(badgesData);
            if (charsData) setCharacters(charsData as unknown as Character[]); // Cast to avoid strict type mismatch if any

            setLoading(false);
        };

        checkAccess();
    }, [router, supabase]);

    const handleCreateBadge = async () => {
        if (!newBadge.name) return;

        const { data: { user } } = await supabase.auth.getUser();

        const { data, error } = await supabase.from("badges").insert({
            name: newBadge.name,
            description: newBadge.description,
            icon_key: newBadge.icon_key,
            created_by: user?.id
        }).select().single();

        if (error) {
            alert("Error creando insignia: " + error.message);
        } else if (data) {
            setBadges([data, ...badges]);
            setNewBadge({ name: "", description: "", icon_key: "🏆" });
            alert("¡Insignia creada!");
        }
    };

    const handleAwardBadge = async () => {
        if (!selectedChar || !selectedBadge) return;

        const { error } = await supabase.from("character_badges").insert({
            character_id: selectedChar,
            badge_id: selectedBadge
        });

        if (error) {
            alert("Error otorgando insignia: " + error.message);
        } else {
            alert("¡Insignia otorgada con éxito!");
            setSelectedChar("");
            setSelectedBadge("");
        }
    };

    if (loading) return <div className="h-screen bg-slate-950 flex items-center justify-center text-amber-500 font-bold">Verificando Credenciales...</div>;

    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans p-6">
            <header className="max-w-4xl mx-auto mb-10 flex justify-between items-center border-b border-slate-800 pb-6">
                <h1 className="text-3xl font-black text-amber-500 flex items-center gap-3">
                    <Shield size={32} /> Herramientas de DM
                </h1>
                <button onClick={() => router.push("/dashboard")} className="text-slate-500 hover:text-white transition">
                    Volver al Dashboard
                </button>
            </header>

            <main className="max-w-4xl mx-auto">
                {/* TABS */}
                <div className="flex gap-4 mb-8">
                    <button
                        onClick={() => setActiveTab('create')}
                        className={`flex-1 py-4 rounded-xl border font-bold flex items-center justify-center gap-2 transition ${activeTab === 'create' ? 'bg-amber-600 border-amber-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-500 hover:bg-slate-800'}`}
                    >
                        <PlusCircle size={20} /> Crear Insignias
                    </button>
                    <button
                        onClick={() => setActiveTab('award')}
                        className={`flex-1 py-4 rounded-xl border font-bold flex items-center justify-center gap-2 transition ${activeTab === 'award' ? 'bg-purple-600 border-purple-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-500 hover:bg-slate-800'}`}
                    >
                        <Award size={20} /> Otorgar a Jugadores
                    </button>
                </div>

                {/* CREATE VIEW */}
                {activeTab === 'create' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                        <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800">
                            <h2 className="text-xl font-bold mb-6 text-slate-200">Nueva Insignia</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Nombre de la Insignia</label>
                                    <input
                                        value={newBadge.name}
                                        onChange={e => setNewBadge({ ...newBadge, name: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl focus:border-amber-500 outline-none"
                                        placeholder="Ej: Matadragones"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Descripción</label>
                                    <textarea
                                        value={newBadge.description}
                                        onChange={e => setNewBadge({ ...newBadge, description: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl focus:border-amber-500 outline-none h-24"
                                        placeholder="Otorgada por..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Icono (Emoji)</label>
                                    <div className="flex gap-2">
                                        {['🏆', '💀', '🔥', '⚔️', '🛡️', '💎', '📜', '🧙‍♂️', '🐉'].map(icon => (
                                            <button
                                                key={icon}
                                                onClick={() => setNewBadge({ ...newBadge, icon_key: icon })}
                                                className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center border transition ${newBadge.icon_key === icon ? 'bg-amber-500 border-amber-400 text-white' : 'bg-slate-950 border-slate-700 text-slate-400 hover:bg-slate-800'}`}
                                            >
                                                {icon}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <button
                                    onClick={handleCreateBadge}
                                    disabled={!newBadge.name}
                                    className="w-full py-4 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl mt-4 flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    <Save size={20} /> Guardar Insignia
                                </button>
                            </div>
                        </div>

                        <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800">
                            <h2 className="text-xl font-bold mb-6 text-slate-200">Insignias Existentes</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {badges.map(b => (
                                    <div key={b.id} className="flex items-center gap-4 p-4 bg-slate-950 rounded-xl border border-slate-800">
                                        <div className="text-3xl">{b.icon_key}</div>
                                        <div>
                                            <h3 className="font-bold text-white">{b.name}</h3>
                                            <p className="text-slate-500 text-sm line-clamp-1">{b.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* AWARD VIEW */}
                {activeTab === 'award' && (
                    <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 animate-in fade-in slide-in-from-bottom-4">
                        <h2 className="text-xl font-bold mb-6 text-slate-200">Otorgar Reconocimiento</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 mb-2">1. Selecciona Personaje</label>
                                <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                                    {characters.map(c => (
                                        <div
                                            key={c.id}
                                            onClick={() => setSelectedChar(c.id)}
                                            className={`p-3 rounded-lg border cursor-pointer flex items-center justify-between transition ${selectedChar === c.id ? 'bg-purple-900/30 border-purple-500' : 'bg-slate-950 border-slate-800 hover:border-slate-600'}`}
                                        >
                                            <div className="font-bold">{c.name}</div>
                                            <div className="text-xs text-slate-500">{c.class}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 mb-2">2. Selecciona Insignia</label>
                                <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                                    {badges.map(b => (
                                        <div
                                            key={b.id}
                                            onClick={() => setSelectedBadge(b.id)}
                                            className={`p-3 rounded-lg border cursor-pointer flex items-center gap-3 transition ${selectedBadge === b.id ? 'bg-purple-900/30 border-purple-500' : 'bg-slate-950 border-slate-800 hover:border-slate-600'}`}
                                        >
                                            <span className="text-xl">{b.icon_key}</span>
                                            <span className="font-bold">{b.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleAwardBadge}
                            disabled={!selectedChar || !selectedBadge}
                            className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl mt-8 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            <Award size={24} /> Otorgar Insignia
                        </button>

                        {!selectedChar && <p className="text-center text-xs text-slate-500 mt-4">Selecciona un personaje y una insignia para continuar.</p>}
                    </div>
                )}
            </main>
        </div>
    );
}
