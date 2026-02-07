-- TABLA DE CAMPAÑAS (Salas persistentes)
CREATE TABLE public.campaigns (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  dm_id uuid references public.profiles(id) not null,
  join_code text unique not null, -- Código corto para unirse (ej. "A4F2")
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- TABLA DE PARTICIPANTES (Relación Campaña <-> Usuario <-> Personaje)
CREATE TABLE public.campaign_participants (
  id uuid default gen_random_uuid() primary key,
  campaign_id uuid references public.campaigns(id) on delete cascade not null,
  user_id uuid references auth.users(id) not null,
  character_id uuid references public.characters(id) on delete set null, -- Solo los jugadores tienen PJ activo aquí. El DM puede ser NULL.
  role text default 'player' check (role in ('dm', 'player', 'spectator')),
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  unique(campaign_id, user_id) -- Un usuario no puede unirse doble a la misma campaña
);

-- RLS POLICIES

-- Campaigns
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
-- Ver campañas: Si eres el DM o eres participante
CREATE POLICY "View campaigns if member or DM" ON public.campaigns FOR SELECT USING (
  dm_id = auth.uid() OR
  exists (select 1 from public.campaign_participants where campaign_id = campaigns.id and user_id = auth.uid())
);
-- Crear campañas: Solo DMs (según profile)
CREATE POLICY "DMs can create campaigns" ON public.campaigns FOR INSERT WITH CHECK (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'dm')
);
-- Update/Delete: Solo el dueño (DM)
CREATE POLICY "DM owner update" ON public.campaigns FOR UPDATE USING (dm_id = auth.uid());
CREATE POLICY "DM owner delete" ON public.campaigns FOR DELETE USING (dm_id = auth.uid());


-- Participants
ALTER TABLE public.campaign_participants ENABLE ROW LEVEL SECURITY;
-- Ver participantes: Si eres miembro de la campaña
CREATE POLICY "View participants if member" ON public.campaign_participants FOR SELECT USING (
  exists (select 1 from public.campaign_participants cp where cp.campaign_id = campaign_participants.campaign_id and cp.user_id = auth.uid()) OR
  exists (select 1 from public.campaigns c where c.id = campaign_participants.campaign_id and c.dm_id = auth.uid())
);
-- Unirse: Cualquiera puede insertar (luego verificamos el código en la app)
CREATE POLICY "Anyone can join" ON public.campaign_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
-- Salir/Kick: Usuario puede salir, DM puede borrar
CREATE POLICY "Kick or Leave" ON public.campaign_participants FOR DELETE USING (
  user_id = auth.uid() OR -- Salir
  exists (select 1 from public.campaigns c where c.id = campaign_participants.campaign_id and c.dm_id = auth.uid()) -- Kick del DM
);
