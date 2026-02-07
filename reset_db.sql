-- SCRIPT PARA REINICIAR CONTENIDO DE LA BASE DE DATOS
-- Ejecuta esto en el Editor SQL de Supabase para borrar todos los datos creados.

-- 1. Borrar datos de tablas dependientes primero (por las Foreign Keys)
TRUNCATE TABLE IF EXISTS public.character_badges CASCADE;
TRUNCATE TABLE IF EXISTS public.items CASCADE;
TRUNCATE TABLE IF EXISTS public.characters CASCADE;

-- 2. Borrar datos de insignias y perfiles
TRUNCATE TABLE IF EXISTS public.badges CASCADE;
TRUNCATE TABLE IF EXISTS public.profiles CASCADE;

-- Opcional: Borrar tablas legacy de salas si existen
-- TRUNCATE TABLE public.room_participants CASCADE;
-- TRUNCATE TABLE public.rooms CASCADE;

-- 3. Borrar usuarios de autenticación (CUIDADO: ESTO BORRA TODOS LOS LOGINS)
DELETE FROM auth.users;

-- ¡Listo! La base de datos está completamente vacía (como nueva).
