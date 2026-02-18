import { StyleSheet, View, Text } from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import { router } from 'expo-router';
import { gradeToLabel } from '@/constants/Grades';
import Colors from '@/constants/Colors';

type Boulder = {
  id: string;
  name: string;
  avg_grade: number | null;
  lat: number;
  lng: number;
};

type SectorMapViewProps = {
  boulders: Boulder[];
  region: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };
  sectorId: string;
  areaId: string;
  sectorName: string;
  areaName: string;
};

export default function SectorMapView({
  boulders,
  region,
  sectorId,
  areaId,
  sectorName,
  areaName,
}: SectorMapViewProps) {
  return (
    <MapView style={styles.map} initialRegion={region}>
      {boulders.map((b) => (
        <Marker
          key={b.id}
          coordinate={{ latitude: b.lat, longitude: b.lng }}
          title={b.name}
          description={gradeToLabel(b.avg_grade)}
          onCalloutPress={() =>
            router.push({
              pathname: `/boulder/${b.id}`,
              params: { sectorId, areaId, sectorName, areaName },
            })
          }
        >
          <Callout tooltip={false}>
            <View style={styles.callout}>
              <Text style={styles.calloutTitle}>{b.name}</Text>
              <Text style={styles.calloutGrade}>{gradeToLabel(b.avg_grade)}</Text>
              <Text style={styles.calloutHint}>Tap to view</Text>
            </View>
          </Callout>
        </Marker>
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1, width: '100%', height: '100%' },
  callout: {
    padding: 12,
    minWidth: 140,
    backgroundColor: Colors.dark.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  calloutTitle: { fontSize: 15, fontWeight: '600', marginBottom: 4, color: Colors.dark.text },
  calloutGrade: { fontSize: 13, color: Colors.dark.tint, marginBottom: 4 },
  calloutHint: { fontSize: 11, opacity: 0.6, color: Colors.dark.text },
});
