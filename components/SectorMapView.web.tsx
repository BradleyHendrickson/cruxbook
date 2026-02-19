import { StyleSheet, View, Text, Pressable, Linking } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Colors from '@/constants/Colors';

type Boulder = {
  id: string;
  name: string;
  problem_count: number;
  lat: number;
  lng: number;
};

type SectorMapViewProps = {
  boulders: Boulder[];
  region: { latitude: number; longitude: number };
  sectorId: string;
  areaId: string;
  sectorName: string;
  areaName: string;
};

export default function SectorMapView({ region }: SectorMapViewProps) {
  const mapUrl = `https://www.google.com/maps?q=${region.latitude},${region.longitude}&z=14`;
  return (
    <View style={styles.placeholder}>
      <FontAwesome name="map" size={48} color={Colors.dark.text} style={{ opacity: 0.5 }} />
      <Text style={styles.title}>Maps available on mobile</Text>
      <Text style={styles.subtitle}>
        Use the iOS or Android app to view the sector map with boulder locations.
      </Text>
      <Pressable onPress={() => Linking.openURL(mapUrl)}>
        <Text style={styles.link}>Open in Google Maps</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.dark.background,
    padding: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.dark.text,
    marginTop: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: Colors.dark.text,
    opacity: 0.8,
    marginTop: 8,
    textAlign: 'center',
  },
  link: {
    fontSize: 16,
    color: Colors.dark.tint,
    fontWeight: '600',
    marginTop: 16,
  },
});
