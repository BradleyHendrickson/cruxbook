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
} from 'react-native';
import * as Linking from 'expo-linking';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import AreaMapView from '@/components/AreaMapView';
import MapLocationPicker from '@/components/MapLocationPicker';
import { useLocalSearchParams, router, useNavigation } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Text as ThemedText } from '@/components/Themed';
import { supabase } from '@/lib/supabase';
import { gradeToLabel } from '@/constants/Grades';
import { useAuth } from '@/lib/auth-context';
import Colors from '@/constants/Colors';

type Sector = {
  id: string;
  name: string;
  description: string | null;
  boulder_count: number;
  lat: number | null;
  lng: number | null;
};

type BoulderMarker = {
  id: string;
  name: string;
  avg_grade: number | null;
  lat: number;
  lng: number;
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
  const [viewMode, setViewMode] = useState<'list' | 'map'>(
    openMap === '1' ? 'map' : 'list'
  );
  const [areaLat, setAreaLat] = useState<number | null>(null);
  const [areaLng, setAreaLng] = useState<number | null>(null);
  const [locationPickerVisible, setLocationPickerVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const hasLoadedOnce = useRef(false);
  const { user } = useAuth();
  const navigation = useNavigation();

  const sectorsWithLocation = sectors.filter(
    (s) => s.lat != null && s.lng != null
  );
  const mapItems = [...sectorsWithLocation, ...boulders];

  useEffect(() => {
    navigation.setOptions({
      title: areaName || 'Area',
      headerRight: () => (
        <View style={styles.headerRight}>
          <Pressable
            onPress={() => setMenuVisible(true)}
            style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
            hitSlop={8}
          >
            <Text style={styles.headerActions}>Actions</Text>
          </Pressable>
        </View>
      ),
    });
  }, [areaName, navigation, id]);

  const fetchAreaAndSectors = async () => {
    if (!id) return;
    const { data: areaData } = await supabase
      .from('areas')
      .select('name, lat, lng')
      .eq('id', id)
      .single();
    setAreaName(areaData?.name ?? 'Area');
    setAreaLat(areaData?.lat ?? null);
    setAreaLng(areaData?.lng ?? null);

    const { data: sectorsData } = await supabase
      .from('sectors')
      .select('id, name, description, boulder_count, lat, lng')
      .eq('area_id', id)
      .order('sort_order')
      .order('name');
    setSectors(sectorsData ?? []);

    const { data: bouldersData } = await supabase
      .from('boulders')
      .select('id, name, avg_grade, lat, lng')
      .eq('area_id', id)
      .not('lat', 'is', null)
      .not('lng', 'is', null);
    setBoulders(
      (bouldersData ?? []).map((b) => ({
        id: b.id,
        name: b.name,
        avg_grade: b.avg_grade,
        lat: b.lat!,
        lng: b.lng!,
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
              !(areaLat != null && areaLng != null) && !user && styles.menuItemLast,
            ]}
            onPress={() => {
              setMenuVisible(false);
              setViewMode((m) => (m === 'list' ? 'map' : 'list'));
            }}
          >
            <FontAwesome name="map" size={16} color={Colors.dark.tint} />
            <Text style={styles.menuItemText}>
              {viewMode === 'list' ? 'View Area Map' : 'View List'}
            </Text>
          </Pressable>
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

  if (viewMode === 'map') {
    if (mapItems.length === 0) {
      return (
        <>
          <AreaMenu />
          <View style={styles.container}>
          <View style={styles.emptyMap}>
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
    const lats = mapItems.map((i) =>
      'boulder_count' in i ? (i as Sector).lat! : (i as BoulderMarker).lat
    );
    const lngs = mapItems.map((i) =>
      'boulder_count' in i ? (i as Sector).lng! : (i as BoulderMarker).lng
    );
    const region = {
      latitude: lats.reduce((a, b) => a + b, 0) / lats.length,
      longitude: lngs.reduce((a, b) => a + b, 0) / lngs.length,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    };
    return (
      <>
        <AreaMenu />
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
        />
        <View style={styles.map}>
          <AreaMapView
            sectors={sectorsWithLocation.map((s) => ({
              id: s.id,
              name: s.name,
              boulder_count: s.boulder_count,
              lat: s.lat!,
              lng: s.lng!,
            }))}
            boulders={boulders}
            region={region}
            areaId={id ?? ''}
            areaName={areaName}
          />
        </View>
      </View>
      </>
    );
  }

  return (
    <>
      <AreaMenu />
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
      />
      <FlatList
        data={sectors}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() =>
              router.push({
                pathname: `/sector/${item.id}`,
                params: {
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
    </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
