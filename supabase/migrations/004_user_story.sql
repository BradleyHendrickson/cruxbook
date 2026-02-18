-- Phase 1: User story schema additions
-- Boulders: height, style, first ascent
ALTER TABLE boulders ADD COLUMN IF NOT EXISTS height TEXT;
ALTER TABLE boulders ADD COLUMN IF NOT EXISTS style TEXT;
ALTER TABLE boulders ADD COLUMN IF NOT EXISTS first_ascent_name TEXT;
ALTER TABLE boulders ADD COLUMN IF NOT EXISTS first_ascent_date DATE;

-- Offline-ready: updated_at for sync
ALTER TABLE areas ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE sectors ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE boulders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Climb logs: multiple per user per boulder
CREATE TABLE climb_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  boulder_id UUID NOT NULL REFERENCES boulders(id) ON DELETE CASCADE,
  outcome TEXT NOT NULL CHECK (outcome IN ('flash', 'send', 'project', 'attempt')),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  notes TEXT,
  logged_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_climb_logs_user ON climb_logs(user_id);
CREATE INDEX idx_climb_logs_boulder ON climb_logs(boulder_id);

ALTER TABLE climb_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Climb logs viewable by everyone" ON climb_logs FOR SELECT USING (true);
CREATE POLICY "Users can insert own climb logs" ON climb_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own climb logs" ON climb_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own climb logs" ON climb_logs FOR DELETE USING (auth.uid() = user_id);

-- Route ratings: one per user per boulder
CREATE TABLE route_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  boulder_id UUID NOT NULL REFERENCES boulders(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, boulder_id)
);

CREATE INDEX idx_route_ratings_boulder ON route_ratings(boulder_id);
CREATE INDEX idx_route_ratings_user ON route_ratings(user_id);

ALTER TABLE route_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Route ratings viewable by everyone" ON route_ratings FOR SELECT USING (true);
CREATE POLICY "Users can insert own route ratings" ON route_ratings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own route ratings" ON route_ratings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own route ratings" ON route_ratings FOR DELETE USING (auth.uid() = user_id);
