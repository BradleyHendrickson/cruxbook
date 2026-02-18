-- Remove suggested_grade from route_ratings
ALTER TABLE route_ratings DROP COLUMN IF EXISTS suggested_grade;
