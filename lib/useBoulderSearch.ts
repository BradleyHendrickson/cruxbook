import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { supabase } from '@/lib/supabase';
import { StyleValue } from '@/constants/Styles';

type SearchArea = {
  id: string;
  name: string;
  description: string | null;
  boulder_count: number;
  lat?: number | null;
  lng?: number | null;
};

type SearchSector = {
  id: string;
  name: string;
  area_id: string;
  area_name: string;
  lat?: number | null;
  lng?: number | null;
};

type SearchBoulder = {
  id: string;
  name: string;
  avg_grade: number | null;
  vote_count: number;
  style: string | null;
  lat: number | null;
  lng: number | null;
  sector_id: string | null;
  area_id: string;
  sector_name: string | null;
  area_name: string;
};

export type SearchResults = {
  areas: SearchArea[];
  sectors: SearchSector[];
  boulders: SearchBoulder[];
};

function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export type SortOption = 'popularity' | 'proximity';

export type SearchTypes = {
  areas: boolean;
  sectors: boolean;
  boulders: boolean;
};

export type SearchParams = {
  query: string;
  minGrade: number | null;
  maxGrade: number | null;
  styles: StyleValue[];
  sort: SortOption;
  userLat: number | null;
  userLng: number | null;
  searchTypes: SearchTypes;
};

export function useBoulderSearch(params: SearchParams) {
  const [results, setResults] = useState<SearchResults>({
    areas: [],
    sectors: [],
    boulders: [],
  });
  const [loading, setLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const fetchLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Location permission denied');
        return null;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocationError(null);
      return {
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
      };
    } catch (err) {
      setLocationError(err instanceof Error ? err.message : 'Could not get location');
      return null;
    }
  }, []);

  const search = useCallback(async () => {
    setLoading(true);
    try {
      const q = params.query.trim();
      const hasQuery = q.length >= 2;
      const hasLocation =
        params.sort === 'proximity' &&
        params.userLat != null &&
        params.userLng != null;

      let areas: SearchArea[] = [];
      let sectors: SearchSector[] = [];
      let boulders: SearchBoulder[] = [];

      if (hasQuery) {
        const { areas: searchAreas, sectors: searchSectors, boulders: searchBoulders } = params.searchTypes;

        const [areasRes, sectorsRes, bouldersRes] = await Promise.all([
          searchAreas
            ? supabase
                .from('areas')
                .select('id, name, description, boulder_count')
                .is('parent_id', null)
                .ilike('name', `%${q}%`)
                .order('name')
                .limit(20)
            : { data: [] },
          searchSectors
            ? supabase
                .from('sectors')
                .select('id, name, area_id, areas(name)')
                .ilike('name', `%${q}%`)
                .order('name')
                .limit(20)
            : { data: [] },
          searchBoulders
            ? supabase
                .from('boulders')
                .select('id, name, avg_grade, vote_count, style, lat, lng, sector_id, area_id, sectors(name), areas(name)')
                .ilike('name', `%${q}%`)
                .limit(100)
            : { data: [] },
        ]);

        areas = (areasRes.data ?? []).map((a: { id: string; name: string; description: string | null; boulder_count: number }) => ({
          id: a.id,
          name: a.name,
          description: a.description,
          boulder_count: a.boulder_count,
        }));

        sectors = (sectorsRes.data ?? []).map((s: { id: string; name: string; area_id: string; areas: { name: string } | null }) => ({
          id: s.id,
          name: s.name,
          area_id: s.area_id,
          area_name: s.areas?.name ?? '',
        }));

        boulders = (bouldersRes.data ?? []).map((b: {
          id: string; name: string; avg_grade: number | null; vote_count: number; style: string | null;
          lat: number | null; lng: number | null; sector_id: string | null; area_id: string;
          sectors: { name: string } | null; areas: { name: string } | null;
        }) => ({
          id: b.id,
          name: b.name,
          avg_grade: b.avg_grade,
          vote_count: b.vote_count ?? 0,
          style: b.style,
          lat: b.lat,
          lng: b.lng,
          sector_id: b.sector_id,
          area_id: b.area_id,
          sector_name: b.sectors?.name ?? null,
          area_name: b.areas?.name ?? '',
        }));
      } else if (hasLocation) {
        const { areas: searchAreas, sectors: searchSectors, boulders: searchBoulders } = params.searchTypes;

        const [areasRes, sectorsRes, bouldersRes] = await Promise.all([
          searchAreas
            ? supabase
                .from('areas')
                .select('id, name, description, boulder_count, lat, lng')
                .is('parent_id', null)
                .not('lat', 'is', null)
                .not('lng', 'is', null)
                .limit(20)
            : { data: [] },
          searchSectors
            ? supabase
                .from('sectors')
                .select('id, name, area_id, areas(name), lat, lng')
                .not('lat', 'is', null)
                .not('lng', 'is', null)
                .limit(20)
            : { data: [] },
          searchBoulders
            ? supabase
                .from('boulders')
                .select('id, name, avg_grade, vote_count, style, lat, lng, sector_id, area_id, sectors(name), areas(name)')
                .not('lat', 'is', null)
                .not('lng', 'is', null)
                .limit(100)
            : { data: [] },
        ]);

        areas = (areasRes.data ?? []).map((a: { id: string; name: string; description: string | null; boulder_count: number; lat: number; lng: number }) => ({
          id: a.id,
          name: a.name,
          description: a.description,
          boulder_count: a.boulder_count,
          lat: a.lat,
          lng: a.lng,
        }));

        sectors = (sectorsRes.data ?? []).map((s: { id: string; name: string; area_id: string; areas: { name: string } | null; lat: number; lng: number }) => ({
          id: s.id,
          name: s.name,
          area_id: s.area_id,
          area_name: s.areas?.name ?? '',
          lat: s.lat,
          lng: s.lng,
        }));

        boulders = (bouldersRes.data ?? []).map((b: {
          id: string; name: string; avg_grade: number | null; vote_count: number; style: string | null;
          lat: number; lng: number; sector_id: string | null; area_id: string;
          sectors: { name: string } | null; areas: { name: string } | null;
        }) => ({
          id: b.id,
          name: b.name,
          avg_grade: b.avg_grade,
          vote_count: b.vote_count ?? 0,
          style: b.style,
          lat: b.lat,
          lng: b.lng,
          sector_id: b.sector_id,
          area_id: b.area_id,
          sector_name: b.sectors?.name ?? null,
          area_name: b.areas?.name ?? '',
        }));
      }

      if (params.minGrade != null) {
        boulders = boulders.filter(
          (b) => b.avg_grade != null && b.avg_grade >= params.minGrade!
        );
      }
      if (params.maxGrade != null) {
        boulders = boulders.filter(
          (b) => b.avg_grade != null && b.avg_grade <= params.maxGrade!
        );
      }
      if (params.styles.length > 0) {
        boulders = boulders.filter(
          (b) => b.style != null && params.styles.includes(b.style as StyleValue)
        );
      }

      const sortByProximity = (a: { lat?: number | null; lng?: number | null }, b: { lat?: number | null; lng?: number | null }) =>
        haversineDistance(params.userLat!, params.userLng!, a.lat!, a.lng!) -
        haversineDistance(params.userLat!, params.userLng!, b.lat!, b.lng!);

      if (hasLocation) {
        if (areas.some((a) => a.lat != null && a.lng != null)) {
          areas = areas
            .filter((a) => a.lat != null && a.lng != null)
            .sort(sortByProximity);
        }
        if (sectors.some((s) => s.lat != null && s.lng != null)) {
          sectors = sectors
            .filter((s) => s.lat != null && s.lng != null)
            .sort(sortByProximity);
        }
        if (boulders.length > 0) {
          boulders = boulders
            .filter((b) => b.lat != null && b.lng != null)
            .sort(sortByProximity);
        }
      } else {
        boulders.sort((a, b) => (b.vote_count ?? 0) - (a.vote_count ?? 0));
      }

      setResults({ areas, sectors, boulders });
    } catch (err) {
      console.error('Search error:', err);
      setResults({ areas: [], sectors: [], boulders: [] });
    } finally {
      setLoading(false);
    }
  }, [
    params.query,
    params.minGrade,
    params.maxGrade,
    params.styles,
    params.sort,
    params.userLat,
    params.userLng,
    params.searchTypes,
  ]);

  useEffect(() => {
    const hasQuery = params.query.trim().length >= 2;
    const hasLocation = params.userLat != null && params.userLng != null && params.sort === 'proximity';
    if (hasQuery || hasLocation) {
      search();
    } else {
      setResults({ areas: [], sectors: [], boulders: [] });
    }
  }, [params.query, params.sort, params.userLat, params.userLng, params.searchTypes, search]);

  return {
    results,
    loading,
    search,
    fetchLocation,
    locationError,
  };
}
