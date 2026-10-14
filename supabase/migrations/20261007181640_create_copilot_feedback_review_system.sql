/*
# Create reviewed Copilot feedback workflow

1. New Tables
- `copilot_feedback` stores one staff member's rating and optional explanation for a Copilot answer, plus review status and any approved correction.
- `copilot_feedback.id` is the feedback record identifier.
- `copilot_feedback.conversation_id` links feedback to the saved Copilot conversation.
- `copilot_feedback.user_id`, `user_name`, and `user_role` record who submitted the feedback in the current role-based portal.
- `copilot_feedback.user_query` and `ai_response` preserve the exact question and answer being reviewed.
- `copilot_feedback.rating` stores `helpful` or `not_helpful`.
- `copilot_feedback.category` stores the review category.
- `copilot_feedback.comment` stores optional staff context.
- `copilot_feedback.status` stores `new`, `investigating`, `approved`, or `rejected`.
- `copilot_feedback.reviewer_name`, `reviewer_role`, `reviewer_notes`, `approved_guidance`, and `reviewed_at` record the human review decision.
- `copilot_guidance` stores only guidance that has been explicitly approved for use by the Copilot.
- `copilot_guidance.id`, `title`, `instruction`, and `scope` describe the approved guidance.
- `copilot_guidance.status` stores `active` or `archived`.
- `copilot_guidance.created_by`, `approved_by`, and `approved_at` provide traceability.

2. Security
- Row Level Security is enabled on both tables.
- This project currently has no sign-in screen and uses a single shared role-switching portal, so anon and authenticated CRUD policies are used to keep the existing app functional.
- The interface exposes review actions only to the existing super-admin role. A future real sign-in flow should replace the shared policies with authenticated reviewer checks before production use.

3. Important Notes
- Feedback does not become Copilot guidance automatically.
- Only rows marked `approved` with non-empty approved guidance are copied into `copilot_guidance` by the application review flow.
- Guidance is soft-archived rather than deleted so review history remains available.
*/

CREATE TABLE IF NOT EXISTS copilot_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES copilot_conversations(id) ON DELETE SET NULL,
  user_id text NOT NULL,
  user_name text NOT NULL,
  user_role text NOT NULL,
  user_query text NOT NULL,
  ai_response text NOT NULL,
  rating text NOT NULL CHECK (rating IN ('helpful', 'not_helpful')),
  category text,
  comment text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'investigating', 'approved', 'rejected')),
  reviewer_name text,
  reviewer_role text,
  reviewer_notes text,
  approved_guidance text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS copilot_guidance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  instruction text NOT NULL,
  scope text NOT NULL DEFAULT 'general',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_by text NOT NULL,
  approved_by text NOT NULL,
  approved_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE copilot_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE copilot_guidance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_copilot_feedback" ON copilot_feedback;
CREATE POLICY "anon_select_copilot_feedback" ON copilot_feedback FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_copilot_feedback" ON copilot_feedback;
CREATE POLICY "anon_insert_copilot_feedback" ON copilot_feedback FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_copilot_feedback" ON copilot_feedback;
CREATE POLICY "anon_update_copilot_feedback" ON copilot_feedback FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_copilot_feedback" ON copilot_feedback;
CREATE POLICY "anon_delete_copilot_feedback" ON copilot_feedback FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_copilot_guidance" ON copilot_guidance;
CREATE POLICY "anon_select_copilot_guidance" ON copilot_guidance FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_copilot_guidance" ON copilot_guidance;
CREATE POLICY "anon_insert_copilot_guidance" ON copilot_guidance FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_copilot_guidance" ON copilot_guidance;
CREATE POLICY "anon_update_copilot_guidance" ON copilot_guidance FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_copilot_guidance" ON copilot_guidance;
CREATE POLICY "anon_delete_copilot_guidance" ON copilot_guidance FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_copilot_feedback_status ON copilot_feedback(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_copilot_feedback_conversation ON copilot_feedback(conversation_id);
CREATE INDEX IF NOT EXISTS idx_copilot_guidance_status ON copilot_guidance(status, approved_at DESC);
