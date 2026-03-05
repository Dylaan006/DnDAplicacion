-- Adds a folder/category field to badges table
ALTER TABLE badges ADD COLUMN IF NOT EXISTS folder TEXT DEFAULT 'General';
