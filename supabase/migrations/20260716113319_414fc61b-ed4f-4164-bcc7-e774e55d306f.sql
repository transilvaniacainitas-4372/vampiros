
CREATE POLICY "authenticated read portraits" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'portraits');
CREATE POLICY "users upload own portrait" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'portraits' AND (storage.foldername(name))[1] = auth.uid()::text
  );
CREATE POLICY "users update own portrait" ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id = 'portraits' AND (storage.foldername(name))[1] = auth.uid()::text
  );
CREATE POLICY "storyteller manages all portraits" ON storage.objects
  FOR ALL TO authenticated USING (
    bucket_id = 'portraits' AND public.has_role(auth.uid(), 'storyteller')
  );
