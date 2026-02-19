import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Callout, Polygon } from 'react-native-maps';
import { router } from 'expo-router';
import { Text as ThemedText } from '@/components/Themed';
import Colors from '@/constants/Colors';
import type { PolygonCoords } from '@/lib/mapUtils';

type Sector = {
  id: string;
  name: string;
  boulder_count: number;
  lat: number;
  lng: number;
  polygon_coords?: PolygonCoords | null;
};

type BoulderMarker = {
  id: string;
  name: string;
  problem_count: number;
  lat: number;
  lng: number;
};

type AreaMapViewProps = {
  sectors: Sector[];
  boulders: BoulderMarker[];
  region: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };
  areaId: string;
  areaName: string;
  areaPolygonCoords?: PolygonCoords | null;
};

const polygonToCoords = (coords: PolygonCoords) =>
  coords.map((c) => ({ latitude: c.lat, longitude: c.lng }));

export default function AreaMapView({
  sectors,
  boulders,
  region,
  areaId,
  areaName,
  areaPolygonCoords,
}: AreaMapViewProps) {
  return (
    <MapView style={styles.map} initialRegion={region}>
      {areaPolygonCoords && areaPolygonCoords.length >= 3 && (
        <Polygon
          coordinates={polygonToCoords(areaPolygonCoords)}
          fillColor="rgba(90, 138, 90, 0.15)"
          strokeColor={Colors.dark.tint}
          strokeWidth={2}
        />
      )}
      {sectors
        .filter((s) => !s.polygon_coords || s.polygon_coords.length < 3)
        .map((s) => (
        <Marker
          key={`sector-${s.id}`}
          coordinate={{ latitude: s.lat, longitude: s.lng }}
          title={s.name}
          description={`${s.boulder_count} boulder${s.boulder_count !== 1 ? 's' : ''}`}
          pinColor={Colors.dark.tint}
          onCalloutPress={() =>
            router.push({
              pathname: '/sector/[id]',
              params: { id: s.id, areaId, sectorName: s.name, areaName },
            })
          }
        >
          <Callout tooltip={false}>
            <View style={styles.callout}>
              <ThemedText style={styles.calloutTitle}>{s.name}</ThemedText>
              <ThemedText style={styles.calloutSub}>
                {s.boulder_count} boulder{s.boulder_count !== 1 ? 's' : ''}
              </ThemedText>
              <ThemedText style={styles.calloutHint}>Tap to view</ThemedText>
            </View>
          </Callout>
        </Marker>
      ))}
      {sectors
        .filter((s) => s.polygon_coords && s.polygon_coords.length >= 3)
        .map((s) => (
          <Polygon
            key={`sector-poly-${s.id}`}
            coordinates={polygonToCoords(s.polygon_coords!)}
            fillColor="rgba(90, 138, 90, 0.2)"
            strokeColor={Colors.dark.tint}
            strokeWidth={2}
          />
        ))}
      {boulders.map((b) => (
        <Marker
          key={`boulder-${b.id}`}
          coordinate={{ latitude: b.lat, longitude: b.lng }}
          title={b.name}
          description={`${b.problem_count} problem${b.problem_count !== 1 ? 's' : ''}`}
          onCalloutPress={() =>
            router.push({
              pathname: '/boulder/[id]',
              params: { id: b.id, areaId, areaName },
            })
          }
        >
          <Callout tooltip={false}>
            <View style={styles.callout}>
              <ThemedText style={styles.calloutTitle}>{b.name}</ThemedText>
              <ThemedText style={styles.calloutGrade}>
                {b.problem_count} problem{b.problem_count !== 1 ? 's' : ''}
              </ThemedText>
              <ThemedText style={styles.calloutHint}>Tap to view</ThemedText>
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
  calloutTitle: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  calloutSub: { fontSize: 13, opacity: 0.8, marginBottom: 4 },
  calloutGrade: { fontSize: 13, color: Colors.dark.tint, marginBottom: 4 },
  calloutHint: { fontSize: 11, opacity: 0.6 },
});
