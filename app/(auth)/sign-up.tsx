import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import {
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Text, View } from '@/components/Themed';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import Colors from '@/constants/Colors';

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

export default function SignUpScreen() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) router.replace('/areas');
  }, [user]);

  const handleSignUp = async () => {
    setError(null);
    if (!username.trim()) {
      setError('Please choose a username');
      return;
    }
    const trimmedUsername = username.trim().toLowerCase();
    if (!USERNAME_REGEX.test(trimmedUsername)) {
      setError('Username: 3–20 characters, letters, numbers, underscores only');
      return;
    }
    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }
    if (!password) {
      setError('Please enter a password');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { username: trimmedUsername } },
      });
      if (err) throw err;
      setError(null);
      router.replace('/areas');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => setError(null);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.badge}>Create account</Text>
            <Text style={styles.title}>Join Cruxbook</Text>
            <Text style={styles.subtitle}>Add areas, vote on grades, share beta</Text>
          </View>

          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.form}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={[styles.input, error ? styles.inputError : null]}
              placeholder="e.g. sendmaster"
              placeholderTextColor="rgba(196, 167, 125, 0.5)"
              value={username}
              onChangeText={(t) => {
                setUsername(t);
                clearError();
              }}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
            />
            <Text style={styles.hint}>3–20 characters, letters, numbers, underscores</Text>

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, error ? styles.inputError : null]}
              placeholder="you@example.com"
              placeholderTextColor="rgba(196, 167, 125, 0.5)"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                clearError();
              }}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={[styles.input, error ? styles.inputError : null]}
              placeholder="At least 6 characters"
              placeholderTextColor="rgba(196, 167, 125, 0.5)"
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                clearError();
              }}
              secureTextEntry
              autoComplete="new-password"
            />

            <Pressable
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSignUp}
              disabled={loading}
            >
              <Text style={styles.buttonText}>{loading ? 'Creating account...' : 'Create Account'}</Text>
            </Pressable>
          </View>

          <Pressable onPress={() => router.back()} style={styles.link}>
            <Text style={styles.linkText}>Already have an account? Sign in</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  scrollContent: { flexGrow: 1, padding: 24, paddingVertical: 40, alignItems: 'center' },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: Colors.dark.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    padding: 24,
  },
  cardHeader: { marginBottom: 20, backgroundColor: 'transparent' },
  badge: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    color: Colors.dark.tint,
    marginBottom: 8,
  },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 4, color: Colors.dark.text },
  subtitle: { fontSize: 14, opacity: 0.7, marginBottom: 4, color: Colors.dark.text },
  errorBanner: {
    backgroundColor: 'rgba(196, 70, 74, 0.2)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(196, 70, 74, 0.4)',
  },
  errorText: { color: Colors.dark.error, fontSize: 14 },
  form: { gap: 4, backgroundColor: 'transparent' },
  label: { fontSize: 13, fontWeight: '600', marginTop: 12, marginBottom: 4, color: Colors.dark.text },
  input: {
    borderWidth: 1,
    borderColor: Colors.dark.inputBorder,
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    backgroundColor: Colors.dark.background,
    color: Colors.dark.text,
  },
  inputError: { borderColor: 'rgba(196, 70, 74, 0.5)' },
  hint: { fontSize: 11, opacity: 0.6, marginTop: 2, marginBottom: 4, color: Colors.dark.text },
  button: {
    backgroundColor: Colors.dark.tint,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  link: { marginTop: 20, alignItems: 'center' },
  linkText: { color: Colors.dark.tint, fontSize: 14 },
});
