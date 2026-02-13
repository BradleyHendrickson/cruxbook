import { Link } from 'expo-router';
import { StyleSheet, Pressable } from 'react-native';
import { Text, View } from './Themed';

type AreaCardProps = {
  id: string;
  name: string;
  description?: string | null;
  boulderCount: number;
};

export default function AreaCard({ id, name, description, boulderCount }: AreaCardProps) {
  return (
    <Link href={`/area/${id}`} asChild>
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
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    opacity: 0.8,
    marginBottom: 8,
  },
  count: {
    fontSize: 12,
    opacity: 0.6,
  },
});
