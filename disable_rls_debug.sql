-- DEBUG: DESACTIVAR RLS TEMPORALMENTE (PARA PROBAR)
-- Si después de esto ves los participantes, era 100% un problema de permisos.

ALTER TABLE public.campaigns DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.characters DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Además, insertamos manualmente al DM como participante (por si acaso)
-- (Cambia 'CAMPAIGN_ID_AQUI' por el ID de tu campaña si lo sabes, o déjalo y prueba solo con el disable RLS)
