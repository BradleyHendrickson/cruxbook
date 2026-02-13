import { Stack } from 'expo-router';

export default function AddLayout() {
  return (
    <Stack>
      <Stack.Screen name="area" options={{ title: 'Add Area' }} />
      <Stack.Screen name="sector" options={{ title: 'Add Sector' }} />
      <Stack.Screen name="boulder" options={{ title: 'Add Boulder' }} />
    </Stack>
  );
}
