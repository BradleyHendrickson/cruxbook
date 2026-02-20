import { useState, useEffect } from 'react';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import {
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  Platform,
  Modal,
  FlatList,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Picker } from '@react-native-picker/picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View } from '@/components/Themed';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import Colors from '@/constants/Colors';
import { GRADES } from '@/constants/Grades';
import { STYLES } from '@/constants/Styles';
import FontAwesome from '@expo/vector-icons/FontAwesome';

const GRADE_NONE = -1;
const STYLE_NONE = '';

export default function AddProblemScreen() {
  const params = useLocalSearchParams<{
    boulderId: string;
    boulderName: string;
    sectorId: string;
    areaId: string;
    sectorName: string;
    areaName: string;
  }>();
  const boulderId =
    typeof params.boulderId === 'string' ? params.boulderId : params.boulderId?.[0];
  const boulderName =
    typeof params.boulderName === 'string'
      ? params.boulderName
      : params.boulderName?.[0];
  const sectorId =
    typeof params.sectorId === 'string'
      ? params.sectorId
      : params.sectorId?.[0];
  const areaId =
    typeof params.areaId === 'string' ? params.areaId : params.areaId?.[0];
  const sectorName =
    typeof params.sectorName === 'string'
      ? params.sectorName
      : params.sectorName?.[0];
  const areaName =
    typeof params.areaName === 'string' ? params.areaName : params.areaName?.[0];

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [height, setHeight] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<string>(STYLE_NONE);
  const [firstAscentName, setFirstAscentName] = useState('');
  const [firstAscentDate, setFirstAscentDate] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<number>(GRADE_NONE);
  const [gradeModalVisible, setGradeModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  useEffect(() => {
    if (boulderName) {
      navigation.setOptions({ headerBackTitle: boulderName });
    }
  }, [boulderName, navigation]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a problem name');
      return;
    }
    if (boulderName && name.trim().toLowerCase() === boulderName.trim().toLowerCase()) {
      Alert.alert('Error', 'Problem name must be different from the boulder name');
      return;
    }
    if (!boulderId || !sectorId || !areaId) {
      Alert.alert('Error', 'Missing boulder, sector, or area');
      return;
    }
    if (!user) {
      Alert.alert('Error', 'You must be signed in to add problems');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('problems')
        .insert({
          boulder_id: boulderId,
          name: name.trim(),
          description: description.trim() || null,
          height: height.trim() || null,
          style: selectedStyle || null,
          first_ascent_name: firstAscentName.trim() || null,
          first_ascent_date: firstAscentDate.trim() || null,
          avg_grade: selectedGrade === GRADE_NONE ? null : selectedGrade,
          created_by: user.id,
        })
        .select('id')
        .single();
      if (error) throw error;
      if (data?.id) {
        router.replace({
          pathname: '/problem/[id]',
          params: {
            id: data.id,
            sectorId,
            areaId,
            sectorName: sectorName ?? '',
            areaName: areaName ?? '',
            boulderName: boulderName ?? '',
          },
        });
      } else {
        router.back();
      }
    } catch (err: unknown) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to create problem'
      );
    } finally {
      setLoading(false);
    }
  };

  if (!boulderId || !sectorId || !areaId) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Invalid boulder</Text>
      </View>
    );
  }

  return (
    <KeyboardAwareScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      enableOnAndroid
      extraScrollHeight={40}
      enableAutomaticScroll
    >
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
            {loading ? 'Creating...' : 'Create Problem'}
          </Text>
        </Pressable>
      </View>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  content: { padding: 16, paddingBottom: 40 },
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
