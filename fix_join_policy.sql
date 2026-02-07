-- FIX JOIN ISSUE: ALLOW FINDING CAMPAIGNS
-- El problema era que "no puedes unirte a lo que no puedes ver".
-- Para unirte, primero debes buscar la campaña por su código, y la política anterior lo impedía.

-- 1. Eliminar política restrictiva anterior
DROP POLICY IF EXISTS "View campaigns if member or DM" ON public.campaigns;

-- 2. Opción A: Permitir ver TODAS las campañas (más simple y evita errores)
CREATE POLICY "Enable read access for all users" ON public.campaigns FOR SELECT USING (true);

-- (Nota: Si quisieras más privacidad, se podría hacer una función RPC "join_campaign", pero esto es lo más rápido).

-- APLICAR FIX
