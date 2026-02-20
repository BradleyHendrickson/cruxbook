import { useCallback, useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  ActivityIndicator,
  Pressable,
  Modal,
  RefreshControl,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useLocalSearchParams, useNavigation, router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import MapLocationPicker from '@/components/MapLocationPicker';
import { supabase } from '@/lib/supabase';
import { regionFromPolygon } from '@/lib/mapUtils';
import type { PolygonCoords } from '@/lib/mapUtils';
import { useAuth } from '@/lib/auth-context';
import { gradeToLabel } from '@/constants/Grades';
import Colors from '@/constants/Colors';

type Boulder = {
  id: string;
  name: string;
  description: string | null;
  sector_id: string | null;
  area_id: string;
  lat: number | null;
  lng: number | null;
};

type Problem = {
  id: string;
  name: string;
  avg_grade: number | null;
  vote_count: number;
  avg_rating: number | null;
};

export default function BoulderDetailScreen() {
  const params = useLocalSearchParams<{
    id: string;
    sectorName?: string;
    areaName?: string;
  }>();
  const id = typeof params.id === 'string' ? params.id : params.id?.[0];
  const sectorName =
    typeof params.sectorName === 'string'
      ? params.sectorName
      : params.sectorName?.[0];
  const areaName =
    typeof params.areaName === 'string'
      ? params.areaName
      : params.areaName?.[0];

  const [boulder, setBoulder] = useState<Boulder | null>(null);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sectorNameFromFetch, setSectorNameFromFetch] = useState<string | null>(null);
  const [areaNameFromFetch, setAreaNameFromFetch] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [locationPickerVisible, setLocationPickerVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [areaPolygonCoords, setAreaPolygonCoords] = useState<PolygonCoords | null>(null);
  const hasLoadedOnce = useRef(false);
  const { user } = useAuth();
  const navigation = useNavigation();

  const canViewMap = !!boulder?.area_id;
  const showMenu = canViewMap || user;

  const fetchBoulder = useCallback(async () => {
    if (!id) return;
    const { data } = await supabase
      .from('boulders')
      .select('id, name, description, sector_id, area_id, lat, lng, sectors(name), areas(name)')
      .eq('id', id)
      .single();
    if (data) {
      setBoulder({
        id: data.id,
        name: data.name,
        description: data.description,
        sector_id: data.sector_id,
        area_id: data.area_id,
        lat: data.lat,
        lng: data.lng,
      });
      const s = (data.sectors as { name?: string } | null)?.name;
      const a = (data.areas as { name?: string } | null)?.name;
      if (s) setSectorNameFromFetch(s);
      if (a) setAreaNameFromFetch(a);
    }
  }, [id]);

  const fetchProblems = useCallback(async () => {
    if (!id) return;
    const { data: problemData } = await supabase
      .from('problems')
      .select('id, name, avg_grade, vote_count')
      .eq('boulder_id', id)
      .order('sort_order')
      .order('name');
    const problemsList = problemData ?? [];
    const problemIds = problemsList.map((p) => p.id);
    const { data: ratingData } =
      problemIds.length > 0
        ? await supabase
            .from('problem_avg_rating')
            .select('problem_id, avg_rating')
            .in('problem_id', problemIds)
        : { data: [] };
    const ratingByProblem = new Map(
      (ratingData ?? []).map((r: { problem_id: string; avg_rating: number }) => [r.problem_id, r.avg_rating])
    );
    setProblems(
      problemsList.map((p) => ({
        ...p,
        avg_rating: ratingByProblem.get(p.id) ?? null,
      }))
    );
  }, [id]);

  const load = useCallback(async () => {
    await Promise.all([fetchBoulder(), fetchProblems()]);
    setLoading(false);
    setRefreshing(false);
  }, [fetchBoulder, fetchProblems]);

  useEffect(() => {
    hasLoadedOnce.current = false;
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      const run = async () => {
        if (!hasLoadedOnce.current) setLoading(true);
        await load();
        hasLoadedOnce.current = true;
      };
      run();
    }, [load])
  );

  useEffect(() => {
    if (!boulder?.area_id) return;
    const fetchArea = async () => {
      const { data } = await supabase
        .from('areas')
        .select('polygon_coords')
        .eq('id', boulder.area_id)
        .single();
      setAreaPolygonCoords((data?.polygon_coords as PolygonCoords) ?? null);
    };
    fetchArea();
  }, [boulder?.area_id]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  useEffect(() => {
    if (boulder?.name) {
      navigation.setOptions({
        title: boulder.name,
        headerRight:
          showMenu && boulder
            ? () => (
                <View style={styles.headerRight}>
                  <Pressable
                    onPressIn={() => setMenuVisible(true)}
                    style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <Text style={styles.headerActions}>Actions</Text>
                  </Pressable>
                </View>
              )
            : undefined,
      });
    }
  }, [boulder?.name, navigation, showMenu, boulder]);

  if (!id) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>Invalid boulder</Text>
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

  if (!boulder) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>Boulder not found</Text>
      </View>
    );
  }

  const BoulderMenu = () => (
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
          {canViewMap && (
            <Pressable
              style={[styles.menuItem, !user && styles.menuItemLast]}
              onPress={() => {
                setMenuVisible(false);
                if (boulder.sector_id && boulder.area_id) {
                  router.push({
                    pathname: '/sector/[id]',
                    params: {
                      id: boulder.sector_id,
                      areaId: boulder.area_id,
                      sectorName: sectorName ?? '',
                      areaName: areaName ?? '',
                      openMap: '1',
                    },
                  });
                } else if (boulder.area_id) {
                  router.push({
                    pathname: '/area/[id]',
                    params: { id: boulder.area_id, openMap: '1' },
                  });
                }
              }}
            >
              <FontAwesome name="map" size={16} color={Colors.dark.tint} />
              <Text style={styles.menuItemText}>View Area Map</Text>
            </Pressable>
          )}
          {user && (
            <>
              <Pressable
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisible(false);
                  router.push({
                    pathname: '/edit-boulder',
                    params: {
                      boulderId: id,
                      sectorId: boulder.sector_id ?? '',
                      areaId: boulder.area_id,
                      sectorName: sectorName ?? '',
                      areaName: areaName ?? '',
                    },
                  });
                }}
              >
                <FontAwesome name="pencil" size={16} color={Colors.dark.tint} />
                <Text style={styles.menuItemText}>Edit boulder</Text>
              </Pressable>
              <Pressable
                style={[styles.menuItem, styles.menuItemLast]}
                onPress={() => {
                  setMenuVisible(false);
                  setLocationPickerVisible(true);
                }}
              >
                <FontAwesome name="map-marker" size={16} color={Colors.dark.tint} />
                <Text style={styles.menuItemText}>Edit location</Text>
              </Pressable>
            </>
          )}
        </View>
      </Pressable>
    </Modal>
  );

  return (
    <>
      <BoulderMenu />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {(areaName ?? areaNameFromFetch ?? sectorName ?? sectorNameFromFetch) && (
          <Text style={styles.breadcrumb}>
            {[areaName ?? areaNameFromFetch, sectorName ?? sectorNameFromFetch].filter(Boolean).join(' › ')}
          </Text>
        )}

        {boulder.description ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{boulder.description}</Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Problems ({problems.length})
            </Text>
            {user && (
              <Pressable
                style={styles.addProblemBtn}
                onPress={() =>
                  router.push({
                    pathname: '/add-problem',
                    params: {
                      boulderId: id,
                      boulderName: boulder.name,
                      sectorId: boulder.sector_id ?? '',
                      areaId: boulder.area_id,
                      sectorName: sectorName ?? '',
                      areaName: areaName ?? '',
                    },
                  })
                }
              >
                <FontAwesome name="plus" size={14} color="#fff" />
                <Text style={styles.addProblemBtnText}>Add problem</Text>
              </Pressable>
            )}
          </View>

          {problems.length === 0 ? (
            <View style={styles.emptyProblems}>
              <Text style={styles.emptyText}>No problems yet</Text>
              {user ? (
                <Pressable
                  style={styles.addProblemEmpty}
                  onPress={() =>
                    router.push({
                      pathname: '/add-problem',
                      params: {
                        boulderId: id,
                        boulderName: boulder.name,
                        sectorId: boulder.sector_id ?? '',
                        areaId: boulder.area_id,
                        sectorName: sectorName ?? '',
                        areaName: areaName ?? '',
                      },
                    })
                  }
                >
                  <Text style={styles.addProblemEmptyText}>Add first problem</Text>
                </Pressable>
              ) : (
                <Text style={styles.emptySubtext}>Sign in to add problems</Text>
              )}
            </View>
          ) : (
            problems.map((p) => (
              <Pressable
                key={p.id}
                style={styles.problemCard}
                onPress={() =>
                  router.push({
                    pathname: '/problem/[id]',
                    params: {
                      id: p.id,
                      sectorId: boulder.sector_id,
                      areaId: boulder.area_id,
                      sectorName: sectorName ?? '',
                      areaName: areaName ?? '',
                      boulderName: boulder.name,
                      problemName: p.name,
                    },
                  })
                }
              >
                <View style={styles.problemCardMain}>
                  <Text style={styles.problemName}>{p.name}</Text>
                  <View style={styles.problemMetaRow}>
                    <Text style={styles.problemGrade}>
                      {gradeToLabel(p.avg_grade)}
                      {p.vote_count > 0 && (
                        <Text style={styles.problemVotes}>
                          {' '}· {p.vote_count} vote{p.vote_count !== 1 ? 's' : ''}
                        </Text>
                      )}
                    </Text>
                    {p.avg_rating != null && (
                      <View style={styles.problemRatingRow}>
                        <FontAwesome name="star" size={12} color={Colors.dark.tint} />
                        <Text style={styles.problemRatingText}>{p.avg_rating.toFixed(1)}</Text>
                      </View>
                    )}
                  </View>
                </View>
                <FontAwesome name="chevron-right" size={14} color={Colors.dark.cardBorder} />
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>

      <MapLocationPicker
        visible={locationPickerVisible}
        onClose={() => setLocationPickerVisible(false)}
        onConfirm={async (newLat, newLng) => {
          if (!id || !user) return;
          const { error } = await supabase
            .from('boulders')
            .update({ lat: newLat, lng: newLng })
            .eq('id', id);
          if (!error) {
            setBoulder((prev) =>
              prev ? { ...prev, lat: newLat, lng: newLng } : null
            );
            setLocationPickerVisible(false);
          }
        }}
        initialLat={boulder.lat}
        initialLng={boulder.lng}
        centerRegion={
          areaPolygonCoords && areaPolygonCoords.length >= 3
            ? regionFromPolygon(areaPolygonCoords)
            : null
        }
        polygonCoords={areaPolygonCoords}
      />
    </>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.dark.background,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  breadcrumb: {
    fontSize: 14,
    opacity: 0.7,
    color: Colors.dark.text,
    marginBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.text,
    opacity: 0.8,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: Colors.dark.text,
    opacity: 0.9,
  },
  addProblemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: Colors.dark.tint,
  },
  addProblemBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyProblems: {
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    borderRadius: 12,
    backgroundColor: Colors.dark.card,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.text,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    opacity: 0.7,
    color: Colors.dark.text,
  },
  addProblemEmpty: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: Colors.dark.tint,
  },
  addProblemEmptyText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  problemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    backgroundColor: Colors.dark.card,
  },
  problemCardMain: {
    flex: 1,
  },
  problemName: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.dark.text,
    marginBottom: 4,
  },
  problemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 2,
  },
  problemGrade: {
    fontSize: 14,
    color: Colors.dark.tint,
  },
  problemRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  problemRatingText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.dark.tint,
  },
  problemVotes: {
    fontSize: 13,
    opacity: 0.8,
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
  text: { color: Colors.dark.text },
});
