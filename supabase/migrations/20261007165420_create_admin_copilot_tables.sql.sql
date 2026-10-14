/*
# Create Admin Copilot Conversation Tables

## Overview
Adds two tables to support the read-only Admin Copilot AI assistant:
- `copilot_conversations` — stores conversation sessions and their message history
- `copilot_audit_logs` — records every tool call the AI makes for compliance auditing

## New Tables

### `copilot_conversations`
- `id` (uuid, primary key)
- `user_id` (text — identifier of the staff member, from RBAC context)
- `user_name` (text — display name of the staff member)
- `user_role` (text — role: super_admin, gigcar_manager, etc.)
- `allowed_fleets` (text[] — fleets the user can see, used for permission filtering)
- `messages` (jsonb — array of {role, content, timestamp, tool_calls?} objects)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### `copilot_audit_logs`
- `id` (uuid, primary key)
- `conversation_id` (uuid, references copilot_conversations)
- `user_id` (text — who triggered the query)
- `tool_name` (text — which read-only tool was called)
- `tool_args` (jsonb — arguments passed to the tool)
- `tool_result_summary` (text — truncated summary of what the tool returned)
- `user_query` (text — the original question that led to this tool call)
- `ai_response` (text — the final answer the AI gave)
- `created_at` (timestamptz)

## Security
- Enable RLS on both tables.
- Single-tenant no-auth portal — open to anon, authenticated.
- The edge function uses the service role key to insert audit records.

## Notes
1. `copilot_conversations.messages` stores the full conversation as a JSONB array
   so we can send conversation history to Gemini for multi-turn dialogue.
2. `copilot_audit_logs` captures every read-only tool invocation for compliance,
   including what question triggered it and what the AI answered.
3. Indexes on conversation_id and user_id for query performance.
*/

CREATE TABLE IF NOT EXISTS copilot_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  user_name text NOT NULL,
  user_role text NOT NULL DEFAULT 'super_admin',
  allowed_fleets text[] NOT NULL DEFAULT '{}',
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS copilot_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES copilot_conversations(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  tool_name text NOT NULL,
  tool_args jsonb DEFAULT '{}'::jsonb,
  tool_result_summary text,
  user_query text,
  ai_response text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE copilot_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE copilot_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_copilot_conversations" ON copilot_conversations;
CREATE POLICY "anon_select_copilot_conversations" ON copilot_conversations FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_copilot_conversations" ON copilot_conversations;
CREATE POLICY "anon_insert_copilot_conversations" ON copilot_conversations FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_copilot_conversations" ON copilot_conversations;
CREATE POLICY "anon_update_copilot_conversations" ON copilot_conversations FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_copilot_conversations" ON copilot_conversations;
CREATE POLICY "anon_delete_copilot_conversations" ON copilot_conversations FOR DELETE
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_copilot_audit" ON copilot_audit_logs;
CREATE POLICY "anon_select_copilot_audit" ON copilot_audit_logs FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_copilot_audit" ON copilot_audit_logs;
CREATE POLICY "anon_insert_copilot_audit" ON copilot_audit_logs FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_copilot_audit" ON copilot_audit_logs;
CREATE POLICY "anon_delete_copilot_audit" ON copilot_audit_logs FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_copilot_conv_user ON copilot_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_copilot_conv_updated ON copilot_conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_copilot_audit_conv ON copilot_audit_logs(conversation_id);
CREATE INDEX IF NOT EXISTS idx_copilot_audit_user ON copilot_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_copilot_audit_created ON copilot_audit_logs(created_at DESC);
