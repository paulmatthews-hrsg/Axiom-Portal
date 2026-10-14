/*
  # Add Stat Dec Substatus for Legal Chain of Custody

  1. Changes
    - Add three new status values to support the stat dec micro-workflow:
      - 'Awaiting Signature' - Stat dec generated, waiting for authorized signature
      - 'Ready for Submission' - Signed stat dec ready to send to authority
    - These statuses allow proper tracking of the legal chain of custody process
  
  2. Security
    - No changes to RLS policies (existing policies remain in effect)
  
  3. Notes
    - All three statuses ('Stat Dec Pending', 'Awaiting Signature', 'Ready for Submission') 
      will map to Stage 3 in the stepper UI
    - This ensures compliance with corporate signature authorization requirements
*/

-- Drop the existing constraint
ALTER TABLE infringements 
DROP CONSTRAINT IF EXISTS infringements_status_check;

-- Add the new constraint with additional status values
ALTER TABLE infringements 
ADD CONSTRAINT infringements_status_check 
CHECK (status IN (
  'New', 
  'Awaiting COR Identification', 
  'Stat Dec Pending', 
  'Awaiting Signature',
  'Ready for Submission',
  'Pending Fleet Payment', 
  'Awaiting Reimbursement (Xero)', 
  'Closed', 
  'Voided'
));