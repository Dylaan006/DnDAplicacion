"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Users, Plus, DoorOpen, Sword, Hash, ChevronLeft } from "lucide-react";

export default function RoomLobbyPage() {
  const [characters, setCharacters] = useState<any[]>([]);
  const [selectedChar, setSelectedChar] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetchChars = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/auth/login");

      // --- CAMBIO AQUÍ ---
      // Antes: .select("id, name, class")
      // Ahora: Agregamos .eq("user_id", user.id) para filtrar solo TUS personajes
      const { data } = await supabase
        .from("characters")
        .select("id, name, class")
        .eq("user_id", user.id); 
      
      if (data) setCharacters(data);
    };
    fetchChars();
  }, [router, supabase]);

  const createRoom = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    // Generar código tipo "XJ-42"
    const code = Math.random().toString(36).substring(2, 4).toUpperCase() + "-" + Math.floor(Math.random() * 99);

    const { error } = await supabase.from("rooms").insert({
      dm_id: user?.id,
      code: code,
      is_active: true
    });

    if (error) alert("Error: " + error.message);
    else router.push(`/room/${code}`);
    setLoading(false);
  };

const joinRoom = async () => {
    if (!selectedChar) return alert("¡Elige un personaje!");
    if (!roomCode) return alert("Falta el código de sala");

    setLoading(true);
    
    // 1. Buscar la sala
    const { data: room, error } = await supabase
      .from("rooms")
      .select("id")
      .eq("code", roomCode.toUpperCase())
      .single();

    if (error || !room) {
      alert("Sala no encontrada");
      setLoading(false);
      return;
    } 

    // 2. Intentar Unirse
    const { error: joinError } = await supabase.from("room_participants").insert({
      room_id: room.id,
      character_id: selectedChar
    });

    if (!joinError || joinError.code === '23505') { // 23505 = Ya existe (lo ignoramos)
      
      // --- NUEVO: GUARDAR EL TICKET DE ENTRADA ---
      // Esto permite que si recargas la página, la sala sepa quién eras
      localStorage.setItem(`room_ticket_${room.id}`, selectedChar);
      
      router.push(`/room/${roomCode.toUpperCase()}`);
    } else {
      alert("Error al unirse: " + joinError.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 flex flex-col items-center justify-center relative">
      <button onClick={() => router.push("/dashboard")} className="absolute top-6 left-6 text-slate-400 hover:text-white flex items-center gap-2">
        <ChevronLeft /> Volver al Dashboard
      </button>

      <div className="w-full max-w-4xl grid md:grid-cols-2 gap-8">
        
        {/* JUGADOR: UNIRSE */}
        <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 space-y-6">
          <div className="flex items-center gap-3 text-amber-500">
            <DoorOpen size={32} />
            <h2 className="text-2xl font-bold">Unirse a Mesa</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="text-xs text-slate-500 uppercase font-bold">1. Tu Héroe</label>
              <select 
                className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl mt-1 outline-none focus:border-amber-500"
                value={selectedChar}
                onChange={(e) => setSelectedChar(e.target.value)}
              >
                <option value="">Seleccionar personaje...</option>
                {characters.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.class})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-500 uppercase font-bold">2. Código de Sala</label>
              <div className="relative">
                <Hash className="absolute left-3 top-3.5 text-slate-600" size={18} />
                <input 
                  type="text" 
                  placeholder="Ej: AB-12"
                  className="w-full bg-slate-950 border border-slate-800 p-3 pl-10 rounded-xl mt-1 outline-none focus:border-amber-500 uppercase"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value)}
                />
              </div>
            </div>

            <button 
              onClick={joinRoom}
              disabled={loading || !selectedChar || !roomCode}
              className="w-full bg-amber-600 hover:bg-amber-500 py-4 rounded-xl font-bold transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Sword size={20} /> Entrar
            </button>
          </div>
        </div>

        {/* DM: CREAR */}
        <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 flex flex-col justify-center items-center text-center space-y-6">
          <div className="p-4 bg-slate-800 rounded-full text-emerald-500">
            <Users size={40} />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Modo Director</h2>
            <p className="text-slate-400 text-sm mt-2">Crea una sala nueva, comparte el código y controla el mapa.</p>
          </div>
          <button 
            onClick={createRoom}
            disabled={loading}
            className="w-full bg-slate-800 hover:bg-slate-700 py-4 rounded-xl font-bold transition border border-slate-700 flex items-center justify-center gap-2"
          >
            <Plus size={20} /> Crear Nueva Sala
          </button>
        </div>

      </div>
    </div>
  );
}