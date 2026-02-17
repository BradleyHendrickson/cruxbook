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
import { decode } from 'base64-arraybuffer';
import { Text, View } from '@/components/Themed';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Colors from '@/constants/Colors';
import { router } from 'expo-router';

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

export default function EditProfileScreen() {
  const { user } = useAuth();
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [initialUsername, setInitialUsername] = useState('');
  const [initialAvatarUrl, setInitialAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getAvatarUrlWithCacheBuster = (url: string | null) => {
    if (!url) return null;
    const updatedAt = user?.user_metadata?.avatar_updated_at as number | undefined;
    return updatedAt ? `${url.split('?')[0]}?t=${updatedAt}` : url;
  };

  useEffect(() => {
    if (user) {
      const metaUsername = (user.user_metadata?.username as string) ?? '';
      const metaAvatar = getAvatarUrlWithCacheBuster(
        (user.user_metadata?.avatar_url as string) ?? null
      );
      setUsername(metaUsername);
      setAvatarUrl(metaAvatar);
      setInitialUsername(metaUsername);
      setInitialAvatarUrl(metaAvatar);
    }
  }, [user]);

  // Fetch fresh user data when screen mounts (auth context may be stale when navigating from profile)
  useEffect(() => {
    const loadUser = async () => {
      const { data: { user: freshUser } } = await supabase.auth.getUser();
      if (freshUser?.user_metadata) {
        const url = freshUser.user_metadata.avatar_url as string | undefined;
        const updatedAt = freshUser.user_metadata.avatar_updated_at as number | undefined;
        const avatar = url
          ? (updatedAt ? `${url.split('?')[0]}?t=${updatedAt}` : url)
          : null;
        setAvatarUrl(avatar);
        setInitialAvatarUrl(avatar);
      }
    };
    loadUser();
  }, []);

  const hasChanges =
    username.trim().toLowerCase() !== initialUsername.trim().toLowerCase() ||
    (avatarUrl ?? null) !== (initialAvatarUrl ?? null);

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
      base64: true,
    });
    if (result.canceled || !result.assets[0]) return;
    setLoading(true);
    setError(null);
    try {
      const asset = result.assets[0];
      const uri = asset.uri;
      const ext = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
      const path = `${user.id}/avatar.${ext}`;

      let uploadData: ArrayBuffer | Blob;
      if (asset.base64) {
        uploadData = decode(asset.base64);
      } else {
        const response = await fetch(uri);
        uploadData = await response.blob();
      }

      const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';
      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(path, uploadData, { upsert: true, contentType });
      if (uploadErr) throw uploadErr;
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      const avatarUpdatedAt = Date.now();
      const { error: updateErr } = await supabase.auth.updateUser({
        data: {
          avatar_url: data.publicUrl,
          avatar_updated_at: avatarUpdatedAt,
        },
      });
      if (updateErr) throw updateErr;
      await supabase.auth.refreshSession();
      const urlWithCacheBuster = `${data.publicUrl}?t=${avatarUpdatedAt}`;
      setAvatarUrl(urlWithCacheBuster);
      setInitialAvatarUrl(urlWithCacheBuster);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to upload image');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
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
      setInitialUsername(trimmed);
      router.back();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Sign in to edit profile</Text>
      </View>
    );
  }

  const displayAvatar = avatarUrl ?? user.user_metadata?.avatar_url;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Avatar section */}
      <View style={[styles.card, styles.avatarCard]}>
        <View style={styles.avatarSection}>
          <Pressable
            onPress={handlePickImage}
            style={styles.avatarPressable}
            disabled={loading}
          >
            {displayAvatar ? (
              <Image key={displayAvatar} source={{ uri: displayAvatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <FontAwesome name="user" size={48} color={Colors.dark.text} />
              </View>
            )}
          </Pressable>
          <Pressable
            onPress={handlePickImage}
            style={styles.changePhotoButton}
            disabled={loading}
          >
            <FontAwesome name="camera" size={14} color={Colors.dark.tint} />
            <Text style={styles.changePhotoText}>Change photo</Text>
          </Pressable>
        </View>
      </View>

      {/* Username section */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Username</Text>
        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
        <TextInput
          style={styles.input}
          placeholder="3–20 characters, letters, numbers, underscores"
          placeholderTextColor="rgba(196, 167, 125, 0.5)"
          value={username}
          onChangeText={(t) => {
            setUsername(t);
            setError(null);
          }}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {/* Save */}
      <Pressable
        style={[
          styles.saveButton,
          (!hasChanges || loading) && styles.saveButtonMuted,
          loading && styles.saveButtonDisabled,
        ]}
        onPress={handleSave}
        disabled={!hasChanges || loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={[styles.saveButtonText, !hasChanges && styles.saveButtonTextMuted]}>
            Save changes
          </Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  content: { padding: 16, paddingBottom: 48 },
  card: {
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  avatarCard: {
    backgroundColor: Colors.dark.background,
    borderColor: 'transparent',
  },
  avatarSection: {
    alignItems: 'center',
  },
  avatarPressable: {
    marginBottom: 12,
    backgroundColor: Colors.dark.background,
    borderRadius: 50,
    overflow: 'hidden',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.dark.background,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.dark.background,
    borderWidth: 2,
    borderColor: Colors.dark.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  changePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  changePhotoText: {
    color: Colors.dark.tint,
    fontSize: 14,
    fontWeight: '500',
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    color: Colors.dark.text,
    opacity: 0.9,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.dark.inputBorder,
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: Colors.dark.text,
    backgroundColor: Colors.dark.background,
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
  saveButton: {
    backgroundColor: Colors.dark.tint,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonMuted: {
    backgroundColor: Colors.dark.card,
    opacity: 0.7,
  },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  saveButtonTextMuted: { color: Colors.dark.text, opacity: 0.5 },
  text: { color: Colors.dark.text },
});
