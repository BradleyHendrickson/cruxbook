import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { AuthProvider } from '@/lib/auth-context';
import { EarthyDarkTheme } from '@/constants/Theme';
import { ThemeProvider } from '@react-navigation/native';
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
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="add-area"
        options={{
          title: 'Add Area',
          headerBackTitle: 'Areas',
        }}
      />
      <Stack.Screen
        name="edit-profile"
        options={{
          title: 'Edit Profile',
          headerBackTitle: 'Profile',
        }}
      />
      <Stack.Screen
        name="area/[id]"
        options={{
          title: 'Area',
          headerBackTitle: 'Areas',
        }}
      />
      <Stack.Screen
        name="add-sector"
        options={{
          title: 'Add Sector',
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen
        name="sector/[id]"
        options={{
          title: 'Sector',
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen
        name="add-boulder"
        options={{
          title: 'Add Boulder',
          headerBackTitle: 'Back',
        }}
      />
    </Stack>
  );
}
