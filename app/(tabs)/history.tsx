import { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  View,
  Text,
  Platform,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';
import { Text as ThemedText } from '@/components/Themed';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import Colors from '@/constants/Colors';

const OUTCOMES: { value: string; label: string }[] = [
  { value: 'flash', label: 'Flash' },
  { value: 'send', label: 'Send' },
  { value: 'attempt', label: 'Attempt' },
];

type ClimbLog = {
  id: string;
  outcome: string;
  rating: number | null;
  notes: string | null;
  logged_at: string;
  problem_id: string;
  problems: {
    name: string;
    boulders: {
      areas: { name: string } | null;
      sectors: { name: string } | null;
    } | null;
  } | null;
};

export default function HistoryScreen() {
  const [logs, setLogs] = useState<ClimbLog[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [outcomeFilter, setOutcomeFilter] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchLogs = useCallback(async () => {
    if (!user) {
      setLogs([]);
      setLoading(false);
      return;
    }
    let query = supabase
      .from('climb_logs')
      .select(`
        id,
        outcome,
        rating,
        notes,
        logged_at,
        problem_id,
        problems(
          name,
          boulders(
            areas(name),
            sectors(name)
          )
        )
      `)
      .eq('user_id', user.id)
      .order('logged_at', { ascending: false });

    if (outcomeFilter) {
      query = query.eq('outcome', outcomeFilter);
    }

    const { data } = await query;
    setLogs((data ?? []) as unknown as ClimbLog[]);
    setLoading(false);
  }, [user?.id, outcomeFilter]);

  useEffect(() => {
    setLoading(true);
    fetchLogs();
  }, [fetchLogs]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLogs();
    setRefreshing(false);
  };

  if (!user) {
    return (
      <View style={styles.center}>
        <ThemedText style={styles.emptyText}>Sign in to view your climbing history</ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.filterRow}>
        <Pressable
          style={[styles.filterChip, !outcomeFilter && styles.filterChipSelected]}
          onPress={() => setOutcomeFilter(null)}
        >
          <Text style={[styles.filterText, !outcomeFilter && styles.filterTextSelected]}>
            All
          </Text>
        </Pressable>
        {OUTCOMES.map((o) => (
          <Pressable
            key={o.value}
            style={[styles.filterChip, outcomeFilter === o.value && styles.filterChipSelected]}
            onPress={() => setOutcomeFilter(outcomeFilter === o.value ? null : o.value)}
          >
            <Text
              style={[
                styles.filterText,
                outcomeFilter === o.value && styles.filterTextSelected,
              ]}
            >
              {o.label}
            </Text>
          </Pressable>
        ))}
      </View>
      {loading ? (
        <View style={styles.center}>
          <ThemedText style={styles.emptyText}>Loading...</ThemedText>
        </View>
      ) : logs.length === 0 ? (
        <View style={styles.center}>
          <FontAwesome name="bookmark-o" size={48} color={Colors.dark.text} style={{ opacity: 0.4 }} />
          <ThemedText style={styles.emptyText}>
            No climbs logged yet
          </ThemedText>
          <ThemedText style={styles.emptySubtext}>
            Log your sends from any problem page
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          renderItem={({ item }) => {
            const p = item.problems;
            const b = p?.boulders;
            const areaName = b?.areas?.name ?? '';
            const sectorName = b?.sectors?.name ?? '';
            const breadcrumb = [areaName, sectorName].filter(Boolean).join(' › ');
            const outcomeLabel = OUTCOMES.find((o) => o.value === item.outcome)?.label ?? item.outcome;
            return (
              <Pressable
                style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
                onPress={() =>
                  router.push({
                    pathname: '/problem/[id]',
                    params: {
                      id: item.problem_id,
                      sectorName: sectorName || '',
                      areaName: areaName || '',
                    },
                  })
                }
              >
                <View style={styles.cardHeader}>
                  <ThemedText style={styles.boulderName}>{p?.name ?? 'Unknown'}</ThemedText>
                  <View style={styles.outcomeBadge}>
                    <Text style={styles.outcomeText}>{outcomeLabel}</Text>
                  </View>
                </View>
                {breadcrumb ? (
                  <ThemedText style={styles.breadcrumb}>{breadcrumb}</ThemedText>
                ) : null}
                <View style={styles.cardFooter}>
                  <Text style={styles.date}>
                    {new Date(item.logged_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </Text>
                  {item.rating != null && (
                    <View style={styles.ratingRow}>
                      <FontAwesome name="star" size={12} color={Colors.dark.tint} />
                      <Text style={styles.ratingText}>{item.rating}</Text>
                    </View>
                  )}
                </View>
                {item.notes ? (
                  <ThemedText style={styles.notes} numberOfLines={2}>
                    {item.notes}
                  </ThemedText>
                ) : null}
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
    marginTop: 8,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 16,
    paddingBottom: 8,
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    backgroundColor: Colors.dark.card,
  },
  filterChipSelected: {
    borderColor: Colors.dark.tint,
    backgroundColor: 'rgba(90, 138, 90, 0.15)',
  },
  filterText: {
    fontSize: 14,
    color: Colors.dark.text,
  },
  filterTextSelected: {
    color: Colors.dark.tint,
    fontWeight: '600',
  },
  list: { padding: 16, paddingBottom: 24 },
  card: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    backgroundColor: Colors.dark.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  boulderName: {
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
  },
  outcomeBadge: {
    backgroundColor: 'rgba(90, 138, 90, 0.2)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  outcomeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.dark.tint,
  },
  breadcrumb: {
    fontSize: 13,
    opacity: 0.8,
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  date: {
    fontSize: 13,
    opacity: 0.7,
    color: Colors.dark.text,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 13,
    color: Colors.dark.tint,
    fontWeight: '600',
  },
  notes: {
    fontSize: 14,
    opacity: 0.85,
    marginTop: 8,
    fontStyle: 'italic',
  },
});
