import { useCallback, useEffect, useRef, useState } from 'react';
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

type SearchProblem = {
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
  boulder_name: string | null;
};

export type SearchResults = {
  areas: SearchArea[];
  sectors: SearchSector[];
  problems: SearchProblem[];
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
  problems: boolean;
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

function mapProblemRow(p: {
  id: string;
  name: string;
  avg_grade: number | null;
  vote_count: number;
  style: string | null;
  boulders: {
    lat: number | null;
    lng: number | null;
    sector_id: string | null;
    area_id: string;
    name: string;
    sectors: { name: string } | { name: string }[] | null;
    areas: { name: string } | { name: string }[] | null;
  } | null;
}): SearchProblem {
  const b = p.boulders;
  const sectorName = b?.sectors
    ? (Array.isArray(b.sectors) ? b.sectors[0]?.name : b.sectors.name)
    : null;
  const areaName = b?.areas
    ? (Array.isArray(b.areas) ? b.areas[0]?.name : b.areas.name) ?? ''
    : '';
  return {
    id: p.id,
    name: p.name,
    avg_grade: p.avg_grade,
    vote_count: p.vote_count ?? 0,
    style: p.style,
    lat: b?.lat ?? null,
    lng: b?.lng ?? null,
    sector_id: b?.sector_id ?? null,
    area_id: b?.area_id ?? '',
    sector_name: sectorName ?? null,
    area_name: areaName,
    boulder_name: b?.name ?? null,
  };
}

const DEBOUNCE_MS = 300;

export function useProblemSearch(params: SearchParams) {
  const [results, setResults] = useState<SearchResults>({
    areas: [],
    sectors: [],
    problems: [],
  });
  const [loading, setLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState(params.query);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    debounceRef.current && clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(params.query);
      debounceRef.current = null;
    }, DEBOUNCE_MS);
    return () => {
      debounceRef.current && clearTimeout(debounceRef.current);
    };
  }, [params.query]);

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
      const q = debouncedQuery.trim();
      const hasQuery = q.length >= 2;
      const hasLocation =
        params.sort === 'proximity' &&
        params.userLat != null &&
        params.userLng != null;

      let areas: SearchArea[] = [];
      let sectors: SearchSector[] = [];
      let problems: SearchProblem[] = [];

      if (hasQuery) {
        const { areas: searchAreas, sectors: searchSectors, problems: searchProblems } = params.searchTypes;

        const problemsSelect = 'id, name, avg_grade, vote_count, style, boulders(lat, lng, sector_id, area_id, name, sectors(name), areas(name))';

        const [areasRes, sectorsRes, problemsRes] = await Promise.all([
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
          searchProblems
            ? supabase
                .from('problems')
                .select(problemsSelect)
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

        sectors = (sectorsRes.data ?? []).map((s: unknown) => {
          const x = s as { id: string; name: string; area_id: string; areas: { name: string } | { name: string }[] | null };
          const areaName = x.areas
            ? (Array.isArray(x.areas) ? x.areas[0]?.name : x.areas.name) ?? ''
            : '';
          return { id: x.id, name: x.name, area_id: x.area_id, area_name: areaName };
        });

        problems = (problemsRes.data ?? []).map((p: unknown) => mapProblemRow(p as Parameters<typeof mapProblemRow>[0]));
      } else if (hasLocation) {
        const { areas: searchAreas, sectors: searchSectors, problems: searchProblems } = params.searchTypes;

        const problemsSelect = 'id, name, avg_grade, vote_count, style, boulders!inner(lat, lng, sector_id, area_id, name, sectors(name), areas(name))';

        const [areasRes, sectorsRes, problemsRes] = await Promise.all([
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
          searchProblems
            ? supabase
                .from('problems')
                .select(problemsSelect)
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

        sectors = (sectorsRes.data ?? []).map((s: unknown) => {
          const x = s as { id: string; name: string; area_id: string; areas: { name: string } | { name: string }[] | null; lat: number; lng: number };
          const areaName = x.areas
            ? (Array.isArray(x.areas) ? x.areas[0]?.name : x.areas.name) ?? ''
            : '';
          return { id: x.id, name: x.name, area_id: x.area_id, area_name: areaName, lat: x.lat, lng: x.lng };
        });

        problems = (problemsRes.data ?? []).map((p: unknown) => mapProblemRow(p as Parameters<typeof mapProblemRow>[0]));
      }

      if (params.minGrade != null) {
        problems = problems.filter(
          (p) => p.avg_grade != null && p.avg_grade >= params.minGrade!
        );
      }
      if (params.maxGrade != null) {
        problems = problems.filter(
          (p) => p.avg_grade != null && p.avg_grade <= params.maxGrade!
        );
      }
      if (params.styles.length > 0) {
        problems = problems.filter(
          (p) => p.style != null && params.styles.includes(p.style as StyleValue)
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
        if (problems.length > 0) {
          problems = problems
            .filter((p) => p.lat != null && p.lng != null)
            .sort(sortByProximity);
        }
      } else {
        problems.sort((a, b) => (b.vote_count ?? 0) - (a.vote_count ?? 0));
      }

      setResults({ areas, sectors, problems });
    } catch (err) {
      console.error('Search error:', err);
      setResults({ areas: [], sectors: [], problems: [] });
    } finally {
      setLoading(false);
    }
  }, [
    debouncedQuery,
    params.minGrade,
    params.maxGrade,
    params.styles,
    params.sort,
    params.userLat,
    params.userLng,
    params.searchTypes,
  ]);

  useEffect(() => {
    const hasQuery = debouncedQuery.trim().length >= 2;
    const hasLocation = params.userLat != null && params.userLng != null && params.sort === 'proximity';
    if (hasQuery || hasLocation) {
      search();
    } else {
      setResults({ areas: [], sectors: [], problems: [] });
    }
  }, [debouncedQuery, params.sort, params.userLat, params.userLng, params.searchTypes, search]);

  return {
    results,
    loading,
    search,
    fetchLocation,
    locationError,
  };
}
