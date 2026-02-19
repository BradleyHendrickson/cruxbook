import { useState, useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import {
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
  View,
  Text,
} from 'react-native';
import { Text as ThemedText, View as ThemedView } from '@/components/Themed';
import MapLocationPicker from '@/components/MapLocationPicker';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import Colors from '@/constants/Colors';
import FontAwesome from '@expo/vector-icons/FontAwesome';

export default function EditBoulderScreen() {
  const params = useLocalSearchParams<{
    boulderId: string;
    sectorId: string;
    areaId: string;
    sectorName: string;
    areaName: string;
  }>();
  const boulderId = typeof params.boulderId === 'string' ? params.boulderId : params.boulderId?.[0];
  const sectorId = typeof params.sectorId === 'string' ? params.sectorId : params.sectorId?.[0];
  const areaId = typeof params.areaId === 'string' ? params.areaId : params.areaId?.[0];

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [locationPickerVisible, setLocationPickerVisible] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const fetchBoulder = async () => {
      if (!boulderId) return;
      const { data } = await supabase
        .from('boulders')
        .select('name, description, lat, lng')
        .eq('id', boulderId)
        .single();
      if (data) {
        setName(data.name ?? '');
        setDescription(data.description ?? '');
        setLat(data.lat ?? null);
        setLng(data.lng ?? null);
      }
      setFetching(false);
    };
    fetchBoulder();
  }, [boulderId]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a boulder name');
      return;
    }
    if (!boulderId || !user) {
      Alert.alert('Error', 'Invalid boulder or not signed in');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('boulders')
        .update({
          name: name.trim(),
          description: description.trim() || null,
          lat,
          lng,
        })
        .eq('id', boulderId);
      if (error) throw error;
      router.back();
    } catch (err: unknown) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to update boulder'
      );
    } finally {
      setLoading(false);
    }
  };

  if (!boulderId) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText style={styles.text}>Invalid boulder</ThemedText>
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
          placeholder="e.g. The Mandala, Midnight Lightning"
          placeholderTextColor="rgba(196, 167, 125, 0.5)"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />
        <Text style={styles.label}>Description (optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Brief description..."
          placeholderTextColor="rgba(196, 167, 125, 0.5)"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
        />
        <Text style={styles.label}>Location (optional)</Text>
        <Pressable
          style={styles.selector}
          onPress={() => setLocationPickerVisible(true)}
        >
          <Text
            style={[
              styles.selectorText,
              lat == null && styles.selectorPlaceholder,
            ]}
          >
            {lat != null && lng != null
              ? `${lat.toFixed(5)}, ${lng.toFixed(5)}`
              : 'Tap to set location on map'}
          </Text>
          <FontAwesome name="map-marker" size={16} color={Colors.dark.tint} />
        </Pressable>
        {lat != null && lng != null && (
          <Pressable
            onPress={() => {
              setLat(null);
              setLng(null);
            }}
            style={styles.clearLocation}
          >
            <Text style={styles.clearLocationText}>Clear location</Text>
          </Pressable>
        )}
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
      <MapLocationPicker
        visible={locationPickerVisible}
        onClose={() => setLocationPickerVisible(false)}
        onConfirm={(newLat, newLng) => {
          setLat(newLat);
          setLng(newLng);
          setLocationPickerVisible(false);
        }}
        initialLat={lat}
        initialLng={lng}
      />
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
  clearLocation: {
    marginTop: 8,
    paddingVertical: 4,
  },
  clearLocationText: {
    fontSize: 14,
    color: Colors.dark.tint,
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
