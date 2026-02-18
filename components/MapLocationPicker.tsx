import { useState, useEffect } from 'react';
import {
  StyleSheet,
  Modal,
  Pressable,
  Text,
  View,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import MapView, { Marker, MapPressEvent } from 'react-native-maps';
import * as Location from 'expo-location';
import Colors from '@/constants/Colors';
import FontAwesome from '@expo/vector-icons/FontAwesome';

const DEFAULT_LAT = 37.5;
const DEFAULT_LNG = -122;
const DEFAULT_DELTA = 0.01;

type MapLocationPickerProps = {
  visible: boolean;
  onClose: () => void;
  onConfirm: (lat: number, lng: number) => void;
  initialLat?: number | null;
  initialLng?: number | null;
};

export default function MapLocationPicker({
  visible,
  onClose,
  onConfirm,
  initialLat,
  initialLng,
}: MapLocationPickerProps) {
  const [lat, setLat] = useState<number | null>(initialLat ?? null);
  const [lng, setLng] = useState<number | null>(initialLng ?? null);
  const [loadingLocation, setLoadingLocation] = useState(false);

  useEffect(() => {
    if (visible) {
      setLat(initialLat ?? null);
      setLng(initialLng ?? null);
    }
  }, [visible, initialLat, initialLng]);

  const handleMapPress = (e: MapPressEvent) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setLat(latitude);
    setLng(longitude);
  };

  const handleUseCurrentLocation = async () => {
    setLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location permission',
          'Please enable location access to use your current position.'
        );
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLat(loc.coords.latitude);
      setLng(loc.coords.longitude);
    } catch (err) {
      Alert.alert(
        'Location error',
        err instanceof Error ? err.message : 'Could not get your location'
      );
    } finally {
      setLoadingLocation(false);
    }
  };

  const handleConfirm = () => {
    if (lat != null && lng != null) {
      onConfirm(lat, lng);
      onClose();
    }
  };

  const region = {
    latitude: lat ?? initialLat ?? DEFAULT_LAT,
    longitude: lng ?? initialLng ?? DEFAULT_LNG,
    latitudeDelta: DEFAULT_DELTA,
    longitudeDelta: DEFAULT_DELTA,
  };

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
            Tap the map to place a pin, or use your current location.
          </Text>
          <View style={styles.mapContainer}>
            <MapView
              style={styles.map}
              initialRegion={region}
              onPress={handleMapPress}
            >
              {lat != null && lng != null && (
                <Marker coordinate={{ latitude: lat, longitude: lng }} />
              )}
            </MapView>
          </View>
          <View style={styles.actions}>
            <Pressable
              style={[styles.button, styles.buttonSecondary]}
              onPress={handleUseCurrentLocation}
              disabled={loadingLocation}
            >
              {loadingLocation ? (
                <ActivityIndicator size="small" color={Colors.dark.tint} />
              ) : (
                <>
                  <FontAwesome
                    name="location-arrow"
                    size={16}
                    color={Colors.dark.tint}
                  />
                  <Text style={styles.buttonSecondaryText}>
                    Use current location
                  </Text>
                </>
              )}
            </Pressable>
            <Pressable
              style={[
                styles.button,
                styles.buttonPrimary,
                (lat == null || lng == null) && styles.buttonDisabled,
              ]}
              onPress={handleConfirm}
              disabled={lat == null || lng == null}
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
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.cardBorder,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  closeButton: {
    padding: 8,
  },
  closeText: {
    color: Colors.dark.tint,
    fontSize: 16,
  },
  hint: {
    fontSize: 14,
    color: Colors.dark.text,
    opacity: 0.8,
    padding: 16,
    paddingBottom: 8,
  },
  mapContainer: {
    height: 300,
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    paddingTop: 16,
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
  buttonSecondaryText: {
    color: Colors.dark.tint,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonPrimary: {
    backgroundColor: Colors.dark.tint,
  },
  buttonPrimaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
