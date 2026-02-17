import { useCallback, useState, useEffect } from 'react';
import { StyleSheet, Pressable, ScrollView, Image, Modal } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Text, View } from '@/components/Themed';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Colors from '@/constants/Colors';
import { router } from 'expo-router';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);

  const syncFromUser = useCallback(() => {
    if (user) {
      setAvatarUrl((user.user_metadata?.avatar_url as string) ?? null);
    }
  }, [user]);

  useEffect(() => {
    syncFromUser();
  }, [syncFromUser]);

  useFocusEffect(
    useCallback(() => {
      const refreshAvatar = async () => {
        const { data: { user: freshUser } } = await supabase.auth.getUser();
        if (freshUser?.user_metadata?.avatar_url) {
          const url = freshUser.user_metadata.avatar_url as string;
          const updatedAt = freshUser.user_metadata.avatar_updated_at as number | undefined;
          setAvatarUrl(updatedAt ? `${url.split('?')[0]}?t=${updatedAt}` : url);
        } else {
          setAvatarUrl(null);
        }
      };
      refreshAvatar();
    }, [])
  );

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

  const displayAvatar =
    avatarUrl ??
    (() => {
      const url = user.user_metadata?.avatar_url as string | undefined;
      if (!url) return null;
      const updatedAt = user.user_metadata?.avatar_updated_at as number | undefined;
      return updatedAt ? `${url.split('?')[0]}?t=${updatedAt}` : url;
    })();
  const displayUsername =
    (user.user_metadata?.username as string) || 'No username set';

  return (
    <>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Pressable
          style={styles.menuButton}
          onPress={() => setMenuVisible(true)}
        >
          <FontAwesome name="ellipsis-v" size={20} color={Colors.dark.text} />
        </Pressable>
      </View>

      <View style={styles.avatarWrap}>
        {displayAvatar ? (
          <Image key={displayAvatar} source={{ uri: displayAvatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <FontAwesome name="user" size={48} color={Colors.dark.text} />
          </View>
        )}
      </View>

      <Text style={styles.displayValue}>{displayUsername}</Text>
      <Text style={styles.email}>{user.email}</Text>
    </ScrollView>

    <Modal
      visible={menuVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setMenuVisible(false)}
    >
      <Pressable
        style={styles.menuOverlay}
        onPress={() => setMenuVisible(false)}
      >
        <View style={styles.menuContainer}>
          <Pressable
            style={styles.menuItem}
            onPress={() => {
              setMenuVisible(false);
              router.push('/edit-profile');
            }}
          >
            <FontAwesome name="pencil" size={16} color={Colors.dark.tint} />
            <Text style={styles.menuItemText}>Edit profile</Text>
          </Pressable>
          <Pressable
            style={[styles.menuItem, styles.menuItemLast]}
            onPress={() => {
              setMenuVisible(false);
              handleSignOut();
            }}
          >
            <FontAwesome name="sign-out" size={16} color={Colors.dark.tint} />
            <Text style={styles.menuItemText}>Sign out</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, paddingBottom: 48, alignItems: 'center' },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    width: '100%',
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  menuButton: {
    padding: 8,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 56,
    paddingRight: 16,
  },
  menuContainer: {
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    minWidth: 180,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.cardBorder,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemText: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '500',
  },
  avatarWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginTop: 8,
    marginBottom: 16,
    overflow: 'hidden',
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
  displayValue: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.dark.text,
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: Colors.dark.text,
    opacity: 0.7,
    marginBottom: 32,
  },
  text: { color: Colors.dark.text },
});
