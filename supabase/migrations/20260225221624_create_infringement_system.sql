/*
  # Create Infringement Triage System

  ## Overview
  This migration creates the core database schema for the Axiom Infringement Triage system,
  designed to manage high volumes of physical camera fines across multiple fleet customer bases.

  ## New Tables
  
  ### `infringements`
  Main table storing all infringement records:
  - `id` (uuid, primary key) - Unique identifier
  - `date_received` (timestamptz) - When the fine was received
  - `customer_base` (text) - Fleet identifier (GigCar, Fleetcar, Yonder)
  - `vrn` (text) - Vehicle Registration Number
  - `offence_type` (text) - Type of infringement
  - `offence_date` (timestamptz) - When the offence occurred
  - `offence_location` (text) - Location of offence
  - `assigned_driver` (text) - Driver assigned to vehicle at time of offence
  - `status` (text) - Current workflow status
  - `fine_amount` (numeric) - Amount of the fine
  - `reference_number` (text) - External reference number from authority
  - `notes` (text) - Additional notes
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `activity_logs`
  Audit trail for all actions taken on infringements:
  - `id` (uuid, primary key) - Unique identifier
  - `infringement_id` (uuid, foreign key) - References infringements table
  - `action_type` (text) - Type of action performed
  - `action_description` (text) - Detailed description of action
  - `performed_by` (text) - User or system that performed action
  - `metadata` (jsonb) - Additional structured data
  - `created_at` (timestamptz) - When action occurred

  ## Security
  - Enable RLS on both tables
  - Add policies for authenticated users to perform all operations
  - In production, these should be restricted based on user roles
*/

-- Create infringements table
CREATE TABLE IF NOT EXISTS infringements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date_received timestamptz NOT NULL DEFAULT now(),
  customer_base text NOT NULL CHECK (customer_base IN ('GigCar', 'Fleetcar', 'Yonder')),
  vrn text NOT NULL,
  offence_type text NOT NULL,
  offence_date timestamptz NOT NULL,
  offence_location text,
  assigned_driver text,
  status text NOT NULL DEFAULT 'New' CHECK (
    status IN (
      'New',
      'Awaiting COR Identification',
      'Stat Dec Pending',
      'Pending Fleet Payment',
      'Awaiting Reimbursement (Xero)',
      'Closed'
    )
  ),
  fine_amount numeric(10, 2),
  reference_number text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create activity_logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  infringement_id uuid NOT NULL REFERENCES infringements(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  action_description text NOT NULL,
  performed_by text NOT NULL DEFAULT 'System',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_infringements_customer_base ON infringements(customer_base);
CREATE INDEX IF NOT EXISTS idx_infringements_status ON infringements(status);
CREATE INDEX IF NOT EXISTS idx_infringements_date_received ON infringements(date_received DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_infringement_id ON activity_logs(infringement_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);

-- Enable Row Level Security
ALTER TABLE infringements ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for infringements (allow all operations for authenticated users)
CREATE POLICY "Authenticated users can view infringements"
  ON infringements FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert infringements"
  ON infringements FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update infringements"
  ON infringements FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete infringements"
  ON infringements FOR DELETE
  TO authenticated
  USING (true);

-- Create policies for activity_logs (allow all operations for authenticated users)
CREATE POLICY "Authenticated users can view activity logs"
  ON activity_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert activity logs"
  ON activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update activity logs"
  ON activity_logs FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete activity logs"
  ON activity_logs FOR DELETE
  TO authenticated
  USING (true);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for infringements
DROP TRIGGER IF EXISTS update_infringements_updated_at ON infringements;
CREATE TRIGGER update_infringements_updated_at
  BEFORE UPDATE ON infringements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for demonstration
INSERT INTO infringements (
  date_received,
  customer_base,
  vrn,
  offence_type,
  offence_date,
  offence_location,
  assigned_driver,
  status,
  fine_amount,
  reference_number
) VALUES
  (
    now() - interval '2 days',
    'Fleetcar',
    'ABC123',
    'Speeding',
    now() - interval '14 days',
    'M1 Motorway, Exit 42',
    'Marine Pool #4',
    'New',
    250.00,
    'INF-2024-00123'
  ),
  (
    now() - interval '5 days',
    'GigCar',
    'XYZ789',
    'Red Light',
    now() - interval '20 days',
    'Collins St & Swanston St',
    'John Smith',
    'Awaiting COR Identification',
    400.00,
    'INF-2024-00098'
  ),
  (
    now() - interval '1 day',
    'Yonder',
    'DEF456',
    'Parking',
    now() - interval '10 days',
    'Wilson Parking - CBD',
    'Sarah Johnson',
    'Stat Dec Pending',
    150.00,
    'INF-2024-00145'
  ),
  (
    now() - interval '3 days',
    'Fleetcar',
    'GHI789',
    'Toll Violation',
    now() - interval '18 days',
    'Eastern Freeway Toll Point',
    'Marine Pool #2',
    'Pending Fleet Payment',
    75.00,
    'INF-2024-00112'
  ),
  (
    now() - interval '7 days',
    'GigCar',
    'JKL012',
    'Mobile Phone',
    now() - interval '25 days',
    'Flinders Street',
    'Michael Brown',
    'Awaiting Reimbursement (Xero)',
    500.00,
    'INF-2024-00087'
  )
ON CONFLICT DO NOTHING;
