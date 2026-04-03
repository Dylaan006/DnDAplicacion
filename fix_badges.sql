-- 1. Añadir tablas a la publicación de Supabase Realtime (Si no estaban ya)
ALTER PUBLICATION supabase_realtime ADD TABLE public.badges;
ALTER PUBLICATION supabase_realtime ADD TABLE public.character_badges;

-- 2. Asegurarnos que REPLICA IDENTITY sea FULL en badges para identificar cambios rápidamente
ALTER TABLE public.badges REPLICA IDENTITY FULL;

-- 3. FIX: Políticas de Edición (UPDATE)
DROP POLICY IF EXISTS "DMs can update their own badges" ON public.badges;
CREATE POLICY "DMs can update their own badges" ON public.badges 
FOR UPDATE USING (
  created_by = auth.uid() OR
  exists (select 1 from public.profiles where id = auth.uid() and role = 'dm')
);

-- 4. FIX: Políticas de Eliminación (DELETE)
DROP POLICY IF EXISTS "DMs can delete their own badges" ON public.badges;
CREATE POLICY "DMs can delete their own badges" ON public.badges 
FOR DELETE USING (
  created_by = auth.uid() OR
  exists (select 1 from public.profiles where id = auth.uid() and role = 'dm')
);
