/*
  # Update RLS Policies for Public Access

  ## Overview
  This migration updates the Row Level Security policies to allow public (anon) access
  for the Axiom infringement system. This enables the application to function without
  requiring user authentication for demonstration purposes.

  ## Changes
  1. Drop existing authenticated-only policies
  2. Create new policies that allow anon role access
  3. Maintain the same access patterns (SELECT, INSERT, UPDATE, DELETE)

  ## Security Notes
  - These policies are suitable for demo/development environments
  - Production deployments should implement proper authentication
  - Consider restricting to authenticated users once auth is implemented
*/

-- Drop existing policies for infringements
DROP POLICY IF EXISTS "Authenticated users can view infringements" ON infringements;
DROP POLICY IF EXISTS "Authenticated users can insert infringements" ON infringements;
DROP POLICY IF EXISTS "Authenticated users can update infringements" ON infringements;
DROP POLICY IF EXISTS "Authenticated users can delete infringements" ON infringements;

-- Create new policies for public access on infringements
CREATE POLICY "Public users can view infringements"
  ON infringements FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Public users can insert infringements"
  ON infringements FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Public users can update infringements"
  ON infringements FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public users can delete infringements"
  ON infringements FOR DELETE
  TO anon
  USING (true);

-- Drop existing policies for activity_logs
DROP POLICY IF EXISTS "Authenticated users can view activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Authenticated users can insert activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Authenticated users can update activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Authenticated users can delete activity logs" ON activity_logs;

-- Create new policies for public access on activity_logs
CREATE POLICY "Public users can view activity logs"
  ON activity_logs FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Public users can insert activity logs"
  ON activity_logs FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Public users can update activity logs"
  ON activity_logs FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public users can delete activity logs"
  ON activity_logs FOR DELETE
  TO anon
  USING (true);
