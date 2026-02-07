-- FIX INFINITE RECURSION IN RLS POLICIES
-- Ejecuta este script para arreglar el error de recursión infinita.

-- 1. Eliminar políticas problemáticas anteriores
DROP POLICY IF EXISTS "View campaigns if member or DM" ON public.campaigns;
DROP POLICY IF EXISTS "View participants if member" ON public.campaign_participants;
DROP POLICY IF EXISTS "Kick or Leave" ON public.campaign_participants;

-- 2. Crear función segura para verificar membresía (bypassea RLS para evitar bucle)
CREATE OR REPLACE FUNCTION public.is_member_of_campaign(_campaign_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.campaign_participants 
    WHERE campaign_id = _campaign_id 
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Re-crear políticas usando la función segura

-- CAMPAIGNS: Ver si soy DM o si soy miembro (usando la función)
CREATE POLICY "View campaigns if member or DM" ON public.campaigns FOR SELECT USING (
  dm_id = auth.uid() OR
  public.is_member_of_campaign(id)
);

-- PARTICIPANTS: Ver si soy el usuario de la fila, o si soy DM, o si soy compañero de campaña
CREATE POLICY "View participants" ON public.campaign_participants FOR SELECT USING (
  user_id = auth.uid() OR -- Veo mi propia fila
  exists (select 1 from public.campaigns c where c.id = campaign_participants.campaign_id and c.dm_id = auth.uid()) OR -- El DM ve todo
  public.is_member_of_campaign(campaign_id) -- Veo si soy miembro de esa campaña
);

-- DELETE (Kick/Leave)
CREATE POLICY "Kick or Leave" ON public.campaign_participants FOR DELETE USING (
  user_id = auth.uid() OR -- Salir
  exists (select 1 from public.campaigns c where c.id = campaign_participants.campaign_id and c.dm_id = auth.uid()) -- Kick del DM
);

-- INSERT (Unirse) - Ya estaba bien, pero la repasamos por si acaso
DROP POLICY IF EXISTS "Anyone can join" ON public.campaign_participants;
CREATE POLICY "Anyone can join" ON public.campaign_participants FOR INSERT WITH CHECK (
  auth.uid() = user_id
);

-- ¡FIX APLICADO! Intenta crear de nuevo.
