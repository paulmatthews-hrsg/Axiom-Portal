/*
# Store copied email recipients in the audit history

1. Modified Tables
- `email_logs.cc_recipients` (text[]): carbon-copy addresses included on the email. Defaults to an empty list so existing and future messages remain valid when no CC recipients are used.
- `email_logs.bcc_recipients` (text[]): blind carbon-copy addresses included on the email. Defaults to an empty list so existing and future messages remain valid when no BCC recipients are used.

2. Application Behavior
- New email sends can persist the exact CC and BCC recipient lists alongside the existing primary recipients.
- Existing email records are preserved and receive empty recipient lists.

3. Security
- No new tables, roles, or policies are introduced.
- The existing access controls on `email_logs` continue to apply to these columns.

4. Important Notes
- This is an additive, non-destructive change.
- The frontend will display copied recipients in the communication audit history when present.
*/

ALTER TABLE email_logs
  ADD COLUMN IF NOT EXISTS cc_recipients text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS bcc_recipients text[] NOT NULL DEFAULT '{}';