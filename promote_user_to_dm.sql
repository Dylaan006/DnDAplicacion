-- SCRIPT PARA HACERTE DM
-- 1. Regístrate primero en la aplicación con tu email.
-- 2. Cambia 'tu@email.com' por tu email real en la línea de abajo.
-- 3. Ejecuta este script.

UPDATE public.profiles
SET role = 'dm'
WHERE id = (
  SELECT id 
  FROM auth.users 
  WHERE email = 'tu@email.com' -- <--- POLLO: CAMBIA ESTO POR TU EMAIL
);

-- Verificación
SELECT * FROM public.profiles 
WHERE role = 'dm';
