-- RLS do bucket assinaturas (issue #8)
-- Upload e delete exigem usuario autenticado; leitura permanece publica
-- (bucket e public — o endpoint /object/public/ serve sem auth).

DROP POLICY IF EXISTS assinaturas_select_public ON storage.objects;
CREATE POLICY assinaturas_select_public ON storage.objects FOR SELECT
  USING (bucket_id = 'assinaturas');

DROP POLICY IF EXISTS assinaturas_insert_auth ON storage.objects;
CREATE POLICY assinaturas_insert_auth ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'assinaturas');

DROP POLICY IF EXISTS assinaturas_update_auth ON storage.objects;
CREATE POLICY assinaturas_update_auth ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'assinaturas')
  WITH CHECK (bucket_id = 'assinaturas');

DROP POLICY IF EXISTS assinaturas_delete_auth ON storage.objects;
CREATE POLICY assinaturas_delete_auth ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'assinaturas');
