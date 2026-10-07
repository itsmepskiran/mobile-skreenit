import { Stack } from 'expo-router';

import { GradientScreen } from '@/components/on-gradient';

export default function RecruiterApplicationsStackLayout() {
  return (
    <Stack
      // iOS paints an opaque native background behind stack screens, so each screen draws the brand gradient itself.
      screenLayout={({ children }) => <GradientScreen>{children}</GradientScreen>}
      screenOptions={{
        contentStyle: { backgroundColor: 'transparent' },
        headerStyle: { backgroundColor: '#4338ca' },
        headerTintColor: '#ffffff',
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[id]" options={{ title: 'Review Candidate' }} />
    </Stack>
  );
}
