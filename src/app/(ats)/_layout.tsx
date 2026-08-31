import { FontAwesome6 } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';

// 2 visible tabs: Dashboard, and a Menu hub (mirrors (recruiter)/ats-services.tsx's
// hub-grid pattern) linking out to the other 7 sections, each registered below
// as an `href: null` extra screen reachable only via push from the hub.
export default function AtsLayout() {
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
        name="menu"
        options={{ title: 'Menu', tabBarIcon: ({ color, size }) => <FontAwesome6 name="bars" size={size * 0.8} color={color} /> }}
      />
      <Tabs.Screen name="departments" options={{ href: null }} />
      <Tabs.Screen name="designations" options={{ href: null }} />
      <Tabs.Screen name="positions" options={{ href: null }} />
      <Tabs.Screen name="requisitions" options={{ href: null }} />
      <Tabs.Screen name="jobs" options={{ href: null }} />
      <Tabs.Screen name="employees" options={{ href: null }} />
      <Tabs.Screen name="users" options={{ href: null }} />
      <Tabs.Screen name="reports" options={{ href: null }} />
    </Tabs>
  );
}
