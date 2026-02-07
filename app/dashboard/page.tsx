"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { PlusCircle, LogOut, Sword, Skull } from "lucide-react";
import { Character } from "@/types/supabase";
import { CLASSES } from "@/lib/constants";

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
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        // Cast to character, assuming DB matches our type definition
        setCharacters(data as unknown as Character[]);
      }
      setLoading(false);
    };

    fetchUserDataAndCharacters();
  }, [router, supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  const getClassIcon = (classId: string) => {
    const found = CLASSES.find(c => c.name.toLowerCase() === classId.toLowerCase() || c.id === classId.toLowerCase());
    return found ? found.icon : "⚔️";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="animate-pulse text-amber-500 font-bold">Invocando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 font-sans selection:bg-amber-500/30">
      {/* Header del Dashboard */}
      <header className="max-w-6xl mx-auto flex justify-between items-center mb-12 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight flex items-center gap-3 text-white">
            <Sword className="text-amber-500" size={36} />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-200 to-amber-600">
              Mis Aventuras
            </span>
          </h1>
          <p className="text-slate-500 mt-2 font-medium">Jugador: <span className="text-slate-300">{user?.email}</span></p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-slate-500 hover:text-red-400 transition bg-slate-900 px-4 py-2 rounded-lg border border-slate-800 hover:border-red-900"
        >
          <LogOut size={18} /> Salir
        </button>
      </header>

      <main className="max-w-6xl mx-auto">
        {characters.length === 0 ? (
          /* Estado Vacío */
          <div className="text-center py-24 border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/50">
            <div className="bg-slate-800 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
              <Skull className="h-12 w-12 text-slate-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2 text-white">Tu leyenda comienza aquí</h2>
            <p className="text-slate-500 mb-8 max-w-md mx-auto">No tienes personajes registrados. Crea el primero y prepárate para la aventura.</p>
            <button
              onClick={() => router.push("/character/create")}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 px-8 py-4 rounded-xl font-bold text-white shadow-lg shadow-amber-900/20 transition transform hover:-translate-y-1"
            >
              <PlusCircle size={24} /> Crear Nuevo Personaje
            </button>
          </div>
        ) : (
          /* Lista de Personajes */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

            {/* Tarjeta de Crear Nuevo (Primero en la lista visualmente es útil) */}
            <button
              onClick={() => router.push("/character/create")}
              className="group bg-slate-900/40 border-2 border-dashed border-slate-800 hover:border-amber-500/50 p-6 rounded-2xl flex flex-col items-center justify-center text-slate-500 hover:text-amber-500 transition min-h-[220px]"
            >
              <div className="w-16 h-16 rounded-full bg-slate-800 group-hover:bg-amber-500/10 flex items-center justify-center mb-4 transition-colors">
                <PlusCircle size={32} />
              </div>
              <span className="font-bold text-lg">Nuevo Héroe</span>
            </button>

            {characters.map((char) => (
              <div
                key={char.id}
                onClick={() => router.push(`/character/${char.id}`)}
                className="group relative bg-slate-900 border border-slate-800 hover:border-amber-500/50 p-6 rounded-2xl cursor-pointer transition-all hover:shadow-2xl hover:shadow-amber-900/10 overflow-hidden"
              >
                {/* Background Decorativo */}
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity text-9xl select-none pointer-events-none font-serif">
                  {getClassIcon(char.class)}
                </div>

                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center text-2xl shadow-inner">
                      {getClassIcon(char.class)}
                    </div>
                    <span className="bg-slate-800 text-slate-300 text-xs font-bold px-2 py-1 rounded border border-slate-700">Nivel {char.level}</span>
                  </div>

                  <h3 className="text-2xl font-bold text-white group-hover:text-amber-500 transition truncate">{char.name}</h3>
                  <p className="text-slate-400 text-sm mb-6 flex items-center gap-2">
                    {char.race} <span className="w-1 h-1 bg-slate-600 rounded-full"></span> {char.class}
                  </p>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-500 font-bold uppercase tracking-wider">
                      <span>HP</span>
                      <span>{char.hp_current} / {char.hp_max}</span>
                    </div>
                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className={`h-full transition-all duration-500 ${char.hp_current < char.hp_max / 3 ? 'bg-red-500' : 'bg-emerald-500'}`}
                        style={{ width: `${Math.min((char.hp_current / char.hp_max) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}