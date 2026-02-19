import { StyleSheet, View, Text } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Colors from '@/constants/Colors';

type EditableMapViewProps = Record<string, unknown>;

export default function EditableMapView(_props: EditableMapViewProps) {
  return (
    <View style={styles.placeholder}>
      <FontAwesome name="map" size={48} color={Colors.dark.text} style={{ opacity: 0.5 }} />
      <Text style={styles.title}>Map editing available on mobile</Text>
      <Text style={styles.subtitle}>
        Use the iOS or Android app to draw area boundaries and place boulders on the map.
      </Text>
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
});
