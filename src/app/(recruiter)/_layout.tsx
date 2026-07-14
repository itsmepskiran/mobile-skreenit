import { Tabs } from 'expo-router';

export default function RecruiterLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="dashboard" options={{ title: 'Dashboard' }} />
      <Tabs.Screen name="postings" options={{ title: 'Jobs' }} />
      <Tabs.Screen name="candidates" options={{ title: 'Candidates' }} />
      <Tabs.Screen name="screening" options={{ title: 'Screening' }} />
    </Tabs>
  );
}
