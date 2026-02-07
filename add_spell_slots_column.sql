ALTER TABLE characters ADD COLUMN IF NOT EXISTS spell_slots JSONB DEFAULT '[]'::jsonb;
