-- Area photos table and storage bucket
CREATE TABLE area_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  area_id UUID NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX idx_area_photos_area ON area_photos(area_id);

ALTER TABLE area_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Area photos are viewable by everyone" ON area_photos FOR SELECT USING (true);
CREATE POLICY "Authenticated users can add area photos" ON area_photos FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can delete own area photos" ON area_photos FOR DELETE USING (auth.uid() = created_by);

-- Area photos storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('area-photos', 'area-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Area photos viewable by everyone"
ON storage.objects FOR SELECT
USING (bucket_id = 'area-photos');

-- Path: {user_id}/{area_id}/{filename}
CREATE POLICY "Authenticated users can upload area photos"
ON storage.objects FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated' AND
  bucket_id = 'area-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own area photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'area-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
