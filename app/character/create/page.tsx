"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { ChevronLeft, Save, ArrowRight, Dices, Brain, Info, Shield, CheckCircle } from "lucide-react";
import { Character, CharacterStats } from "@/types/supabase";
import { CLASSES, RACES } from "@/lib/constants";

export default function CreateCharacterPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Estado del formulario
  const [formData, setFormData] = useState({
    name: "",
    race: "",
    class: "",
    level: 1,
    hp_max: 10,
    str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10
  });

  const updateForm = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  // --- LOGICA DE ATRIBUTOS ---
  const getMod = (curr: number) => Math.floor((curr - 10) / 2);

  const handleStatChange = (stat: string, val: number) => {
    // Limit 1-20
    const safeVal = Math.min(Math.max(val, 1), 20);
    updateForm(stat, safeVal);
  };

  const calculateAC = () => {
    // Basic unarmored defense
    if (formData.class.toLowerCase() === 'barbarian')
      return 10 + getMod(formData.dex) + getMod(formData.con);
    if (formData.class.toLowerCase() === 'monk')
      return 10 + getMod(formData.dex) + getMod(formData.wis);
    return 10 + getMod(formData.dex);
  };

  const handleSubmit = async () => {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return router.push("/auth/login");
    }

    const newCharacterPayload = {
      user_id: user.id,
      name: formData.name,
      race: formData.race,
      class: formData.class,
      level: formData.level,
      hp_current: formData.hp_max,
      hp_max: formData.hp_max,
      armor_class: calculateAC(),
      speed: "30 ft",
      initiative: getMod(formData.dex),
      is_enemy: false,
      stats: {
        str: formData.str, dex: formData.dex, con: formData.con,
        int: formData.int, wis: formData.wis, cha: formData.cha
      } as CharacterStats,
      abilities: []
    };

    const { error } = await supabase.from("characters").insert(newCharacterPayload as any);

    if (error) {
      alert("Error: " + error.message);
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  };

  // --- RENDERIZADO DE PASOS ---

  const renderStep1_Identity = () => (
    <div className="space-y-8 animate-in slide-in-from-right fade-in duration-300">
      <div className="space-y-3">
        <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Nombre del Héroe</label>
        <input
          autoFocus
          placeholder="Ej: Valerius el Audaz..."
          className="w-full bg-slate-900 border border-slate-700 p-5 rounded-2xl text-2xl font-black text-white focus:border-amber-500 outline-none transition placeholder:text-slate-700"
          value={formData.name}
          onChange={e => updateForm("name", e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* CLASES */}
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Clase</label>
          <div className="grid grid-cols-2 gap-3 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
            {CLASSES.map(c => (
              <div
                key={c.id}
                onClick={() => {
                  updateForm("class", c.name);
                  updateForm("hp_max", c.hitDie + 2); // Simule +2 CON
                }}
                className={`p-4 rounded-xl border cursor-pointer flex flex-col items-center gap-2 transition-all group ${formData.class === c.name ? 'bg-amber-500/10 border-amber-500 ring-1 ring-amber-500' : 'bg-slate-900 border-slate-800 hover:border-slate-600'}`}
              >
                <span className="text-3xl group-hover:scale-110 transition-transform duration-300">{c.icon}</span>
                <span className={`text-sm font-bold ${formData.class === c.name ? 'text-amber-500' : 'text-slate-400 group-hover:text-slate-200'}`}>{c.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* RAZAS */}
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Raza</label>
          <div className="grid grid-cols-2 gap-3 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
            {RACES.map(r => (
              <div
                key={r.id}
                onClick={() => updateForm("race", r.name)}
                className={`p-4 rounded-xl border cursor-pointer border-slate-800 hover:border-slate-600 transition flex items-center justify-center text-center ${formData.race === r.name ? 'bg-amber-500/10 border-amber-500 text-amber-500 font-bold' : 'bg-slate-900 text-slate-400 hover:text-slate-200'}`}
              >
                <span className="text-sm font-medium">{r.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
        <div className="flex-1">
          <label className="text-xs font-bold uppercase text-slate-500 block mb-2">Nivel Inicial</label>
          <input type="number" min="1" max="20" className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-center font-bold text-xl text-white focus:border-amber-500 outline-none" value={formData.level} onChange={e => updateForm("level", Number(e.target.value))} />
        </div>
        <div className="flex-1">
          <label className="text-xs font-bold uppercase text-slate-500 block mb-2">HP Máximo</label>
          <input type="number" min="1" className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-center font-bold text-xl text-emerald-500 focus:border-emerald-500 outline-none" value={formData.hp_max} onChange={e => updateForm("hp_max", Number(e.target.value))} />
        </div>
      </div>
    </div>
  );

  const renderStep2_Stats = () => (
    <div className="animate-in slide-in-from-right fade-in duration-300">
      <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 mb-8 flex items-start gap-4">
        <div className="bg-amber-500/20 p-3 rounded-xl">
          <Brain className="text-amber-500 shrink-0" size={24} />
        </div>
        <div>
          <h3 className="font-bold text-slate-200 text-lg">Define tus Capacidades</h3>
          <p className="text-sm text-slate-400 mt-1">Ajusta tus puntuaciones. Los modificadores (MOD) afectarán a tus tiradas de dados.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
        {['str', 'dex', 'con', 'int', 'wis', 'cha'].map(stat => (
          <div key={stat} className="bg-slate-900 p-5 rounded-2xl border border-slate-800 text-center relative overflow-hidden group hover:border-slate-600 hover:shadow-xl transition-all">
            <label className="text-xs font-black uppercase text-slate-500 block mb-4 tracking-widest">{stat}</label>
            <div className="flex items-center justify-center gap-4 mb-4">
              <button onClick={() => handleStatChange(stat, (formData as any)[stat] - 1)} className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-bold transition flex items-center justify-center">-</button>
              <span className="text-3xl font-black text-white w-10">{(formData as any)[stat]}</span>
              <button onClick={() => handleStatChange(stat, (formData as any)[stat] + 1)} className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-bold transition flex items-center justify-center">+</button>
            </div>
            <div>
              <span className={`text-sm font-bold px-3 py-1 rounded-full ${getMod((formData as any)[stat]) >= 0 ? 'bg-emerald-900/30 text-emerald-400' : 'bg-red-900/30 text-red-400'}`}>
                {getMod((formData as any)[stat]) >= 0 ? '+' : ''}{getMod((formData as any)[stat])} MOD
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderStep3_Review = () => (
    <div className="animate-in slide-in-from-right fade-in duration-300 space-y-8 text-center max-w-lg mx-auto">
      <div className="relative inline-block mx-auto mb-4">
        <div className="w-32 h-32 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center shadow-2xl shadow-amber-900/50 text-5xl relative z-10 border-4 border-slate-950">
          {CLASSES.find(c => c.name === formData.class)?.icon || "✨"}
        </div>
        <div className="absolute inset-0 bg-amber-500 blur-2xl opacity-20 -z-10 rounded-full animate-pulse"></div>
      </div>

      <div>
        <h2 className="text-4xl font-black text-white mb-2">{formData.name}</h2>
        <div className="flex items-center justify-center gap-3 text-lg text-slate-300 bg-slate-900/50 py-2 px-6 rounded-full inline-flex border border-slate-800">
          <span className="font-semibold">{formData.race}</span>
          <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
          <span className="font-semibold">{formData.class}</span>
          <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
          <span className="text-amber-500 font-bold">Nivel {formData.level}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-0 bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="text-center p-6 border-r border-slate-800 hover:bg-slate-800/50 transition">
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">VIDA</div>
          <div className="text-2xl font-black text-emerald-500">{formData.hp_max}</div>
        </div>
        <div className="text-center p-6 border-r border-slate-800 hover:bg-slate-800/50 transition">
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">CLASE ARM.</div>
          <div className="text-2xl font-black text-slate-200">{calculateAC()}</div>
        </div>
        <div className="text-center p-6 hover:bg-slate-800/50 transition">
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">INICIATIVA</div>
          <div className="text-2xl font-black text-amber-500">+{getMod(formData.dex)}</div>
        </div>
      </div>

      <div className="bg-amber-900/10 border border-amber-900/30 p-4 rounded-xl flex items-center gap-3 text-left">
        <CheckCircle className="text-amber-500 shrink-0" />
        <p className="text-sm text-amber-200/80">
          Tu personaje está listo. Al hacer clic en "Forjar", se guardará en tu cuenta y podrás acceder a su hoja completa.
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col selection:bg-amber-500/30">
      {/* HEADER */}
      <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <button onClick={() => router.back()} className="text-slate-500 hover:text-white flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition group">
          <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Cancelar
        </button>

        <div className="flex items-center gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${step >= i ? 'w-8 bg-amber-500' : 'w-2 bg-slate-800'}`} />
          ))}
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex-1 p-6 md:p-12 max-w-4xl mx-auto w-full flex flex-col">
        <div className="mb-10 text-center">
          <h1 className="text-3xl md:text-5xl font-black mb-3 text-transparent bg-clip-text bg-gradient-to-br from-white via-slate-200 to-slate-500">
            {step === 1 && "Identidad del Héroe"}
            {step === 2 && "Atributos y Habilidades"}
            {step === 3 && "Confirmación Final"}
          </h1>
          <p className="text-slate-500 text-lg">
            {step === 1 && "Todo gran viaje comienza con un nombre."}
            {step === 2 && "Define tus fortalezas y debilidades."}
            {step === 3 && "Tu leyenda está a punto de comenzar."}
          </p>
        </div>

        <div className="flex-1">
          {step === 1 && renderStep1_Identity()}
          {step === 2 && renderStep2_Stats()}
          {step === 3 && renderStep3_Review()}
        </div>

        {/* FOOTER NAV */}
        <div className="mt-12 flex justify-between items-center border-t border-slate-800 pt-8">
          {step > 1 ? (
            <button onClick={() => setStep(s => s - 1 as any)} className="px-6 py-3 rounded-xl font-bold text-slate-400 hover:bg-slate-900 transition flex items-center gap-2">
              <ChevronLeft size={18} /> Anterior
            </button>
          ) : <div />}

          {step < 3 ? (
            <button
              disabled={!formData.name || !formData.class || !formData.race}
              onClick={() => setStep(s => s + 1 as any)}
              className="px-8 py-4 bg-slate-100 hover:bg-white text-slate-900 rounded-xl font-black flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition hover:shadow-xl hover:shadow-white/10"
            >
              Siguiente Paso <ArrowRight size={20} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-10 py-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-xl font-black flex items-center gap-2 shadow-xl shadow-amber-900/30 transition transform hover:-translate-y-1 hover:shadow-2xl disabled:opacity-50 disabled:transform-none"
            >
              {loading ? "Creando..." : "Forjar Personaje"} <Save size={20} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}