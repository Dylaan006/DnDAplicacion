"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { PlusCircle, User, LogOut, Sword } from "lucide-react";

// Definimos qué datos tiene un personaje para que TS no se queje
interface Character {
  id: string;
  name: string;
  class: string;
  level: number;
  hp_current: number;
  hp_max: number;
}

export default function DashboardPage() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetchUserDataAndCharacters = async () => {
      // 1. Obtener el usuario actual
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/auth/login");
        return;
      }
      setUser(user);

      // 2. Obtener sus personajes
      const { data, error } = await supabase
        .from("characters")
        .select("*")
        .eq("user_id", user.id);

      if (!error && data) {
        setCharacters(data);
      }
      setLoading(false);
    };

    fetchUserDataAndCharacters();
  }, [router, supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <p className="animate-pulse">Cargando tus aventuras...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      {/* Header del Dashboard */}
      <header className="max-w-5xl mx-auto flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sword className="text-amber-500" /> Mis Personajes
          </h1>
          <p className="text-slate-400">Bienvenido, {user?.email}</p>
        </div>
        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 text-slate-400 hover:text-red-400 transition"
        >
          <LogOut size={20} /> Salir
        </button>
      </header>

      <main className="max-w-5xl mx-auto">
        {characters.length === 0 ? (
          /* Estado Vacío */
          <div className="text-center py-20 border-2 border-dashed border-slate-800 rounded-2xl">
            <User className="mx-auto h-16 w-16 text-slate-700 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Aún no tienes personajes</h2>
            <p className="text-slate-500 mb-8">Crea tu primer héroe para empezar a jugar.</p>
            <button
              onClick={() => router.push("/character/create")}
              className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-500 px-6 py-3 rounded-lg font-bold transition"
            >
              <PlusCircle size={20} /> Crear Personaje
            </button>
          </div>
        ) : (
          /* Lista de Personajes */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {characters.map((char) => (
              <div 
                key={char.id} 
                onClick={() => router.push(`/character/${char.id}`)}
                className="bg-slate-900 border border-slate-800 p-5 rounded-xl hover:border-amber-500 cursor-pointer transition group"
              >
                <h3 className="text-xl font-bold group-hover:text-amber-500">{char.name}</h3>
                <p className="text-slate-400 text-sm mb-4">{char.class} - Nivel {char.level}</p>
                
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-red-500 h-full" 
                    style={{ width: `${(char.hp_current / char.hp_max) * 100}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs mt-2 text-slate-500 font-mono">
                  <span>HP</span>
                  <span>{char.hp_current} / {char.hp_max}</span>
                </div>
              </div>
            ))}
            
            {/* Botón para añadir uno más */}
            <button
              onClick={() => router.push("/character/create")}
              className="bg-slate-950 border-2 border-dashed border-slate-800 p-5 rounded-xl flex flex-col items-center justify-center text-slate-500 hover:border-slate-600 hover:text-slate-300 transition"
            >
              <PlusCircle size={32} className="mb-2" />
              <span className="font-medium">Nuevo Héroe</span>
            </button>
          </div>
        )}
      </main>
    </div>
  );
}