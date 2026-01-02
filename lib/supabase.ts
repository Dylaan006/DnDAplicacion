import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // Creamos el cliente de Supabase para el navegador (Client Side)
  // El signo "!" al final le dice a TypeScript que estamos seguros de que 
  // esas variables existen en el archivo .env.local
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}