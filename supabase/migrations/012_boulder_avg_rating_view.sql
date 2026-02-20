-- View: average star rating per problem (from route_ratings)
CREATE OR REPLACE VIEW problem_avg_rating AS
SELECT
  problem_id,
  ROUND(AVG(rating)::numeric, 1)::double precision AS avg_rating,
  COUNT(rating)::int AS rating_count
FROM route_ratings
GROUP BY problem_id;

-- Drop boulder view if it existed from a previous migration
DROP VIEW IF EXISTS boulder_avg_rating;
