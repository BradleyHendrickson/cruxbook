-- Allow authenticated users to update areas with no creator (created_by IS NULL).
-- This fixes polygon_coords saves for legacy/migrated areas.
-- Existing policy still requires ownership for areas that have created_by set.
CREATE POLICY "Authenticated users can update areas with no creator"
  ON areas FOR UPDATE
  USING (created_by IS NULL AND auth.role() = 'authenticated');
