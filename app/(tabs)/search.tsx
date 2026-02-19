import { useState, useCallback } from 'react';
import {
  StyleSheet,
  TextInput,
  Pressable,
  FlatList,
  ActivityIndicator,
  Modal,
  ScrollView,
  View as RNView,
  Keyboard,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';
import { Text as ThemedText, View } from '@/components/Themed';
import { useProblemSearch } from '@/lib/useProblemSearch';
import { GRADES, gradeToLabel } from '@/constants/Grades';
import { STYLES } from '@/constants/Styles';
import Colors from '@/constants/Colors';
import type { SortOption, SearchTypes } from '@/lib/useProblemSearch';
import type { StyleValue } from '@/constants/Styles';

const GRADE_NONE = -1;

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [minGrade, setMinGrade] = useState<number>(GRADE_NONE);
  const [maxGrade, setMaxGrade] = useState<number>(GRADE_NONE);
  const [selectedStyles, setSelectedStyles] = useState<StyleValue[]>([]);
  const [sort, setSort] = useState<SortOption>('popularity');
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [searchTypes, setSearchTypes] = useState<SearchTypes>({
    areas: true,
    sectors: true,
    problems: true,
  });

  const { results, loading, fetchLocation, locationError } = useProblemSearch({
    query,
    minGrade: minGrade === GRADE_NONE ? null : minGrade,
    maxGrade: maxGrade === GRADE_NONE ? null : maxGrade,
    styles: selectedStyles,
    sort,
    userLat,
    userLng,
    searchTypes,
  });

  const handleNearMe = useCallback(async () => {
    Keyboard.dismiss();
    const loc = await fetchLocation();
    if (loc) {
      setUserLat(loc.lat);
      setUserLng(loc.lng);
      setSort('proximity');
    }
  }, [fetchLocation]);

  const toggleStyle = (value: StyleValue) => {
    setSelectedStyles((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value]
    );
  };

  const clearFilters = useCallback(() => {
    setMinGrade(GRADE_NONE);
    setMaxGrade(GRADE_NONE);
    setSelectedStyles([]);
    setSort('popularity');
    setUserLat(null);
    setUserLng(null);
    setSearchTypes({ areas: true, sectors: true, problems: true });
    setFilterModalVisible(false);
  }, []);

  const toggleSearchType = (key: keyof SearchTypes) => {
    setSearchTypes((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const hasSearchTypeFilter = !searchTypes.areas || !searchTypes.sectors || !searchTypes.problems;

  const hasActiveFilters =
    minGrade !== GRADE_NONE ||
    maxGrade !== GRADE_NONE ||
    selectedStyles.length > 0 ||
    sort === 'proximity' ||
    hasSearchTypeFilter;

  const listData: { type: 'area' | 'sector' | 'problem'; item: unknown }[] = [
    ...results.areas.map((a) => ({ type: 'area' as const, item: a })),
    ...results.sectors.map((s) => ({ type: 'sector' as const, item: s })),
    ...results.problems.map((p) => ({ type: 'problem' as const, item: p })),
  ];

  const renderItem = ({
    item: { type, item },
  }: {
    item: { type: 'area' | 'sector' | 'problem'; item: unknown };
  }) => {
    const i = item as { id: string; name: string; area_name?: string; sector_name?: string; avg_grade?: number | null; vote_count?: number };
    const subtitle =
      type === 'sector'
        ? i.area_name
        : type === 'problem'
          ? [i.area_name, i.sector_name].filter(Boolean).join(' › ') +
            (i.avg_grade != null ? ` · ${gradeToLabel(i.avg_grade)}` : '')
          : undefined;

    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
        onPress={() => {
          if (type === 'area') {
            router.push({ pathname: '/area/[id]', params: { id: i.id } });
          } else if (type === 'sector') {
            const s = item as { id: string; area_id: string; area_name: string };
            router.push({
              pathname: '/sector/[id]',
              params: { id: s.id, areaId: s.area_id, sectorName: i.name, areaName: s.area_name },
            });
          } else {
            const p = item as { id: string; sector_name: string | null; area_name: string };
            router.push({
              pathname: '/problem/[id]',
              params: {
                id: p.id,
                sectorName: p.sector_name ?? '',
                areaName: p.area_name,
              },
            });
          }
        }}
      >
        <ThemedText style={styles.cardName}>{i.name}</ThemedText>
        {subtitle && (
          <ThemedText style={styles.cardSubtitle}>{subtitle}</ThemedText>
        )}
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <FontAwesome name="search" size={18} color={Colors.dark.text} style={styles.searchIcon} />
        <TextInput
          style={styles.input}
          placeholder="Search areas, sectors, problems..."
          placeholderTextColor="rgba(196, 167, 125, 0.5)"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          underlineColorAndroid="transparent"
        />
      </View>

      <View style={styles.searchTypesRow}>
        <Pressable
          style={[styles.searchTypeChip, searchTypes.areas && styles.searchTypeChipActive]}
          onPress={() => toggleSearchType('areas')}
        >
          <ThemedText style={[styles.searchTypeText, searchTypes.areas && styles.searchTypeTextActive]}>
            Areas
          </ThemedText>
        </Pressable>
        <Pressable
          style={[styles.searchTypeChip, searchTypes.sectors && styles.searchTypeChipActive]}
          onPress={() => toggleSearchType('sectors')}
        >
          <ThemedText style={[styles.searchTypeText, searchTypes.sectors && styles.searchTypeTextActive]}>
            Sectors
          </ThemedText>
        </Pressable>
        <Pressable
          style={[styles.searchTypeChip, searchTypes.problems && styles.searchTypeChipActive]}
          onPress={() => toggleSearchType('problems')}
        >
          <ThemedText style={[styles.searchTypeText, searchTypes.problems && styles.searchTypeTextActive]}>
            Problems
          </ThemedText>
        </Pressable>
      </View>

      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [
            styles.actionButton,
            (userLat != null || sort === 'proximity') && styles.actionButtonActive,
            pressed && { opacity: 0.8 },
          ]}
          onPress={handleNearMe}
          hitSlop={12}
        >
          <FontAwesome
            name="location-arrow"
            size={14}
            color={sort === 'proximity' ? Colors.dark.tint : Colors.dark.text}
          />
          <ThemedText style={[styles.actionButtonText, sort === 'proximity' && styles.actionButtonTextActive]}>
            Near me
          </ThemedText>
        </Pressable>
        {locationError && (
          <ThemedText style={styles.locationError}>{locationError}</ThemedText>
        )}
        <Pressable
          style={({ pressed }) => [
            styles.actionButton,
            hasActiveFilters && styles.actionButtonActive,
            pressed && { opacity: 0.8 },
          ]}
          onPress={() => setFilterModalVisible(true)}
          hitSlop={12}
        >
          <FontAwesome name="sliders" size={14} color={Colors.dark.text} />
          <ThemedText style={styles.actionButtonText}>Filters</ThemedText>
        </Pressable>
        {hasActiveFilters && (
          <Pressable
            onPress={clearFilters}
            hitSlop={12}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
          >
            <ThemedText style={styles.clearButton}>Clear</ThemedText>
          </Pressable>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.dark.tint} />
        </View>
      ) : listData.length === 0 ? (
        <View style={styles.empty}>
          <ThemedText style={styles.emptyText}>
            {query.length >= 2 || (userLat != null && sort === 'proximity')
              ? 'No results found'
              : 'Try searching by name or tap "Near me"'}
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item) => `${item.type}-${(item.item as { id: string }).id}`}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}

      <Modal
        visible={filterModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setFilterModalVisible(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <RNView style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Filters</ThemedText>
              <RNView style={styles.modalHeaderActions}>
                {hasActiveFilters && (
                  <Pressable onPress={clearFilters} hitSlop={8}
                    style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
                    <ThemedText style={styles.clearButton}>Clear</ThemedText>
                  </Pressable>
                )}
                <Pressable onPress={() => setFilterModalVisible(false)} hitSlop={8}>
                  <ThemedText style={styles.modalCloseText}>Done</ThemedText>
                </Pressable>
              </RNView>
            </RNView>
            <ScrollView style={styles.modalBody}>
              <RNView>
              <ThemedText style={styles.filterLabel}>Search in</ThemedText>
              <RNView style={styles.searchTypesChips}>
                <Pressable
                  style={[styles.chip, searchTypes.areas && styles.chipSelected]}
                  onPress={() => toggleSearchType('areas')}
                >
                  <ThemedText style={styles.chipText}>Areas</ThemedText>
                </Pressable>
                <Pressable
                  style={[styles.chip, searchTypes.sectors && styles.chipSelected]}
                  onPress={() => toggleSearchType('sectors')}
                >
                  <ThemedText style={styles.chipText}>Sectors</ThemedText>
                </Pressable>
                <Pressable
                  style={[styles.chip, searchTypes.problems && styles.chipSelected]}
                  onPress={() => toggleSearchType('problems')}
                >
                  <ThemedText style={styles.chipText}>Problems</ThemedText>
                </Pressable>
              </RNView>

              <ThemedText style={styles.filterLabel}>Grade range</ThemedText>
              <RNView style={styles.gradeRow}>
                <RNView style={styles.gradeHalf}>
                  <ThemedText style={styles.gradeSubLabel}>Min</ThemedText>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <RNView style={styles.gradeChips}>
                      <Pressable
                        style={[styles.chip, minGrade === GRADE_NONE && styles.chipSelected]}
                        onPress={() => setMinGrade(GRADE_NONE)}
                      >
                        <ThemedText style={styles.chipText}>Any</ThemedText>
                      </Pressable>
                      {GRADES.map((g) => (
                        <Pressable
                          key={g.label}
                          style={[styles.chip, minGrade === g.value && styles.chipSelected]}
                          onPress={() => setMinGrade(g.value)}
                        >
                          <ThemedText style={styles.chipText}>{g.label}</ThemedText>
                        </Pressable>
                      ))}
                    </RNView>
                  </ScrollView>
                </RNView>
                <RNView style={styles.gradeHalf}>
                  <ThemedText style={styles.gradeSubLabel}>Max</ThemedText>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <RNView style={styles.gradeChips}>
                      <Pressable
                        style={[styles.chip, maxGrade === GRADE_NONE && styles.chipSelected]}
                        onPress={() => setMaxGrade(GRADE_NONE)}
                      >
                        <ThemedText style={styles.chipText}>Any</ThemedText>
                      </Pressable>
                      {GRADES.map((g) => (
                        <Pressable
                          key={g.label}
                          style={[styles.chip, maxGrade === g.value && styles.chipSelected]}
                          onPress={() => setMaxGrade(g.value)}
                        >
                          <ThemedText style={styles.chipText}>{g.label}</ThemedText>
                        </Pressable>
                      ))}
                    </RNView>
                  </ScrollView>
                </RNView>
              </RNView>

              <ThemedText style={styles.filterLabel}>Style</ThemedText>
              <RNView style={styles.styleChips}>
                {STYLES.map((s) => (
                  <Pressable
                    key={s.value}
                    style={[styles.chip, selectedStyles.includes(s.value) && styles.chipSelected]}
                    onPress={() => toggleStyle(s.value)}
                  >
                    <ThemedText style={styles.chipText}>{s.label}</ThemedText>
                  </Pressable>
                ))}
              </RNView>

              <ThemedText style={styles.filterLabel}>Sort by</ThemedText>
              <RNView style={styles.sortRow}>
                <Pressable
                  style={[styles.sortButton, sort === 'popularity' && styles.sortButtonSelected]}
                  onPress={() => setSort('popularity')}
                >
                  <ThemedText style={[styles.sortText, sort === 'popularity' && styles.sortTextSelected]}>
                    Popularity
                  </ThemedText>
                </Pressable>
                <Pressable
                  style={[styles.sortButton, sort === 'proximity' && styles.sortButtonSelected]}
                  onPress={() => setSort('proximity')}
                >
                  <ThemedText style={[styles.sortText, sort === 'proximity' && styles.sortTextSelected]}>
                    Proximity
                  </ThemedText>
                </Pressable>
              </RNView>
              </RNView>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.dark.inputBorder,
    borderRadius: 8,
    paddingHorizontal: 14,
    backgroundColor: Colors.dark.card,
  },
  searchIcon: { marginRight: 10 },
  searchTypesRow: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  searchTypeChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    backgroundColor: Colors.dark.card,
  },
  searchTypeChipActive: {
    borderColor: Colors.dark.tint,
    backgroundColor: 'rgba(90, 138, 90, 0.15)',
  },
  searchTypeText: { fontSize: 13, backgroundColor: 'transparent' },
  searchTypeTextActive: { color: Colors.dark.tint, fontWeight: '600', backgroundColor: 'transparent' },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 0,
    fontSize: 16,
    color: Colors.dark.text,
    backgroundColor: 'transparent',
    minHeight: 44,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    backgroundColor: Colors.dark.card,
  },
  actionButtonActive: {
    borderColor: Colors.dark.tint,
  },
  actionButtonText: { fontSize: 14, backgroundColor: 'transparent' },
  actionButtonTextActive: { color: Colors.dark.tint, fontWeight: '600', backgroundColor: 'transparent' },
  locationError: { fontSize: 12, flex: 1, color: Colors.dark.error, backgroundColor: 'transparent' },
  list: { padding: 16, paddingBottom: 24 },
  card: {
    padding: 18,
    borderRadius: 13,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    backgroundColor: Colors.dark.card,
  },
  cardName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
    backgroundColor: 'transparent',
  },
  cardSubtitle: {
    fontSize: 14,
    opacity: 0.75,
    backgroundColor: 'transparent',
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { padding: 48, alignItems: 'center' },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    opacity: 0.85,
    backgroundColor: 'transparent',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.dark.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.cardBorder,
  },
  modalTitle: { fontSize: 18, fontWeight: '600', color: Colors.dark.text, backgroundColor: 'transparent' },
  modalHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  modalCloseText: { fontSize: 16, color: Colors.dark.tint, fontWeight: '600', backgroundColor: 'transparent' },
  clearButton: { fontSize: 16, color: Colors.dark.tint, fontWeight: '600', backgroundColor: 'transparent' },
  modalBody: { padding: 16 },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
  searchTypesChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gradeRow: { flexDirection: 'row', gap: 12 },
  gradeHalf: { flex: 1 },
  gradeSubLabel: { fontSize: 12, opacity: 0.7, marginBottom: 4, backgroundColor: 'transparent' },
  gradeChips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  styleChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    backgroundColor: Colors.dark.card,
  },
  chipSelected: {
    borderColor: Colors.dark.tint,
    backgroundColor: 'rgba(90, 138, 90, 0.15)',
  },
  chipText: { fontSize: 14, backgroundColor: 'transparent' },
  sortRow: { flexDirection: 'row', gap: 12 },
  sortButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    backgroundColor: Colors.dark.card,
  },
  sortButtonSelected: {
    borderColor: Colors.dark.tint,
    backgroundColor: 'rgba(90, 138, 90, 0.15)',
  },
  sortText: { fontSize: 14, backgroundColor: 'transparent' },
  sortTextSelected: { color: Colors.dark.tint, fontWeight: '600', backgroundColor: 'transparent' },
});
