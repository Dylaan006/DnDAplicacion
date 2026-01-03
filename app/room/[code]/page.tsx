"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase/client"
import { useParams, useRouter } from "next/navigation";
import { 
  Users, Briefcase, Upload, Loader2, LogOut, Dices, 
  MessageSquare, Map as MapIcon, User, Plus, Trash2, 
  Send, Gift, X, Skull, Footprints 
} from "lucide-react";

export default function GameRoomPage() {
  const { code } = useParams();
  const router = useRouter();

  // --- ESTADOS ---
  const [room, setRoom] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]); 
  const [logs, setLogs] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [myCharacter, setMyCharacter] = useState<any>(null);
  const [isDM, setIsDM] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  const [activeTab, setActiveTab] = useState<"map" | "players" | "sheet" | "chat" | "loot">("map");
  const sessionTokenRef = useRef<string | null>(null);

  // --- MODALES ---
  const [modalType, setModalType] = useState<"create" | "transfer" | "enemy" | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null); 
  const [itemForm, setItemForm] = useState({ name: "", description: "", type: "general", quantity: 1, targetUserId: "" });
  const [enemyForm, setEnemyForm] = useState({ name: "", hp: 10, ac: 10, speed: "30 ft", dex: 10 });

  // --- CARGA DE DATOS ---
  const fetchParticipants = useCallback(async (roomId: string) => {
    const { data } = await supabase.from("room_participants").select(`*, characters(*)`).eq("room_id", roomId);
    if (data) setParticipants(data.filter(p => p.characters !== null));
  }, [supabase]);

  const fetchLogs = useCallback(async (roomId: string) => {
    const { data } = await supabase.from("room_logs").select("*").eq("room_id", roomId).order("created_at", { ascending: false }).limit(30);
    if (data) setLogs(data);
  }, [supabase]);

  const fetchItems = useCallback(async (roomId: string) => {
    const { data } = await supabase.from("items").select("*"); 
    if (data) setItems(data);
  }, [supabase]);

  // --- INICIALIZACIÓN ---
  useEffect(() => {
    const loadRoom = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return router.push("/auth/login");
      setCurrentUser(session.user);
      sessionTokenRef.current = session.access_token;

      const { data: roomData } = await supabase.from("rooms").select("*").eq("code", code).maybeSingle();
      if (!roomData) return router.push("/room");
      setRoom(roomData);
      setIsDM(roomData.dm_id === session.user.id);
      
      await fetchParticipants(roomData.id);
      await fetchLogs(roomData.id);
      await fetchItems(roomData.id); 
      setLoading(false);
    };
    loadRoom();
  }, [code, router, supabase, fetchParticipants, fetchLogs, fetchItems]);

  // --- REALTIME ---
  useEffect(() => {
    if (!room?.id) return;
    const channel = supabase.channel(`room-logic-${room.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${room.id}` }, (p) => setRoom(p.new))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'room_participants', filter: `room_id=eq.${room.id}` }, () => fetchParticipants(room.id))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'characters' }, () => fetchParticipants(room.id))
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'room_logs', filter: `room_id=eq.${room.id}` }, (p) => setLogs(prev => [p.new, ...prev]))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, () => fetchItems(room.id))
        .subscribe((status) => { if (status === 'SUBSCRIBED') { fetchParticipants(room.id); fetchItems(room.id); } });
    return () => { supabase.removeChannel(channel); };
  }, [room?.id]);

  // --- REINGRESO ---
  useEffect(() => {
    if (room && currentUser && !isDM) {
        const attemptRejoin = async () => {
            const savedCharId = localStorage.getItem(`room_ticket_${room.id}`);
            if (savedCharId) {
                await supabase.from("room_participants").upsert({ room_id: room.id, character_id: savedCharId }, { onConflict: 'room_id, character_id' });
                fetchParticipants(room.id);
            }
        };
        attemptRejoin();
    }
  }, [room?.id, currentUser?.id, isDM]);

  // --- MI PERSONAJE ---
  useEffect(() => {
    if (currentUser && participants.length > 0) {
        const mine = participants.find(p => p.characters.user_id === currentUser.id);
        if (mine) setMyCharacter(mine.characters);
    }
  }, [participants, currentUser]);

  // --- LÓGICA DE JUEGO ---
  const getMod = (stat: number) => Math.floor(((stat || 10) - 10) / 2);

  const rollDice = async (sides: number) => {
    if (!room) return;
    const result = Math.floor(Math.random() * sides) + 1;
    const name = isDM ? "Director" : (myCharacter?.name || "Espectador");
    await supabase.from("room_logs").insert({ room_id: room.id, user_name: name, content: `tira 1d${sides}: [ ${result} ]` });
  };

  const rollInitiative = async () => {
    if (!myCharacter || !room) return;
    const die = Math.floor(Math.random() * 20) + 1;
    // Soporte para ambos idiomas en la base de datos
    const dex = myCharacter.destreza || myCharacter.dexterity || 10;
    const mod = getMod(dex); 
    const total = die + mod;
    await supabase.from("characters").update({ initiative: total }).eq("id", myCharacter.id);
    await supabase.from("room_logs").insert({ room_id: room.id, user_name: "SISTEMA", content: `⚔️ ${myCharacter.name} iniciativa: ${total} (${die}+${mod})` });
  };

  // Función para tirar iniciativa de un personaje específico (Enemigos u otros jugadores)
  const rollSpecificInitiative = async (targetChar: any) => {
    if (!room) return;
    const die = Math.floor(Math.random() * 20) + 1;
    
    // Soporte para ambos idiomas
    const dex = targetChar.destreza || targetChar.dexterity || 10;
    const mod = getMod(dex); 
    const total = die + mod;

    await supabase.from("characters").update({ initiative: total }).eq("id", targetChar.id);
    
    // Log diferenciado para saber quién tiró
    const actorName = isDM ? "DM" : myCharacter?.name;
    await supabase.from("room_logs").insert({ 
        room_id: room.id, 
        user_name: "SISTEMA", 
        content: `⚔️ ${targetChar.name} iniciativa: ${total} (${die}+${mod}) [Tirado por ${actorName}]` 
    });
  };

  const updateHP = async (charId: string, current: number, max: number, amount: number) => {
    const newHP = Math.min(Math.max(current + amount, 0), max);
    await supabase.from("characters").update({ hp_current: newHP }).eq("id", charId);
  };

  const handleLeaveRoom = async () => {
    if (!isDM && room) {
        localStorage.removeItem(`room_ticket_${room.id}`);
        await supabase.rpc('leave_room', { room_id_arg: room.id });
    }
    router.push("/room");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !isDM) return;
    setUploading(true);
    const file = e.target.files[0];
    const path = `${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from('campaign-images').upload(path, file);
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('campaign-images').getPublicUrl(path);
      await supabase.from("rooms").update({ broadcast_image_url: publicUrl }).eq("id", room.id);
    }
    setUploading(false);
  };

  const handleCreateItem = async () => {
    if (!itemForm.name.trim()) return;
    
    // Si soy DM uso el target, si soy jugador uso mi ID
    const targetCharId = isDM ? itemForm.targetUserId : myCharacter?.id;
    if (!targetCharId) return alert("Error: No se pudo asignar el dueño del item.");

    const { error } = await supabase.from("items").insert({
        character_id: targetCharId,
        name: itemForm.name.trim(),
        description: itemForm.description?.trim() || "",
        type: itemForm.type || "general",
        quantity: parseInt(itemForm.quantity.toString()) || 1 
    });
    
    if (error) {
        console.error(error);
        alert("Error: " + error.message);
    } else {
        setModalType(null);
        setItemForm({ name: "", description: "", type: "general", quantity: 1, targetUserId: "" });
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm("¿Borrar este objeto?")) return;
    await supabase.from("items").delete().eq("id", itemId);
  };

  const handleTransferItem = async () => {
    if (!selectedItem || !itemForm.targetUserId) return;
    const receiver = participants.find(p => p.characters.id === itemForm.targetUserId)?.characters.name || "Alguien";
    const { error } = await supabase.from("items").update({ character_id: itemForm.targetUserId }).eq("id", selectedItem.id);
    if (!error && room) {
        const senderName = isDM ? "El Director" : myCharacter?.name;
        await supabase.from("room_logs").insert({ room_id: room.id, user_name: "SISTEMA", content: `${senderName} dio ${selectedItem.name} a ${receiver}` });
    }
    setModalType(null);
    setSelectedItem(null);
  };

  const handleCreateEnemy = async () => {
     if (!isDM || !room) return;
     if (!enemyForm.name) return alert("El enemigo necesita un nombre");
     
     // 1. Detectar idioma de columna (Buscar en un personaje existente o default a español)
     const sampleChar = participants.find(p => p.characters)?.characters;
     const dexKey = sampleChar?.destreza !== undefined ? 'destreza' : 'dexterity';

     const enemyData: any = {
       user_id: currentUser.id,
       name: enemyForm.name,
       class: "Monstruo",
       hp_max: enemyForm.hp,
       hp_current: enemyForm.hp,
       armor_class: enemyForm.ac,
       speed: enemyForm.speed,
       is_enemy: true
     };
     // Asignar destreza dinámicamente
     enemyData[dexKey] = enemyForm.dex;

     const { data: charData, error: charError } = await supabase.from("characters").insert(enemyData).select().single();
     if (charError) return alert("Error: " + charError.message);

     await supabase.from("room_participants").insert({ room_id: room.id, character_id: charData.id });
     setModalType(null);
     setEnemyForm({ name: "", hp: 10, ac: 10, speed: "30 ft", dex: 10 });
  };

  if (loading) return <div className="h-screen bg-slate-950 flex items-center justify-center text-white">Cargando...</div>;

  return (
    <div className="h-screen bg-slate-950 text-white flex flex-col overflow-hidden font-sans">
      
      {/* NAVBAR */}
      <nav className="h-14 border-b border-slate-800 bg-slate-900 flex items-center justify-between px-4 shrink-0 z-40">
        <div className="flex items-center gap-4">
          <button onClick={handleLeaveRoom} className="text-red-400 hover:bg-red-900/20 p-2 rounded transition flex items-center gap-2">
            <LogOut size={18}/> <span className="hidden sm:inline text-xs font-bold">SALIR</span>
          </button>
          <div className="flex flex-col leading-tight">
            <span className="text-[10px] text-slate-500 font-bold uppercase">SALA</span>
            <span className="text-amber-500 font-black tracking-tight">{code}</span>
          </div>
        </div>
        {isDM && (
          <label className="cursor-pointer bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded flex items-center gap-2 text-xs font-bold border border-slate-700 transition">
            {uploading ? <Loader2 className="animate-spin" size={14}/> : <Upload size={14}/>}
            <span className="hidden sm:inline">MAPA</span>
            <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
          </label>
        )}
      </nav>

      <main className="flex-1 flex overflow-hidden relative">
        
        {/* MAPA */}
        <div className={`flex-1 bg-black/50 flex items-center justify-center p-4 overflow-hidden relative ${activeTab === 'map' ? 'flex' : 'hidden md:flex'}`}>
            {room?.broadcast_image_url ? (
                <img key={room.broadcast_image_url} src={room.broadcast_image_url} className="max-w-full max-h-full object-contain shadow-2xl rounded" alt="Mapa" />
            ) : (
                <div className="text-slate-600 flex flex-col items-center gap-2"><MapIcon size={64} opacity={0.2} /><p className="text-xs font-bold uppercase">Sin Mapa</p></div>
            )}
        </div>

        {/* SIDEBAR */}
        <aside className={`w-full md:w-96 border-l border-slate-800 bg-slate-950 flex flex-col ${activeTab !== 'map' ? 'flex' : 'hidden md:flex'}`}>
            
            {/* TABS PC */}
            <div className="hidden md:flex border-b border-slate-800 bg-slate-900">
                <button onClick={() => setActiveTab("players")} className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest ${activeTab === 'players' || activeTab === 'map' ? 'text-amber-500 border-b-2 border-amber-500' : 'text-slate-500'}`}>Grupo</button>
                {isDM ? (
                   <button onClick={() => setActiveTab("loot")} className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest ${activeTab === 'loot' ? 'text-purple-500 border-b-2 border-purple-500' : 'text-slate-500'}`}>DM</button>
                ) : (
                   <button onClick={() => setActiveTab("sheet")} className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest ${activeTab === 'sheet' ? 'text-amber-500 border-b-2 border-amber-500' : 'text-slate-500'}`}>Yo</button>
                )}
                <button onClick={() => setActiveTab("chat")} className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest ${activeTab === 'chat' ? 'text-amber-500 border-b-2 border-amber-500' : 'text-slate-500'}`}>Dados</button>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-950 relative pb-24 md:pb-4">
                
                {/* A. GRUPO */}
                {(activeTab === 'players' || activeTab === 'map') && (
                    <div className="p-4 space-y-3 animate-in fade-in">
                        {participants.map(p => {
                            const char = p.characters;
                            const isEnemy = char.is_enemy;
                            const canControl = isDM || (currentUser && char.user_id === currentUser.id);
                            const showHP = isDM || !isEnemy;

                            return (
                                <div key={p.id} className={`p-3 rounded-xl border relative ${isEnemy ? 'bg-red-950/20 border-red-900/40' : (canControl ? 'bg-slate-900 border-amber-500/30' : 'bg-slate-900/40 border-slate-800')}`}>
                                   <div className="flex justify-between items-center mb-2">
    <div className="flex flex-col max-w-[60%]">
        <span className={`font-bold text-xs truncate ${isEnemy ? 'text-red-400' : 'text-slate-200'}`}>{char.name}</span>
        {isEnemy && <span className="text-[9px] text-slate-500 flex items-center gap-1"><Footprints size={8}/> {char.speed}</span>}
    </div>
    <div className="flex gap-1.5 items-center">
        {/* BOTÓN DE INICIATIVA NUEVO */}
        {canControl && (
            <button 
                onClick={() => rollSpecificInitiative(char)}
                className="text-[10px] bg-indigo-600 hover:bg-indigo-500 text-white p-1 rounded transition"
                title="Tirar Iniciativa"
            >
                <Dices size={12} />
            </button>
        )}
        
        {char.initiative > 0 && <span className="text-[10px] bg-orange-950/40 px-2 py-0.5 rounded border border-orange-500/50 text-orange-400 font-bold">⚔️ {char.initiative}</span>}
        <span className="text-[10px] bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-amber-500 font-bold">AC {char.armor_class}</span>
    </div>
</div>
                                    {showHP ? (
                                        <>
                                            <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden mb-1"><div className={`h-full transition-all ${char.hp_current/char.hp_max < 0.3 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{width: `${(char.hp_current/char.hp_max)*100}%`}} /></div>
                                            <div className="text-[9px] text-slate-500 text-right">{char.hp_current}/{char.hp_max} HP</div>
                                        </>
                                    ) : (
                                        <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden mb-2 opacity-50"><div className="h-full bg-slate-800 w-full animate-pulse"/></div>
                                    )}
                                    {canControl && <div className="grid grid-cols-4 gap-1 mt-2">
                                        {[-5,-1,1,5].map(v => <button key={v} onClick={() => updateHP(char.id, char.hp_current, char.hp_max, v)} className={`py-1 rounded text-[9px] font-bold ${v<0?'bg-red-900/30 text-red-400':'bg-emerald-900/30 text-emerald-400'}`}>{v>0?`+${v}`:v}</button>)}
                                    </div>}
                                    {isDM && isEnemy && <button onClick={async () => { if(confirm("¿Eliminar?")) await supabase.from("room_participants").delete().eq("id", p.id); }} className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full p-0.5"><X size={10}/></button>}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* B. MI FICHA */}
                {activeTab === 'sheet' && myCharacter && (
                    <div className="p-4 space-y-4 animate-in fade-in">
                        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex justify-between items-center">
                            <div><h2 className="text-lg font-bold text-amber-500">{myCharacter.name}</h2><p className="text-[10px] text-slate-500 font-bold uppercase">{myCharacter.class} Lvl {myCharacter.level}</p></div>
                            <div className="text-right"><div className="text-2xl font-mono text-emerald-500">{myCharacter.hp_current}</div><div className="text-[9px] text-slate-500 uppercase">HP ACTUAL</div></div>
                        </div>

                        <button onClick={rollInitiative} className="w-full bg-orange-600 hover:bg-orange-500 text-white py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all">
                          <Dices size={16} /> TIRAR INICIATIVA (DEX)
                        </button>

                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { n: 'STR', v: myCharacter.fuerza || myCharacter.strength },
                            { n: 'DEX', v: myCharacter.destreza || myCharacter.dexterity },
                            { n: 'CON', v: myCharacter.constitucion || myCharacter.constitution },
                            { n: 'INT', v: myCharacter.inteligencia || myCharacter.intelligence },
                            { n: 'WIS', v: myCharacter.sabiduria || myCharacter.wisdom },
                            { n: 'CHA', v: myCharacter.carisma || myCharacter.charisma }
                          ].map(s => (
                            <div key={s.n} className="bg-slate-900 border border-slate-800 p-2 rounded-lg text-center">
                              <p className="text-[9px] text-slate-500 font-bold">{s.n}</p>
                              <p className="text-lg font-mono font-bold text-slate-100">{s.v || 10}</p>
                              <p className="text-[10px] text-amber-500 font-bold">{getMod(s.v || 10) >= 0 ? `+${getMod(s.v || 10)}` : getMod(s.v || 10)}</p>
                            </div>
                          ))}
                        </div>

                        <div className="space-y-2 mt-4">
                            <div className="flex justify-between items-center mb-1">
                                <h4 className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2"><Briefcase size={12}/> Inventario</h4>
                                <button onClick={() => { setModalType('create'); setItemForm({...itemForm, targetUserId: myCharacter.id}); }} className="text-[10px] bg-amber-600 hover:bg-amber-500 text-white px-2 py-1 rounded flex items-center gap-1 font-bold"><Plus size={12}/> AGREGAR</button>
                            </div>
                            {items.filter(i => i.character_id === myCharacter.id).map(item => (
                                <div key={item.id} className="bg-slate-900/50 border border-slate-800 p-2 rounded flex justify-between items-center">
                                    <span className="text-xs text-slate-200">{item.name} {item.quantity > 1 && `x${item.quantity}`}</span>
                                    <div className="flex gap-1">
                                        <button onClick={() => { setSelectedItem(item); setModalType('transfer'); }} className="p-1.5 bg-slate-800 text-slate-400 rounded"><Send size={12}/></button>
                                        <button onClick={() => handleDeleteItem(item.id)} className="p-1.5 bg-slate-800 text-slate-400 rounded"><Trash2 size={12}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* C. DM TOOLS */}
                {activeTab === 'loot' && isDM && (
                    <div className="p-4 space-y-4 animate-in fade-in">
                        <div className="grid grid-cols-2 gap-2">
                             <button onClick={() => setModalType('create')} className="bg-purple-600/20 border border-purple-500/30 text-purple-400 py-3 rounded-xl text-xs font-bold flex flex-col items-center gap-1"><Gift size={16}/> CREAR ITEM</button>
                             <button onClick={() => setModalType('enemy')} className="bg-red-600/20 border border-red-500/30 text-red-400 py-3 rounded-xl text-xs font-bold flex flex-col items-center gap-1"><Skull size={16}/> INVOCAR ENEMIGO</button>
                        </div>
                        <button onClick={async () => {
                                if(!confirm("¿Resetear iniciativa de todos?")) return;
                                const ids = participants.map(p => p.characters.id);
                                await supabase.from("characters").update({ initiative: 0 }).in("id", ids);
                            }}
                            className="w-full bg-slate-800 text-slate-400 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-slate-700"
                        >
                            Limpiar Combate (Reset)
                        </button>
                    </div>
                )}

                {/* D. CHAT */}
                {activeTab === 'chat' && (
                    <div className="flex flex-col h-full animate-in fade-in">
                        <div className="p-3 grid grid-cols-6 gap-2 bg-slate-900 border-b border-slate-800">
                            {[4,6,8,10,12,20].map(d => <button key={d} onClick={() => rollDice(d)} className="bg-slate-800 hover:bg-amber-600 aspect-square rounded flex flex-col items-center justify-center text-[10px] font-bold text-slate-400 hover:text-white"><Dices size={12} className="opacity-40 mb-1"/>d{d}</button>)}
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {logs.map(log => (
                                <div key={log.id} className="text-[11px] font-mono"><span className="text-amber-500 font-bold">{log.user_name}</span> <span className="text-slate-500">➜</span> <span className="text-slate-200">{log.content}</span></div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </aside>
      </main>

      {/* FOOTER MÓVIL (Fixed) */}
      <footer className="h-16 border-t border-slate-800 bg-slate-900 flex md:hidden shrink-0 pb-safe fixed bottom-0 w-full z-50">
        <button onClick={() => setActiveTab("map")} className={`flex-1 flex flex-col items-center justify-center gap-1 ${activeTab === 'map' ? 'text-amber-500' : 'text-slate-500'}`}><MapIcon size={18} /><span className="text-[9px] font-bold uppercase">Mapa</span></button>
        <button onClick={() => setActiveTab("players")} className={`flex-1 flex flex-col items-center justify-center gap-1 ${activeTab === 'players' ? 'text-amber-500' : 'text-slate-500'}`}><Users size={18} /><span className="text-[9px] font-bold uppercase">Grupo</span></button>
        {isDM ? (
            <button onClick={() => setActiveTab("loot")} className={`flex-1 flex flex-col items-center justify-center gap-1 ${activeTab === 'loot' ? 'text-purple-500' : 'text-slate-500'}`}><Skull size={18} /><span className="text-[9px] font-bold uppercase">DM</span></button>
        ) : (
            <button onClick={() => setActiveTab("sheet")} className={`flex-1 flex flex-col items-center justify-center gap-1 ${activeTab === 'sheet' ? 'text-amber-500' : 'text-slate-500'}`}><User size={18} /><span className="text-[9px] font-bold uppercase">Yo</span></button>
        )}
        <button onClick={() => setActiveTab("chat")} className={`flex-1 flex flex-col items-center justify-center gap-1 ${activeTab === 'chat' ? 'text-amber-500' : 'text-slate-500'}`}><MessageSquare size={18} /><span className="text-[9px] font-bold uppercase">Chat</span></button>
      </footer>

      {/* MODALES */}
      {modalType && (
          <div className="absolute inset-0 z-[60] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
                  <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/30">
                      <h3 className="font-bold text-sm text-slate-200">
                          {modalType === 'enemy' && "Invocar Enemigo"}
                          {modalType === 'create' && "Nuevo Objeto"}
                          {modalType === 'transfer' && "Transferir Item"}
                      </h3>
                      <button onClick={() => setModalType(null)} className="text-slate-500 hover:text-white"><X size={20}/></button>
                  </div>
                  <div className="p-5 space-y-4">
                      {/* FORMULARIO ENEMIGO */}
                      {modalType === 'enemy' && (
                          <>
                              <input placeholder="Nombre (ej: Orco)" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-white" value={enemyForm.name} onChange={e => setEnemyForm({...enemyForm, name: e.target.value})} autoFocus />
                              <div className="grid grid-cols-2 gap-3">
                                  <div><label className="text-[9px] text-slate-500 font-bold uppercase mb-1 block">Vida</label><input type="number" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white" value={enemyForm.hp} onChange={e => setEnemyForm({...enemyForm, hp: parseInt(e.target.value) || 0})}/></div>
                                  <div><label className="text-[9px] text-slate-500 font-bold uppercase mb-1 block">AC</label><input type="number" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white" value={enemyForm.ac} onChange={e => setEnemyForm({...enemyForm, ac: parseInt(e.target.value) || 0})}/></div>
                                  <div><label className="text-[9px] text-slate-500 font-bold uppercase mb-1 block">Speed</label><input type="text" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white" value={enemyForm.speed} onChange={e => setEnemyForm({...enemyForm, speed: e.target.value})}/></div>
                                  <div><label className="text-[9px] text-slate-500 font-bold uppercase mb-1 block">DEX</label><input type="number" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white" value={enemyForm.dex} onChange={e => setEnemyForm({...enemyForm, dex: parseInt(e.target.value) || 0})}/></div>
                              </div>
                              <button onClick={handleCreateEnemy} className="w-full bg-red-600 hover:bg-red-500 text-white py-3 rounded-xl font-bold text-xs mt-2">INVOCAR</button>
                          </>
                      )}

                      {/* FORMULARIO CREAR ITEM */}
                      {modalType === 'create' && (
                          <>
                              <input placeholder="Nombre" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-white" value={itemForm.name} onChange={e => setItemForm({...itemForm, name: e.target.value})} autoFocus />
                              <textarea placeholder="Descripción" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-white h-20" value={itemForm.description} onChange={e => setItemForm({...itemForm, description: e.target.value})} />
                              
                              {isDM && (
                                <select className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-white"
                                    onChange={e => setItemForm({...itemForm, targetUserId: e.target.value})} value={itemForm.targetUserId || ""}>
                                    <option value="" disabled>-- Asignar a --</option>
                                    {participants.map(p => <option key={p.id} value={p.characters.id}>{p.characters.name}</option>)}
                                </select>
                              )}
                              
                              <button onClick={handleCreateItem} className="w-full bg-amber-600 hover:bg-amber-500 text-white py-3 rounded-xl font-bold text-xs mt-2">GUARDAR</button>
                          </>
                      )}

                      {/* FORMULARIO TRANSFERIR ITEM */}
                      {modalType === 'transfer' && (
                          <>
                              <p className="text-xs text-slate-400 mb-2">Dar <b>{selectedItem?.name}</b> a:</p>
                              <div className="grid grid-cols-2 gap-2">
                                  {participants.filter(p => p.characters.id !== myCharacter?.id).map(p => (
                                      <button key={p.id} onClick={() => setItemForm({...itemForm, targetUserId: p.characters.id})} 
                                          className={`p-2 rounded border text-xs font-bold ${itemForm.targetUserId === p.characters.id ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-950 border-slate-800 text-slate-400'}`}>
                                          {p.characters.name}
                                      </button>
                                  ))}
                              </div>
                              <button onClick={handleTransferItem} disabled={!itemForm.targetUserId} className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-3 rounded-xl font-bold text-xs mt-4">ENVIAR</button>
                          </>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}