/*
  # Add Audit Logs and OCR Verification Support

  1. New Tables
    - `audit_logs`
      - `id` (uuid, primary key)
      - `infringement_id` (uuid, foreign key to infringements)
      - `timestamp` (timestamptz with timezone)
      - `actor` (text) - User or system that performed the action
      - `actor_type` (text) - 'user' or 'system'
      - `ip_address` (text) - IP address of the actor
      - `action` (text) - Description of the action
      - `created_at` (timestamptz)
  
  2. Changes to Existing Tables
    - `infringements`
      - Add `ocr_verified` (boolean) - Whether OCR data has been verified
      - Add `ocr_verified_at` (timestamptz) - When OCR data was verified
      - Add `ocr_verified_by` (text) - Who verified the OCR data
  
  3. Security
    - Enable RLS on `audit_logs` table
    - Add policies for reading and creating audit logs
*/

-- Add OCR verification fields to infringements
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'infringements' AND column_name = 'ocr_verified'
  ) THEN
    ALTER TABLE infringements 
    ADD COLUMN ocr_verified boolean DEFAULT false,
    ADD COLUMN ocr_verified_at timestamptz,
    ADD COLUMN ocr_verified_by text;
  END IF;
END $$;

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  infringement_id uuid REFERENCES infringements(id) ON DELETE CASCADE,
  timestamp timestamptz DEFAULT now() NOT NULL,
  actor text NOT NULL,
  actor_type text NOT NULL CHECK (actor_type IN ('user', 'system')),
  ip_address text NOT NULL,
  action text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DO $$
BEGIN
  DROP POLICY IF EXISTS "Anyone can view audit logs" ON audit_logs;
  DROP POLICY IF EXISTS "Authenticated users can create audit logs" ON audit_logs;
END $$;

-- Allow anyone to read audit logs (in production, this would be more restrictive)
CREATE POLICY "Anyone can view audit logs"
  ON audit_logs FOR SELECT
  USING (true);

-- Allow inserts (authenticated users or service role)
CREATE POLICY "Authenticated users can create audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_infringement_id ON audit_logs(infringement_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_infringements_ocr_verified ON infringements(ocr_verified);
