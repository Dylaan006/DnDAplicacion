-- ==========================================
-- SUPER RESET SCRIPT (BORRÓN Y CUENTA NUEVA)
-- ==========================================
-- Este script destruye TODO y lo vuelve a crear desde cero.
-- Ejecútalo en el Editor SQL de Supabase.

-- 1. LIMPIEZA TOTAL (Orden inverso a la creación para respetar FKs)
DROP TABLE IF EXISTS public.character_badges CASCADE;
DROP TABLE IF EXISTS public.items CASCADE;
DROP TABLE IF EXISTS public.characters CASCADE;
DROP TABLE IF EXISTS public.badges CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 2. BORRAR TODOS LOS USUARIOS (Esto fuerza a registrarse de nuevo)
DELETE FROM auth.users;

-- ==========================================
-- RE-CREACIÓN DE LA BASE DE DATOS
-- ==========================================

-- 3. Tabla: PROFILES (Roles de usuario)
CREATE TABLE public.profiles (
  id uuid references auth.users not null primary key,
  role text default 'player' check (role in ('player', 'dm', 'admin')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 4. Tabla: CHARACTERS (Personajes)
CREATE TABLE public.characters (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  class text not null,
  race text not null,
  level int default 1,
  hp_current int default 10,
  hp_max int default 10,
  armor_class int default 10,
  speed text default '30 ft',
  initiative int default 0,
  stats jsonb default '{}'::jsonb,      -- Guardamos STR, DEX, etc. como JSON
  abilities jsonb default '[]'::jsonb,  -- Array de habilidades
  is_enemy boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see all characters" ON public.characters FOR SELECT USING (true);
CREATE POLICY "Users can insert their own characters" ON public.characters FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own characters" ON public.characters FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own characters" ON public.characters FOR DELETE USING (auth.uid() = user_id);
-- Permitir al DM editar cualquier personaje (Opcional, útil para otorgar items/daño)
CREATE POLICY "DMs can update any character" ON public.characters FOR UPDATE USING (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'dm')
);

-- 5. Tabla: ITEMS (Inventario)
CREATE TABLE public.items (
  id uuid default gen_random_uuid() primary key,
  character_id uuid references public.characters(id) on delete cascade not null, -- Si se borra el PJ, se borran sus items
  name text not null,
  description text,
  type text default 'general',
  quantity int default 1,
  is_official boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Items viewable by everyone" ON public.items FOR SELECT USING (true);
CREATE POLICY "Users can manage items of their chars" ON public.items FOR ALL USING (
  exists (select 1 from public.characters where id = items.character_id and user_id = auth.uid())
);

-- 6. Tabla: BADGES (Insignias definibles por el DM)
CREATE TABLE public.badges (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  icon_key text default '🏆',
  created_by uuid references auth.users,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Badges viewable by everyone" ON public.badges FOR SELECT USING (true);
CREATE POLICY "DMs can create badges" ON public.badges FOR INSERT WITH CHECK (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'dm')
);

-- 7. Tabla: CHARACTER_BADGES (Relación Personaje <-> Insignia)
CREATE TABLE public.character_badges (
  id uuid default gen_random_uuid() primary key,
  character_id uuid references public.characters(id) on delete cascade not null,
  badge_id uuid references public.badges(id) on delete cascade not null,
  awarded_at timestamp with time zone default timezone('utc'::text, now()) not null
);
ALTER TABLE public.character_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "CharBadges viewable by everyone" ON public.character_badges FOR SELECT USING (true);
CREATE POLICY "DMs can award badges" ON public.character_badges FOR INSERT WITH CHECK (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'dm')
);

-- 8. TRIGGER Automático para crear Profile al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, role)
  VALUES (new.id, 'player');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ¡LISTO! BASE DE DATOS REINICIADA Y ESTRUCTURA CREADA
