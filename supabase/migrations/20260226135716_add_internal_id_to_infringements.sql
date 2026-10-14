/*
  # Add Internal ID to Infringements

  1. Changes
    - Add `internal_id` column to `infringements` table
      - `internal_id` (text, unique, not null)
      - Automatically generated with format "PEN-{sequential_number}"
    - Create sequence for generating sequential internal IDs
    - Add function to auto-generate internal_id on insert
    - Backfill existing records with internal IDs

  2. Notes
    - Internal ID is separate from the external reference_number (notice number)
    - Internal ID format: PEN-1001, PEN-1002, etc.
    - Sequence starts at 1001 for professional appearance
*/

-- Create sequence for internal IDs
CREATE SEQUENCE IF NOT EXISTS infringement_internal_id_seq START WITH 1001;

-- Add internal_id column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'infringements' AND column_name = 'internal_id'
  ) THEN
    ALTER TABLE infringements ADD COLUMN internal_id text;
  END IF;
END $$;

-- Backfill existing records with internal IDs
DO $$
DECLARE
  rec RECORD;
  counter INT := 1001;
BEGIN
  FOR rec IN 
    SELECT id FROM infringements WHERE internal_id IS NULL ORDER BY created_at
  LOOP
    UPDATE infringements 
    SET internal_id = 'PEN-' || counter 
    WHERE id = rec.id;
    counter := counter + 1;
  END LOOP;
  
  -- Update the sequence to the next value
  PERFORM setval('infringement_internal_id_seq', counter);
END $$;

-- Make internal_id NOT NULL after backfill
ALTER TABLE infringements ALTER COLUMN internal_id SET NOT NULL;

-- Add unique constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'infringements_internal_id_key'
  ) THEN
    ALTER TABLE infringements ADD CONSTRAINT infringements_internal_id_key UNIQUE (internal_id);
  END IF;
END $$;

-- Create function to auto-generate internal_id
CREATE OR REPLACE FUNCTION generate_internal_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.internal_id IS NULL THEN
    NEW.internal_id := 'PEN-' || nextval('infringement_internal_id_seq');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate internal_id on insert
DROP TRIGGER IF EXISTS set_internal_id ON infringements;
CREATE TRIGGER set_internal_id
  BEFORE INSERT ON infringements
  FOR EACH ROW
  EXECUTE FUNCTION generate_internal_id();
