import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import { router } from 'expo-router';
import { Text as ThemedText } from '@/components/Themed';
import { gradeToLabel } from '@/constants/Grades';
import Colors from '@/constants/Colors';

type Sector = {
  id: string;
  name: string;
  boulder_count: number;
  lat: number;
  lng: number;
};

type BoulderMarker = {
  id: string;
  name: string;
  avg_grade: number | null;
  lat: number;
  lng: number;
};

type AreaMapViewProps = {
  sectors: Sector[];
  boulders: BoulderMarker[];
  region: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };
  areaId: string;
  areaName: string;
};

export default function AreaMapView({
  sectors,
  boulders,
  region,
  areaId,
  areaName,
}: AreaMapViewProps) {
  return (
    <MapView style={styles.map} initialRegion={region}>
      {sectors.map((s) => (
        <Marker
          key={`sector-${s.id}`}
          coordinate={{ latitude: s.lat, longitude: s.lng }}
          title={s.name}
          description={`${s.boulder_count} boulder${s.boulder_count !== 1 ? 's' : ''}`}
          pinColor={Colors.dark.tint}
          onCalloutPress={() =>
            router.push({
              pathname: `/sector/${s.id}`,
              params: { areaId, sectorName: s.name, areaName },
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
      {boulders.map((b) => (
        <Marker
          key={`boulder-${b.id}`}
          coordinate={{ latitude: b.lat, longitude: b.lng }}
          title={b.name}
          description={gradeToLabel(b.avg_grade)}
          onCalloutPress={() =>
            router.push({
              pathname: `/boulder/${b.id}`,
              params: { areaId, areaName },
            })
          }
        >
          <Callout tooltip={false}>
            <View style={styles.callout}>
              <ThemedText style={styles.calloutTitle}>{b.name}</ThemedText>
              <ThemedText style={styles.calloutGrade}>
                {gradeToLabel(b.avg_grade)}
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
