import { Stack } from 'expo-router';

export default function RecruiterJobsStackLayout() {
  return (
    <Stack
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
