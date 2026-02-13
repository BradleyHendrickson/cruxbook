-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Areas: top-level locations (e.g., Buttermilks, Rocklands)
CREATE TABLE areas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID REFERENCES areas(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  boulder_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX idx_areas_parent ON areas(parent_id);
CREATE INDEX idx_areas_created_by ON areas(created_by);

-- Sectors: groupings within an area (e.g., The Cave, Sunnyside)
CREATE TABLE sectors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  area_id UUID NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  boulder_count INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX idx_sectors_area ON sectors(area_id);
CREATE INDEX idx_sectors_created_by ON sectors(created_by);

-- Boulders: individual problems
CREATE TABLE boulders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  area_id UUID NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
  sector_id UUID REFERENCES sectors(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  avg_grade DOUBLE PRECISION,
  vote_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT sector_must_belong_to_area CHECK (
    sector_id IS NULL OR EXISTS (
      SELECT 1 FROM sectors s WHERE s.id = sector_id AND s.area_id = boulders.area_id
    )
  )
);

CREATE INDEX idx_boulders_area ON boulders(area_id);
CREATE INDEX idx_boulders_sector ON boulders(sector_id);
CREATE INDEX idx_boulders_created_by ON boulders(created_by);

-- Grade votes: one per user per boulder, averaged for display
CREATE TABLE grade_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  boulder_id UUID NOT NULL REFERENCES boulders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  grade_value DOUBLE PRECISION NOT NULL CHECK (grade_value >= 0 AND grade_value <= 17),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(boulder_id, user_id)
);

CREATE INDEX idx_grade_votes_boulder ON grade_votes(boulder_id);
CREATE INDEX idx_grade_votes_user ON grade_votes(user_id);

-- Photos: linked to boulders
CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  boulder_id UUID NOT NULL REFERENCES boulders(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX idx_photos_boulder ON photos(boulder_id);

-- Favorites
CREATE TABLE favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  boulder_id UUID NOT NULL REFERENCES boulders(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, boulder_id)
);

CREATE INDEX idx_favorites_user ON favorites(user_id);
CREATE INDEX idx_favorites_boulder ON favorites(boulder_id);

-- Comments
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  boulder_id UUID NOT NULL REFERENCES boulders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_comments_boulder ON comments(boulder_id);
CREATE INDEX idx_comments_user ON comments(user_id);

-- Trigger: recompute boulder avg_grade and vote_count when grade_votes change
CREATE OR REPLACE FUNCTION update_boulder_grade_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE boulders SET
      avg_grade = (SELECT COALESCE(AVG(grade_value), 0) FROM grade_votes WHERE boulder_id = OLD.boulder_id),
      vote_count = (SELECT COUNT(*) FROM grade_votes WHERE boulder_id = OLD.boulder_id)
    WHERE id = OLD.boulder_id;
    RETURN OLD;
  ELSE
    UPDATE boulders SET
      avg_grade = (SELECT COALESCE(AVG(grade_value), 0) FROM grade_votes WHERE boulder_id = NEW.boulder_id),
      vote_count = (SELECT COUNT(*) FROM grade_votes WHERE boulder_id = NEW.boulder_id)
    WHERE id = NEW.boulder_id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_boulder_grade_stats
  AFTER INSERT OR UPDATE OR DELETE ON grade_votes
  FOR EACH ROW EXECUTE FUNCTION update_boulder_grade_stats();

-- Trigger: update area/sector boulder_count
CREATE OR REPLACE FUNCTION update_area_boulder_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE areas SET boulder_count = (SELECT COUNT(*) FROM boulders WHERE area_id = OLD.area_id) WHERE id = OLD.area_id;
    IF OLD.sector_id IS NOT NULL THEN
      UPDATE sectors SET boulder_count = (SELECT COUNT(*) FROM boulders WHERE sector_id = OLD.sector_id) WHERE id = OLD.sector_id;
    END IF;
    RETURN OLD;
  ELSE
    UPDATE areas SET boulder_count = (SELECT COUNT(*) FROM boulders WHERE area_id = NEW.area_id) WHERE id = NEW.area_id;
    IF NEW.sector_id IS NOT NULL THEN
      UPDATE sectors SET boulder_count = (SELECT COUNT(*) FROM boulders WHERE sector_id = NEW.sector_id) WHERE id = NEW.sector_id;
    END IF;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_area_boulder_count
  AFTER INSERT OR UPDATE OR DELETE ON boulders
  FOR EACH ROW EXECUTE FUNCTION update_area_boulder_count();

-- RLS: Enable on all tables
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE boulders ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Areas: public read, authenticated create/update/delete own
CREATE POLICY "Areas are viewable by everyone" ON areas FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create areas" ON areas FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update own areas" ON areas FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users can delete own areas" ON areas FOR DELETE USING (auth.uid() = created_by);

-- Sectors: public read, authenticated create/update/delete own
CREATE POLICY "Sectors are viewable by everyone" ON sectors FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create sectors" ON sectors FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update own sectors" ON sectors FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users can delete own sectors" ON sectors FOR DELETE USING (auth.uid() = created_by);

-- Boulders: public read, authenticated create/update/delete own
CREATE POLICY "Boulders are viewable by everyone" ON boulders FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create boulders" ON boulders FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update own boulders" ON boulders FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users can delete own boulders" ON boulders FOR DELETE USING (auth.uid() = created_by);

-- Grade votes: authenticated only
CREATE POLICY "Grade votes viewable by everyone" ON grade_votes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert own votes" ON grade_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own votes" ON grade_votes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own votes" ON grade_votes FOR DELETE USING (auth.uid() = user_id);

-- Photos: public read, authenticated create/delete own
CREATE POLICY "Photos are viewable by everyone" ON photos FOR SELECT USING (true);
CREATE POLICY "Authenticated users can add photos" ON photos FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can delete own photos" ON photos FOR DELETE USING (auth.uid() = created_by);

-- Favorites: users manage own
CREATE POLICY "Users can view own favorites" ON favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can add favorites" ON favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove favorites" ON favorites FOR DELETE USING (auth.uid() = user_id);

-- Comments: public read, authenticated create/delete own
CREATE POLICY "Comments are viewable by everyone" ON comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can add comments" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON comments FOR DELETE USING (auth.uid() = user_id);
