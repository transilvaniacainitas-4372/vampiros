INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'portraits',
  'portraits',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "authenticated read portraits" ON storage.objects;
DROP POLICY IF EXISTS "public read portraits" ON storage.objects;

CREATE POLICY "public read portraits" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'portraits');
