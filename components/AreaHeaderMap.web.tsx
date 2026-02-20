import { StyleSheet, View, Text, Pressable, Linking } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Colors from '@/constants/Colors';

type BoulderMarker = {
  id: string;
  name: string;
  problem_count: number;
  lat: number;
  lng: number;
};

type AreaHeaderMapProps = {
  boulders: BoulderMarker[];
  region: { latitude: number; longitude: number; latitudeDelta?: number; longitudeDelta?: number };
  areaPolygonCoords?: { lat: number; lng: number }[] | null;
  areaId: string;
  areaName: string;
};

export default function AreaHeaderMap({ boulders, region }: AreaHeaderMapProps) {
  const mapUrl = `https://www.google.com/maps?q=${region.latitude},${region.longitude}&z=14`;
  return (
    <View style={styles.placeholder}>
      <FontAwesome name="map" size={36} color={Colors.dark.text} style={{ opacity: 0.5 }} />
      <Text style={styles.title}>Map on mobile</Text>
      <Pressable onPress={() => Linking.openURL(mapUrl)}>
        <Text style={styles.link}>Open in Google Maps</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.dark.background,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.text,
    marginTop: 12,
    textAlign: 'center',
  },
  link: {
    fontSize: 14,
    color: Colors.dark.tint,
    fontWeight: '600',
    marginTop: 8,
  },
});
