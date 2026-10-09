import { FontAwesome6 } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Tabs } from 'expo-router';

import { GradientScreen } from '@/components/on-gradient';

import { useTheme } from '@/hooks/use-theme';
import { getFeatures } from '@/lib/api/features';

// 6 tabs per product spec: Jobs, Dashboard, My Applications, My Assessments,
// Training Sessions, Profile. Jobs leads since it's also the post-login landing route (see
// useProtectedRoute in app/_layout.tsx). Notifications stays a real route
// (reachable from a header bell icon, matching the web's header-dropdown
// pattern) but is hidden from the tab bar via href: null.
export default function CandidateLayout() {
  const theme = useTheme();
  // The Jobs tab is hidden while candidate job search is switched off server-side (app_settings).
  const features = useQuery({ queryKey: ['features'], queryFn: getFeatures, staleTime: 60_000 });
  const jobsEnabled = features.data?.data.candidate_job_search !== false;

  return (
    <GradientScreen>
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: 'transparent' },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
      }}
    >
      <Tabs.Screen
        name="jobs"
        options={{
          title: 'Jobs',
          href: jobsEnabled ? undefined : null,
          tabBarIcon: ({ color, size }) => <FontAwesome6 name="briefcase" size={size * 0.8} color={color} />,
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{ title: 'Dashboard', tabBarIcon: ({ color, size }) => <FontAwesome6 name="house" size={size * 0.8} color={color} /> }}
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
        name="training-sessions"
        options={{
          title: 'Training Sessions',
          tabBarLabel: 'Training',
          tabBarIcon: ({ color, size }) => <FontAwesome6 name="graduation-cap" size={size * 0.8} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <FontAwesome6 name="user" size={size * 0.8} color={color} /> }}
      />
      <Tabs.Screen name="resume-writing" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="purchase-history" options={{ href: null }} />
      <Tabs.Screen name="my-purchases" options={{ href: null }} />
      <Tabs.Screen name="employability-report" options={{ href: null }} />
      <Tabs.Screen name="premium-services" options={{ href: null }} />
      <Tabs.Screen name="mock-interview" options={{ href: null }} />
      <Tabs.Screen name="intro-video-analysis" options={{ href: null }} />
      <Tabs.Screen name="plans" options={{ href: null }} />
      <Tabs.Screen name="practice" options={{ href: null }} />
      <Tabs.Screen name="interview-room/[applicationId]" options={{ href: null }} />
    </Tabs>
    </GradientScreen>
  );
}
