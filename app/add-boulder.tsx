import { useState, useEffect } from 'react';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { StyleSheet, TextInput, Pressable, Alert } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Text, View } from '@/components/Themed';
import MapLocationPicker from '@/components/MapLocationPicker';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import Colors from '@/constants/Colors';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { regionFromPolygon } from '@/lib/mapUtils';
import type { PolygonCoords } from '@/lib/mapUtils';

export default function AddBoulderScreen() {
  const params = useLocalSearchParams<{
    sectorId: string;
    areaId: string;
    sectorName: string;
    areaName: string;
    lat?: string;
    lng?: string;
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
  const areaName =
    typeof params.areaName === 'string' ? params.areaName : params.areaName?.[0];
  const paramLat = typeof params.lat === 'string' ? params.lat : params.lat?.[0];
  const paramLng = typeof params.lng === 'string' ? params.lng : params.lng?.[0];

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [lat, setLat] = useState<number | null>(() => {
    const n = paramLat ? parseFloat(paramLat) : NaN;
    return !isNaN(n) ? n : null;
  });
  const [lng, setLng] = useState<number | null>(() => {
    const n = paramLng ? parseFloat(paramLng) : NaN;
    return !isNaN(n) ? n : null;
  });
  const [locationPickerVisible, setLocationPickerVisible] = useState(false);
  const [areaPolygonCoords, setAreaPolygonCoords] = useState<PolygonCoords | null>(null);
  const { user } = useAuth();
  const navigation = useNavigation();

  useEffect(() => {
    if (!areaId) return;
    const fetchArea = async () => {
      const { data } = await supabase
        .from('areas')
        .select('polygon_coords')
        .eq('id', areaId)
        .single();
      setAreaPolygonCoords((data?.polygon_coords as PolygonCoords) ?? null);
    };
    fetchArea();
  }, [areaId]);

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
      const { data, error } = await supabase
        .from('boulders')
        .insert({
          area_id: areaId,
          sector_id: sectorId,
          name: name.trim(),
          description: description.trim() || null,
          lat: lat,
          lng: lng,
          created_by: user.id,
        })
        .select('id')
        .single();
      if (error) throw error;
      if (data?.id) {
        router.replace({
          pathname: '/boulder/[id]',
          params: {
            id: data.id,
            sectorId,
            areaId,
            sectorName: sectorName ?? '',
            areaName: areaName ?? '',
          },
        });
      } else {
        router.replace({
          pathname: '/sector/[id]',
          params: { id: sectorId, areaId, sectorName: sectorName ?? '', areaName: areaName ?? '' },
        });
      }
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
          placeholder="e.g. The Mandala, Midnight Lightning"
          placeholderTextColor="rgba(196, 167, 125, 0.5)"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />
        <Text style={styles.label}>Description (optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Brief description of the boulder..."
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
            {loading ? 'Creating...' : 'Create Boulder'}
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
        centerRegion={
          areaPolygonCoords && areaPolygonCoords.length >= 3
            ? regionFromPolygon(areaPolygonCoords)
            : null
        }
        polygonCoords={areaPolygonCoords}
      />
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
