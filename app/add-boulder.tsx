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
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View } from '@/components/Themed';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import Colors from '@/constants/Colors';
import { GRADES } from '@/constants/Grades';
import FontAwesome from '@expo/vector-icons/FontAwesome';

const GRADE_NONE = -1;

export default function AddBoulderScreen() {
  const params = useLocalSearchParams<{
    sectorId: string;
    areaId: string;
    sectorName: string;
    areaName: string;
  }>();
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

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<number>(GRADE_NONE);
  const [gradeModalVisible, setGradeModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  useEffect(() => {
    if (sectorName) {
      navigation.setOptions({ headerBackTitle: sectorName });
    }
  }, [sectorName, navigation]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a boulder name');
      return;
    }
    if (!sectorId || !areaId) {
      Alert.alert('Error', 'Missing sector or area');
      return;
    }
    if (!user) {
      Alert.alert('Error', 'You must be signed in to add boulders');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('boulders').insert({
        area_id: areaId,
        sector_id: sectorId,
        name: name.trim(),
        description: description.trim() || null,
        avg_grade: selectedGrade === GRADE_NONE ? null : selectedGrade,
        created_by: user.id,
      });
      if (error) throw error;
      router.back();
    } catch (err: unknown) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to create boulder'
      );
    } finally {
      setLoading(false);
    }
  };

  if (!sectorId || !areaId) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Invalid sector</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.form}>
        <Text style={styles.label}>Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. The Mandala, Midnight Lightning"
          placeholderTextColor="rgba(196, 167, 125, 0.5)"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />
        <Text style={styles.label}>Grade (optional)</Text>
        {(Platform.OS === 'ios' || Platform.OS === 'web') ? (
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
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Brief description..."
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
            {loading ? 'Creating...' : 'Create Boulder'}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  content: { padding: 16 },
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
