"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { ChevronLeft, Save } from "lucide-react";

export default function CreateCharacterPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  // Estado del formulario
  const [formData, setFormData] = useState({
    name: "",
    race: "",
    class: "",
    level: 1,
    hp_max: 10,
    str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === "name" || name === "race" || name === "class" ? value : Number(value)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // 1. Obtener ID del usuario
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      alert("Debes iniciar sesión");
      router.push("/auth/login");
      return;
    }

    // 2. Insertar en Supabase
    const { error } = await supabase.from("characters").insert({
      user_id: user.id,
      name: formData.name,
      race: formData.race,
      class: formData.class,
      level: formData.level,
      hp_current: formData.hp_max, // Empieza con la vida al tope
      hp_max: formData.hp_max,
      stats: {
        str: formData.str, dex: formData.dex, con: formData.con, 
        int: formData.int, wis: formData.wis, cha: formData.cha
      }
    });

    if (error) {
      alert("Error: " + error.message);
    } else {
      router.push("/dashboard");
    }
    setLoading(false);
  };

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <button 
        onClick={() => router.back()} 
        className="flex items-center text-slate-400 hover:text-white mb-6"
      >
        <ChevronLeft size={20} /> Volver
      </button>

      <h1 className="text-3xl font-bold mb-8 text-amber-500">Crear Nuevo Héroe</h1>

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* Sección 1: Datos Básicos */}
        <section className="bg-slate-900 p-6 rounded-xl border border-slate-800">
          <h2 className="text-xl font-semibold mb-4 border-b border-slate-800 pb-2">Identidad</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Nombre</label>
              <input name="name" onChange={handleChange} className="w-full bg-slate-950 border border-slate-700 p-2 rounded focus:border-amber-500 outline-none" required />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Raza</label>
              <input name="race" onChange={handleChange} className="w-full bg-slate-950 border border-slate-700 p-2 rounded focus:border-amber-500 outline-none" required />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Clase</label>
              <input name="class" onChange={handleChange} className="w-full bg-slate-950 border border-slate-700 p-2 rounded focus:border-amber-500 outline-none" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Nivel</label>
                <input type="number" name="level" value={formData.level} onChange={handleChange} className="w-full bg-slate-950 border border-slate-700 p-2 rounded text-center" min="1" max="20" />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">HP Máximo</label>
                <input type="number" name="hp_max" value={formData.hp_max} onChange={handleChange} className="w-full bg-slate-950 border border-slate-700 p-2 rounded text-center" min="1" />
              </div>
            </div>
          </div>
        </section>

        {/* Sección 2: Atributos */}
        <section className="bg-slate-900 p-6 rounded-xl border border-slate-800">
          <h2 className="text-xl font-semibold mb-4 border-b border-slate-800 pb-2">Atributos</h2>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {['str', 'dex', 'con', 'int', 'wis', 'cha'].map((stat) => (
              <div key={stat} className="text-center">
                <label className="block text-xs uppercase font-bold text-slate-500 mb-1">{stat}</label>
                <input 
                  type="number" 
                  name={stat} 
                  //@ts-ignore
                  value={formData[stat]} 
                  onChange={handleChange}
                  className="w-full bg-slate-950 border border-slate-700 p-3 rounded text-center font-bold text-lg focus:border-amber-500 outline-none"
                />
              </div>
            ))}
          </div>
        </section>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 transition disabled:opacity-50"
        >
          <Save size={24} />
          {loading ? "Forjando destino..." : "Guardar Personaje"}
        </button>

      </form>
    </div>
  );
}