import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { StyleValue } from '@/constants/Styles';

export type AreaProblem = {
  id: string;
  name: string;
  avg_grade: number | null;
  vote_count: number;
  style: string | null;
  boulder_id: string;
  boulder_name: string;
  sector_id: string | null;
  sector_name: string | null;
  avg_rating: number | null;
};

export type BoulderMarker = {
  id: string;
  name: string;
  problem_count: number;
  lat: number;
  lng: number;
  sector_id?: string | null;
};

export type AreaProblemsParams = {
  query: string;
  minGrade: number | null;
  maxGrade: number | null;
  styles: StyleValue[];
  sectorId: string | null;
  boulderId: string | null;
};

function mapProblemRow(p: {
  id: string;
  name: string;
  avg_grade: number | null;
  vote_count: number;
  style: string | null;
  boulder_id: string;
  boulders: {
    id: string;
    name: string;
    lat: number | null;
    lng: number | null;
    sector_id: string | null;
    sectors: { name: string } | { name: string }[] | null;
  } | null;
}, problemRatings?: Map<string, number>): AreaProblem & { lat: number | null; lng: number | null } {
  const b = p.boulders;
  const sectorName = b?.sectors
    ? (Array.isArray(b.sectors) ? b.sectors[0]?.name : b.sectors.name)
    : null;
  return {
    id: p.id,
    name: p.name,
    avg_grade: p.avg_grade,
    vote_count: p.vote_count ?? 0,
    style: p.style,
    boulder_id: p.boulder_id,
    boulder_name: b?.name ?? '',
    sector_id: b?.sector_id ?? null,
    sector_name: sectorName ?? null,
    avg_rating: problemRatings?.get(p.id) ?? null,
    lat: b?.lat ?? null,
    lng: b?.lng ?? null,
  };
}

function applyFilters(
  allProblems: (AreaProblem & { lat: number | null; lng: number | null })[],
  params: AreaProblemsParams
): (AreaProblem & { lat: number | null; lng: number | null })[] {
  let filtered = allProblems;
  if (params.query.trim().length >= 2) {
    const q = params.query.trim().toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.boulder_name.toLowerCase().includes(q) ||
        (p.sector_name?.toLowerCase().includes(q) ?? false)
    );
  }
  if (params.minGrade != null) {
    filtered = filtered.filter(
      (p) => p.avg_grade != null && p.avg_grade >= params.minGrade!
    );
  }
  if (params.maxGrade != null) {
    filtered = filtered.filter(
      (p) => p.avg_grade != null && p.avg_grade <= params.maxGrade!
    );
  }
  if (params.styles.length > 0) {
    filtered = filtered.filter(
      (p) => p.style != null && params.styles.includes(p.style as StyleValue)
    );
  }
  if (params.sectorId) {
    filtered = filtered.filter((p) => p.sector_id === params.sectorId);
  }
  if (params.boulderId) {
    filtered = filtered.filter((p) => p.boulder_id === params.boulderId);
  }
  return filtered;
}

export function useAreaProblems(areaId: string | undefined, params: AreaProblemsParams) {
  const [allProblems, setAllProblems] = useState<(AreaProblem & { lat: number | null; lng: number | null })[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch once when areaId changes
  useEffect(() => {
    if (!areaId) {
      setAllProblems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const select =
      'id, name, avg_grade, vote_count, style, boulder_id, boulders!inner(id, name, lat, lng, sector_id, area_id, sectors(name))';
    supabase
      .from('problems')
      .select(select)
      .eq('boulders.area_id', areaId)
      .order('sort_order')
      .order('name')
      .then(async ({ data: rawProblems }) => {
        const problems = rawProblems ?? [];
        const problemIds = problems.map((p: { id: string }) => p.id);
        const { data: ratingData } =
          problemIds.length > 0
            ? await supabase
                .from('problem_avg_rating')
                .select('problem_id, avg_rating')
                .in('problem_id', problemIds)
            : { data: [] };
        const problemRatings = new Map(
          (ratingData ?? []).map((r: { problem_id: string; avg_rating: number }) => [r.problem_id, r.avg_rating])
        );
        const mapped = problems.map((p: unknown) =>
          mapProblemRow(p as Parameters<typeof mapProblemRow>[0], problemRatings)
        );
        setAllProblems(mapped);
      })
      .catch((err) => {
        console.error('Area problems fetch error:', err);
        setAllProblems([]);
      })
      .finally(() => setLoading(false));
  }, [areaId]);

  // Filter in memory when params change - no loading, no re-fetch
  const problems = applyFilters(allProblems, params);

  const boulders = (() => {
    const bouldersWithLocation = problems.filter((p) => p.lat != null && p.lng != null);
    const boulderMap = new Map<
      string,
      { id: string; name: string; lat: number; lng: number; count: number; sector_id: string | null }
    >();
    for (const p of bouldersWithLocation) {
      const existing = boulderMap.get(p.boulder_id);
      if (existing) {
        existing.count += 1;
      } else {
        boulderMap.set(p.boulder_id, {
          id: p.boulder_id,
          name: p.boulder_name,
          lat: p.lat!,
          lng: p.lng!,
          count: 1,
          sector_id: p.sector_id ?? null,
        });
      }
    }
    return Array.from(boulderMap.values()).map((b) => ({
      id: b.id,
      name: b.name,
      problem_count: b.count,
      lat: b.lat,
      lng: b.lng,
      sector_id: b.sector_id,
    }));
  })();

  return {
    problems,
    boulders,
    totalProblemCount: allProblems.length,
    loading,
    search: () => {}, // No-op, fetch happens in useEffect
  };
}
