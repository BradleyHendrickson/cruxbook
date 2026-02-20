import { useCallback, useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Text,
  View,
  Modal,
  Platform,
  InteractionManager,
} from 'react-native';
import * as Linking from 'expo-linking';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import AreaMapView from '@/components/AreaMapView';
import AreaHeaderMap from '@/components/AreaHeaderMap';
import AreaProblemsFilters from '@/components/AreaProblemsFilters';
import EditableMapView from '@/components/EditableMapView';
import MapLocationPicker from '@/components/MapLocationPicker';
import { regionFromPolygon, regionFromPoints, sanitizePolygonCoords } from '@/lib/mapUtils';
import { useLocalSearchParams, router, useNavigation } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Text as ThemedText } from '@/components/Themed';
import { supabase } from '@/lib/supabase';
import { gradeToLabel } from '@/constants/Grades';
import { useAuth } from '@/lib/auth-context';
import { useAreaProblems } from '@/lib/useAreaProblems';
import Colors from '@/constants/Colors';
import type { StyleValue } from '@/constants/Styles';

type PolygonCoords = { lat: number; lng: number }[];

type Sector = {
  id: string;
  name: string;
  description: string | null;
  boulder_count: number;
  lat: number | null;
  lng: number | null;
  polygon_coords: PolygonCoords | null;
};

type BoulderMarker = {
  id: string;
  name: string;
  problem_count: number;
  lat: number;
  lng: number;
  sector_id?: string | null;
};

export default function AreaDetailScreen() {
  const params = useLocalSearchParams<{ id: string; openMap?: string }>();
  const id = typeof params.id === 'string' ? params.id : params.id?.[0];
  const [areaName, setAreaName] = useState<string>('');
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [boulders, setBoulders] = useState<BoulderMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const openMap = typeof params.openMap === 'string' ? params.openMap : params.openMap?.[0];
  const [viewMode, setViewMode] = useState<'list' | 'map' | 'mapEdit'>(
    openMap === '1' ? 'map' : 'list'
  );
  const [areaLat, setAreaLat] = useState<number | null>(null);
  const [areaLng, setAreaLng] = useState<number | null>(null);
  const [areaPolygonCoords, setAreaPolygonCoords] = useState<PolygonCoords | null>(null);
  const [locationPickerVisible, setLocationPickerVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'problems' | 'sectors'>('problems');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [problemQuery, setProblemQuery] = useState('');
  const [minGrade, setMinGrade] = useState<number | null>(null);
  const [maxGrade, setMaxGrade] = useState<number | null>(null);
  const [selectedStyles, setSelectedStyles] = useState<StyleValue[]>([]);
  const [sectorFilterId, setSectorFilterId] = useState<string | null>(null);
  const [boulderFilterId, setBoulderFilterId] = useState<string | null>(null);
  const hasLoadedOnce = useRef(false);
  const { user } = useAuth();
  const navigation = useNavigation();

  const { problems, boulders: problemBoulders, totalProblemCount, loading: problemsLoading } = useAreaProblems(
    activeTab === 'problems' ? id : undefined,
    {
      query: problemQuery,
      minGrade,
      maxGrade,
      styles: selectedStyles,
      sectorId: sectorFilterId,
      boulderId: boulderFilterId,
    }
  );

  const sectorsWithLocation = sectors.filter(
    (s) => s.lat != null && s.lng != null
  );
  const mapItems = [...sectorsWithLocation, ...boulders];

  useEffect(() => {
    const isMapView = viewMode === 'map' || viewMode === 'mapEdit';
    navigation.setOptions({
      title: areaName || 'Area',
      headerLeft: isMapView
        ? () => (
            <Pressable
              onPress={() =>
                setViewMode((m) => (m === 'mapEdit' ? 'map' : 'list'))
              }
              style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, paddingLeft: 16, paddingRight: 16 }]}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <FontAwesome name="chevron-left" size={20} color={Colors.dark.tint} />
            </Pressable>
          )
        : undefined,
      headerRight: isMapView
        ? undefined
        : () => (
            <View style={styles.headerRight}>
              <Pressable
                onPressIn={() => setMenuVisible(true)}
                style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Text style={styles.headerActions}>Actions</Text>
              </Pressable>
            </View>
          ),
    });
  }, [areaName, navigation, id, viewMode]);

  const fetchAreaAndSectors = async () => {
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
  };

  useEffect(() => {
    hasLoadedOnce.current = false;
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        if (!hasLoadedOnce.current) setLoading(true);
        await fetchAreaAndSectors();
        hasLoadedOnce.current = true;
        setLoading(false);
      };
      load();
    }, [id])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAreaAndSectors();
    setRefreshing(false);
  };

  if (!id) {
    return (
      <View style={styles.center}>
        <ThemedText style={styles.text}>Invalid area</ThemedText>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.dark.tint} />
      </View>
    );
  }

  const AreaMenu = () => (
    <Modal
      visible={menuVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setMenuVisible(false)}
    >
      <Pressable
        style={styles.menuOverlay}
        onPress={() => setMenuVisible(false)}
      >
        <View style={styles.menuContainer}>
          <Pressable
            style={[
              styles.menuItem,
              !(areaLat != null && areaLng != null) && !user && viewMode !== 'mapEdit' && styles.menuItemLast,
            ]}
            onPress={() => {
              setMenuVisible(false);
              if (viewMode === 'mapEdit') {
                setViewMode('map');
              } else {
                setViewMode((m) => (m === 'list' ? 'map' : 'list'));
              }
            }}
          >
            <FontAwesome name="map" size={16} color={Colors.dark.tint} />
            <Text style={styles.menuItemText}>
              {viewMode === 'mapEdit' ? 'Done editing' : viewMode === 'list' ? 'View Area Map' : 'View List'}
            </Text>
          </Pressable>
          {user && viewMode === 'map' && (
            <Pressable
              style={[styles.menuItem, !(areaLat != null && areaLng != null) && styles.menuItemLast]}
              onPress={() => {
                setMenuVisible(false);
                setViewMode('mapEdit');
              }}
            >
              <FontAwesome name="pencil" size={16} color={Colors.dark.tint} />
              <Text style={styles.menuItemText}>Edit map</Text>
            </Pressable>
          )}
          {areaLat != null && areaLng != null && (
            <Pressable
              style={[styles.menuItem, !user && styles.menuItemLast]}
              onPress={() => {
                setMenuVisible(false);
                const url =
                  Platform.OS === 'ios'
                    ? `maps://?daddr=${areaLat},${areaLng}`
                    : Platform.OS === 'android'
                      ? `geo:${areaLat},${areaLng}`
                      : `https://www.google.com/maps/dir/?api=1&destination=${areaLat},${areaLng}`;
                Linking.openURL(url);
              }}
            >
              <FontAwesome name="location-arrow" size={16} color={Colors.dark.tint} />
              <Text style={styles.menuItemText}>Get directions</Text>
            </Pressable>
          )}
          {user && (
            <>
              <Pressable
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisible(false);
                  setLocationPickerVisible(true);
                }}
              >
                <FontAwesome name="map-marker" size={16} color={Colors.dark.tint} />
                <Text style={styles.menuItemText}>Edit location</Text>
              </Pressable>
              <Pressable
                style={[styles.menuItem, styles.menuItemLast]}
                onPress={() => {
                  setMenuVisible(false);
                  router.push({
                    pathname: '/add-sector',
                    params: { areaId: id, areaName },
                  });
                }}
              >
                <FontAwesome name="plus" size={16} color={Colors.dark.tint} />
                <Text style={styles.menuItemText}>Add Sector</Text>
              </Pressable>
            </>
          )}
        </View>
      </Pressable>
    </Modal>
  );

  if (viewMode === 'mapEdit' && user) {
    const editRegion =
      areaPolygonCoords && areaPolygonCoords.length >= 3
        ? regionFromPolygon(areaPolygonCoords)
        : mapItems.length > 0
          ? {
              latitude:
                mapItems.reduce(
                  (sum, i) => sum + (('boulder_count' in i ? (i as Sector).lat! : (i as BoulderMarker).lat)),
                  0
                ) / mapItems.length,
              longitude:
                mapItems.reduce(
                  (sum, i) => sum + (('boulder_count' in i ? (i as Sector).lng! : (i as BoulderMarker).lng)),
                  0
                ) / mapItems.length,
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            }
          : {
              latitude: areaLat ?? 37.5,
              longitude: areaLng ?? -122,
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            };

    const editPolygons: { id: string; coords: PolygonCoords; name?: string }[] = [];
    if (areaPolygonCoords && areaPolygonCoords.length >= 3) {
      const sanitized = sanitizePolygonCoords(areaPolygonCoords);
      if (sanitized.length >= 3) {
        editPolygons.push({ id: 'area', coords: sanitized, name: areaName });
      }
    }
    sectors.forEach((s) => {
      if (s.polygon_coords && s.polygon_coords.length >= 3) {
        editPolygons.push({ id: s.id, coords: s.polygon_coords, name: s.name });
      }
    });

    return (
      <>
        {menuVisible && <AreaMenu />}
        <View style={styles.container}>
          <EditableMapView
            polygons={editPolygons}
            sectors={sectors.map((s) => ({
              id: s.id,
              name: s.name,
              polygon_coords: s.polygon_coords,
              lat: s.lat,
              lng: s.lng,
            }))}
            boulders={boulders}
            region={editRegion}
            areaId={id ?? ''}
            areaName={areaName}
            onPolygonComplete={async (coords) => {
              if (!id) return false;
              const sanitized = sanitizePolygonCoords(coords);
              if (sanitized.length < 3) return false;
              const { error } = await supabase
                .from('areas')
                .update({ polygon_coords: sanitized })
                .eq('id', id);
              if (!error) {
                InteractionManager.runAfterInteractions(() => {
                  setAreaPolygonCoords(sanitized);
                });
                return true;
              }
              console.error('Polygon save failed:', error.message, error.code);
              return false;
            }}
            onBoulderPlace={(lat, lng, sectorId) => {
              const sectorToUse = sectorId ?? sectors[0]?.id;
              if (!sectorToUse) return;
              const sector = sectors.find((s) => s.id === sectorToUse);
              router.push({
                pathname: '/add-boulder',
                params: {
                  sectorId: sectorToUse,
                  areaId: id ?? '',
                  sectorName: sector?.name ?? '',
                  areaName,
                  lat: lat.toString(),
                  lng: lng.toString(),
                },
              });
            }}
            editable={true}
            entityType="area"
          />
        </View>
      </>
    );
  }

  if (viewMode === 'map') {
    if (mapItems.length === 0 && !areaPolygonCoords) {
      return (
        <>
          {menuVisible && <AreaMenu />}
          <View style={styles.container}>
          <View style={styles.emptyMap}>
            {user && (
              <Pressable
                style={styles.editMapButton}
                onPress={() => setViewMode('mapEdit')}
              >
                <FontAwesome name="pencil" size={16} color="#fff" />
                <Text style={styles.editMapButtonText}>Edit map to add boundaries</Text>
              </Pressable>
            )}
            <View style={{ opacity: 0.4 }}>
              <FontAwesome name="map" size={48} color={Colors.dark.text} />
            </View>
            <ThemedText style={styles.emptyMapTitle}>No locations yet</ThemedText>
            <ThemedText style={styles.emptyMapText}>
              Add locations when creating sectors and boulders to see them on the map.
            </ThemedText>
          </View>
        </View>
        </>
      );
    }
    const region =
      areaPolygonCoords && areaPolygonCoords.length >= 3
        ? regionFromPolygon(areaPolygonCoords)
        : mapItems.length > 0
          ? (() => {
              const lats = mapItems.map((i) =>
                'boulder_count' in i ? (i as Sector).lat! : (i as BoulderMarker).lat
              );
              const lngs = mapItems.map((i) =>
                'boulder_count' in i ? (i as Sector).lng! : (i as BoulderMarker).lng
              );
              return {
                latitude: lats.reduce((a, b) => a + b, 0) / lats.length,
                longitude: lngs.reduce((a, b) => a + b, 0) / lngs.length,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
              };
            })()
          : {
              latitude: areaLat ?? 37.5,
              longitude: areaLng ?? -122,
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            };
    return (
      <>
        {menuVisible && <AreaMenu />}
        <View style={styles.container}>
        <MapLocationPicker
          visible={locationPickerVisible}
          onClose={() => setLocationPickerVisible(false)}
          onConfirm={async (newLat, newLng) => {
            if (!id) return;
            const { error } = await supabase
              .from('areas')
              .update({ lat: newLat, lng: newLng })
              .eq('id', id);
            if (!error) {
              setAreaLat(newLat);
              setAreaLng(newLng);
              setLocationPickerVisible(false);
            }
          }}
          initialLat={areaLat}
          initialLng={areaLng}
          centerRegion={
            areaPolygonCoords && areaPolygonCoords.length >= 3
              ? regionFromPolygon(areaPolygonCoords)
              : null
          }
          polygonCoords={areaPolygonCoords}
        />
        <View style={styles.map}>
          <AreaMapView
            sectors={sectorsWithLocation.map((s) => ({
              id: s.id,
              name: s.name,
              boulder_count: s.boulder_count,
              lat: s.lat!,
              lng: s.lng!,
              polygon_coords: s.polygon_coords,
            }))}
            boulders={boulders}
            region={region}
            areaId={id ?? ''}
            areaName={areaName}
            areaPolygonCoords={areaPolygonCoords}
          />
        </View>
      </View>
      </>
    );
  }

  const mapBouldersRaw = (() => {
    const byId = new Map<string, BoulderMarker>();
    for (const b of boulders) {
      byId.set(b.id, b);
    }
    for (const b of problemBoulders) {
      if (!byId.has(b.id)) {
        byId.set(b.id, b);
      }
    }
    return Array.from(byId.values());
  })();
  const mapBoulders =
    sectorFilterId != null
      ? mapBouldersRaw.filter((b) => (b.sector_id ?? null) === sectorFilterId)
      : mapBouldersRaw;
  const headerRegion =
    areaPolygonCoords && areaPolygonCoords.length >= 3
      ? regionFromPolygon(areaPolygonCoords, 0.02, 0.02, 0.2)
      : mapBoulders.length > 0
        ? regionFromPoints(
            mapBoulders.map((b) => ({ lat: b.lat, lng: b.lng })),
            0.02,
            0.02,
            0.2
          )
        : {
            latitude: areaLat ?? 37.5,
            longitude: areaLng ?? -122,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          };

  const hasActiveFilters =
    minGrade != null ||
    maxGrade != null ||
    selectedStyles.length > 0 ||
    sectorFilterId != null ||
    boulderFilterId != null;

  const problemsHeader = activeTab === 'problems' && (
    <View style={styles.problemsHeader}>
      {(mapBoulders.length > 0 || areaPolygonCoords || (areaLat != null && areaLng != null)) && (
        <View style={styles.headerMapWrap}>
          <AreaHeaderMap
            key={`map-${mapBoulders.map((b) => b.id).sort().join(',')}`}
            boulders={mapBoulders}
            region={headerRegion}
            areaPolygonCoords={areaPolygonCoords}
            areaId={id ?? ''}
            areaName={areaName}
            selectedBoulderId={boulderFilterId}
            onBoulderSelect={(boulderId) =>
              setBoulderFilterId((prev) => (prev === boulderId ? null : boulderId))
            }
            onMapPress={() => setBoulderFilterId(null)}
          />
        </View>
      )}
      <AreaProblemsFilters
        query={problemQuery}
        onQueryChange={setProblemQuery}
        minGrade={minGrade}
        maxGrade={maxGrade}
        onMinGradeChange={setMinGrade}
        onMaxGradeChange={setMaxGrade}
        selectedStyles={selectedStyles}
        onStylesChange={setSelectedStyles}
        sectorId={sectorFilterId}
        onSectorChange={setSectorFilterId}
        sectors={sectors.map((s) => ({ id: s.id, name: s.name }))}
        boulders={mapBoulders.map((b) => ({ id: b.id, name: b.name }))}
        boulderFilterId={boulderFilterId}
        onBoulderChange={setBoulderFilterId}
        onClear={() => setBoulderFilterId(null)}
        filterModalVisible={filterModalVisible}
        onFilterModalVisibleChange={setFilterModalVisible}
      />
      {!boulderFilterId && (
        <View style={styles.statsRow}>
          <ThemedText style={styles.statsText}>
            {totalProblemCount} problem{totalProblemCount !== 1 ? 's' : ''}
          </ThemedText>
          <ThemedText style={styles.statsText}>
            {boulders.length} boulder{boulders.length !== 1 ? 's' : ''}
          </ThemedText>
          <ThemedText style={styles.statsText}>
            {sectors.length} sector{sectors.length !== 1 ? 's' : ''}
          </ThemedText>
        </View>
      )}
      {hasActiveFilters && !boulderFilterId && (
        <ThemedText style={styles.matchText}>
          {problems.length} match{problems.length !== 1 ? 'es' : ''}
        </ThemedText>
      )}
      {boulderFilterId && (
        <ThemedText style={styles.selectedBoulderTitle}>
          {mapBoulders.find((b) => b.id === boulderFilterId)?.name ?? 'Boulder'}
          {' · '}
          {problems.length} problem{problems.length !== 1 ? 's' : ''}
        </ThemedText>
      )}
    </View>
  );

  return (
    <>
      {menuVisible && <AreaMenu />}
      <View style={styles.container}>
        <MapLocationPicker
          visible={locationPickerVisible}
          onClose={() => setLocationPickerVisible(false)}
          onConfirm={async (newLat, newLng) => {
            if (!id) return;
            const { error } = await supabase
              .from('areas')
              .update({ lat: newLat, lng: newLng })
              .eq('id', id);
            if (!error) {
              setAreaLat(newLat);
              setAreaLng(newLng);
              setLocationPickerVisible(false);
            }
          }}
          initialLat={areaLat}
          initialLng={areaLng}
          centerRegion={
            areaPolygonCoords && areaPolygonCoords.length >= 3
              ? regionFromPolygon(areaPolygonCoords)
              : null
          }
        />
        <View style={styles.tabBar}>
          <Pressable
            style={[styles.tab, activeTab === 'problems' && styles.tabActive]}
            onPress={() => setActiveTab('problems')}
          >
            <ThemedText style={[styles.tabText, activeTab === 'problems' && styles.tabTextActive]}>
              Problems
            </ThemedText>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === 'sectors' && styles.tabActive]}
            onPress={() => setActiveTab('sectors')}
          >
            <ThemedText style={[styles.tabText, activeTab === 'sectors' && styles.tabTextActive]}>
              Sectors
            </ThemedText>
          </Pressable>
        </View>
        {activeTab === 'problems' ? (
          <View style={styles.problemsContainer}>
            {problemsHeader}
            <FlatList
              data={problems}
              keyExtractor={(item) => item.id}
              style={styles.problemsList}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.card}
                  onPress={() =>
                    router.push({
                      pathname: '/problem/[id]',
                      params: {
                        id: item.id,
                        sectorName: item.sector_name ?? '',
                        areaName,
                        areaId: id ?? '',
                        boulderName: item.boulder_name,
                        problemName: item.name,
                      },
                    })
                  }
                >
                  <ThemedText style={styles.name}>{item.name}</ThemedText>
                  <View style={styles.problemMetaRow}>
                  <ThemedText style={styles.problemMeta}>
                    {item.avg_grade != null ? gradeToLabel(item.avg_grade) : '—'} · {item.boulder_name}
                    {item.sector_name ? ` · ${item.sector_name}` : ''}
                  </ThemedText>
                  {item.avg_rating != null && (
                    <View style={styles.problemRatingRow}>
                      <FontAwesome name="star" size={12} color={Colors.dark.tint} />
                      <ThemedText style={styles.problemRatingText}>{item.avg_rating.toFixed(1)}</ThemedText>
                    </View>
                  )}
                </View>
                </Pressable>
              )}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.empty}>
                {problemsLoading ? (
                  <ActivityIndicator size="large" color={Colors.dark.tint} style={{ marginTop: 24 }} />
                ) : (
                  <ThemedText style={styles.emptyText}>
                    {problemQuery.length >= 2 || hasActiveFilters
                      ? 'No problems match'
                      : 'No problems yet'}
                  </ThemedText>
                )}
              </View>
            }
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            />
          </View>
        ) : (
          <FlatList
            data={sectors}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Pressable
                style={styles.card}
                onPress={() =>
                  router.push({
                    pathname: '/sector/[id]',
                    params: {
                      id: item.id,
                      areaId: id,
                      sectorName: item.name,
                      areaName,
                    },
                  })
                }
              >
                <ThemedText style={styles.name}>{item.name}</ThemedText>
                {item.description ? (
                  <ThemedText style={styles.description} numberOfLines={3}>
                    {item.description}
                  </ThemedText>
                ) : null}
                <ThemedText style={styles.count}>
                  {item.boulder_count} boulder{item.boulder_count !== 1 ? 's' : ''}
                </ThemedText>
              </Pressable>
            )}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.empty}>
                <ThemedText style={styles.emptyText}>No sectors yet</ThemedText>
                {user && (
                  <ThemedText style={styles.emptySubtext}>Tap + to add a sector</ThemedText>
                )}
              </View>
            }
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.cardBorder,
    paddingHorizontal: 16,
  },
  tab: {
    paddingVertical: 14,
    paddingHorizontal: 4,
    marginRight: 20,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: Colors.dark.tint,
  },
  tabText: { fontSize: 16, fontWeight: '500', color: Colors.dark.text },
  tabTextActive: { color: Colors.dark.tint, fontWeight: '600' },
  problemsContainer: { flex: 1 },
  problemsHeader: {
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 8,
  },
  problemsList: { flex: 1 },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
    marginBottom: 8,
  },
  statsText: { fontSize: 14, opacity: 0.85, color: Colors.dark.text },
  matchText: { fontSize: 13, opacity: 0.7, marginBottom: 8, color: Colors.dark.text },
  selectedBoulderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.dark.text,
    marginTop: 4,
    marginBottom: 8,
  },
  headerMapWrap: { marginHorizontal: -4, marginBottom: 12 },
  list: { padding: 16, paddingBottom: 24 },
  card: {
    padding: 18,
    borderRadius: 13,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    backgroundColor: Colors.dark.card,
  },
  name: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 6,
    color: Colors.dark.text,
  },
  description: {
    fontSize: 15,
    opacity: 0.85,
    marginBottom: 8,
    lineHeight: 20,
    color: Colors.dark.text,
  },
  count: { fontSize: 13, opacity: 0.7, color: Colors.dark.text },
  problemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    gap: 8,
  },
  problemMeta: { fontSize: 14, opacity: 0.8, flex: 1, color: Colors.dark.text },
  problemRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  problemRatingText: { fontSize: 14, fontWeight: '600', color: Colors.dark.tint },
  empty: { padding: 48, alignItems: 'center' },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: Colors.dark.text,
  },
  emptySubtext: {
    fontSize: 14,
    opacity: 0.7,
    color: Colors.dark.text,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 20,
    paddingRight: 16,
  },
  headerActions: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.tint,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 56,
    paddingRight: 16,
  },
  menuContainer: {
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    minWidth: 180,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.cardBorder,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemText: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '500',
  },
  map: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  emptyMap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyMapTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.dark.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMapText: {
    fontSize: 14,
    color: Colors.dark.text,
    opacity: 0.7,
    textAlign: 'center',
  },
  editMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.dark.tint,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginTop: 24,
  },
  editMapButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  callout: {
    minWidth: 120,
    padding: 8,
  },
  calloutTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  calloutSub: {
    fontSize: 12,
    color: Colors.dark.tint,
    marginTop: 2,
  },
  calloutGrade: {
    fontSize: 12,
    color: Colors.dark.tint,
    marginTop: 2,
  },
  calloutHint: {
    fontSize: 11,
    color: Colors.dark.text,
    opacity: 0.6,
    marginTop: 4,
  },
  text: { color: Colors.dark.text },
});
