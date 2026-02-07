"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useParams, useRouter } from "next/navigation";
import { Shield, Users, Heart, Zap, Sword, Award, Gift, LogOut, PlusCircle, Trash2 } from "lucide-react";
import { Campaign, CampaignParticipant, Character } from "@/types/supabase";

import CampaignCharacterModal from "@/components/CampaignCharacterModal";

type ParticipantWithChar = CampaignParticipant & {
    characters: Character | null;
    profiles: { role: string } | null
};

type Enemy = {
    id: string;
    name: string;
    hp_current: number;
    hp_max: number;
    ac: number;
    initiative: number;
};

export default function CampaignRoomPage() {
    const { id: campaignId } = useParams();
    const router = useRouter();
    const supabase = createClient();

    const [campaign, setCampaign] = useState<Campaign | null>(null);
    const [viewCharacterId, setViewCharacterId] = useState<string | null>(null); // State for Modal (ID only)
    const [badges, setBadges] = useState<any[]>([]);
    const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);
    const [selectedCharId, setSelectedCharId] = useState<string | null>(null);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);

    // Enemy State
    const [enemies, setEnemies] = useState<Enemy[]>([]);
    const [isEnemyModalOpen, setIsEnemyModalOpen] = useState(false);
    const [newEnemy, setNewEnemy] = useState({ name: "", hp: 10, ac: 10, initiative: 0 });

    // Restored missing state
    const [participants, setParticipants] = useState<ParticipantWithChar[]>([]);
    const [currentUserId, setCurrentUserId] = useState<string>("");
    const [isDM, setIsDM] = useState(false);
    const [loading, setLoading] = useState(true);

    // Derive character for modal
    const characterToView = viewCharacterId
        ? participants.find(p => p.characters?.id === viewCharacterId)?.characters
        : null;

    // Inicialización y Carga de Datos
    useEffect(() => {
        const parseEnemies = (desc: string | null) => {
            if (!desc) return [];
            const parts = desc.split("|||JSON|||");
            if (parts.length > 1) {
                try {
                    return JSON.parse(parts[1]).enemies || [];
                } catch (e) {
                    return [];
                }
            }
            return [];
        };

        const fetchParticipants = async () => {
            const { data } = await supabase
                .from("campaign_participants")
                .select("*, characters(*), profiles(role)")
                .eq("campaign_id", campaignId as string);

            if (data) setParticipants(data as any);
        };

        const fetchData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return router.push("/auth/login");
            setCurrentUserId(user.id);

            // 1. Cargar Campaña
            const { data: camp, error } = await supabase
                .from("campaigns")
                .select("*")
                .eq("id", campaignId as string)
                .single();

            if (error || !camp) {
                alert("Campaña no encontrada");
                return router.push("/campaigns");
            }
            const campaignData = camp as Campaign;
            setCampaign(campaignData);
            setEnemies(parseEnemies(campaignData.description));
            const userIsDM = campaignData.dm_id === user.id;
            setIsDM(userIsDM);

            // 2. Cargar Participantes iniciales (con sus personajes)
            await fetchParticipants();

            // 3. Si es DM, cargar insignias disponibles
            if (userIsDM) {
                const { data: badgeData } = await supabase.from("badges").select("*").eq("created_by", user.id);
                if (badgeData) setBadges(badgeData);
            }

            setLoading(false);
        };

        fetchData();

        // 3. Suscripción a Realtime
        const channel = supabase
            .channel(`campaign:${campaignId}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'campaign_participants', filter: `campaign_id=eq.${campaignId}` },
                () => {
                    console.log("Cambio en participantes detectado");
                    fetchParticipants(); // Recargar lista al entrar/salir gente
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'characters' },
                (payload) => {
                    console.log("Cambio en personaje detectado:", payload);
                    // Actualizar el personaje específico en el estado local sin recargar todo
                    setParticipants(prev => prev.map(p => {
                        if (p.character_id === payload.new.id) {
                            // Mergeamos el nuevo payload con el personaje existente para no perder relaciones si el payload es parcial (aunque UPDATE suele traer todo lo cambiado)
                            // En Supabase realtime update trae la fila completa por defecto.
                            return {
                                ...p,
                                characters: payload.new as Character
                            };
                        }
                        return p;
                    }));
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'campaigns', filter: `id=eq.${campaignId}` },
                (payload) => {
                    console.log("Cambio en campaña detectado", payload);
                    const newCamp = payload.new as Campaign;
                    setCampaign(newCamp);
                    setEnemies(parseEnemies(newCamp.description));
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [campaignId, router, supabase]);

    const updateStat = async (charId: string, stat: 'hp_current' | 'hp_max' | 'initiative', value: number) => {
        // Optimistic update (opcional, pero la suscripción ya lo manejaría)
        // Por ahora confiamos en Realtime o podríamos hacer optimistic aquí si se siente lento
        await (supabase.from("characters") as any).update({ [stat]: value }).eq("id", charId);
    };

    // Enemy Handlers
    const saveEnemies = async (updatedEnemies: Enemy[]) => {
        const originalDesc = campaign?.description?.split("|||JSON|||")[0] || "";
        const payload = { enemies: updatedEnemies };
        const newDesc = `${originalDesc}|||JSON|||${JSON.stringify(payload)}`;
        // Optimistic
        setEnemies(updatedEnemies);
        await (supabase.from("campaigns") as any).update({ description: newDesc }).eq("id", campaignId);
    };

    const handleAddEnemy = async () => {
        if (!newEnemy.name) return;
        const enemy: Enemy = {
            id: crypto.randomUUID(),
            name: newEnemy.name,
            hp_current: newEnemy.hp,
            hp_max: newEnemy.hp,
            ac: newEnemy.ac,
            initiative: newEnemy.initiative
        };
        const updated = [...enemies, enemy];
        await saveEnemies(updated);
        setIsEnemyModalOpen(false);
        setNewEnemy({ name: "", hp: 10, ac: 10, initiative: 0 });
    };

    const handleDeleteEnemy = async (enemyId: string) => {
        if (!confirm("¿Borrar enemigo?")) return;
        const updated = enemies.filter(e => e.id !== enemyId);
        await saveEnemies(updated);
    };

    const updateEnemyHP = async (enemyId: string, change: number) => {
        const updated = enemies.map(e => {
            if (e.id === enemyId) {
                const newHp = Math.max(0, Math.min(e.hp_max, e.hp_current + change));
                return { ...e, hp_current: newHp };
            }
            return e;
        });
        await saveEnemies(updated);
    };

    const handleGrantBadge = async (badgeId: string) => {
        if (!selectedCharId) return;

        const { error } = await (supabase.from("character_badges") as any).insert({
            character_id: selectedCharId,
            badge_id: badgeId
        });

        if (error) {
            alert("Error al dar insignia: " + error.message);
        } else {
            alert("¡Insignia otorgada!");
            setIsBadgeModalOpen(false);
            setSelectedCharId(null);
        }
    };

    if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-amber-500">Conectando al Tablero...</div>;

    return (
        <div className="min-h-screen bg-slate-950 text-white p-6" onClick={() => setOpenMenuId(null)}>
            {/* HEADER */}
            <header className="max-w-7xl mx-auto mb-8 border-b border-slate-800 pb-6 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-amber-500 flex items-center gap-3">
                        <Shield size={32} /> {campaign?.name}
                    </h1>
                    <p className="text-slate-400 flex items-center gap-4 mt-2">
                        <span className="flex items-center gap-1"><Users size={16} /> {participants.length} Participantes</span>
                        <span className="bg-slate-800 text-white px-2 py-0.5 rounded font-mono text-sm border border-slate-700">CÓDIGO: {campaign?.join_code}</span>
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                    {isDM && (
                        <>
                            <button
                                onClick={() => setIsEnemyModalOpen(true)}
                                className="px-4 py-2 bg-red-900/50 hover:bg-red-900 border border-red-800 rounded-lg text-sm font-bold flex items-center justify-center gap-2 text-red-200 transition"
                            >
                                <PlusCircle size={16} /> Ver/Crear Enemigos
                            </button>
                            <button
                                onClick={() => router.push("/dm")}
                                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-bold flex items-center justify-center gap-2"
                            >
                                <Award size={16} /> Gestionar Insignias
                            </button>
                        </>
                    )}
                    <button
                        onClick={() => router.push("/campaigns")}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-bold flex items-center justify-center gap-2"
                    >
                        <LogOut size={16} /> Salir
                    </button>
                </div>
            </header>

            {/* GRID DE PERSONAJES */}
            <main className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

                {participants.filter(p => p.role !== 'dm').map((participant) => {
                    const char = participant.characters;
                    const isOwner = participant.user_id === currentUserId;

                    if (!char) return null;

                    return (
                        <div key={participant.id} className={`relative bg-slate-900 rounded-2xl border ${isOwner ? 'border-amber-500/50 shadow-amber-900/20 shadow-lg' : 'border-slate-800'} overflow-visible group`}>

                            {/* Character Header Image/Color */}
                            <div className="h-24 bg-gradient-to-r from-slate-800 to-slate-900 p-4 flex items-end relative">
                                <div className="flex items-center gap-3 w-full">
                                    <div className="w-16 h-16 rounded-xl bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-3xl shadow-lg -mb-8 z-10 cursor-pointer hover:scale-105 transition"
                                        onClick={() => setViewCharacterId(char.id)}>
                                        {char.race === 'Dracónido' ? '🐲' : '👤'}
                                    </div>
                                    <div className="mb-1 cursor-pointer hover:text-amber-500 transition" onClick={() => setViewCharacterId(char.id)}>
                                        <h3 className="font-bold text-lg leading-none">{char.name}</h3>
                                        <p className="text-xs text-slate-400">{char.race} {char.class} (Nvl {char.level})</p>
                                    </div>
                                </div>

                                {/* DM 3-Dots Menu */}
                                {isDM && (
                                    <div className="absolute top-2 right-2 z-20" onClick={(e) => e.stopPropagation()}>
                                        <button
                                            onClick={() => setOpenMenuId(openMenuId === char.id ? null : char.id)}
                                            className="p-1 text-slate-400 hover:text-white rounded-full hover:bg-slate-800"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" /></svg>
                                        </button>

                                        {openMenuId === char.id && (
                                            <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-30 overflow-hidden">
                                                <button
                                                    onClick={() => {
                                                        setSelectedCharId(char.id);
                                                        setIsBadgeModalOpen(true);
                                                        setOpenMenuId(null);
                                                    }}
                                                    className="w-full text-left px-4 py-3 text-sm text-amber-500 hover:bg-slate-700 font-bold flex items-center gap-2"
                                                >
                                                    <Award size={16} /> Dar Insignia
                                                </button>
                                                {/* Aquí se pueden agregar más opciones futuras como "Kick" */}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Stats Grid */}
                            <div className="mt-8 px-4 pb-4 space-y-4">

                                {/* HP BAR */}
                                <div className="space-y-1">
                                    <div className="flex justify-between text-xs font-bold text-slate-400 uppercase">
                                        <span>Puntos de Golpe</span>
                                        <span className={char.hp_temp ? 'text-emerald-400' : ''}>
                                            {char.hp_current} {char.hp_temp ? `(+${char.hp_temp})` : ''} / {char.hp_max}
                                        </span>
                                    </div>
                                    <div className="h-4 bg-slate-950 rounded-full overflow-hidden border border-slate-800 relative group/hp">
                                        <div
                                            className="h-full bg-red-600 transition-all duration-500 ease-out"
                                            style={{ width: `${Math.max(0, Math.min(100, (char.hp_current / char.hp_max) * 100))}%` }}
                                        />
                                        {/* Vista previa de HP Temporal (overlay) */}
                                        {char.hp_temp && (
                                            <div
                                                className="absolute top-0 left-0 h-full bg-emerald-500/50 transition-all duration-500"
                                                style={{ width: `${Math.min(100, (char.hp_temp / char.hp_max) * 100)}%` }}
                                            />
                                        )}
                                    </div>

                                    {/* HP Controls (Owner Only) */}
                                    {isOwner && (
                                        <div className="grid grid-cols-4 gap-1 mt-2">
                                            <button
                                                onClick={() => updateStat(char.id, 'hp_current', Math.max(0, char.hp_current - 5))}
                                                className="bg-red-900/30 hover:bg-red-900/50 text-red-500 text-[10px] font-bold py-1 rounded transition"
                                            >
                                                -5
                                            </button>
                                            <button
                                                onClick={() => updateStat(char.id, 'hp_current', Math.max(0, char.hp_current - 1))}
                                                className="bg-red-900/30 hover:bg-red-900/50 text-red-500 text-[10px] font-bold py-1 rounded transition"
                                            >
                                                -1
                                            </button>
                                            <button
                                                onClick={() => updateStat(char.id, 'hp_current', Math.min(char.hp_max, char.hp_current + 1))}
                                                className="bg-emerald-900/30 hover:bg-emerald-900/50 text-emerald-500 text-[10px] font-bold py-1 rounded transition"
                                            >
                                                +1
                                            </button>
                                            <button
                                                onClick={() => updateStat(char.id, 'hp_current', Math.min(char.hp_max, char.hp_current + 5))}
                                                className="bg-emerald-900/30 hover:bg-emerald-900/50 text-emerald-500 text-[10px] font-bold py-1 rounded transition"
                                            >
                                                +5
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Secondary Stats */}
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="bg-slate-950 p-2 rounded-lg text-center border border-slate-800 relative">
                                        <div className="text-xs text-slate-500 uppercase font-bold flex justify-center items-center gap-1"><Shield size={10} /> CA</div>
                                        <div className={`font-mono font-bold text-lg ${char.temp_ac ? 'text-emerald-400' : ''}`}>
                                            {char.armor_class + (char.temp_ac || 0)}
                                        </div>
                                        {/* Indicador sutil de bono */}
                                        {char.temp_ac && (
                                            <div className="absolute top-1 right-1 text-[8px] text-emerald-500 font-bold">
                                                +{char.temp_ac}
                                            </div>
                                        )}
                                    </div>
                                    <div className="bg-slate-950 p-2 rounded-lg text-center border border-slate-800 relative group/inic">
                                        <div className="text-xs text-slate-500 uppercase font-bold flex justify-center items-center gap-1"><Zap size={10} /> INIC</div>
                                        {isOwner ? (
                                            <input
                                                type="number"
                                                className="w-full bg-transparent text-center font-mono font-bold text-lg text-yellow-500 outline-none p-0 focus:text-yellow-400"
                                                value={char.initiative}
                                                // Simplified handler for initiative to direct update for now
                                                onChange={(e) => updateStat(char.id, 'initiative', Number(e.target.value))}
                                            />
                                        ) : (
                                            <div className="font-mono font-bold text-lg text-yellow-500">+{char.initiative}</div>
                                        )}
                                        {isOwner && <div className="absolute inset-0 border border-yellow-500/20 rounded-lg pointer-events-none opacity-0 group-hover/inic:opacity-100 transition"></div>}
                                    </div>
                                    <div className="bg-slate-950 p-2 rounded-lg text-center border border-slate-800">
                                        <div className="text-xs text-slate-500 uppercase font-bold flex justify-center items-center gap-1"><Sword size={10} /> VEL</div>
                                        <div className="font-mono font-bold text-lg">{char.speed}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* ENEMIES GRID */}
                {enemies.map((enemy) => (
                    <div key={enemy.id} className="relative bg-red-950/20 rounded-2xl border border-red-900/50 overflow-visible group">
                        {/* Header */}
                        <div className="h-16 bg-gradient-to-r from-red-950/50 to-slate-900 p-4 flex items-center gap-3 relative">
                            <div className="w-12 h-12 rounded-lg bg-red-900/50 border border-red-800 flex items-center justify-center text-2xl shadow-lg">
                                💀
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-lg leading-none text-red-200">{enemy.name}</h3>
                                <p className="text-xs text-red-400">Enemigo {isDM && <span className="ml-1 text-red-300 font-mono">(AC {enemy.ac})</span>}</p>
                            </div>
                            {isDM && (
                                <button
                                    onClick={() => handleDeleteEnemy(enemy.id)}
                                    className="p-2 text-red-500 hover:text-red-300 hover:bg-red-900/50 rounded-lg"
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>

                        {/* Stats */}
                        <div className="p-4 space-y-4">
                            <div className="space-y-1">
                                {isDM && (
                                    <div className="flex justify-between text-xs font-bold text-red-400 uppercase">
                                        <span>HP</span>
                                        <span>{enemy.hp_current} / {enemy.hp_max}</span>
                                    </div>
                                )}
                                <div className="h-3 bg-slate-950 rounded-full overflow-hidden border border-red-900/30 relative">
                                    <div
                                        className={`h-full transition-all duration-300 ${enemy.hp_current > 0 ? (isDM ? 'bg-red-700' : 'bg-green-600') : 'bg-slate-600'}`}
                                        style={{ width: `${isDM ? (enemy.hp_current > 0 ? (enemy.hp_current / enemy.hp_max) * 100 : 100) : 100}%` }}
                                    />
                                </div>
                                {isDM && (
                                    <div className="grid grid-cols-4 gap-1 mt-2">
                                        <button onClick={() => updateEnemyHP(enemy.id, -5)} className="bg-red-900/30 hover:bg-red-900 text-red-500 text-[10px] font-bold py-1 rounded">-5</button>
                                        <button onClick={() => updateEnemyHP(enemy.id, -1)} className="bg-red-900/30 hover:bg-red-900 text-red-500 text-[10px] font-bold py-1 rounded">-1</button>
                                        <button onClick={() => updateEnemyHP(enemy.id, 1)} className="bg-emerald-900/30 hover:bg-emerald-900 text-emerald-500 text-[10px] font-bold py-1 rounded">+1</button>
                                        <button onClick={() => updateEnemyHP(enemy.id, 5)} className="bg-emerald-900/30 hover:bg-emerald-900 text-emerald-500 text-[10px] font-bold py-1 rounded">+5</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                {participants.filter(p => p.role === 'dm').length > 0 && (
                    <div className="col-span-1 md:col-span-2 xl:col-span-3 mt-8 p-4 bg-slate-900/50 border border-dashed border-slate-800 rounded-xl text-center text-slate-500">
                        <span className="font-bold">Dungeon Master:</span> {participants.find(p => p.role === 'dm')?.profiles?.role ? 'Presente' : 'Observando'}
                    </div>
                )}
            </main>

            {/* MODAL DE INSIGNIAS */}
            {isBadgeModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setIsBadgeModalOpen(false)}>
                    <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl relative" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <Award className="text-amber-500" /> Otorgar Insignia
                        </h3>
                        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                            {badges.length === 0 ? (
                                <p className="text-slate-500 text-center py-4">No has creado insignias aún. Ve a "Gestionar Insignias".</p>
                            ) : (
                                badges.map(badge => (
                                    <button
                                        key={badge.id}
                                        onClick={() => handleGrantBadge(badge.id)}
                                        className="w-full flex items-center gap-3 p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl transition text-left group"
                                    >
                                        <div className="w-10 h-10 rounded-lg bg-amber-900/20 text-2xl flex items-center justify-center border border-amber-900/50 group-hover:border-amber-500 transition">
                                            {badge.icon_key || "🏆"}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white group-hover:text-amber-400">{badge.name}</h4>
                                            <p className="text-xs text-slate-500 line-clamp-1">{badge.description}</p>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                        <button
                            onClick={() => setIsBadgeModalOpen(false)}
                            className="absolute top-4 right-4 text-slate-500 hover:text-white"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>
                </div>
            )}

            {/* MODAL CREAR ENEMIGO */}
            {isEnemyModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setIsEnemyModalOpen(false)}>
                    <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl relative" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2 text-red-400">
                            💀 Nuevo Enemigo
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Nombre</label>
                                <input
                                    className="w-full bg-slate-950 border border-slate-700 p-2 rounded-lg text-white"
                                    value={newEnemy.name}
                                    onChange={e => setNewEnemy({ ...newEnemy, name: e.target.value })}
                                    placeholder="Ej: Goblin Jefe"
                                />
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">HP Max</label>
                                    <input
                                        type="number"
                                        className="w-full bg-slate-950 border border-slate-700 p-2 rounded-lg text-white text-center"
                                        value={newEnemy.hp}
                                        onChange={e => setNewEnemy({ ...newEnemy, hp: Number(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">AC</label>
                                    <input
                                        type="number"
                                        className="w-full bg-slate-950 border border-slate-700 p-2 rounded-lg text-white text-center"
                                        value={newEnemy.ac}
                                        onChange={e => setNewEnemy({ ...newEnemy, ac: Number(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Inic</label>
                                    <input
                                        type="number"
                                        className="w-full bg-slate-950 border border-slate-700 p-2 rounded-lg text-white text-center"
                                        value={newEnemy.initiative}
                                        onChange={e => setNewEnemy({ ...newEnemy, initiative: Number(e.target.value) })}
                                    />
                                </div>
                            </div>
                            <button
                                onClick={handleAddEnemy}
                                disabled={!newEnemy.name}
                                className="w-full py-3 bg-red-600 hover:bg-red-500 rounded-xl font-bold text-white mt-2 disabled:opacity-50"
                            >
                                Invovar Enemigo
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* NUEVO: MODAL VISTA DE PERSONAJE */}
            {characterToView && (
                <CampaignCharacterModal
                    character={characterToView}
                    currentUser={currentUserId}
                    onClose={() => setViewCharacterId(null)}
                />
            )}
        </div>
    );
}
