/*
# Create infringement_documents table and storage bucket

1. New Tables
- `infringement_documents`
  - `id` (uuid, primary key)
  - `infringement_id` (uuid, foreign key to infringements, ON DELETE CASCADE)
  - `file_name` (text, the original uploaded file name)
  - `storage_path` (text, the path within the 'infringement-documents' storage bucket)
  - `file_size` (bigint, size in bytes, nullable)
  - `mime_type` (text, nullable)
  - `uploaded_at` (timestamptz, default now())
2. Security
- Enable RLS on `infringement_documents`.
- This is a single-tenant app (no sign-in screen), so allow anon + authenticated CRUD.
- Storage bucket 'infringement-documents' is created as public-read so uploaded PDFs can be viewed/downloaded directly via their public URL.
3. Important Notes
- The storage bucket is created with public read access so document preview/download works without an authenticated session.
- Uploads are allowed for anon and authenticated roles.
*/

CREATE TABLE IF NOT EXISTS infringement_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  infringement_id uuid NOT NULL REFERENCES infringements(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  storage_path text NOT NULL,
  file_size bigint,
  mime_type text,
  uploaded_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_infringement_documents_infringement_id
  ON infringement_documents(infringement_id);

ALTER TABLE infringement_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_documents" ON infringement_documents;
CREATE POLICY "anon_select_documents"
ON infringement_documents FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_documents" ON infringement_documents;
CREATE POLICY "anon_insert_documents"
ON infringement_documents FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_documents" ON infringement_documents;
CREATE POLICY "anon_update_documents"
ON infringement_documents FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_documents" ON infringement_documents;
CREATE POLICY "anon_delete_documents"
ON infringement_documents FOR DELETE
TO anon, authenticated USING (true);

-- Create storage bucket for infringement documents (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('infringement-documents', 'infringement-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: allow anon + authenticated to upload, read, and delete
DROP POLICY IF EXISTS "anon_upload_documents" ON storage.objects;
CREATE POLICY "anon_upload_documents"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'infringement-documents');

DROP POLICY IF EXISTS "anon_read_documents" ON storage.objects;
CREATE POLICY "anon_read_documents"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'infringement-documents');

DROP POLICY IF EXISTS "anon_delete_documents_storage" ON storage.objects;
CREATE POLICY "anon_delete_documents_storage"
ON storage.objects FOR DELETE
TO anon, authenticated
USING (bucket_id = 'infringement-documents');
