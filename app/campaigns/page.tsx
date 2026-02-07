"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client"; // Corregida importación
import { useRouter } from "next/navigation";
import { Users, Plus, Hash, ArrowRight, Shield, Dices } from "lucide-react";
import { Campaign, CampaignParticipant, Character } from "@/types/supabase";

export default function CampaignsPage() {
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState<'dm' | 'player' | null>(null);
    const [myCampaigns, setMyCampaigns] = useState<Campaign[]>([]);
    const [myParticipations, setMyParticipations] = useState<(CampaignParticipant & { campaigns: Campaign })[]>([]);

    // Forms
    const [newCampaignName, setNewCampaignName] = useState("");
    const [joinCode, setJoinCode] = useState("");
    const [myCharacters, setMyCharacters] = useState<Character[]>([]);
    const [selectedCharId, setSelectedCharId] = useState("");

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return router.push("/auth/login");

            // 1. Get Role
            const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
            const role = profile?.role as 'dm' | 'player';
            setUserRole(role);

            // 2. Fetch Data based on role
            if (role === 'dm') {
                // DM: Fetch created campaigns
                const { data } = await supabase.from("campaigns").select("*").eq("dm_id", user.id).order('created_at', { ascending: false });
                if (data) setMyCampaigns(data);
            }

            // 3. Fetch joined campaigns (Everyone can join)
            const { data: joined } = await supabase
                .from("campaign_participants")
                .select("*, campaigns(*)")
                .eq("user_id", user.id);

            if (joined) setMyParticipations(joined as any); // Cast for nested join

            // 4. Fetch Characters (for joining)
            const { data: chars } = await supabase.from("characters").select("*").eq("user_id", user.id);
            if (chars) {
                setMyCharacters(chars);
                if (chars.length > 0) setSelectedCharId(chars[0].id);
            }

            setLoading(false);
        };
        init();
    }, [router, supabase]);

    const handleCreateCampaign = async () => {
        if (!newCampaignName) return;
        const { data: { user } } = await supabase.auth.getUser();

        // Generar código simple de 4 caracteres
        const code = Math.random().toString(36).substring(2, 6).toUpperCase();

        const { data, error } = await supabase.from("campaigns").insert({
            name: newCampaignName,
            dm_id: user?.id,
            join_code: code
        }).select().single();

        if (error) {
            alert("Error al crear: " + error.message);
        } else if (data) {
            setMyCampaigns([data, ...myCampaigns]);
            setNewCampaignName("");
            alert(`¡Campaña creada! Código: ${data.join_code}`);
        }
    };

    const handleJoinCampaign = async () => {
        if (!joinCode || !selectedCharId) return;
        const { data: { user } } = await supabase.auth.getUser();

        // 1. Buscar campaña por código
        const { data: campaign, error: findError } = await supabase
            .from("campaigns")
            .select("id")
            .eq("join_code", joinCode.toUpperCase())
            .single();

        if (findError || !campaign) {
            return alert("Código de campaña inválido.");
        }

        // 2. Unirse
        const { error: joinError } = await supabase.from("campaign_participants").insert({
            campaign_id: campaign.id,
            user_id: user?.id,
            character_id: selectedCharId,
            role: 'player'
        });

        if (joinError) {
            if (joinError.code === '23505') alert("Ya estás en esta campaña.");
            else alert("Error al unirse: " + joinError.message);
        } else {
            alert("¡Te has unido a la campaña!");
            window.location.reload(); // Recargar para verla en la lista
        }
    };

    if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-amber-500">Cargando Aventuras...</div>;

    return (
        <div className="min-h-screen bg-slate-950 text-white p-6">
            <header className="max-w-5xl mx-auto mb-10 border-b border-slate-800 pb-6">
                <h1 className="text-3xl font-black text-amber-500 flex items-center gap-3">
                    <Users size={32} /> Campañas y Mesas
                </h1>
                <p className="text-slate-400">Gestiona tus aventuras o únete a una nueva.</p>
            </header>

            <main className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">

                {/* SECTION 1: ACTIONS (CREATE / JOIN) */}
                <div className="space-y-8">
                    {/* DM CREATE BOX */}
                    {userRole === 'dm' && (
                        <div className="bg-slate-900 /50 p-6 rounded-2xl border border-amber-900/30">
                            <h2 className="text-xl font-bold text-amber-500 mb-4 flex items-center gap-2">
                                <Shield size={20} /> Crear Nueva Campaña
                            </h2>
                            <div className="space-y-4">
                                <input
                                    type="text"
                                    placeholder="Nombre de la Campaña (Ej. La Maldición de Strahd)"
                                    className="w-full bg-slate-950 border border-slate-700 p-4 rounded-xl focus:border-amber-500 outline-none"
                                    value={newCampaignName}
                                    onChange={e => setNewCampaignName(e.target.value)}
                                />
                                <button
                                    onClick={handleCreateCampaign}
                                    disabled={!newCampaignName}
                                    className="w-full py-4 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition"
                                >
                                    <Plus size={20} /> Crear Mundo
                                </button>
                            </div>
                        </div>
                    )}

                    {/* PLAYER JOIN BOX */}
                    <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                        <h2 className="text-xl font-bold text-blue-400 mb-4 flex items-center gap-2">
                            <Hash size={20} /> Unirse con Código
                        </h2>
                        <div className="space-y-4">
                            <input
                                type="text"
                                placeholder="Código de Invitación (Ej. A4F2)"
                                className="w-full bg-slate-950 border border-slate-700 p-4 rounded-xl focus:border-blue-500 outline-none uppercase tracking-widest font-mono"
                                value={joinCode}
                                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                                maxLength={4}
                            />

                            {myCharacters.length > 0 ? (
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Elige tu Personaje</label>
                                    <select
                                        value={selectedCharId}
                                        onChange={e => setSelectedCharId(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl focus:border-blue-500 outline-none"
                                    >
                                        {myCharacters.map(c => (
                                            <option key={c.id} value={c.id}>{c.name} ({c.class} Lvl {c.level})</option>
                                        ))}
                                    </select>
                                </div>
                            ) : (
                                <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded-lg">
                                    Necesitas crear un personaje primero para unirte.
                                </div>
                            )}

                            <button
                                onClick={handleJoinCampaign}
                                disabled={!joinCode || myCharacters.length === 0}
                                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition"
                            >
                                <ArrowRight size={20} /> Unirse a la Aventura
                            </button>
                        </div>
                    </div>
                </div>

                {/* SECTION 2: LIST OF CAMPAIGNS */}
                <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-white mb-6">Tus Campañas Activas</h2>

                    {myCampaigns.length === 0 && myParticipations.length === 0 && (
                        <div className="text-center py-12 text-slate-500 bg-slate-900/30 rounded-2xl border border-dashed border-slate-800">
                            <Dices size={48} className="mx-auto mb-4 opacity-50" />
                            <p>No participas en ninguna campaña aún.</p>
                        </div>
                    )}

                    {/* DM Campaigns */}
                    {myCampaigns.map(c => (
                        <div
                            key={c.id}
                            onClick={() => router.push(`/campaigns/${c.id}`)}
                            className="bg-gradient-to-r from-amber-900/20 to-slate-900 p-6 rounded-2xl border border-amber-900/50 hover:border-amber-500 cursor-pointer transition group"
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="text-amber-500 text-xs font-bold mb-1 flex items-center gap-1"><Shield size={12} /> DUNGEON MASTER</div>
                                    <h3 className="text-xl font-bold text-white group-hover:text-amber-400 transition">{c.name}</h3>
                                    <p className="text-slate-400 text-sm mt-1">Código: <span className="font-mono text-white bg-slate-800 px-2 py-0.5 rounded">{c.join_code}</span></p>
                                </div>
                                <ArrowRight className="text-slate-600 group-hover:text-amber-500 transition" />
                            </div>
                        </div>
                    ))}

                    {/* Player Campaigns */}
                    {myParticipations.map(p => (
                        <div
                            key={p.id}
                            onClick={() => router.push(`/campaigns/${p.campaign_id}`)}
                            className="bg-slate-900 p-6 rounded-2xl border border-slate-800 hover:border-blue-500 cursor-pointer transition group"
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="text-blue-500 text-xs font-bold mb-1 flex items-center gap-1"><Users size={12} /> JUGADOR</div>
                                    <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition">{p.campaigns.name}</h3>
                                    <p className="text-slate-400 text-sm mt-1">Unido el {new Date(p.joined_at).toLocaleDateString()}</p>
                                </div>
                                <ArrowRight className="text-slate-600 group-hover:text-blue-500 transition" />
                            </div>
                        </div>
                    ))}
                </div>

            </main>
        </div>
    );
}
