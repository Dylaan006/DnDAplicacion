"use client"; // Indica que este componente usa interactividad del lado del cliente

import { useState } from "react";
import { createClient } from "@/lib/supabase/client"; // Asegúrate de que la ruta coincida
import { useRouter } from "next/navigation";
import { Sword } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert("Error al iniciar sesión: " + error.message);
    } else {
      router.push("/dashboard");
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-white p-6">
      <div className="w-full max-w-md space-y-8 bg-slate-900 p-8 rounded-xl border border-slate-800 shadow-2xl">
        <div className="flex flex-col items-center">
          <Sword className="h-12 w-12 text-amber-500 mb-2" />
          <h2 className="text-3xl font-bold">D&D Companion</h2>
          <p className="text-slate-400 mt-2">Inicia sesión para entrar a la mesa</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 rounded bg-slate-800 border border-slate-700 focus:border-amber-500 outline-none transition"
              placeholder="tu@email.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 rounded bg-slate-800 border border-slate-700 focus:border-amber-500 outline-none transition"
              placeholder="••••••••"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-500 rounded font-bold transition disabled:opacity-50"
          >
            {loading ? "Cargando..." : "Entrar a la aventura"}
          </button>
        </form>

        <p className="text-center text-sm text-slate-400">
          ¿No tienes cuenta?{" "}
          <a href="/auth/register" className="text-amber-500 hover:underline">
            Regístrate aquí
          </a>
        </p>
      </div>
    </div>
  );
}