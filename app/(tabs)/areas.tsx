import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, FlatList, Pressable, RefreshControl, Text as RNText, View as RNView, Modal } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
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
        renderItem={({ item }) => {
          const sectorCount = item.sectors?.[0]?.count ?? 0;
          return (
            <Pressable
              style={styles.card}
              onPress={() => router.push({ pathname: '/area/[id]', params: { id: item.id } })}
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
            {user && <ThemedText style={styles.emptySubtext}>Tap Actions to add an area</ThemedText>}
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
