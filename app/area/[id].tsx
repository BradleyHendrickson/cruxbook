import { useCallback, useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Text,
} from 'react-native';
import { useLocalSearchParams, router, useNavigation } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Text as ThemedText, View } from '@/components/Themed';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import Colors from '@/constants/Colors';

type Sector = {
  id: string;
  name: string;
  description: string | null;
  boulder_count: number;
};

export default function AreaDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = typeof params.id === 'string' ? params.id : params.id?.[0];
  const [areaName, setAreaName] = useState<string>('');
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const hasLoadedOnce = useRef(false);
  const { user } = useAuth();
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({
      title: areaName || 'Area',
      headerRight: user
        ? () => (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/add-sector',
                  params: { areaId: id, areaName },
                })
              }
              style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
              hitSlop={12}
            >
              <Text style={styles.headerAdd}>+</Text>
            </Pressable>
          )
        : undefined,
    });
  }, [areaName, navigation, user, id]);

  const fetchAreaAndSectors = async () => {
    if (!id) return;
    const { data: areaData } = await supabase
      .from('areas')
      .select('name')
      .eq('id', id)
      .single();
    setAreaName(areaData?.name ?? 'Area');

    const { data: sectorsData } = await supabase
      .from('sectors')
      .select('id, name, description, boulder_count')
      .eq('area_id', id)
      .order('sort_order')
      .order('name');
    setSectors(sectorsData ?? []);
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

  return (
    <View style={styles.container}>
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
  headerAdd: {
    fontSize: 28,
    fontWeight: '300',
    color: Colors.dark.text,
    paddingHorizontal: 16,
  },
  text: { color: Colors.dark.text },
});
