-- FIX PARTICIPANTS VISIBILITY
-- El problema persiste: "0 participantes".
-- Razón: La tabla `campaign_participants` tiene politicas muy estrictas.

-- 1. Eliminar política vieja
DROP POLICY IF EXISTS "View participants" ON public.campaign_participants;
DROP POLICY IF EXISTS "View participants if member" ON public.campaign_participants;

-- 2. Permitir a cualquiera ver quién está en qué campaña
-- (Esto es necesario para que el frontend pueda listar a los jugadores)
CREATE POLICY "Public read participants" ON public.campaign_participants FOR SELECT USING (true);

-- 3. (Opcional) Asegurar permisos de Character también
DROP POLICY IF EXISTS "Users can see all characters" ON public.characters;
CREATE POLICY "Users can see all characters" ON public.characters FOR SELECT USING (true);
