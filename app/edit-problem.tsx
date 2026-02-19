import { useState, useEffect } from 'react';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import {
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  Platform,
  Modal,
  FlatList,
  ActivityIndicator,
  View,
  Text,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text as ThemedText, View as ThemedView } from '@/components/Themed';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import Colors from '@/constants/Colors';
import { GRADES } from '@/constants/Grades';
import { STYLES } from '@/constants/Styles';
import FontAwesome from '@expo/vector-icons/FontAwesome';

const GRADE_NONE = -1;
const STYLE_NONE = '';

export default function EditProblemScreen() {
  const params = useLocalSearchParams<{
    problemId: string;
    boulderId: string;
    sectorId: string;
    areaId: string;
    sectorName: string;
    areaName: string;
    boulderName: string;
  }>();
  const problemId =
    typeof params.problemId === 'string' ? params.problemId : params.problemId?.[0];
  const boulderId =
    typeof params.boulderId === 'string' ? params.boulderId : params.boulderId?.[0];
  const boulderName =
    typeof params.boulderName === 'string'
      ? params.boulderName
      : params.boulderName?.[0];

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [height, setHeight] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<string>(STYLE_NONE);
  const [firstAscentName, setFirstAscentName] = useState('');
  const [firstAscentDate, setFirstAscentDate] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<number>(GRADE_NONE);
  const [gradeModalVisible, setGradeModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [boulderNameFromFetch, setBoulderNameFromFetch] = useState<string | null>(null);

  useEffect(() => {
    const backTitle = boulderName ?? boulderNameFromFetch;
    if (backTitle) {
      navigation.setOptions({ headerBackTitle: backTitle });
    }
  }, [boulderName, boulderNameFromFetch, navigation]);

  useEffect(() => {
    const fetchProblem = async () => {
      if (!problemId) return;
      const { data } = await supabase
        .from('problems')
        .select('name, description, height, style, first_ascent_name, first_ascent_date, avg_grade, boulders(name)')
        .eq('id', problemId)
        .single();
      if (data) {
        setName(data.name ?? '');
        setDescription(data.description ?? '');
        setHeight(data.height ?? '');
        setSelectedStyle(data.style ?? STYLE_NONE);
        setFirstAscentName(data.first_ascent_name ?? '');
        setFirstAscentDate(data.first_ascent_date ?? '');
        setSelectedGrade(data.avg_grade ?? GRADE_NONE);
        const bn = (data.boulders as { name?: string } | null)?.name;
        if (bn) setBoulderNameFromFetch(bn);
      }
      setFetching(false);
    };
    fetchProblem();
  }, [problemId]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a problem name');
      return;
    }
    const refBoulderName = boulderName ?? boulderNameFromFetch ?? '';
    if (refBoulderName && name.trim().toLowerCase() === refBoulderName.trim().toLowerCase()) {
      Alert.alert('Error', 'Problem name must be different from the boulder name');
      return;
    }
    if (!problemId || !user) {
      Alert.alert('Error', 'Invalid problem or not signed in');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('problems')
        .update({
          name: name.trim(),
          description: description.trim() || null,
          height: height.trim() || null,
          style: selectedStyle || null,
          first_ascent_name: firstAscentName.trim() || null,
          first_ascent_date: firstAscentDate.trim() || null,
          avg_grade: selectedGrade === GRADE_NONE ? null : selectedGrade,
        })
        .eq('id', problemId);
      if (error) throw error;
      router.back();
    } catch (err: unknown) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to update problem'
      );
    } finally {
      setLoading(false);
    }
  };

  if (!problemId) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText style={styles.text}>Invalid problem</ThemedText>
      </ThemedView>
    );
  }

  if (fetching) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator size="large" color={Colors.dark.tint} />
      </ThemedView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.form}>
        <Text style={styles.label}>Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. The Sit, Stand, Traverse"
          placeholderTextColor="rgba(196, 167, 125, 0.5)"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />
        <Text style={styles.label}>Grade (optional)</Text>
        {Platform.OS === 'ios' || Platform.OS === 'web' ? (
          <>
            <Pressable
              style={styles.selector}
              onPress={() => setGradeModalVisible(true)}
            >
              <Text
                style={[
                  styles.selectorText,
                  selectedGrade === GRADE_NONE && styles.selectorPlaceholder,
                ]}
              >
                {selectedGrade === GRADE_NONE
                  ? 'Select grade'
                  : GRADES.find((g) => g.value === selectedGrade)?.label ?? '—'}
              </Text>
              <FontAwesome name="chevron-down" size={14} color={Colors.dark.text} />
            </Pressable>
            <Modal
              visible={gradeModalVisible}
              transparent
              animationType="slide"
              onRequestClose={() => setGradeModalVisible(false)}
            >
              <View style={styles.modalOverlay}>
                <Pressable
                  style={StyleSheet.absoluteFill}
                  onPress={() => setGradeModalVisible(false)}
                />
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Select grade</Text>
                    <Pressable
                      onPress={() => {
                        setSelectedGrade(GRADE_NONE);
                        setGradeModalVisible(false);
                      }}
                      style={styles.modalClose}
                    >
                      <Text style={styles.modalCloseText}>None</Text>
                    </Pressable>
                  </View>
                  <FlatList
                    data={GRADES}
                    keyExtractor={(item) => item.label}
                    contentContainerStyle={[
                      styles.gradeListContent,
                      { paddingBottom: Math.max(40, insets.bottom + 24) },
                    ]}
                    renderItem={({ item }) => (
                      <Pressable
                        style={[
                          styles.gradeOption,
                          selectedGrade === item.value && styles.gradeOptionSelected,
                        ]}
                        onPress={() => {
                          setSelectedGrade(item.value);
                          setGradeModalVisible(false);
                        }}
                      >
                        <Text style={styles.gradeOptionText}>{item.label}</Text>
                        {selectedGrade === item.value && (
                          <FontAwesome name="check" size={16} color={Colors.dark.tint} />
                        )}
                      </Pressable>
                    )}
                  />
                </View>
              </View>
            </Modal>
          </>
        ) : (
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={selectedGrade}
              onValueChange={(value) => setSelectedGrade(Number(value))}
              style={styles.picker}
              dropdownIconColor={Colors.dark.text}
              prompt="Select grade"
            >
              <Picker.Item label="None" value={GRADE_NONE} />
              {GRADES.map((g) => (
                <Picker.Item key={g.label} label={g.label} value={g.value} />
              ))}
            </Picker>
          </View>
        )}
        <Text style={styles.label}>Height (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 15ft, 5m"
          placeholderTextColor="rgba(196, 167, 125, 0.5)"
          value={height}
          onChangeText={setHeight}
        />
        <Text style={styles.label}>Style (optional)</Text>
        <View style={styles.styleChips}>
          {STYLES.map((s) => (
            <Pressable
              key={s.value}
              style={[
                styles.styleChip,
                selectedStyle === s.value && styles.styleChipSelected,
              ]}
              onPress={() =>
                setSelectedStyle(selectedStyle === s.value ? STYLE_NONE : s.value)
              }
            >
              <Text
                style={[
                  styles.styleChipText,
                  selectedStyle === s.value && styles.styleChipTextSelected,
                ]}
              >
                {s.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.label}>First ascent (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Climber name"
          placeholderTextColor="rgba(196, 167, 125, 0.5)"
          value={firstAscentName}
          onChangeText={setFirstAscentName}
        />
        <TextInput
          style={[styles.input, { marginTop: 8 }]}
          placeholder="Date (e.g. 2020)"
          placeholderTextColor="rgba(196, 167, 125, 0.5)"
          value={firstAscentDate}
          onChangeText={setFirstAscentDate}
        />
        <Text style={styles.label}>Description (optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Brief description of the problem..."
          placeholderTextColor="rgba(196, 167, 125, 0.5)"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
        />
        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  content: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  form: { gap: 8 },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 4,
    color: Colors.dark.text,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.dark.inputBorder,
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    backgroundColor: Colors.dark.card,
    color: Colors.dark.text,
  },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.dark.inputBorder,
    borderRadius: 8,
    padding: 14,
    backgroundColor: Colors.dark.card,
  },
  selectorText: {
    fontSize: 16,
    color: Colors.dark.text,
  },
  selectorPlaceholder: {
    opacity: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.dark.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.cardBorder,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  modalClose: {
    padding: 8,
  },
  modalCloseText: {
    color: Colors.dark.tint,
    fontSize: 16,
  },
  gradeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.cardBorder,
  },
  gradeOptionSelected: {
    backgroundColor: 'rgba(90, 138, 90, 0.15)',
  },
  gradeOptionText: {
    fontSize: 16,
    color: Colors.dark.text,
  },
  gradeListContent: {
    paddingBottom: 24,
  },
  styleChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  styleChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    backgroundColor: Colors.dark.card,
  },
  styleChipSelected: {
    borderColor: Colors.dark.tint,
    backgroundColor: 'rgba(90, 138, 90, 0.15)',
  },
  styleChipText: {
    fontSize: 14,
    color: Colors.dark.text,
  },
  styleChipTextSelected: {
    color: Colors.dark.tint,
    fontWeight: '600',
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: Colors.dark.inputBorder,
    borderRadius: 8,
    backgroundColor: Colors.dark.card,
    overflow: 'hidden',
  },
  picker: {
    color: Colors.dark.text,
    height: 50,
  },
  button: {
    backgroundColor: Colors.dark.tint,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  text: { color: Colors.dark.text },
});
