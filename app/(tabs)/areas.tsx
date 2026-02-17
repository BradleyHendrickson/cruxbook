import { useCallback, useState } from 'react';
import { StyleSheet, FlatList, Pressable, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { router } from 'expo-router';
import { Text, View } from '@/components/Themed';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Colors from '@/constants/Colors';

type Area = {
  id: string;
  name: string;
  description: string | null;
  boulder_count: number;
};

export default function AreasScreen() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();
  const tabBarHeight = useBottomTabBarHeight();

  const fetchAreas = async () => {
    const { data } = await supabase
      .from('areas')
      .select('id, name, description, boulder_count')
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
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>{item.name}</Text>
            {item.description ? (
              <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
            ) : null}
            <Text style={styles.count}>{item.boulder_count} boulder{item.boulder_count !== 1 ? 's' : ''}</Text>
          </View>
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No areas yet</Text>
            {user && <Text style={styles.emptySubtext}>Tap + to add an area</Text>}
          </View>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />
      {user && (
        <Pressable
          style={[styles.fab, { backgroundColor: Colors.dark.tint, bottom: tabBarHeight + 16 }]}
          onPress={() => router.push('/add-area')}
        >
          <FontAwesome name="plus" size={24} color="#fff" />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16, paddingBottom: 100 },
  card: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    backgroundColor: Colors.dark.card,
  },
  name: { fontSize: 18, fontWeight: '600', marginBottom: 4, color: Colors.dark.text },
  description: { fontSize: 14, opacity: 0.8, marginBottom: 8, color: Colors.dark.text },
  count: { fontSize: 12, opacity: 0.6, color: Colors.dark.text },
  empty: { padding: 48, alignItems: 'center' },
  emptyText: { fontSize: 18, fontWeight: '600', marginBottom: 8, color: Colors.dark.text },
  emptySubtext: { fontSize: 14, opacity: 0.7, color: Colors.dark.text },
  fab: {
    position: 'absolute',
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
