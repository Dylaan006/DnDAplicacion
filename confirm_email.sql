-- SCRIPT PARA CONFIRMAR EMAIL MANUALMENTE
-- 1. Asegúrate de poner tu email real abajo.
-- 2. Ejecuta este script en el SQL EDITOR de Supabase.

UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email = 'pindy2006@gmail.com'; -- <--- REVISA SI ES TU EMAIL

-- Verificar si funcionó
SELECT id, email, email_confirmed_at 
FROM auth.users 
WHERE email = 'pindy2006@gmail.com';
