import {
  StyleSheet,
  TextInput,
  Pressable,
  Modal,
  ScrollView,
  View as RNView,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Text as ThemedText } from '@/components/Themed';
import { GRADES } from '@/constants/Grades';
import { STYLES } from '@/constants/Styles';
import Colors from '@/constants/Colors';
import type { StyleValue } from '@/constants/Styles';

const GRADE_NONE = -1;

type Sector = { id: string; name: string };
type Boulder = { id: string; name: string };

type AreaProblemsFiltersProps = {
  query: string;
  onQueryChange: (q: string) => void;
  minGrade: number | null;
  maxGrade: number | null;
  onMinGradeChange: (v: number | null) => void;
  onMaxGradeChange: (v: number | null) => void;
  selectedStyles: StyleValue[];
  onStylesChange: (styles: StyleValue[]) => void;
  sectorId: string | null;
  onSectorChange: (id: string | null) => void;
  sectors: Sector[];
  boulders: Boulder[];
  boulderFilterId: string | null;
  onBoulderChange: (id: string | null) => void;
  onClear: () => void;
  filterModalVisible: boolean;
  onFilterModalVisibleChange: (v: boolean) => void;
};

export default function AreaProblemsFilters({
  query,
  onQueryChange,
  minGrade,
  maxGrade,
  onMinGradeChange,
  onMaxGradeChange,
  selectedStyles,
  onStylesChange,
  sectorId,
  onSectorChange,
  sectors,
  boulders,
  boulderFilterId,
  onBoulderChange,
  onClear,
  filterModalVisible,
  onFilterModalVisibleChange,
}: AreaProblemsFiltersProps) {
  const toggleStyle = (value: StyleValue) => {
    onStylesChange(
      selectedStyles.includes(value)
        ? selectedStyles.filter((s) => s !== value)
        : [...selectedStyles, value]
    );
  };

  const hasActiveFilters =
    query.trim().length >= 2 ||
    (minGrade != null && minGrade !== GRADE_NONE) ||
    (maxGrade != null && maxGrade !== GRADE_NONE) ||
    selectedStyles.length > 0 ||
    sectorId != null ||
    !!boulderFilterId;

  const handleClear = () => {
    onQueryChange('');
    onMinGradeChange(null);
    onMaxGradeChange(null);
    onStylesChange([]);
    onSectorChange(null);
    onBoulderChange(null);
    onClear();
    onFilterModalVisibleChange(false);
  };

  const minVal = minGrade === GRADE_NONE || minGrade == null ? GRADE_NONE : minGrade;
  const maxVal = maxGrade === GRADE_NONE || maxGrade == null ? GRADE_NONE : maxGrade;

  return (
    <>
      <RNView style={styles.searchRow}>
        <RNView style={styles.searchBar}>
          <FontAwesome name="search" size={16} color={Colors.dark.text} style={styles.searchIcon} />
          <TextInput
            style={styles.input}
            placeholder="Search problems..."
            placeholderTextColor="rgba(196, 167, 125, 0.5)"
            value={query}
            onChangeText={onQueryChange}
            autoCapitalize="none"
            autoCorrect={false}
            underlineColorAndroid="transparent"
          />
        </RNView>
        <Pressable
          style={[styles.filterButton, hasActiveFilters && styles.filterButtonActive]}
          onPress={() => onFilterModalVisibleChange(true)}
        >
          <FontAwesome name="sliders" size={14} color={Colors.dark.text} />
          <ThemedText style={styles.filterButtonText}>Filters</ThemedText>
        </Pressable>
        {hasActiveFilters && (
          <Pressable onPress={handleClear} hitSlop={8} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
            <ThemedText style={styles.clearButton}>Clear</ThemedText>
          </Pressable>
        )}
      </RNView>

      <Modal
        visible={filterModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => onFilterModalVisibleChange(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => onFilterModalVisibleChange(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <RNView style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Filters</ThemedText>
              <RNView style={styles.modalHeaderActions}>
                {hasActiveFilters && (
                  <Pressable onPress={handleClear} hitSlop={8} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
                    <ThemedText style={styles.clearButton}>Clear</ThemedText>
                  </Pressable>
                )}
                <Pressable onPress={() => onFilterModalVisibleChange(false)} hitSlop={8}>
                  <ThemedText style={styles.modalCloseText}>Done</ThemedText>
                </Pressable>
              </RNView>
            </RNView>
            <ScrollView style={styles.modalBody}>
              <RNView>
                <ThemedText style={styles.filterLabel}>Grade range</ThemedText>
                <RNView style={styles.gradeRow}>
                  <RNView style={styles.gradeHalf}>
                    <ThemedText style={styles.gradeSubLabel}>Min</ThemedText>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <RNView style={styles.gradeChips}>
                        <Pressable
                          style={[styles.chip, minVal === GRADE_NONE && styles.chipSelected]}
                          onPress={() => onMinGradeChange(null)}
                        >
                          <ThemedText style={styles.chipText}>Any</ThemedText>
                        </Pressable>
                        {GRADES.map((g) => (
                          <Pressable
                            key={g.label}
                            style={[styles.chip, minVal === g.value && styles.chipSelected]}
                            onPress={() => onMinGradeChange(g.value)}
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
                          style={[styles.chip, maxVal === GRADE_NONE && styles.chipSelected]}
                          onPress={() => onMaxGradeChange(null)}
                        >
                          <ThemedText style={styles.chipText}>Any</ThemedText>
                        </Pressable>
                        {GRADES.map((g) => (
                          <Pressable
                            key={g.label}
                            style={[styles.chip, maxVal === g.value && styles.chipSelected]}
                            onPress={() => onMaxGradeChange(g.value)}
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

                {sectors.length > 0 && (
                  <>
                    <ThemedText style={styles.filterLabel}>Sector</ThemedText>
                    <RNView style={styles.sectorChips}>
                      <Pressable
                        style={[styles.chip, !sectorId && styles.chipSelected]}
                        onPress={() => onSectorChange(null)}
                      >
                        <ThemedText style={styles.chipText}>All sectors</ThemedText>
                      </Pressable>
                      {sectors.map((s) => (
                        <Pressable
                          key={s.id}
                          style={[styles.chip, sectorId === s.id && styles.chipSelected]}
                          onPress={() => onSectorChange(s.id)}
                        >
                          <ThemedText style={styles.chipText}>{s.name}</ThemedText>
                        </Pressable>
                      ))}
                    </RNView>
                  </>
                )}

                {boulders.length > 0 && (
                  <>
                    <ThemedText style={styles.filterLabel}>Boulder</ThemedText>
                    <RNView style={styles.boulderChips}>
                      <Pressable
                        style={[styles.chip, !boulderFilterId && styles.chipSelected]}
                        onPress={() => onBoulderChange(null)}
                      >
                        <ThemedText style={styles.chipText}>All boulders</ThemedText>
                      </Pressable>
                      {boulders.map((b) => (
                        <Pressable
                          key={b.id}
                          style={[styles.chip, boulderFilterId === b.id && styles.chipSelected]}
                          onPress={() => onBoulderChange(b.id)}
                        >
                          <ThemedText style={styles.chipText}>{b.name}</ThemedText>
                        </Pressable>
                      ))}
                    </RNView>
                  </>
                )}
              </RNView>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.dark.inputBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: Colors.dark.card,
  },
  searchIcon: { marginRight: 8 },
  input: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 0,
    fontSize: 15,
    color: Colors.dark.text,
    backgroundColor: 'transparent',
    minHeight: 40,
  },
  filterButton: {
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
  filterButtonActive: {
    borderColor: Colors.dark.tint,
  },
  filterButtonText: { fontSize: 14, color: Colors.dark.text },
  clearButton: { fontSize: 16, color: Colors.dark.tint, fontWeight: '600' },
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
  modalTitle: { fontSize: 18, fontWeight: '600', color: Colors.dark.text },
  modalHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  modalCloseText: { fontSize: 16, color: Colors.dark.tint, fontWeight: '600' },
  modalBody: { padding: 16 },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  gradeRow: { flexDirection: 'row', gap: 12 },
  gradeHalf: { flex: 1 },
  gradeSubLabel: { fontSize: 12, opacity: 0.7, marginBottom: 4 },
  gradeChips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  styleChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sectorChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  boulderChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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
  chipText: { fontSize: 14, color: Colors.dark.text },
});
