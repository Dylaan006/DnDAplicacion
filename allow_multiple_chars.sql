-- 1. Remove the unique constraint that limits 1 character per player per campaign
ALTER TABLE public.campaign_participants DROP CONSTRAINT IF EXISTS campaign_participants_campaign_id_user_id_key;

-- 2. Add a constraint to ensure a character isn't in the same campaign twice (Optional but recommended)
-- ALTER TABLE public.campaign_participants ADD CONSTRAINT campaign_participants_campaign_id_character_id_key UNIQUE (campaign_id, character_id);

-- 3. Update Characters RLS to allow players to edit characters they are assigned to in a campaign
DROP POLICY IF EXISTS "Users can update their own characters" ON public.characters;
CREATE POLICY "Users can update characters they own or control in a campaign" 
ON public.characters FOR UPDATE USING (
  auth.uid() = user_id OR
  exists (
    select 1 from public.campaign_participants 
    where character_id = public.characters.id and user_id = auth.uid()
  ) OR
  exists (
    select 1 from public.profiles 
    where id = auth.uid() and role = 'dm'
  )
);

-- Similarly for select and delete if needed, but select is already "true" (public)
