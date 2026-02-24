import { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  Text as RNText,
  View as RNView,
  Modal,
  ActivityIndicator,
  Platform,
  ImageBackground,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router, useNavigation } from 'expo-router';
import { Text as ThemedText, View } from '@/components/Themed';
import { FadeInView, AnimatedPressable } from '@/components/Animated';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import Colors from '@/constants/Colors';

const CARD_HEIGHT = 180;

type Area = {
  id: string;
  name: string;
  description: string | null;
  boulder_count: number;
  lat: number | null;
  lng: number | null;
  photoUrl: string | null;
  sectors?: { count: number }[];
};

export default function AreasScreen() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const { user } = useAuth();
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({
      headerRight: user
        ? () => (
            <RNView style={styles.headerRight}>
              <Pressable
                onPressIn={() => setMenuVisible(true)}
                style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <RNText style={styles.headerActions}>Actions</RNText>
              </Pressable>
            </RNView>
          )
        : undefined,
    });
  }, [navigation, user]);

  const fetchAreas = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const { data: areasData } = await supabase
        .from('areas')
        .select('id, name, description, boulder_count, lat, lng, sectors(count)')
        .is('parent_id', null)
        .order('name');

      const areasList = areasData ?? [];
      const areaIds = areasList.map((a) => a.id);

      let photoByArea: Record<string, string> = {};
      if (areaIds.length > 0) {
        const { data: photosData } = await supabase
          .from('area_photos')
          .select('area_id, url')
          .in('area_id', areaIds)
          .order('created_at', { ascending: true });

        for (const p of photosData ?? []) {
          if (!photoByArea[p.area_id]) photoByArea[p.area_id] = p.url;
        }
      }

      setAreas(
        areasList.map((a) => ({
          ...a,
          photoUrl: photoByArea[a.id] ?? null,
        }))
      );
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchAreas();
    }, [fetchAreas])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAreas(false);
    setRefreshing(false);
  };

  return (
    <>
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
          <RNView style={styles.menuContainer}>
            {user && (
              <Pressable
                style={[styles.menuItem, styles.menuItemLast]}
                onPress={() => {
                  setMenuVisible(false);
                  router.push('/add-area');
                }}
              >
                <FontAwesome name="plus" size={16} color={Colors.dark.tint} />
                <RNText style={styles.menuItemText}>Add Area</RNText>
              </Pressable>
            )}
          </RNView>
        </Pressable>
      </Modal>
      <View style={styles.container}>
        <FlatList
          data={areas}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <FadeInView index={index}>
              <AnimatedPressable
                style={styles.card}
                onPress={() => router.push({ pathname: '/area/[id]', params: { id: item.id } })}
              >
                {item.photoUrl ? (
                  <ImageBackground
                    source={{ uri: item.photoUrl }}
                    style={styles.cardBackground}
                    resizeMode="cover"
                  >
                    <RNView style={styles.cardOverlay} />
                    <RNView style={styles.cardContent}>
                      <ThemedText style={styles.cardTitle}>{item.name}</ThemedText>
                      <RNView style={styles.cardButtons}>
                        {item.lat != null && item.lng != null && (
                          <Pressable
                            style={styles.cardButton}
                            onPress={(e) => {
                              e.stopPropagation();
                              const url =
                                Platform.OS === 'ios'
                                  ? `maps://?daddr=${item.lat},${item.lng}`
                                  : Platform.OS === 'android'
                                    ? `geo:${item.lat},${item.lng}`
                                    : `https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lng}`;
                              Linking.openURL(url);
                            }}
                          >
                            <FontAwesome name="location-arrow" size={14} color="#fff" />
                            <RNText style={styles.cardButtonText}>Navigate</RNText>
                          </Pressable>
                        )}
                        <Pressable
                          style={[styles.cardButton, styles.cardButtonPrimary]}
                          onPress={(e) => {
                            e.stopPropagation();
                            router.push({ pathname: '/area/[id]', params: { id: item.id } });
                          }}
                        >
                          <RNText style={styles.cardButtonTextPrimary}>View details</RNText>
                          <FontAwesome name="chevron-right" size={14} color={Colors.dark.tint} />
                        </Pressable>
                      </RNView>
                    </RNView>
                  </ImageBackground>
                ) : (
                  <RNView style={styles.cardPlaceholder}>
                    <RNView style={styles.cardOverlayLight} />
                    <RNView style={styles.cardContent}>
                      <ThemedText style={styles.cardTitleDark}>{item.name}</ThemedText>
                      <RNView style={styles.cardButtons}>
                        {item.lat != null && item.lng != null && (
                          <Pressable
                            style={styles.cardButton}
                            onPress={(e) => {
                              e.stopPropagation();
                              const url =
                                Platform.OS === 'ios'
                                  ? `maps://?daddr=${item.lat},${item.lng}`
                                  : Platform.OS === 'android'
                                    ? `geo:${item.lat},${item.lng}`
                                    : `https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lng}`;
                              Linking.openURL(url);
                            }}
                          >
                            <FontAwesome name="location-arrow" size={14} color="#fff" />
                            <RNText style={styles.cardButtonText}>Navigate</RNText>
                          </Pressable>
                        )}
                        <Pressable
                          style={[styles.cardButton, styles.cardButtonPrimary]}
                          onPress={(e) => {
                            e.stopPropagation();
                            router.push({ pathname: '/area/[id]', params: { id: item.id } });
                          }}
                        >
                          <RNText style={styles.cardButtonTextPrimary}>View details</RNText>
                          <FontAwesome name="chevron-right" size={14} color={Colors.dark.tint} />
                        </Pressable>
                      </RNView>
                    </RNView>
                  </RNView>
                )}
              </AnimatedPressable>
            </FadeInView>
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              {loading ? (
                <ActivityIndicator size="large" color={Colors.dark.tint} />
              ) : (
                <>
                  <ThemedText style={styles.emptyText}>No areas yet</ThemedText>
                  {user && <ThemedText style={styles.emptySubtext}>Tap Actions to add an area</ThemedText>}
                </>
              )}
            </View>
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16, paddingBottom: 24 },
  card: {
    height: CARD_HEIGHT,
    borderRadius: 14,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  cardBackground: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  cardPlaceholder: {
    flex: 1,
    backgroundColor: Colors.dark.card,
    justifyContent: 'flex-end',
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  cardOverlayLight: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  cardContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 12,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    marginBottom: 12,
  },
  cardTitleDark: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.dark.text,
    marginBottom: 12,
  },
  cardButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  cardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: Colors.dark.tint,
  },
  cardButtonPrimary: {
    backgroundColor: Colors.dark.card,
    borderWidth: 1,
    borderColor: Colors.dark.tint,
  },
  cardButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  cardButtonTextPrimary: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.tint,
  },
  empty: { padding: 48, alignItems: 'center' },
  emptyText: { fontSize: 18, fontWeight: '600', marginBottom: 8, color: Colors.dark.text },
  emptySubtext: { fontSize: 14, opacity: 0.7, color: Colors.dark.text },
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
});
