-- Profiles: username for comments display (synced from auth.users user_metadata)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT
);

CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- RPC: get boulder comments with username (left join profiles)
CREATE OR REPLACE FUNCTION get_boulder_comments(p_boulder_id UUID)
RETURNS TABLE (
  id UUID,
  body TEXT,
  created_at TIMESTAMPTZ,
  user_id UUID,
  username TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.body, c.created_at, c.user_id, p.username
  FROM comments c
  LEFT JOIN profiles p ON p.id = c.user_id
  WHERE c.boulder_id = p_boulder_id
  ORDER BY c.created_at ASC;
$$;

-- Boulder photos storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('boulder-photos', 'boulder-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Boulder photos viewable by everyone"
ON storage.objects FOR SELECT
USING (bucket_id = 'boulder-photos');

-- Path must be {user_id}/{boulder_id}/{filename}
CREATE POLICY "Authenticated users can upload boulder photos"
ON storage.objects FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated' AND
  bucket_id = 'boulder-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can delete photos they uploaded (path: {user_id}/{boulder_id}/{filename})
CREATE POLICY "Users can delete own boulder photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'boulder-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
