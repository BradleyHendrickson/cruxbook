import { useState, useEffect } from 'react';
import {
  StyleSheet,
  Modal,
  Pressable,
  Text,
  View,
  TextInput,
} from 'react-native';
import * as Location from 'expo-location';
import Colors from '@/constants/Colors';
import FontAwesome from '@expo/vector-icons/FontAwesome';

type MapLocationPickerProps = {
  visible: boolean;
  onClose: () => void;
  onConfirm: (lat: number, lng: number) => void;
  initialLat?: number | null;
  initialLng?: number | null;
  centerRegion?: { latitude: number; longitude: number; latitudeDelta?: number; longitudeDelta?: number } | null;
  polygonCoords?: { lat: number; lng: number }[] | null;
};

export default function MapLocationPicker({
  visible,
  onClose,
  onConfirm,
  initialLat,
  initialLng,
  centerRegion: _centerRegion,
  polygonCoords: _polygonCoords,
}: MapLocationPickerProps) {
  const [lat, setLat] = useState<string>(initialLat?.toString() ?? '');
  const [lng, setLng] = useState<string>(initialLng?.toString() ?? '');
  const [loadingLocation, setLoadingLocation] = useState(false);

  useEffect(() => {
    if (visible) {
      setLat(initialLat?.toString() ?? '');
      setLng(initialLng?.toString() ?? '');
    }
  }, [visible, initialLat, initialLng]);

  const handleUseCurrentLocation = async () => {
    setLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Please enable location access to use your current position.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLat(loc.coords.latitude.toString());
      setLng(loc.coords.longitude.toString());
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not get your location');
    } finally {
      setLoadingLocation(false);
    }
  };

  const handleConfirm = () => {
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    if (!Number.isNaN(latNum) && !Number.isNaN(lngNum)) {
      onConfirm(latNum, lngNum);
      onClose();
    }
  };

  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);
  const canConfirm = !Number.isNaN(latNum) && !Number.isNaN(lngNum);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Set location</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>Cancel</Text>
            </Pressable>
          </View>
          <Text style={styles.hint}>
            Enter coordinates or use your current location. Maps are available on the mobile app.
          </Text>
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Latitude</Text>
            <TextInput
              style={styles.input}
              value={lat}
              onChangeText={setLat}
              placeholder="e.g. 37.5"
              placeholderTextColor="rgba(196, 167, 125, 0.5)"
              keyboardType="numeric"
            />
          </View>
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Longitude</Text>
            <TextInput
              style={styles.input}
              value={lng}
              onChangeText={setLng}
              placeholder="e.g. -122"
              placeholderTextColor="rgba(196, 167, 125, 0.5)"
              keyboardType="numeric"
            />
          </View>
          <View style={styles.actions}>
            <Pressable
              style={[styles.button, styles.buttonSecondary]}
              onPress={handleUseCurrentLocation}
              disabled={loadingLocation}
            >
              <FontAwesome name="location-arrow" size={16} color={Colors.dark.tint} />
              <Text style={styles.buttonSecondaryText}>
                {loadingLocation ? 'Getting...' : 'Use current location'}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.button, styles.buttonPrimary, !canConfirm && styles.buttonDisabled]}
              onPress={handleConfirm}
              disabled={!canConfirm}
            >
              <Text style={styles.buttonPrimaryText}>Confirm</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: Colors.dark.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 24,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.cardBorder,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  closeButton: { padding: 8 },
  closeText: { color: Colors.dark.tint, fontSize: 16 },
  hint: {
    fontSize: 14,
    color: Colors.dark.text,
    opacity: 0.8,
    marginTop: 16,
    marginBottom: 16,
  },
  inputRow: { marginBottom: 12 },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.dark.text,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.dark.inputBorder,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.dark.text,
    backgroundColor: Colors.dark.background,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    gap: 8,
  },
  buttonSecondary: {
    backgroundColor: Colors.dark.background,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  buttonSecondaryText: { color: Colors.dark.tint, fontSize: 16, fontWeight: '600' },
  buttonPrimary: { backgroundColor: Colors.dark.tint },
  buttonPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  buttonDisabled: { opacity: 0.5 },
});
