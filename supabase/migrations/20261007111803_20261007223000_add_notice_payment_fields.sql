/*
# Add infringement notice payment fields

1. New columns on `infringements`
- `due_date` (date) - Payment due date printed on the infringement notice.
- `total_amount_payable` (numeric) - Total amount payable, including any levy or other notice charges.
- `victims_levy` (numeric) - Victims levy amount printed on the notice.

2. Modified tables
- `infringements` receives three nullable fields so existing records remain valid and are not changed.

3. Security
- No new tables, permissions, or RLS policies are introduced. Existing `infringements` RLS and access policies remain unchanged.

4. Important notes
- All new fields are nullable because historical records may not contain these values.
- No existing columns or records are removed or altered.
*/

ALTER TABLE infringements
  ADD COLUMN IF NOT EXISTS due_date date,
  ADD COLUMN IF NOT EXISTS total_amount_payable numeric(10, 2),
  ADD COLUMN IF NOT EXISTS victims_levy numeric(10, 2);