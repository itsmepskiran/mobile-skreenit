import { FontAwesome6 } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';

// 5 tabs per product spec: Dashboard, Job Posts, Applications Received,
// Pending Interviews, Profile. Icons match sql-skreenit's recruiter sidebar
// (Overview/My Jobs/Applications/My Profile) plus a dedicated interview icon.
export default function RecruiterLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{ title: 'Dashboard', tabBarIcon: ({ color, size }) => <FontAwesome6 name="gauge" size={size * 0.8} color={color} /> }}
      />
      <Tabs.Screen
        name="jobs"
        options={{ title: 'Job Posts', tabBarIcon: ({ color, size }) => <FontAwesome6 name="briefcase" size={size * 0.8} color={color} /> }}
      />
      <Tabs.Screen
        name="applications"
        options={{
          title: 'Applications Received',
          tabBarLabel: 'Applications',
          tabBarIcon: ({ color, size }) => <FontAwesome6 name="users" size={size * 0.8} color={color} />,
        }}
      />
      <Tabs.Screen
        name="interviews"
        options={{
          title: 'Pending Interviews',
          tabBarLabel: 'Interviews',
          tabBarIcon: ({ color, size }) => <FontAwesome6 name="video" size={size * 0.8} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <FontAwesome6 name="circle-user" size={size * 0.8} color={color} />,
        }}
      />
    </Tabs>
  );
}
