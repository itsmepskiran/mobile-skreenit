import { Stack } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';

export default function JobsStackLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.text,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Jobs' }} />
      <Stack.Screen name="[id]" options={{ title: 'Job details' }} />
    </Stack>
  );
}
