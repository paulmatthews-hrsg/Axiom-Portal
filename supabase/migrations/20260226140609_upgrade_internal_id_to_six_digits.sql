/*
  # Upgrade Internal ID to 6-Digit Zero-Padded Format

  1. Changes
    - Update internal_id format from 4-digit (PEN-1001) to 6-digit zero-padded (PEN-001001)
    - Backfill existing records to use new format
    - Update sequence to start from 1001 (will display as PEN-001001)
    - Update auto-generation function to use 6-digit zero-padding

  2. Rationale
    - 4-digit format will not scale to enterprise volumes (max 9,999 records)
    - 6-digit format provides capacity for 999,999 records
    - Zero-padding ensures consistent UI alignment and professional appearance
    - Maintains existing sequence numbering (1001, 1002, etc.) but formats with leading zeros

  3. Format Examples
    - Old: PEN-1001, PEN-1002, PEN-9999
    - New: PEN-001001, PEN-001002, PEN-009999
*/

-- Update existing records to use 6-digit zero-padded format
UPDATE infringements
SET internal_id = 'PEN-' || lpad(split_part(internal_id, '-', 2), 6, '0')
WHERE internal_id IS NOT NULL;

-- Update the function to generate 6-digit zero-padded internal IDs
CREATE OR REPLACE FUNCTION generate_internal_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.internal_id IS NULL THEN
    NEW.internal_id := 'PEN-' || lpad(nextval('infringement_internal_id_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
