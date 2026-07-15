import { FontAwesome6 } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';

// 5 tabs per product spec: Dashboard, Jobs, My Applications, My Assessments,
// Profile. Notifications stays a real route (reachable from a header bell
// icon, matching the web's header-dropdown pattern) but is hidden from the
// tab bar via href: null.
export default function CandidateLayout() {
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
        options={{ title: 'Dashboard', tabBarIcon: ({ color, size }) => <FontAwesome6 name="house" size={size * 0.8} color={color} /> }}
      />
      <Tabs.Screen
        name="jobs"
        options={{ title: 'Jobs', tabBarIcon: ({ color, size }) => <FontAwesome6 name="briefcase" size={size * 0.8} color={color} /> }}
      />
      <Tabs.Screen
        name="applications"
        options={{
          title: 'My Applications',
          tabBarLabel: 'Applications',
          tabBarIcon: ({ color, size }) => <FontAwesome6 name="file-lines" size={size * 0.8} color={color} />,
        }}
      />
      <Tabs.Screen
        name="assessments"
        options={{
          title: 'My Assessments',
          tabBarLabel: 'Assessments',
          tabBarIcon: ({ color, size }) => <FontAwesome6 name="clipboard-check" size={size * 0.8} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <FontAwesome6 name="user" size={size * 0.8} color={color} /> }}
      />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="subscription" options={{ href: null }} />
    </Tabs>
  );
}
