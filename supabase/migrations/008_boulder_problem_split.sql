-- Boulder > Problem split: Problems are user-facing entities (grades, votes, logs, etc.)
-- Boulders become physical containers that group problems.

-- 1. Create problems table
CREATE TABLE problems (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  boulder_id UUID NOT NULL REFERENCES boulders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  avg_grade DOUBLE PRECISION,
  vote_count INTEGER DEFAULT 0,
  height TEXT,
  style TEXT,
  first_ascent_name TEXT,
  first_ascent_date DATE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_problems_boulder ON problems(boulder_id);
CREATE INDEX idx_problems_created_by ON problems(created_by);

ALTER TABLE problems ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Problems are viewable by everyone" ON problems FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create problems" ON problems FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update own problems" ON problems FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users can delete own problems" ON problems FOR DELETE USING (auth.uid() = created_by);

-- 2. Migrate data: one problem per boulder
INSERT INTO problems (boulder_id, name, description, avg_grade, vote_count, height, style, first_ascent_name, first_ascent_date, created_by)
SELECT id, name, description, avg_grade, vote_count, height, style, first_ascent_name, first_ascent_date, created_by
FROM boulders;

-- 3. Migrate grade_votes: add problem_id, populate, drop boulder_id
ALTER TABLE grade_votes ADD COLUMN problem_id UUID REFERENCES problems(id) ON DELETE CASCADE;

UPDATE grade_votes gv
SET problem_id = p.id
FROM problems p
WHERE p.boulder_id = gv.boulder_id;

ALTER TABLE grade_votes DROP CONSTRAINT IF EXISTS grade_votes_boulder_id_user_id_key;
ALTER TABLE grade_votes ALTER COLUMN problem_id SET NOT NULL;
ALTER TABLE grade_votes DROP COLUMN boulder_id;
ALTER TABLE grade_votes ADD CONSTRAINT grade_votes_problem_id_user_id_key UNIQUE (problem_id, user_id);

DROP INDEX IF EXISTS idx_grade_votes_boulder;
CREATE INDEX idx_grade_votes_problem ON grade_votes(problem_id);

-- 4. Migrate favorites
ALTER TABLE favorites ADD COLUMN problem_id UUID REFERENCES problems(id) ON DELETE CASCADE;

UPDATE favorites f
SET problem_id = p.id
FROM problems p
WHERE p.boulder_id = f.boulder_id;

ALTER TABLE favorites DROP CONSTRAINT IF EXISTS favorites_user_id_boulder_id_key;
ALTER TABLE favorites ALTER COLUMN problem_id SET NOT NULL;
ALTER TABLE favorites DROP COLUMN boulder_id;
ALTER TABLE favorites ADD CONSTRAINT favorites_user_id_problem_id_key UNIQUE (user_id, problem_id);

DROP INDEX IF EXISTS idx_favorites_boulder;
CREATE INDEX idx_favorites_problem ON favorites(problem_id);

-- 5. Migrate comments
ALTER TABLE comments ADD COLUMN problem_id UUID REFERENCES problems(id) ON DELETE CASCADE;

UPDATE comments c
SET problem_id = p.id
FROM problems p
WHERE p.boulder_id = c.boulder_id;

ALTER TABLE comments ALTER COLUMN problem_id SET NOT NULL;
ALTER TABLE comments DROP COLUMN boulder_id;

DROP INDEX IF EXISTS idx_comments_boulder;
CREATE INDEX idx_comments_problem ON comments(problem_id);

-- 6. Migrate photos
ALTER TABLE photos ADD COLUMN problem_id UUID REFERENCES problems(id) ON DELETE CASCADE;

UPDATE photos ph
SET problem_id = p.id
FROM problems p
WHERE p.boulder_id = ph.boulder_id;

ALTER TABLE photos ALTER COLUMN problem_id SET NOT NULL;
ALTER TABLE photos DROP COLUMN boulder_id;

DROP INDEX IF EXISTS idx_photos_boulder;
CREATE INDEX idx_photos_problem ON photos(problem_id);

-- 7. Migrate climb_logs
ALTER TABLE climb_logs ADD COLUMN problem_id UUID REFERENCES problems(id) ON DELETE CASCADE;

UPDATE climb_logs cl
SET problem_id = p.id
FROM problems p
WHERE p.boulder_id = cl.boulder_id;

ALTER TABLE climb_logs ALTER COLUMN problem_id SET NOT NULL;
ALTER TABLE climb_logs DROP COLUMN boulder_id;

DROP INDEX IF EXISTS idx_climb_logs_boulder;
CREATE INDEX idx_climb_logs_problem ON climb_logs(problem_id);

-- 8. Migrate route_ratings
ALTER TABLE route_ratings ADD COLUMN problem_id UUID REFERENCES problems(id) ON DELETE CASCADE;

UPDATE route_ratings rr
SET problem_id = p.id
FROM problems p
WHERE p.boulder_id = rr.boulder_id;

ALTER TABLE route_ratings DROP CONSTRAINT IF EXISTS route_ratings_user_id_boulder_id_key;
ALTER TABLE route_ratings ALTER COLUMN problem_id SET NOT NULL;
ALTER TABLE route_ratings DROP COLUMN boulder_id;
ALTER TABLE route_ratings ADD CONSTRAINT route_ratings_user_id_problem_id_key UNIQUE (user_id, problem_id);

DROP INDEX IF EXISTS idx_route_ratings_boulder;
CREATE INDEX idx_route_ratings_problem ON route_ratings(problem_id);

-- 9. Drop boulder columns (moved to problems)
ALTER TABLE boulders DROP COLUMN IF EXISTS avg_grade;
ALTER TABLE boulders DROP COLUMN IF EXISTS vote_count;
ALTER TABLE boulders DROP COLUMN IF EXISTS height;
ALTER TABLE boulders DROP COLUMN IF EXISTS style;
ALTER TABLE boulders DROP COLUMN IF EXISTS first_ascent_name;
ALTER TABLE boulders DROP COLUMN IF EXISTS first_ascent_date;

-- 10. Drop update_boulder_grade_stats; create update_problem_grade_stats
DROP TRIGGER IF EXISTS trigger_update_boulder_grade_stats ON grade_votes;

CREATE OR REPLACE FUNCTION update_problem_grade_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE problems SET
      avg_grade = (SELECT COALESCE(AVG(grade_value), 0) FROM grade_votes WHERE problem_id = OLD.problem_id),
      vote_count = (SELECT COUNT(*) FROM grade_votes WHERE problem_id = OLD.problem_id)
    WHERE id = OLD.problem_id;
    RETURN OLD;
  ELSE
    UPDATE problems SET
      avg_grade = (SELECT COALESCE(AVG(grade_value), 0) FROM grade_votes WHERE problem_id = NEW.problem_id),
      vote_count = (SELECT COUNT(*) FROM grade_votes WHERE problem_id = NEW.problem_id)
    WHERE id = NEW.problem_id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_problem_grade_stats
  AFTER INSERT OR UPDATE OR DELETE ON grade_votes
  FOR EACH ROW EXECUTE FUNCTION update_problem_grade_stats();

-- 11. Add problem_count to boulders + trigger
ALTER TABLE boulders ADD COLUMN problem_count INTEGER DEFAULT 0;

CREATE OR REPLACE FUNCTION update_boulder_problem_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE boulders SET problem_count = (SELECT COUNT(*) FROM problems WHERE boulder_id = OLD.boulder_id) WHERE id = OLD.boulder_id;
    RETURN OLD;
  ELSE
    UPDATE boulders SET problem_count = (SELECT COUNT(*) FROM problems WHERE boulder_id = NEW.boulder_id) WHERE id = NEW.boulder_id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_boulder_problem_count
  AFTER INSERT OR UPDATE OR DELETE ON problems
  FOR EACH ROW EXECUTE FUNCTION update_boulder_problem_count();

-- Backfill problem_count for existing boulders
UPDATE boulders b
SET problem_count = (SELECT COUNT(*) FROM problems p WHERE p.boulder_id = b.id);

-- 12. Create get_problem_comments RPC; drop get_boulder_comments
DROP FUNCTION IF EXISTS get_boulder_comments(UUID);

CREATE OR REPLACE FUNCTION get_problem_comments(p_problem_id UUID)
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
  WHERE c.problem_id = p_problem_id
  ORDER BY c.created_at ASC;
$$;

-- 13. Storage: boulder-photos bucket path allows {user_id}/{problem_id}/ for new uploads
-- Existing photos remain at {user_id}/{boulder_id}/; policy only checks first folder = user_id, so no change needed.
