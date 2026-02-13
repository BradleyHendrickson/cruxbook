import { Link } from 'expo-router';
import { StyleSheet, Pressable } from 'react-native';
import { Text, View } from './Themed';

type BoulderCardProps = {
  id: string;
  name: string;
  grade: string;
  voteCount: number;
};

export default function BoulderCard({ id, name, grade, voteCount }: BoulderCardProps) {
  return (
    <Link href={`/boulder/${id}`} asChild>
      <Pressable>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.name}>{name}</Text>
            <View style={styles.gradeBadge}>
              <Text style={styles.grade}>{grade}</Text>
            </View>
          </View>
          {voteCount > 0 && (
            <Text style={styles.votes}>{voteCount} vote{voteCount !== 1 ? 's' : ''}</Text>
          )}
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  gradeBadge: {
    backgroundColor: 'rgba(47, 149, 220, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  grade: {
    fontSize: 14,
    fontWeight: '700',
  },
  votes: {
    fontSize: 11,
    opacity: 0.6,
    marginTop: 4,
  },
});
