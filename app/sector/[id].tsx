import { useCallback, useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  View,
  Text,
} from 'react-native';
import { useLocalSearchParams, router, useNavigation } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import Colors from '@/constants/Colors';
import { gradeToLabel } from '@/constants/Grades';

type Boulder = {
  id: string;
  name: string;
  description: string | null;
  avg_grade: number | null;
};

export default function SectorDetailScreen() {
  const params = useLocalSearchParams<{
    id: string;
    areaId: string;
    sectorName: string;
    areaName: string;
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
  const hasLoadedOnce = useRef(false);
  const { user } = useAuth();
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({
      title: sectorName || 'Sector',
      headerRight: user
        ? () => (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/add-boulder',
                  params: {
                    sectorId: id,
                    areaId,
                    sectorName: sectorName ?? '',
                    areaName: areaName ?? '',
                  },
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
  }, [sectorName, navigation, user, id, areaId, areaName]);

  const fetchBoulders = async () => {
    if (!id) return;
    const { data } = await supabase
      .from('boulders')
      .select('id, name, description, avg_grade')
      .eq('sector_id', id)
      .order('name');
    setBoulders(data ?? []);
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

  return (
    <View style={styles.container}>
      <FlatList
        data={boulders}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.grade}>{gradeToLabel(item.avg_grade)}</Text>
            </View>
            {item.description ? (
              <Text style={styles.description} numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}
          </View>
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
  headerAdd: {
    fontSize: 28,
    fontWeight: '300',
    color: Colors.dark.text,
    paddingHorizontal: 16,
  },
  text: { color: Colors.dark.text },
});
