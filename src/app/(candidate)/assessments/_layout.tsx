import { Stack } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';

export default function AssessmentsStackLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.text,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="take/[planId]" options={{ title: 'Assessment', headerBackTitle: 'Back' }} />
      <Stack.Screen name="result/[sessionId]" options={{ title: 'Results', headerBackTitle: 'Back' }} />
    </Stack>
  );
}
