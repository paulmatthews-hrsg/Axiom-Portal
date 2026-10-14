/*
# Add title column to copilot_conversations

1. Modified Tables
- `copilot_conversations` gains a `title` column (text, nullable) so conversations can display a human-readable name in the history list.
- Existing rows get a title backfilled from the first user message in their stored messages JSON, falling back to "Untitled conversation".

2. Security
- No policy changes. The existing CRUD policies on copilot_conversations already cover UPDATE, so the new column is writable through the same path.

3. Important Notes
- The edge function will set the title automatically when a new conversation is created (derived from the first user query).
- Users can rename conversations from the UI, which updates this column.
- Deleting a conversation removes it and its audit logs (via the existing CASCADE on copilot_audit_logs).
*/

ALTER TABLE copilot_conversations
  ADD COLUMN IF NOT EXISTS title text;

UPDATE copilot_conversations
  SET title = COALESCE(
    (SELECT (msg->>'content') FROM jsonb_array_elements(messages) AS msg WHERE msg->>'role' = 'user' LIMIT 1),
    'Untitled conversation'
  )
  WHERE title IS NULL;
