import { Stack } from 'expo-router';

import { ThemeOverrideProvider } from '@/hooks/use-theme';

export default function AtsAuthLayout() {
  return (
    <ThemeOverrideProvider value="light">
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
      </Stack>
    </ThemeOverrideProvider>
  );
}
