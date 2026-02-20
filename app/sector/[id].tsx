import { useCallback, useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  View,
  Text,
  Modal,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import SectorMapView from '@/components/SectorMapView';
import MapLocationPicker from '@/components/MapLocationPicker';
import { useLocalSearchParams, router, useNavigation } from 'expo-router';
import { regionFromPolygon } from '@/lib/mapUtils';
import type { PolygonCoords } from '@/lib/mapUtils';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import Colors from '@/constants/Colors';

type Boulder = {
  id: string;
  name: string;
  description: string | null;
  problem_count: number;
  lat: number | null;
  lng: number | null;
};

export default function SectorDetailScreen() {
  const params = useLocalSearchParams<{
    id: string;
    areaId: string;
    sectorName: string;
    areaName: string;
    openMap?: string;
  }>();
  const id = typeof params.id === 'string' ? params.id : params.id?.[0];
  const areaId =
    typeof params.areaId === 'string' ? params.areaId : params.areaId?.[0];
  const sectorName =
    typeof params.sectorName === 'string'
      ? params.sectorName
      : params.sectorName?.[0];
  const areaName =
    typeof params.areaName === 'string'
      ? params.areaName
      : params.areaName?.[0];

  const [boulders, setBoulders] = useState<Boulder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const openMap = typeof params.openMap === 'string' ? params.openMap : params.openMap?.[0];
  const [viewMode, setViewMode] = useState<'list' | 'map'>(
    openMap === '1' ? 'map' : 'list'
  );
  const [sectorLat, setSectorLat] = useState<number | null>(null);
  const [sectorLng, setSectorLng] = useState<number | null>(null);
  const [sectorPolygonCoords, setSectorPolygonCoords] = useState<{ lat: number; lng: number }[] | null>(null);
  const [areaPolygonCoords, setAreaPolygonCoords] = useState<PolygonCoords | null>(null);
  const [locationPickerVisible, setLocationPickerVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const hasLoadedOnce = useRef(false);
  const { user } = useAuth();
  const navigation = useNavigation();

  const bouldersWithLocation = boulders.filter(
    (b) => b.lat != null && b.lng != null
  );

  const SectorMenu = () => (
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
            style={[styles.menuItem, !user && styles.menuItemLast]}
            onPress={() => {
              setMenuVisible(false);
              setViewMode((m) => (m === 'list' ? 'map' : 'list'));
            }}
          >
            <FontAwesome name="map" size={16} color={Colors.dark.tint} />
            <Text style={styles.menuItemText}>
              {viewMode === 'list' ? 'View Sector Map' : 'View List'}
            </Text>
          </Pressable>
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
                    pathname: '/add-boulder',
                    params: {
                      sectorId: id,
                      areaId,
                      sectorName: sectorName ?? '',
                      areaName: areaName ?? '',
                    },
                  });
                }}
              >
                <FontAwesome name="plus" size={16} color={Colors.dark.tint} />
                <Text style={styles.menuItemText}>Add Boulder</Text>
              </Pressable>
            </>
          )}
        </View>
      </Pressable>
    </Modal>
  );

  useEffect(() => {
    navigation.setOptions({
      title: sectorName || 'Sector',
      headerRight: () => (
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
  }, [sectorName, navigation, id, areaId, areaName]);

  const fetchBoulders = async () => {
    if (!id) return;
    const { data } = await supabase
      .from('boulders')
      .select('id, name, description, problem_count, lat, lng')
      .eq('sector_id', id)
      .order('name');
    setBoulders(data ?? []);

    const { data: sectorData } = await supabase
      .from('sectors')
      .select('lat, lng, polygon_coords')
      .eq('id', id)
      .single();
    setSectorLat(sectorData?.lat ?? null);
    setSectorLng(sectorData?.lng ?? null);
    setSectorPolygonCoords((sectorData?.polygon_coords as { lat: number; lng: number }[]) ?? null);

    if (areaId) {
      const { data: areaData } = await supabase
        .from('areas')
        .select('polygon_coords')
        .eq('id', areaId)
        .single();
      setAreaPolygonCoords((areaData?.polygon_coords as PolygonCoords) ?? null);
    }
  };

  useEffect(() => {
    hasLoadedOnce.current = false;
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        if (!hasLoadedOnce.current) setLoading(true);
        await fetchBoulders();
        hasLoadedOnce.current = true;
        setLoading(false);
      };
      load();
    }, [id])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBoulders();
    setRefreshing(false);
  };


  if (!id || !areaId) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>Invalid sector</Text>
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

  if (viewMode === 'map') {
    if (bouldersWithLocation.length === 0) {
      return (
        <>
          <SectorMenu />
          <View style={styles.container}>
          <View style={styles.emptyMap}>
            <View style={{ opacity: 0.4 }}>
              <FontAwesome name="map" size={48} color={Colors.dark.text} />
            </View>
            <Text style={styles.emptyMapTitle}>No locations yet</Text>
            <Text style={styles.emptyMapText}>
              Add locations when creating boulders to see them on the map.
            </Text>
          </View>
          </View>
        </>
      );
    }
    const region = {
      latitude:
        bouldersWithLocation.reduce((s, b) => s + (b.lat ?? 0), 0) /
        bouldersWithLocation.length,
      longitude:
        bouldersWithLocation.reduce((s, b) => s + (b.lng ?? 0), 0) /
        bouldersWithLocation.length,
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
    };
    return (
      <>
        <SectorMenu />
        <View style={styles.container}>
        <MapLocationPicker
          visible={locationPickerVisible}
          onClose={() => setLocationPickerVisible(false)}
          onConfirm={async (newLat, newLng) => {
            if (!id) return;
            const { error } = await supabase
              .from('sectors')
              .update({ lat: newLat, lng: newLng })
              .eq('id', id);
            if (!error) {
              setSectorLat(newLat);
              setSectorLng(newLng);
              setLocationPickerVisible(false);
            }
          }}
          initialLat={sectorLat}
          initialLng={sectorLng}
          centerRegion={
            areaPolygonCoords && areaPolygonCoords.length >= 3
              ? regionFromPolygon(areaPolygonCoords)
              : null
          }
          polygonCoords={areaPolygonCoords}
        />
        <View style={styles.map}>
          <SectorMapView
            boulders={bouldersWithLocation.map((b) => ({
              id: b.id,
              name: b.name,
              problem_count: b.problem_count ?? 0,
              lat: b.lat!,
              lng: b.lng!,
            }))}
            region={region}
            sectorId={id ?? ''}
            areaId={areaId ?? ''}
            sectorName={sectorName ?? ''}
            areaName={areaName ?? ''}
            sectorPolygonCoords={sectorPolygonCoords}
          />
        </View>
        </View>
      </>
    );
  }

  return (
    <>
      <SectorMenu />
      <View style={styles.container}>
      <MapLocationPicker
        visible={locationPickerVisible}
        onClose={() => setLocationPickerVisible(false)}
        onConfirm={async (newLat, newLng) => {
          if (!id) return;
          const { error } = await supabase
            .from('sectors')
            .update({ lat: newLat, lng: newLng })
            .eq('id', id);
          if (!error) {
            setSectorLat(newLat);
            setSectorLng(newLng);
            setLocationPickerVisible(false);
          }
        }}
        initialLat={sectorLat}
        initialLng={sectorLng}
        centerRegion={
          areaPolygonCoords && areaPolygonCoords.length >= 3
            ? regionFromPolygon(areaPolygonCoords)
            : null
        }
        polygonCoords={areaPolygonCoords}
      />
      <FlatList
        data={boulders}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
            onPress={() =>
              router.push({
                pathname: '/boulder/[id]',
                params: {
                  id: item.id,
                  sectorId: id,
                  areaId: areaId ?? '',
                  sectorName: sectorName ?? '',
                  areaName: areaName ?? '',
                },
              })
            }
          >
            <View style={styles.cardHeader}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.grade}>
                {item.problem_count} problem{item.problem_count !== 1 ? 's' : ''}
              </Text>
            </View>
            {item.description ? (
              <Text style={styles.description} numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}
          </Pressable>
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No boulders yet</Text>
            {user && (
              <Text style={styles.emptySubtext}>Tap + to add a boulder</Text>
            )}
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
      </View>
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
  list: { padding: 16, paddingBottom: 24 },
  card: {
    padding: 14,
    borderRadius: 11,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    backgroundColor: Colors.dark.card,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.text,
    backgroundColor: 'transparent',
  },
  grade: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.dark.tint,
    backgroundColor: 'transparent',
  },
  description: {
    fontSize: 13,
    opacity: 0.8,
    color: Colors.dark.text,
    backgroundColor: 'transparent',
  },
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
  callout: {
    minWidth: 120,
    padding: 8,
  },
  calloutTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.text,
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
