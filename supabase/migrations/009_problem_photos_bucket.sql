-- Problem photos storage bucket
-- New uploads use {user_id}/{problem_id}/{filename}
-- Legacy photos remain in boulder-photos bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('problem-photos', 'problem-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Problem photos viewable by everyone"
ON storage.objects FOR SELECT
USING (bucket_id = 'problem-photos');

-- Path: {user_id}/{problem_id}/{filename}
CREATE POLICY "Authenticated users can upload problem photos"
ON storage.objects FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated' AND
  bucket_id = 'problem-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own problem photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'problem-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
