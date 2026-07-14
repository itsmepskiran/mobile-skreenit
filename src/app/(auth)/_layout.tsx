import { Stack } from 'expo-router';

import { ThemeOverrideProvider } from '@/hooks/use-theme';

export default function AuthLayout() {
  return (
    <ThemeOverrideProvider value="light">
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="forgot-password" />
        <Stack.Screen name="reset-password" />
        <Stack.Screen name="confirm-email" />
      </Stack>
    </ThemeOverrideProvider>
  );
}
