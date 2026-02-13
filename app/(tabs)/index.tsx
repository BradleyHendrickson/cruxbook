import { useEffect, useState } from 'react';
import { StyleSheet, FlatList, Pressable, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Text, View } from '@/components/Themed';
import AreaCard from '@/components/AreaCard';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

type Area = {
  id: string;
  name: string;
  description: string | null;
  boulder_count: number;
};

export default function ExploreScreen() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();
  const colorScheme = useColorScheme();

  const fetchAreas = async () => {
    const { data, error } = await supabase
      .from('areas')
      .select('id, name, description, boulder_count')
      .is('parent_id', null)
      .order('name');

    if (error) {
      console.error('Error fetching areas:', error);
      return;
    }
    setAreas(data ?? []);
  };

  useEffect(() => {
    fetchAreas();
  }, []);

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
          <AreaCard
            id={item.id}
            name={item.name}
            description={item.description}
            boulderCount={item.boulder_count}
          />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No areas yet</Text>
              <Text style={styles.emptySubtext}>
                {user ? 'Tap + to add the first area' : 'Sign in to add areas'}
              </Text>
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
      {user && (
        <Pressable
          style={[styles.fab, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]}
          onPress={() => router.push('/add/area')}
        >
          <FontAwesome name="plus" size={24} color="#fff" />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    padding: 16,
    paddingBottom: 80,
  },
  empty: {
    padding: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    opacity: 0.7,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
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
