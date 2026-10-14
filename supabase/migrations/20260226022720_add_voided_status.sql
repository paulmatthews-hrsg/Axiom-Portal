/*
  # Add 'Voided' Status to Infringements

  1. Changes
    - Add 'Voided' as a new possible status value for infringements table
    - Allows administrators to permanently close botched records while maintaining audit trail
  
  2. Notes
    - Drops existing status check constraint and recreates with 'Voided' included
    - All existing records remain unchanged
    - New status value enables danger zone functionality in UI
*/

ALTER TABLE infringements 
DROP CONSTRAINT IF EXISTS infringements_status_check;

ALTER TABLE infringements 
ADD CONSTRAINT infringements_status_check 
CHECK (status = ANY (ARRAY[
  'New'::text, 
  'Awaiting COR Identification'::text, 
  'Stat Dec Pending'::text, 
  'Pending Fleet Payment'::text, 
  'Awaiting Reimbursement (Xero)'::text, 
  'Closed'::text,
  'Voided'::text
]));