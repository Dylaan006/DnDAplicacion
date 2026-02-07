-- RUN THIS IN SUPABASE SQL EDITOR

-- 1. Create Profiles table (extends auth.users)
create table public.profiles (
  id uuid references auth.users not null primary key,
  role text default 'player' check (role in ('player', 'dm', 'admin')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create Badges table
create table public.badges (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  icon_key text, -- Icon identifier or emoji
  created_by uuid references auth.users,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Create Character Badges (Junction)
create table public.character_badges (
  id uuid default gen_random_uuid() primary key,
  character_id uuid references public.characters not null,
  badge_id uuid references public.badges not null,
  awarded_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Enable RLS
alter table public.profiles enable row level security;
alter table public.badges enable row level security;
alter table public.character_badges enable row level security;

-- 5. Policies (Simple for now)
-- Profiles: Public read, Self update
create policy "Public profiles are viewable by everyone." on public.profiles for select using (true);
create policy "Users can insert their own profile." on public.profiles for insert with check (auth.uid() = id);

-- Badges: Read all, DM create
create policy "Badges are viewable by everyone." on public.badges for select using (true);
create policy "DMs can create badges." on public.badges for insert with check (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'dm')
);

-- Character Badges: Read all, DM insert
create policy "Character Badges viewable by everyone." on public.character_badges for select using (true);
create policy "DMs can award badges." on public.character_badges for insert with check (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'dm')
);

-- Trigger to create profile on sign up
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, role)
  values (new.id, 'player');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
