-- ENABLE REALTIME
-- Para que el servidor mande actualizaciones, las tablas deben estar en la "publicación" de realtime.

-- 1. Añadir tablas a la publicación de Supabase
alter publication supabase_realtime add table public.characters;
alter publication supabase_realtime add table public.campaign_participants;
alter publication supabase_realtime add table public.campaigns;

-- 2. Asegurarnos de que REPLICA IDENTITY esté activada para recibir updates
-- (Normalmente es DEFAULT, pero FULL asegura que recibamos todo)
ALTER TABLE public.characters REPLICA IDENTITY FULL;
