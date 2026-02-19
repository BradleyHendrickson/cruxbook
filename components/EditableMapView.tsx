import { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  TouchableOpacity,
  ScrollView,
  Alert,
  InteractionManager,
} from 'react-native';
import MapView, { Marker, Polygon, Callout, MapPressEvent } from 'react-native-maps';
import { router } from 'expo-router';
import { Text as ThemedText } from '@/components/Themed';
import Colors from '@/constants/Colors';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import type { LatLng, PolygonCoords } from '@/lib/mapUtils';
import { pointInPolygon, sanitizePolygonCoords } from '@/lib/mapUtils';

export type MapPolygon = {
  id: string;
  coords: PolygonCoords;
  name?: string;
};

export type MapBoulder = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  problem_count: number;
};

export type MapSector = {
  id: string;
  name: string;
  polygon_coords: PolygonCoords | null;
  lat: number | null;
  lng: number | null;
};

type DrawMode = 'browse' | 'boulder' | 'polygon';

type EditableMapViewProps = {
  polygons: MapPolygon[];
  sectors: MapSector[];
  boulders: MapBoulder[];
  region: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };
  areaId: string;
  areaName: string;
  onPolygonComplete: (coords: PolygonCoords) => void | Promise<boolean>;
  onBoulderPlace: (lat: number, lng: number, sectorId: string | null) => void;
  editable: boolean;
  entityType?: 'area';
};

export default function EditableMapView({
  polygons,
  sectors,
  boulders,
  region,
  areaId,
  areaName,
  onPolygonComplete,
  onBoulderPlace,
  editable,
  entityType = 'area',
}: EditableMapViewProps) {
  const [drawMode, setDrawMode] = useState<DrawMode>('browse');
  const [polygonPoints, setPolygonPoints] = useState<LatLng[]>([]);

  const findSectorForPoint = useCallback(
    (point: LatLng): string | null => {
      for (const s of sectors) {
        if (s.polygon_coords && s.polygon_coords.length >= 3) {
          if (pointInPolygon(point, s.polygon_coords)) return s.id;
        }
      }
      return null;
    },
    [sectors]
  );

  const handleMapPress = useCallback(
    (e: MapPressEvent) => {
      const { latitude, longitude } = e.nativeEvent.coordinate;
      const point: LatLng = { lat: latitude, lng: longitude };

      if (drawMode === 'polygon' && editable) {
        setPolygonPoints((prev) => [...prev, point]);
      } else if (drawMode === 'boulder' && editable) {
        const sectorId = findSectorForPoint(point);
        onBoulderPlace(latitude, longitude, sectorId);
      }
    },
    [drawMode, editable, findSectorForPoint, onBoulderPlace]
  );

  const handleFinishPolygon = useCallback(async () => {
    if (polygonPoints.length < 2) return;
    try {
      let coords = sanitizePolygonCoords([...polygonPoints]);
      if (coords.length < 3) {
        Alert.alert('Invalid polygon', 'Please add at least 3 valid points to define the area.');
        return;
      }
      if (coords[0].lat !== coords[coords.length - 1].lat || coords[0].lng !== coords[coords.length - 1].lng) {
        coords = [...coords, coords[0]];
      }
      const result = onPolygonComplete(coords);
      const ok = result instanceof Promise ? await result : true;
      if (ok) {
        InteractionManager.runAfterInteractions(() => {
          setPolygonPoints([]);
          setDrawMode('browse');
        });
      } else {
        Alert.alert('Could not save', 'Failed to save the area boundary. Please try again.');
      }
    } catch (e) {
      console.error('Finish area error:', e);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  }, [polygonPoints, onPolygonComplete]);

  const handleCancelPolygon = useCallback(() => {
    setPolygonPoints([]);
    setDrawMode('browse');
  }, []);

  const handleBoulderPress = useCallback(
    (boulderId: string) => {
      router.push({
        pathname: '/boulder/[id]',
        params: { id: boulderId, areaId, areaName },
      });
    },
    [areaId, areaName]
  );

  const polygonCoordsToRegion = (coords: PolygonCoords) =>
    sanitizePolygonCoords(coords).map((c) => ({ latitude: c.lat, longitude: c.lng }));

  return (
    <View style={styles.container}>
      {editable && (
        <View style={styles.modeBar}>
          <Pressable
            style={[styles.modeButton, drawMode === 'browse' && styles.modeButtonActive]}
            onPress={() => setDrawMode('browse')}
          >
            <FontAwesome name="hand-paper-o" size={16} color={drawMode === 'browse' ? Colors.dark.tint : Colors.dark.text} />
            <Text style={[styles.modeText, drawMode === 'browse' && styles.modeTextActive]}>Browse</Text>
          </Pressable>
          <Pressable
            style={[styles.modeButton, drawMode === 'boulder' && styles.modeButtonActive]}
            onPress={() => setDrawMode('boulder')}
          >
            <FontAwesome name="cube" size={16} color={drawMode === 'boulder' ? Colors.dark.tint : Colors.dark.text} />
            <Text style={[styles.modeText, drawMode === 'boulder' && styles.modeTextActive]}>Add boulder</Text>
          </Pressable>
          <Pressable
            style={[styles.modeButton, drawMode === 'polygon' && styles.modeButtonActive]}
            onPress={() => setDrawMode('polygon')}
          >
            <FontAwesome name="pencil" size={16} color={drawMode === 'polygon' ? Colors.dark.tint : Colors.dark.text} />
            <Text style={[styles.modeText, drawMode === 'polygon' && styles.modeTextActive]}>Draw area</Text>
          </Pressable>
        </View>
      )}

      {drawMode === 'polygon' && polygonPoints.length >= 2 && (
        <View style={styles.polygonActions}>
          <TouchableOpacity
            style={styles.polygonButton}
            onPress={() => void handleFinishPolygon()}
            activeOpacity={0.7}
          >
            <ThemedText style={styles.polygonButtonText}>
              Finish {entityType === 'area' ? 'area' : 'polygon'}
            </ThemedText>
          </TouchableOpacity>
          <Pressable style={[styles.polygonButton, styles.polygonButtonCancel]} onPress={handleCancelPolygon}>
            <ThemedText style={styles.polygonButtonCancelText}>Cancel</ThemedText>
          </Pressable>
        </View>
      )}

      <MapView
        style={styles.map}
        initialRegion={region}
        onPress={handleMapPress}
      >
        {polygons
          .filter((p) => sanitizePolygonCoords(p.coords).length >= 3)
          .map((p) => (
          <Polygon
            key={p.id}
            coordinates={polygonCoordsToRegion(p.coords)}
            fillColor="rgba(90, 138, 90, 0.2)"
            strokeColor={Colors.dark.tint}
            strokeWidth={2}
          />
        ))}

        {sectors
          .filter((s) => s.lat != null && s.lng != null && !s.polygon_coords)
          .map((s) => (
            <Marker
              key={`sector-${s.id}`}
              coordinate={{ latitude: s.lat!, longitude: s.lng! }}
              title={s.name}
              pinColor={Colors.dark.tint}
            />
          ))}

        {boulders.map((b) => (
          <Marker
            key={b.id}
            coordinate={{ latitude: b.lat, longitude: b.lng }}
            title={b.name}
            onCalloutPress={() => handleBoulderPress(b.id)}
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

        {drawMode === 'polygon' &&
          sanitizePolygonCoords(polygonPoints).map((pt, i) => (
            <Marker
              key={`poly-${i}`}
              coordinate={{ latitude: pt.lat, longitude: pt.lng }}
              pinColor={Colors.dark.tint}
            />
          ))}

        {drawMode === 'polygon' && polygonPoints.length >= 2 && (() => {
          const previewCoords = sanitizePolygonCoords(polygonPoints).map((p) => ({ latitude: p.lat, longitude: p.lng }));
          return previewCoords.length >= 2 ? (
            <Polygon
              coordinates={previewCoords}
              fillColor="rgba(90, 138, 90, 0.15)"
              strokeColor={Colors.dark.tint}
              strokeWidth={2}
            />
          ) : null;
        })()}
      </MapView>

      {boulders.length > 0 && (
        <ScrollView style={styles.listPanel} horizontal showsHorizontalScrollIndicator={false}>
          {boulders.map((b) => (
            <Pressable
              key={b.id}
              style={styles.listItem}
              onPress={() => handleBoulderPress(b.id)}
            >
              <ThemedText style={styles.listItemName}>{b.name}</ThemedText>
              <ThemedText style={styles.listItemCount}>
                {b.problem_count} problem{b.problem_count !== 1 ? 's' : ''}
              </ThemedText>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  modeBar: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.cardBorder,
    backgroundColor: Colors.dark.card,
  },
  modeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  modeButtonActive: {
    borderColor: Colors.dark.tint,
    backgroundColor: 'rgba(90, 138, 90, 0.15)',
  },
  modeText: { fontSize: 14, color: Colors.dark.text },
  modeTextActive: { color: Colors.dark.tint, fontWeight: '600' },
  polygonActions: {
    flexDirection: 'row',
    padding: 12,
    gap: 12,
    backgroundColor: Colors.dark.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.cardBorder,
    zIndex: 10,
    elevation: 10,
  },
  polygonButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: Colors.dark.tint,
  },
  polygonButtonCancel: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  polygonButtonText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  polygonButtonCancelText: { fontSize: 14, fontWeight: '600', color: Colors.dark.text },
  map: { flex: 1, width: '100%' },
  callout: {
    padding: 12,
    minWidth: 140,
    backgroundColor: Colors.dark.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  calloutTitle: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  calloutGrade: { fontSize: 13, color: Colors.dark.tint, marginBottom: 4 },
  calloutHint: { fontSize: 11, opacity: 0.6 },
  listPanel: {
    maxHeight: 80,
    padding: 12,
    backgroundColor: Colors.dark.card,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.cardBorder,
  },
  listItem: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginRight: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    minWidth: 120,
  },
  listItemName: { fontSize: 14, fontWeight: '600' },
  listItemCount: { fontSize: 12, opacity: 0.8, marginTop: 2 },
});
