"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { X, UserPlus, Shield, User } from "lucide-react";
import { Character, CampaignParticipant } from "@/types/supabase";

interface Props {
    campaignId: string;
    dmCharacters: Character[];
    participants: (CampaignParticipant & { profiles: { role: string } | null })[];
    onClose: () => void;
    onSuccess: () => void;
}

export default function AssignCharacterModal({ campaignId, dmCharacters, participants, onClose, onSuccess }: Props) {
    const supabase = createClient();
    const [selectedCharId, setSelectedCharId] = useState<string>("");
    const [selectedUserId, setSelectedUserId] = useState<string>("");
    const [loading, setLoading] = useState(false);

    const handleAssign = async () => {
        if (!selectedCharId || !selectedUserId) return;
        setLoading(true);

        const { error } = await (supabase.from("campaign_participants") as any).insert({
            campaign_id: campaignId,
            user_id: selectedUserId,
            character_id: selectedCharId,
            role: 'player'
        });

        if (error) {
            if (error.code === '23505') {
                alert("Este personaje ya está asignado en esta campaña.");
            } else {
                alert("Error al asignar: " + error.message);
            }
        } else {
            onSuccess();
        }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl relative" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white">
                    <X size={20} />
                </button>

                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <UserPlus className="text-blue-500" /> Asignar Personaje Extra
                </h3>

                <div className="space-y-6">
                    {/* Character Selection */}
                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-500 mb-2">1. Elige un Personaje (Tus NPCs/Personajes)</label>
                        <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                            {dmCharacters.length === 0 ? (
                                <p className="text-slate-600 text-sm italic">No tienes personajes creados.</p>
                            ) : (
                                dmCharacters.map(char => (
                                    <button
                                        key={char.id}
                                        onClick={() => setSelectedCharId(char.id)}
                                        className={`flex items-center gap-3 p-3 rounded-xl border transition text-left ${selectedCharId === char.id ? 'bg-blue-600/20 border-blue-500' : 'bg-slate-950 border-slate-800 hover:border-slate-700'}`}
                                    >
                                        <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-xl">
                                            {char.race === 'Dracónido' ? '🐲' : '👤'}
                                        </div>
                                        <div>
                                            <div className="font-bold text-white text-sm">{char.name}</div>
                                            <div className="text-xs text-slate-500">{char.race} {char.class}</div>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Player Selection */}
                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-500 mb-2">2. Selecciona al Jugador Receptor</label>
                        <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                            {participants.map(p => (
                                <button
                                    key={p.user_id}
                                    onClick={() => setSelectedUserId(p.user_id)}
                                    className={`flex items-center gap-3 p-3 rounded-xl border transition text-left ${selectedUserId === p.user_id ? 'bg-blue-600/20 border-blue-500' : 'bg-slate-950 border-slate-800 hover:border-slate-700'}`}
                                >
                                    <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-blue-500">
                                        <User size={20} />
                                    </div>
                                    <div>
                                        <div className="font-bold text-white text-sm">Jugador ID: {p.user_id.substring(0, 8)}...</div>
                                        <div className="text-xs text-slate-500">En la sala desde {new Date(p.joined_at).toLocaleDateString()}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={handleAssign}
                        disabled={!selectedCharId || !selectedUserId || loading}
                        className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition shadow-lg shadow-blue-900/20"
                    >
                        {loading ? "Asignando..." : "Otorgar Control"}
                    </button>
                    
                    <p className="text-[10px] text-slate-500 text-center italic">
                        El jugador podrá ver y editar este personaje en esta sala, pero tú seguirás siendo el dueño global.
                    </p>
                </div>
            </div>
        </div>
    );
}
