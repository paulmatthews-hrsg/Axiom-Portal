/*
# Fix statutory declaration PDF storage and audit logging

1. Storage security changes
- Add an UPDATE policy for the `infringement-documents` storage bucket.
- The statutory declaration upload uses replacement mode so a regenerated PDF can safely reuse its filename.
- Access remains limited to the existing single-tenant infringement-documents bucket for anon and authenticated roles.

2. Audit logging changes
- No table or column changes are made.
- The frontend records this automated action as `system`, which matches the existing audit log check constraint.

3. Important notes
- This migration does not remove files or change existing document records.
- The UPDATE policy is scoped only to the infringement-documents bucket.
*/

DROP POLICY IF EXISTS "anon_update_documents_storage" ON storage.objects;
CREATE POLICY "anon_update_documents_storage"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'infringement-documents')
WITH CHECK (bucket_id = 'infringement-documents');