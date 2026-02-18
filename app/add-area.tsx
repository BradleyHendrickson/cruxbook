import { useState } from 'react';
import { router } from 'expo-router';
import { StyleSheet, TextInput, Pressable, ScrollView, Alert } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Text, View } from '@/components/Themed';
import MapLocationPicker from '@/components/MapLocationPicker';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import Colors from '@/constants/Colors';

export default function AddAreaScreen() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [locationPickerVisible, setLocationPickerVisible] = useState(false);
  const { user } = useAuth();

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter an area name');
      return;
    }
    if (!user) {
      Alert.alert('Error', 'You must be signed in to add areas');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from('areas').insert({
        name: name.trim(),
        description: description.trim() || null,
        lat,
        lng,
        created_by: user.id,
      });
      if (error) throw error;
      router.back();
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to create area');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.form}>
        <Text style={styles.label}>Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Buttermilks, Rocklands"
          placeholderTextColor="rgba(196, 167, 125, 0.5)"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
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
          <Text style={styles.buttonText}>{loading ? 'Creating...' : 'Create Area'}</Text>
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
  form: { gap: 8 },
  label: { fontSize: 14, fontWeight: '600', marginTop: 12, marginBottom: 4, color: Colors.dark.text },
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
  button: {
    backgroundColor: Colors.dark.tint,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
