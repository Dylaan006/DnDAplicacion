import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar"; // Importamos tu nuevo componente

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "D&D Companion",
  description: "Gestor de partidas presenciales",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${inter.className} bg-slate-950 text-white flex`}>
        {/* Aquí insertamos el Sidebar. 
            Como el Sidebar tiene lógica para ocultarse en /auth, no estorbará en el login. 
            El 'flex' en el body hace que se pongan uno al lado del otro en Desktop.
        */}
        <Sidebar />
        
        {/* Este div envuelve el contenido principal de tus páginas */}
        <div className="flex-1 min-h-screen relative w-full">
          {children}
        </div>
      </body>
    </html>
  );
}