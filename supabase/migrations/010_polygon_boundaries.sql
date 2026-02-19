-- Add polygon_coords: array of {lat, lng} for boundary. NULL = use lat/lng point.
-- Format: [{"lat": 37.78, "lng": -122.43}, ...] (closed polygon: first point = last point optional)
ALTER TABLE areas ADD COLUMN IF NOT EXISTS polygon_coords JSONB;
ALTER TABLE sectors ADD COLUMN IF NOT EXISTS polygon_coords JSONB;
