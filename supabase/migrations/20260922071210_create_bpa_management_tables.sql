/*
# Create BPA (Business Purchase Agreement) Management Tables

## Overview
Adds the `bpa_agreements` table to support a Business Purchase Agreement management
module within the PennyOS portal. BPAs are contracts with vendors/suppliers for fleet-
related goods and services (vehicles, parts, maintenance, fuel, insurance, etc.).

## New Tables
- `bpa_agreements`
  - `id` (uuid, primary key)
  - `agreement_number` (text, unique — human-readable BPA reference, e.g. BPA-000001)
  - `vendor_name` (text — supplier or vendor party)
  - `vendor_category` (text — e.g. Vehicle Supply, Parts & Maintenance, Fuel, Insurance, Tyres, Other)
  - `description` (text — summary of what the agreement covers)
  - `total_value` (numeric — total contracted value in AUD)
  - `currency` (text, default 'AUD')
  - `start_date` (date — agreement effective date)
  - `end_date` (date — agreement expiry date)
  - `status` (text — Draft, Active, Expiring Soon, Expired, Terminated)
  - `contact_name` (text — vendor primary contact)
  - `contact_email` (text — vendor contact email)
  - `contact_phone` (text — vendor contact phone)
  - `payment_terms` (text — e.g. Net 30, Net 60, Prepaid)
  - `notes` (text — internal notes)
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())

## Security
- Enable RLS on `bpa_agreements`.
- This is a no-auth single-tenant portal — all CRUD is open to `anon, authenticated`.

## Notes
1. An auto-incrementing sequence `bpa_agreement_seq` generates 6-digit agreement numbers.
2. A trigger updates `updated_at` on every row update.
*/

CREATE TABLE IF NOT EXISTS bpa_agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_number text UNIQUE NOT NULL,
  vendor_name text NOT NULL,
  vendor_category text NOT NULL DEFAULT 'Other',
  description text,
  total_value numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'AUD',
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  status text NOT NULL DEFAULT 'Draft',
  contact_name text,
  contact_email text,
  contact_phone text,
  payment_terms text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Sequence for 6-digit agreement numbers starting at 000001
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.sequences WHERE sequence_name = 'bpa_agreement_seq') THEN
    CREATE SEQUENCE bpa_agreement_seq START 1;
  END IF;
END $$;

-- Auto-generate agreement_number on insert if not provided
CREATE OR REPLACE FUNCTION generate_bpa_number()
RETURNS trigger AS $$
BEGIN
  IF NEW.agreement_number IS NULL OR NEW.agreement_number = '' THEN
    NEW.agreement_number := 'BPA-' || lpad(nextval('bpa_agreement_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_bpa_number ON bpa_agreements;
CREATE TRIGGER trg_generate_bpa_number
  BEFORE INSERT ON bpa_agreements
  FOR EACH ROW EXECUTE FUNCTION generate_bpa_number();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_bpa_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bpa_updated_at ON bpa_agreements;
CREATE TRIGGER trg_bpa_updated_at
  BEFORE UPDATE ON bpa_agreements
  FOR EACH ROW EXECUTE FUNCTION update_bpa_updated_at();

-- Enable RLS
ALTER TABLE bpa_agreements ENABLE ROW LEVEL SECURITY;

-- Policies: single-tenant, no auth — open to anon + authenticated
DROP POLICY IF EXISTS "anon_select_bpa" ON bpa_agreements;
CREATE POLICY "anon_select_bpa" ON bpa_agreements FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_bpa" ON bpa_agreements;
CREATE POLICY "anon_insert_bpa" ON bpa_agreements FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_bpa" ON bpa_agreements;
CREATE POLICY "anon_update_bpa" ON bpa_agreements FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_bpa" ON bpa_agreements;
CREATE POLICY "anon_delete_bpa" ON bpa_agreements FOR DELETE
  TO anon, authenticated USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bpa_status ON bpa_agreements(status);
CREATE INDEX IF NOT EXISTS idx_bpa_vendor ON bpa_agreements(vendor_name);
CREATE INDEX IF NOT EXISTS idx_bpa_category ON bpa_agreements(vendor_category);

-- Seed sample data
INSERT INTO bpa_agreements (agreement_number, vendor_name, vendor_category, description, total_value, start_date, end_date, status, contact_name, contact_email, contact_phone, payment_terms, notes)
VALUES
  ('BPA-000001', 'Toyota Fleet Sales Australia', 'Vehicle Supply', 'Fleet vehicle supply agreement for Toyota Hiace and Hilux models. Volume-based pricing tiers for orders of 10+ units.', 450000.00, '2026-01-15', '2027-01-14', 'Active', 'Michael Chen', 'mchen@toyota-fleet.com.au', '02 9876 5432', 'Net 30', 'Preferred supplier for commercial vans'),
  ('BPA-000002', 'Bridgestone Australia', 'Tyres', 'National tyre supply and fleet retreading program. Includes roadside tyre replacement service.', 120000.00, '2026-03-01', '2027-02-28', 'Active', 'Sarah Williams', 's.williams@bridgestone.com.au', '03 8765 4321', 'Net 45', 'Quarterly price review built in'),
  ('BPA-000003', 'Shell Fleet Solutions', 'Fuel', 'Bulk fuel card program with fixed discount per litre across all metropolitan and regional sites.', 280000.00, '2025-11-01', '2026-10-31', 'Expiring Soon', 'David Park', 'd.park@shellfleet.com.au', '07 6543 2109', 'Monthly Direct Debit', 'Renewal under negotiation'),
  ('BPA-000004', 'Allianz Fleet Insurance', 'Insurance', 'Comprehensive motor fleet insurance covering all owned and leased vehicles. Includes third party property and hail damage.', 185000.00, '2026-01-01', '2026-12-31', 'Active', 'Jennifer Liu', 'j.liu@allianz.com.au', '02 1234 5678', 'Monthly', 'Excess-free windscreen replacement included'),
  ('BPA-000005', 'Repco Pro Trade', 'Parts & Maintenance', 'OEM and aftermarket parts supply with same-day metro delivery. Discount structure based on annual spend.', 95000.00, '2026-02-01', '2028-01-31', 'Active', 'Robert Thompson', 'r.thompson@repco.com.au', '03 4567 8901', 'Net 30', NULL),
  ('BPA-000006', 'EV Chargers Pty Ltd', 'Vehicle Supply', 'Supply and installation of EV charging infrastructure at depot locations. Includes 2-year maintenance warranty.', 210000.00, '2026-06-01', NULL, 'Draft', 'Emma Davis', 'emma@evchargers.com.au', '08 8765 4321', '50% Deposit, 50% on Completion', 'Pending board approval for Phase 2 sites'),
  ('BPA-000007', 'National Logistics Group', 'Other', 'Third-party logistics and vehicle relocation services for inter-state fleet transfers.', 67000.00, '2025-07-01', '2026-06-30', 'Expired', 'James Wilson', 'j.wilson@nlg.com.au', '02 9988 7766', 'Net 60', 'Agreement lapsed — awaiting renewal decision')
ON CONFLICT (agreement_number) DO NOTHING;
