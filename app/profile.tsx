import { useState, useEffect } from 'react';
import {
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Text, View } from '@/components/Themed';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Colors from '@/constants/Colors';
import { router } from 'expo-router';

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setUsername((user.user_metadata?.username as string) ?? '');
      setAvatarUrl((user.user_metadata?.avatar_url as string) ?? null);
    }
  }, [user]);

  const handleUpdateUsername = async () => {
    if (!user) return;
    const trimmed = username.trim().toLowerCase();
    if (!USERNAME_REGEX.test(trimmed)) {
      setError('Username: 3–20 characters, letters, numbers, underscores only');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.updateUser({
        data: { username: trimmed },
      });
      if (err) throw err;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to update username');
    } finally {
      setLoading(false);
    }
  };

  const handlePickImage = async () => {
    if (!user) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow access to photos to set a profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    setLoading(true);
    setError(null);
    try {
      const uri = result.assets[0].uri;
      const ext = uri.split('.').pop() ?? 'jpg';
      const path = `${user.id}/avatar.${ext}`;
      const response = await fetch(uri);
      const blob = await response.blob();
      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { upsert: true });
      if (uploadErr) throw uploadErr;
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      const { error: updateErr } = await supabase.auth.updateUser({
        data: { avatar_url: data.publicUrl },
      });
      if (updateErr) throw updateErr;
      setAvatarUrl(data.publicUrl);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to upload image');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/(auth)/login');
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Sign in to view profile</Text>
      </View>
    );
  }

  const displayAvatar = avatarUrl ?? user.user_metadata?.avatar_url;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profile picture</Text>
        <Pressable onPress={handlePickImage} style={styles.avatarWrap} disabled={loading}>
          {displayAvatar ? (
            <Image source={{ uri: displayAvatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <FontAwesome name="user" size={48} color={Colors.dark.text} />
            </View>
          )}
          <View style={styles.avatarOverlay}>
            <FontAwesome name="camera" size={20} color="#fff" />
          </View>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Username</Text>
        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
        <TextInput
          style={styles.input}
          placeholder="Username"
          placeholderTextColor="rgba(196, 167, 125, 0.5)"
          value={username}
          onChangeText={(t) => {
            setUsername(t);
            setError(null);
          }}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleUpdateUsername}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.buttonText}>Update username</Text>
          )}
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.email}>{user.email}</Text>
      </View>

      <Pressable style={styles.signOut} onPress={handleSignOut}>
        <FontAwesome name="sign-out" size={18} color={Colors.dark.tint} />
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, paddingBottom: 48 },
  section: { marginBottom: 32 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    color: Colors.dark.text,
    opacity: 0.8,
  },
  avatarWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: 'center',
    position: 'relative',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.dark.card,
    borderWidth: 2,
    borderColor: Colors.dark.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.dark.tint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorBanner: {
    backgroundColor: 'rgba(196, 70, 74, 0.2)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(196, 70, 74, 0.4)',
  },
  errorText: { color: Colors.dark.error, fontSize: 14 },
  input: {
    borderWidth: 1,
    borderColor: Colors.dark.inputBorder,
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    marginBottom: 12,
    color: Colors.dark.text,
    backgroundColor: Colors.dark.card,
  },
  button: {
    backgroundColor: Colors.dark.tint,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  email: { fontSize: 14, color: Colors.dark.text, opacity: 0.6 },
  text: { color: Colors.dark.text },
  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    paddingVertical: 12,
  },
  signOutText: { color: Colors.dark.tint, fontSize: 16, fontWeight: '500' },
});
