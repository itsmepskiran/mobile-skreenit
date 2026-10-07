import { Stack } from 'expo-router';

import { GradientScreen } from '@/components/on-gradient';

export default function RecruiterJobsStackLayout() {
  return (
    <Stack
      // iOS paints an opaque native background behind stack screens, so each screen draws the brand gradient itself.
      screenLayout={({ children }) => <GradientScreen>{children}</GradientScreen>}
      screenOptions={{
        contentStyle: { backgroundColor: 'transparent' },
        headerStyle: { backgroundColor: '#4338ca' },
        headerTintColor: '#ffffff',
        headerShadowVisible: false,
        headerLargeTitle: false,
        headerTitleAlign: 'left',
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="create" options={{ title: 'Post a Job' }} />
      <Stack.Screen name="[id]/edit" options={{ title: 'Edit Job' }} />
    </Stack>
  );
}
