-- FIX JOIN RELATIONSHIP for PostgREST
-- Para poder hacer .select('*, profiles(role)') necesitamos que campaign_participants tenga una FK a profiles.
-- Actualmente apunta a auth.users. Vamos a cambiarlo (o añadir una FK secundaria si fuera necesario, pero cambiarlo es mas limpio ya que profiles es 1:1 con auth.users).

ALTER TABLE public.campaign_participants
  DROP CONSTRAINT IF EXISTS campaign_participants_user_id_fkey;

ALTER TABLE public.campaign_participants
  ADD CONSTRAINT campaign_participants_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.profiles(id)
  ON DELETE CASCADE;

-- Esto permite a Supabase "ver" la relación y permitir el join.
