import { StyleSheet, View, Text } from 'react-native';
import MapView, { Marker, Callout, Polygon } from 'react-native-maps';
import { router } from 'expo-router';
import Colors from '@/constants/Colors';
import type { PolygonCoords } from '@/lib/mapUtils';

type Boulder = {
  id: string;
  name: string;
  problem_count: number;
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
  sectorPolygonCoords?: PolygonCoords | null;
};

const polygonToCoords = (coords: PolygonCoords) =>
  coords.map((c) => ({ latitude: c.lat, longitude: c.lng }));

export default function SectorMapView({
  boulders,
  region,
  sectorId,
  areaId,
  sectorName,
  areaName,
  sectorPolygonCoords,
}: SectorMapViewProps) {
  return (
    <MapView style={styles.map} initialRegion={region}>
      {sectorPolygonCoords && sectorPolygonCoords.length >= 3 && (
        <Polygon
          coordinates={polygonToCoords(sectorPolygonCoords)}
          fillColor="rgba(90, 138, 90, 0.2)"
          strokeColor={Colors.dark.tint}
          strokeWidth={2}
        />
      )}
      {boulders.map((b) => (
        <Marker
          key={b.id}
          coordinate={{ latitude: b.lat, longitude: b.lng }}
          title={b.name}
          description={`${b.problem_count} problem${b.problem_count !== 1 ? 's' : ''}`}
          onCalloutPress={() =>
            router.push({
              pathname: '/boulder/[id]',
              params: { id: b.id, sectorId, areaId, sectorName, areaName },
            })
          }
        >
          <Callout tooltip={false}>
            <View style={styles.callout}>
              <Text style={styles.calloutTitle}>{b.name}</Text>
              <Text style={styles.calloutGrade}>
                {b.problem_count} problem{b.problem_count !== 1 ? 's' : ''}
              </Text>
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
