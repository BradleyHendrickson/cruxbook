import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '@/lib/supabase';

export type PolygonCoords = { lat: number; lng: number }[];

export type Sector = {
  id: string;
  name: string;
  description: string | null;
  boulder_count: number;
  lat: number | null;
  lng: number | null;
  polygon_coords: PolygonCoords | null;
};

export type BoulderMarker = {
  id: string;
  name: string;
  problem_count: number;
  lat: number;
  lng: number;
  sector_id?: string | null;
};

export type AreaPhoto = { id: string; url: string };

export type UseAreaDataResult = {
  areaName: string;
  areaLat: number | null;
  areaLng: number | null;
  areaPolygonCoords: PolygonCoords | null;
  sectors: Sector[];
  boulders: BoulderMarker[];
  areaPhotos: AreaPhoto[];
  problemCount: number;
  loading: boolean;
  refreshing: boolean;
  refresh: () => Promise<void>;
  setAreaLat: (lat: number | null) => void;
  setAreaLng: (lng: number | null) => void;
  setAreaPolygonCoords: (coords: PolygonCoords | null) => void;
  setAreaPhotos: (photos: AreaPhoto[] | ((prev: AreaPhoto[]) => AreaPhoto[])) => void;
};

export function useAreaData(id: string | undefined): UseAreaDataResult {
  const [areaName, setAreaName] = useState<string>('');
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [boulders, setBoulders] = useState<BoulderMarker[]>([]);
  const [areaPhotos, setAreaPhotos] = useState<AreaPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [areaLat, setAreaLat] = useState<number | null>(null);
  const [areaLng, setAreaLng] = useState<number | null>(null);
  const [areaPolygonCoords, setAreaPolygonCoords] = useState<PolygonCoords | null>(null);
  const hasLoadedOnce = useRef(false);

  const fetchAreaAndSectors = useCallback(async () => {
    if (!id) return;
    const { data: areaData } = await supabase
      .from('areas')
      .select('name, lat, lng, polygon_coords')
      .eq('id', id)
      .single();
    setAreaName(areaData?.name ?? 'Area');
    setAreaLat(areaData?.lat ?? null);
    setAreaLng(areaData?.lng ?? null);
    setAreaPolygonCoords((areaData?.polygon_coords as PolygonCoords) ?? null);

    const { data: sectorsData } = await supabase
      .from('sectors')
      .select('id, name, description, boulder_count, lat, lng, polygon_coords')
      .eq('area_id', id)
      .order('sort_order')
      .order('name');
    setSectors(
      (sectorsData ?? []).map((s) => ({
        ...s,
        polygon_coords: (s.polygon_coords as PolygonCoords) ?? null,
      }))
    );

    const { data: bouldersData } = await supabase
      .from('boulders')
      .select('id, name, problem_count, lat, lng, sector_id')
      .eq('area_id', id)
      .not('lat', 'is', null)
      .not('lng', 'is', null);
    setBoulders(
      (bouldersData ?? []).map((b) => ({
        id: b.id,
        name: b.name,
        problem_count: b.problem_count ?? 0,
        lat: b.lat!,
        lng: b.lng!,
        sector_id: b.sector_id ?? null,
      }))
    );

    const { data: photosData } = await supabase
      .from('area_photos')
      .select('id, url')
      .eq('area_id', id)
      .order('created_at', { ascending: true });
    setAreaPhotos(photosData ?? []);
  }, [id]);

  useEffect(() => {
    hasLoadedOnce.current = false;
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        if (!id) return;
        if (!hasLoadedOnce.current) setLoading(true);
        await fetchAreaAndSectors();
        hasLoadedOnce.current = true;
        setLoading(false);
      };
      load();
    }, [id, fetchAreaAndSectors])
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAreaAndSectors();
    setRefreshing(false);
  }, [fetchAreaAndSectors]);

  const problemCount = boulders.reduce((s, b) => s + b.problem_count, 0);

  return {
    areaName,
    areaLat,
    areaLng,
    areaPolygonCoords,
    sectors,
    boulders,
    areaPhotos,
    problemCount,
    loading,
    refreshing,
    refresh,
    setAreaLat,
    setAreaLng,
    setAreaPolygonCoords,
    setAreaPhotos,
  };
}
