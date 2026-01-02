"use client";

import { Sword } from "lucide-react";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-slate-950 text-white text-center">
      <div className="mb-8 p-8 rounded-full bg-slate-900 border border-slate-800 shadow-2xl shadow-amber-900/20 animate-pulse">
        <Sword size={80} className="text-amber-500" />
      </div>
      
      <h1 className="text-6xl font-extrabold mb-4 tracking-tight">
        D&D <span className="text-amber-500">Companion</span>
      </h1>
      
      <p className="text-slate-500 text-sm font-mono mt-4">
        GESTIÓN DE MESA v1.0
      </p>
    </main>
  );
}