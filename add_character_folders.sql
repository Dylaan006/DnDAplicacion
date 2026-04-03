-- 1. Añadir columna folder a la tabla characters
ALTER TABLE public.characters ADD COLUMN folder text default 'General';

-- 2. Asegurarnos que Realtime esté activo para la tabla characters (ya debería estarlo, pero por si acaso)
-- alter publication supabase_realtime add table public.characters;
