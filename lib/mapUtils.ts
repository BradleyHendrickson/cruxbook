export type LatLng = { lat: number; lng: number };
export type PolygonCoords = LatLng[];

/**
 * Ray-casting point-in-polygon test.
 * Returns true if point is inside the polygon ring.
 */
export function pointInPolygon(point: LatLng, ring: PolygonCoords): boolean {
  const { lat, lng } = point;
  const n = ring.length;
  if (n < 3) return false;

  let inside = false;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = ring[i].lng;
    const yi = ring[i].lat;
    const xj = ring[j].lng;
    const yj = ring[j].lat;

    const intersect =
      yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export type BoulderWithLocation = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  problem_count?: number;
};

/**
 * Filter boulders that fall within a polygon.
 */
export function bouldersInPolygon<T extends BoulderWithLocation>(
  boulders: T[],
  polygonCoords: PolygonCoords | null
): T[] {
  if (!polygonCoords || polygonCoords.length < 3) return boulders;
  return boulders.filter((b) =>
    pointInPolygon({ lat: b.lat, lng: b.lng }, polygonCoords)
  );
}

/**
 * Compute map region from polygon bounds (min/max lat/lng with padding).
 * Returns safe fallback if coords are invalid (avoids NaN crashes in MapView).
 * @param zoomScale - Multiply deltas by this (0-1) to zoom in. Default 1.
 */
export function regionFromPolygon(
  coords: PolygonCoords,
  latitudeDelta = 0.02,
  longitudeDelta = 0.02,
  zoomScale = 1
): { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number } {
  const valid = coords.filter(
    (c) => typeof c?.lat === 'number' && typeof c?.lng === 'number' && Number.isFinite(c.lat) && Number.isFinite(c.lng)
  );
  if (valid.length === 0) {
    return { latitude: 37.5, longitude: -122, latitudeDelta: 0.02, longitudeDelta: 0.02 };
  }
  const lats = valid.map((c) => c.lat);
  const lngs = valid.map((c) => c.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const lat = (minLat + maxLat) / 2;
  const lng = (minLng + maxLng) / 2;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { latitude: 37.5, longitude: -122, latitudeDelta: 0.02, longitudeDelta: 0.02 };
  }
  const latDelta = Math.max(maxLat - minLat + 0.005, latitudeDelta) * zoomScale;
  const lngDelta = Math.max(maxLng - minLng + 0.005, longitudeDelta) * zoomScale;
  return {
    latitude: lat,
    longitude: lng,
    latitudeDelta: latDelta,
    longitudeDelta: lngDelta,
  };
}

/**
 * Compute map region from points (e.g. boulder locations) to fit all points with padding.
 */
export function regionFromPoints(
  points: LatLng[],
  latitudeDelta = 0.02,
  longitudeDelta = 0.02,
  zoomScale = 1
): { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number } {
  return regionFromPolygon(points, latitudeDelta, longitudeDelta, zoomScale);
}

/**
 * Filter polygon coords to valid {lat, lng} for MapView (avoids NaN crashes).
 */
export function sanitizePolygonCoords(coords: PolygonCoords): PolygonCoords {
  return coords.filter(
    (c) => c && typeof c.lat === 'number' && typeof c.lng === 'number' && Number.isFinite(c.lat) && Number.isFinite(c.lng)
  );
}

/**
 * Find which sector polygon contains a point. Returns sector id or null.
 */
export function sectorContainingPoint(
  point: LatLng,
  sectors: { id: string; polygon_coords: PolygonCoords | null }[]
): string | null {
  for (const s of sectors) {
    if (s.polygon_coords && pointInPolygon(point, s.polygon_coords)) {
      return s.id;
    }
  }
  return null;
}
