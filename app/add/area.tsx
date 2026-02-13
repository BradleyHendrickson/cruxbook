import { useState } from 'react';
import { router } from 'expo-router';
import { StyleSheet, TextInput, Pressable, ScrollView, Alert } from 'react-native';
import { Text, View } from '@/components/Themed';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

export default function AddAreaScreen() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter an area name');
      return;
    }
    if (!user) {
      Alert.alert('Error', 'You must be signed in to add areas');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from('areas').insert({
        name: name.trim(),
        description: description.trim() || null,
        created_by: user.id,
      });
      if (error) throw error;
      router.back();
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to create area');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.form}>
        <Text style={styles.label}>Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Buttermilks, Rocklands"
          placeholderTextColor="#999"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Brief description of the area..."
          placeholderTextColor="#999"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
        />
        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? 'Creating...' : 'Create Area'}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  form: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#2f95dc',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
