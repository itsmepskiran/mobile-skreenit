import { FontAwesome6 } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';

// 6 tabs: ATS Services, Dashboard, Job Posts, Applications Received, Pending
// Interviews, Profile. ATS Services leads (and is the post-login landing tab
// — see roleHome in src/app/_layout.tsx) since it's the primary reason a
// recruiter opens the app day-to-day, ahead of the stats-focused Dashboard.
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
        name="ats-services"
        options={{
          title: 'ATS Services',
          tabBarLabel: 'ATS Services',
          tabBarIcon: ({ color, size }) => <FontAwesome6 name="toolbox" size={size * 0.8} color={color} />,
        }}
      />
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
      <Tabs.Screen name="purchase-history" options={{ href: null }} />
      <Tabs.Screen name="resume-analysis" options={{ href: null }} />
      <Tabs.Screen name="candidate-search" options={{ href: null }} />
      <Tabs.Screen name="interviews-calendar" options={{ href: null }} />
      <Tabs.Screen name="jd-writer" options={{ href: null }} />
      <Tabs.Screen name="premium" options={{ href: null }} />
      <Tabs.Screen name="analysis-reports" options={{ href: null }} />
      <Tabs.Screen name="reports" options={{ href: null }} />
    </Tabs>
  );
}
