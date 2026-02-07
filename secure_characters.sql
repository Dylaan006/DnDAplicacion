-- SECURE CHARACTERS TABLE
-- Previamente desactivamos RLS para debuggear. Ahora vamos a activarlo pero permitiendo edits.
-- Permitir que CADA USUARIO edite SU PROPIO personaje.
-- Permitir que el DM edite los personajes DE SU CAMPAÑA (esto requiere logica compleja o policies mas laxas).
-- Simplificación: Permitir UPDATE si eres el dueño O si (logica de DM... que es compleja en RLS puro sin funciones).

-- 1. Reactivar RLS en Characters
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;

-- 2. Policy: Ver todo (ya estaba)
CREATE POLICY "Public view characters" ON public.characters FOR SELECT USING (true);

-- 3. Policy: Update propio (Owners)
CREATE POLICY "Owners can update their chars" ON public.characters FOR UPDATE USING (
  auth.uid() = user_id
);

-- 4. Policy: DM Update (Truco: Permitir si existe una participacion de campaña donde el usuario sea DM y el char esté en ella)
--    Esto es pesado para la DB.
--    Alternativa temporal: Dejar RLS desactivado en characters SI confías en tu frontend. 
--    Pero como pediste seguridad, activamos SOLO para owners por ahora. 
--    NOTA: Si activamos esto, EL DM NO PODRÁ EDITAR VIDA DE JUGADORES (solo la suya).
--    Si quieres que el DM pueda, avísame y hago la función compleja.
