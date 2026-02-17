import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Pressable } from 'react-native';
import 'react-native-reanimated';

import { AuthProvider } from '@/lib/auth-context';
import { EarthyDarkTheme } from '@/constants/Theme';
import { ThemeProvider } from '@react-navigation/native';
import { useAuth } from '@/lib/auth-context';
import { router } from 'expo-router';
import Colors from '@/constants/Colors';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = { initialRouteName: 'index' };

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <AuthProvider>
      <ThemeProvider value={EarthyDarkTheme}>
        <RootLayoutNav />
      </ThemeProvider>
    </AuthProvider>
  );
}

function RootLayoutNav() {
  const { user } = useAuth();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.dark.card },
        headerTintColor: Colors.dark.text,
        headerTitleStyle: { color: Colors.dark.text },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen
        name="areas"
        options={{
          title: 'Areas',
          headerRight: () =>
            user ? (
              <Pressable onPress={() => router.push('/profile')} style={{ marginRight: 16 }}>
                <FontAwesome name="user" size={22} color={Colors.dark.text} />
              </Pressable>
            ) : null,
        }}
      />
      <Stack.Screen name="add-area" options={{ title: 'Add Area' }} />
      <Stack.Screen name="profile" options={{ title: 'Profile' }} />
    </Stack>
  );
}
