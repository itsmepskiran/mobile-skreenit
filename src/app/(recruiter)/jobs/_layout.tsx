import { Stack } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';

export default function RecruiterJobsStackLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.text,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'My Jobs' }} />
      <Stack.Screen name="create" options={{ title: 'Post a Job' }} />
      <Stack.Screen name="[id]/edit" options={{ title: 'Edit Job' }} />
    </Stack>
  );
}
