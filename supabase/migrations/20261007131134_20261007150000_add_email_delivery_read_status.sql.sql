/*
# Add email delivery and read status tracking

1. Modified Tables
- `email_logs.delivery_status` (text): lifecycle state for an email: sent, delivered, read, or failed.
- `email_logs.delivered_at` (timestamptz): when a delivery confirmation is received.
- `email_logs.read_at` (timestamptz): when a read confirmation is received.

2. Security
- No new tables or policies are introduced.
- Existing row-level security policies on `email_logs` remain unchanged.

3. Important Notes
- This migration is additive and preserves all existing email records.
- The application can display sent status immediately; Make or another mail provider must write delivery/read confirmations for those later states to appear.
*/

ALTER TABLE email_logs
  ADD COLUMN IF NOT EXISTS delivery_status text NOT NULL DEFAULT 'sent',
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS read_at timestamptz;

ALTER TABLE email_logs
  DROP CONSTRAINT IF EXISTS email_logs_delivery_status_check;

ALTER TABLE email_logs
  ADD CONSTRAINT email_logs_delivery_status_check
  CHECK (delivery_status IN ('sent', 'delivered', 'read', 'failed'));

UPDATE email_logs
SET delivery_status = CASE
  WHEN status = 'failed' THEN 'failed'
  ELSE 'sent'
END
WHERE delivery_status IS NULL OR delivery_status NOT IN ('sent', 'delivered', 'read', 'failed');

CREATE INDEX IF NOT EXISTS idx_email_logs_infringement_delivery_status
  ON email_logs(infringement_id, delivery_status);