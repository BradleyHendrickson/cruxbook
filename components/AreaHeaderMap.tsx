import { useRef } from 'react';
import { StyleSheet } from 'react-native';
import MapView, { Marker, Polygon } from 'react-native-maps';
import Colors from '@/constants/Colors';
import type { PolygonCoords } from '@/lib/mapUtils';

type BoulderMarker = {
  id: string;
  name: string;
  problem_count: number;
  lat: number;
  lng: number;
};

type AreaHeaderMapProps = {
  boulders: BoulderMarker[];
  region: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };
  areaPolygonCoords?: PolygonCoords | null;
  areaId: string;
  areaName: string;
  selectedBoulderId?: string | null;
  onBoulderSelect?: (boulderId: string) => void;
  onMapPress?: () => void;
};

const polygonToCoords = (coords: PolygonCoords) =>
  coords.map((c) => ({ latitude: c.lat, longitude: c.lng }));

export default function AreaHeaderMap({
  boulders,
  region,
  areaPolygonCoords,
  areaId,
  areaName,
  selectedBoulderId,
  onBoulderSelect,
  onMapPress,
}: AreaHeaderMapProps) {
  const markerPressTime = useRef(0);

  const handleMarkerPress = (boulderId: string) => {
    markerPressTime.current = Date.now();
    onBoulderSelect?.(boulderId);
  };

  const handleMapPress = () => {
    if (Date.now() - markerPressTime.current < 150) return;
    onMapPress?.();
  };

  return (
    <MapView
      style={styles.map}
      initialRegion={region}
      scrollEnabled={false}
      zoomEnabled={false}
      pitchEnabled={false}
      rotateEnabled={false}
      onPress={handleMapPress}
    >
      {areaPolygonCoords && areaPolygonCoords.length >= 3 && (
        <Polygon
          coordinates={polygonToCoords(areaPolygonCoords)}
          fillColor="rgba(90, 138, 90, 0.15)"
          strokeColor={Colors.dark.tint}
          strokeWidth={2}
        />
      )}
      {boulders.map((b) => (
        <Marker
          key={`boulder-${b.id}`}
          coordinate={{ latitude: b.lat, longitude: b.lng }}
          pinColor={selectedBoulderId === b.id ? Colors.dark.tint : undefined}
          stopPropagation
          onPress={() => handleMarkerPress(b.id)}
        />
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
  },
});
