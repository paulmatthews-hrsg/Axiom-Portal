/*
  # Add Pending Driver Nomination Status

  1. Changes
    - Add 'Pending Driver Nomination' status to infringements status enum
    - This intermediate status occurs between OCR verification and sending the email
    - Provides visual momentum by advancing the workflow stepper immediately after verification

  2. Notes
    - Status flow: New -> Pending Driver Nomination -> Awaiting Driver Nomination
    - 'Pending Driver Nomination' = OCR verified, email not yet sent
    - 'Awaiting Driver Nomination' = Email sent, awaiting client response
*/

DO $$
BEGIN
  -- Add the new status to the status check constraint
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'infringements_status_check'
    AND table_name = 'infringements'
  ) THEN
    ALTER TABLE infringements DROP CONSTRAINT infringements_status_check;
  END IF;

  ALTER TABLE infringements 
  ADD CONSTRAINT infringements_status_check 
  CHECK (status IN (
    'New',
    'Pending Driver Nomination',
    'Awaiting Driver Nomination',
    'Stat Dec Pending',
    'Awaiting Signature',
    'Ready for Submission',
    'Pending Fleet Payment',
    'Awaiting Reimbursement (Xero)',
    'Closed',
    'Voided'
  ));
END $$;
