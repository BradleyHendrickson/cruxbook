import { Link } from 'expo-router';
import { StyleSheet, Pressable } from 'react-native';
import { Text, View } from './Themed';

type SectorCardProps = {
  id: string;
  areaId: string;
  name: string;
  description?: string | null;
  boulderCount: number;
};

export default function SectorCard({ id, areaId, name, description, boulderCount }: SectorCardProps) {
  return (
    <Link href={`/sector/${id}`} asChild>
      <Pressable>
        <View style={styles.card}>
          <Text style={styles.name}>{name}</Text>
          {description ? (
            <Text style={styles.description} numberOfLines={2}>{description}</Text>
          ) : null}
          <Text style={styles.count}>{boulderCount} boulder{boulderCount !== 1 ? 's' : ''}</Text>
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    opacity: 0.8,
    marginBottom: 6,
  },
  count: {
    fontSize: 12,
    opacity: 0.6,
  },
});
