import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, FlatList, Pressable, RefreshControl, Text as RNText, View as RNView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { router, useNavigation } from 'expo-router';
import { Text as ThemedText, View } from '@/components/Themed';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import Colors from '@/constants/Colors';

type Area = {
  id: string;
  name: string;
  description: string | null;
  boulder_count: number;
  sectors?: { count: number }[];
};

export default function AreasScreen() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({
      headerRight: user
        ? () => (
            <Pressable
              onPress={() => router.push('/add-area')}
              style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
              hitSlop={12}
            >
              <RNText style={styles.headerAdd}>+</RNText>
            </Pressable>
          )
        : undefined,
    });
  }, [user, navigation]);

  const fetchAreas = async () => {
    const { data } = await supabase
      .from('areas')
      .select('id, name, description, boulder_count, sectors(count)')
      .is('parent_id', null)
      .order('name');
    setAreas(data ?? []);
  };

  useFocusEffect(
    useCallback(() => {
      fetchAreas();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAreas();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={areas}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const sectorCount = item.sectors?.[0]?.count ?? 0;
          return (
            <Pressable
              style={styles.card}
              onPress={() => router.push(`/area/${item.id}`)}
            >
              <ThemedText style={styles.name}>{item.name}</ThemedText>
              {item.description ? (
                <ThemedText style={styles.description} numberOfLines={4}>{item.description}</ThemedText>
              ) : null}
              <RNView style={styles.statsRow}>
                <ThemedText style={[styles.stat, styles.statFirst]}>{sectorCount} sector{sectorCount !== 1 ? 's' : ''}</ThemedText>
                <ThemedText style={styles.stat}>{item.boulder_count} boulder{item.boulder_count !== 1 ? 's' : ''}</ThemedText>
              </RNView>
            </Pressable>
          );
        }}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <ThemedText style={styles.emptyText}>No areas yet</ThemedText>
            {user && <ThemedText style={styles.emptySubtext}>Tap + to add an area</ThemedText>}
          </View>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16, paddingBottom: 24 },
  card: {
    padding: 20,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    backgroundColor: Colors.dark.card,
  },
  name: { fontSize: 22, fontWeight: '600', marginBottom: 8, color: Colors.dark.text, backgroundColor: 'transparent' },
  description: { fontSize: 16, opacity: 0.85, marginBottom: 12, lineHeight: 22, color: Colors.dark.text, backgroundColor: 'transparent' },
  statsRow: { flexDirection: 'row', marginTop: 4, backgroundColor: 'transparent' },
  stat: { fontSize: 14, opacity: 0.7, color: Colors.dark.text, backgroundColor: 'transparent' },
  statFirst: { marginRight: 16 },
  empty: { padding: 48, alignItems: 'center' },
  emptyText: { fontSize: 18, fontWeight: '600', marginBottom: 8, color: Colors.dark.text },
  emptySubtext: { fontSize: 14, opacity: 0.7, color: Colors.dark.text },
  headerAdd: {
    fontSize: 28,
    fontWeight: '300',
    color: Colors.dark.text,
    paddingHorizontal: 16,
  },
});
