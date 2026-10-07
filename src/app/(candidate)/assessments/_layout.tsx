import { Stack } from 'expo-router';

export default function AssessmentsStackLayout() {
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: 'transparent' },
        headerStyle: { backgroundColor: '#4338ca' },
        headerTintColor: '#ffffff',
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="take/[planId]" options={{ title: 'Assessment', headerBackTitle: 'Back' }} />
      <Stack.Screen name="result/[sessionId]" options={{ title: 'Results', headerBackTitle: 'Back' }} />
    </Stack>
  );
}
