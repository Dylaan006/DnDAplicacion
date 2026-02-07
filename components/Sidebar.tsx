"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Sword, Shield, Users, LogOut, Home, Award } from "lucide-react";
import { supabase } from "@/lib/supabase/client"
import { useRouter } from "next/navigation";

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isDM, setIsDM] = useState(false);
  const pathname = usePathname();
  const router = useRouter();


  useEffect(() => {
    const checkRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await (supabase.from('profiles').select('role').eq('id', user.id).single() as any);
        if (data && (data.role === 'dm' || data.role === 'admin')) {
          setIsDM(true);
        }
      }
    };
    checkRole();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/auth/login");
    setIsOpen(false);
  };



  // Si estamos en login o registro, NO mostramos el sidebar
  if (pathname.startsWith("/auth")) {
    return null;
  }

  const navItems = [
    { name: "Mis Personajes", href: "/dashboard", icon: Home },
    {
      name: isDM ? "Crear Campaña" : "Unirse a Campaña",
      href: "/campaigns",
      icon: Users
    },
    { name: "Crear Héroe", href: "/character/create", icon: Sword },
  ];

  if (isDM) {
    navItems.push({ name: "Insignias", href: "/dm", icon: Award });
  }

  return (
    <>
      {/* Botón Flotante para abrir menú (Solo móvil/tablet) */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 left-4 z-40 p-2 bg-slate-800 text-amber-500 rounded-lg shadow-lg hover:bg-slate-700 transition md:hidden"
      >
        <Menu size={24} />
      </button>

      {/* Overlay Oscuro (Fondo negro al abrir) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* El Sidebar en sí */}
      <aside className={`
          fixed top-0 left-0 h-full w-64 bg-slate-900 border-r border-slate-800 z-50 transform transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0 md:sticky md:top-0 md:h-screen
        `}>
        <div className="flex flex-col h-full p-6">
          {/* Cabecera */}
          <div className="flex items-center justify-between mb-10">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Shield className="text-amber-500 fill-amber-500" size={24} />
              D&D App
            </h1>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white md:hidden"
            >
              <X size={24} />
            </button>
          </div>

          {/* Enlaces de Navegación */}
          <nav className="flex-1 space-y-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                    ? "bg-amber-600/20 text-amber-500 border border-amber-600/30"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                    }`}
                >
                  <item.icon size={20} />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Footer / Logout */}
          <div className="pt-6 border-t border-slate-800">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 w-full text-slate-400 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition"
            >
              <LogOut size={20} />
              <span className="font-medium">Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </aside >
    </>
  );
}