import { useEffect, useState } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { StyleSheet, FlatList, Pressable, RefreshControl } from 'react-native';
import { Text, View } from '@/components/Themed';
import SectorCard from '@/components/SectorCard';
import BoulderCard from '@/components/BoulderCard';
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

type Sector = {
  id: string;
  name: string;
  description: string | null;
  boulder_count: number;
  sort_order: number;
};

type Boulder = {
  id: string;
  name: string;
  description: string | null;
  avg_grade: number | null;
  vote_count: number;
  sector_id: string | null;
};

function gradeToV(grade: number | null): string {
  if (grade === null || grade === undefined) return '?';
  const v = Math.round(grade * 2) / 2;
  return `V${v}`;
}

export default function AreaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [area, setArea] = useState<Area | null>(null);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [bouldersWithoutSector, setBouldersWithoutSector] = useState<Boulder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();
  const colorScheme = useColorScheme();

  const fetchData = async () => {
    if (!id) return;
    const [areaRes, sectorsRes, bouldersRes] = await Promise.all([
      supabase.from('areas').select('id, name, description, boulder_count').eq('id', id).single(),
      supabase.from('sectors').select('id, name, description, boulder_count, sort_order').eq('area_id', id).order('sort_order'),
      supabase.from('boulders').select('id, name, description, avg_grade, vote_count, sector_id').eq('area_id', id),
    ]);
    if (areaRes.data) setArea(areaRes.data);
    if (sectorsRes.data) setSectors(sectorsRes.data);
    if (bouldersRes.data) {
      setBouldersWithoutSector(bouldersRes.data.filter((b) => !b.sector_id));
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  if (!area) return <View style={styles.container}><Text>Loading...</Text></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{area.name}</Text>
        {area.description ? (
          <Text style={styles.description}>{area.description}</Text>
        ) : null}
        <Text style={styles.count}>{area.boulder_count} boulder{area.boulder_count !== 1 ? 's' : ''}</Text>
      </View>

      <FlatList
        data={sectors}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <SectorCard
            id={item.id}
            areaId={id!}
            name={item.name}
            description={item.description}
            boulderCount={item.boulder_count}
          />
        )}
        ListHeaderComponent={
          <>
            {bouldersWithoutSector.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Boulders (no sector)</Text>
                {bouldersWithoutSector.map((b) => (
                  <BoulderCard
                    key={b.id}
                    id={b.id}
                    name={b.name}
                    grade={gradeToV(b.avg_grade)}
                    voteCount={b.vote_count}
                  />
                ))}
              </View>
            ) : null}
          </>
        }
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />

      {user && (
        <View style={styles.fabRow}>
          <Pressable
            style={[styles.fab, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]}
            onPress={() => router.push({ pathname: '/add/sector', params: { areaId: id } })}
          >
            <FontAwesome name="folder" size={20} color="#fff" />
            <Text style={styles.fabLabel}>Sector</Text>
          </Pressable>
          <Pressable
            style={[styles.fab, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]}
            onPress={() => router.push({ pathname: '/add/boulder', params: { areaId: id } })}
          >
            <FontAwesome name="plus" size={20} color="#fff" />
            <Text style={styles.fabLabel}>Boulder</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    opacity: 0.8,
    marginBottom: 4,
  },
  count: {
    fontSize: 12,
    opacity: 0.6,
  },
  section: {
    padding: 16,
    paddingBottom: 0,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  fabRow: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    flexDirection: 'row',
    gap: 12,
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
