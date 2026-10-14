/*
  # Rename COR Identification to Driver Nomination

  1. Changes
    - Update status value from 'Awaiting COR Identification' to 'Awaiting Driver Nomination'
    - This reflects correct business terminology where COR means "Contract Office Representative" (client POC)
    - The status now accurately represents that we're requesting driver identification from the fleet manager
  
  2. Security
    - No changes to RLS policies (existing policies remain in effect)
  
  3. Notes
    - This is a domain terminology correction
    - The workflow stage remains the same (Stage 2) in the UI
*/

-- Drop the existing constraint first
ALTER TABLE infringements 
DROP CONSTRAINT IF EXISTS infringements_status_check;

-- Add the new constraint with both old and new status values temporarily
ALTER TABLE infringements 
ADD CONSTRAINT infringements_status_check 
CHECK (status IN (
  'New', 
  'Awaiting COR Identification',
  'Awaiting Driver Nomination', 
  'Stat Dec Pending', 
  'Awaiting Signature',
  'Ready for Submission',
  'Pending Fleet Payment', 
  'Awaiting Reimbursement (Xero)', 
  'Closed', 
  'Voided'
));

-- Update existing records with the old status
UPDATE infringements 
SET status = 'Awaiting Driver Nomination' 
WHERE status = 'Awaiting COR Identification';

-- Drop the constraint again
ALTER TABLE infringements 
DROP CONSTRAINT IF EXISTS infringements_status_check;

-- Add the final constraint with only the new status value
ALTER TABLE infringements 
ADD CONSTRAINT infringements_status_check 
CHECK (status IN (
  'New', 
  'Awaiting Driver Nomination', 
  'Stat Dec Pending', 
  'Awaiting Signature',
  'Ready for Submission',
  'Pending Fleet Payment', 
  'Awaiting Reimbursement (Xero)', 
  'Closed', 
  'Voided'
));