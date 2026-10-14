/*
  # Add Jurisdiction and Financial Metadata to Infringements

  ## Changes Made
  
  1. New Columns Added to `infringements` table
    - `issuing_state` (text) - Australian state/territory issuing the fine (NT, NSW, QLD, VIC, WA, SA, TAS, ACT)
    - `issuing_authority` (text) - The authority that issued the fine (e.g., 'Northern Territory Police', 'Revenue NSW')
    - `corporate_fine_amount` (numeric) - The corporate multiplier fine amount (higher than individual fine)
    - `bpay_biller_code` (text) - BPAY biller code for payment processing
    - `bpay_reference` (text) - BPAY reference number for payment processing
    - `reissued_individual_fine_amount` (numeric) - The lower individual fine amount after driver nomination
  
  2. Data Validation
    - Added check constraint to ensure issuing_state is one of the valid Australian states/territories
    - All new fields are nullable to support existing records
  
  ## Important Notes
  - Corporate fine amounts are typically 3-5x higher than individual fines in Australia
  - BPAY details are essential for payment processing and reconciliation
  - Issuing state determines which jurisdiction's processes apply
*/

DO $$
BEGIN
  -- Add issuing_state column with check constraint
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'infringements' AND column_name = 'issuing_state'
  ) THEN
    ALTER TABLE infringements ADD COLUMN issuing_state text;
    ALTER TABLE infringements ADD CONSTRAINT valid_issuing_state 
      CHECK (issuing_state IN ('NT', 'NSW', 'QLD', 'VIC', 'WA', 'SA', 'TAS', 'ACT'));
  END IF;

  -- Add issuing_authority column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'infringements' AND column_name = 'issuing_authority'
  ) THEN
    ALTER TABLE infringements ADD COLUMN issuing_authority text;
  END IF;

  -- Add corporate_fine_amount column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'infringements' AND column_name = 'corporate_fine_amount'
  ) THEN
    ALTER TABLE infringements ADD COLUMN corporate_fine_amount numeric(10, 2);
  END IF;

  -- Add bpay_biller_code column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'infringements' AND column_name = 'bpay_biller_code'
  ) THEN
    ALTER TABLE infringements ADD COLUMN bpay_biller_code text;
  END IF;

  -- Add bpay_reference column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'infringements' AND column_name = 'bpay_reference'
  ) THEN
    ALTER TABLE infringements ADD COLUMN bpay_reference text;
  END IF;

  -- Add reissued_individual_fine_amount column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'infringements' AND column_name = 'reissued_individual_fine_amount'
  ) THEN
    ALTER TABLE infringements ADD COLUMN reissued_individual_fine_amount numeric(10, 2);
  END IF;
END $$;