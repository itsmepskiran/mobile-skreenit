import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { Poppins_600SemiBold } from '@expo-google-fonts/poppins';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Slot, ThemeProvider, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { useColorScheme, View } from 'react-native';

import { TopBrandBar } from '@/components/top-brand-bar';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { useAuthStore } from '@/lib/auth/store';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1 } },
});

function useProtectedRoute() {
  const segments = useSegments();
  const router = useRouter();
  const status = useAuthStore((state) => state.status);
  const role = useAuthStore((state) => state.user?.role);

  useEffect(() => {
    if (status === 'loading') return;

    const group = segments[0];
    const inAuthGroup = group === '(auth)';
    const roleHome = role === 'recruiter' ? '/(recruiter)/dashboard' : '/(candidate)/jobs';

    if (status === 'signedOut' && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (status === 'signedIn' && inAuthGroup) {
      router.replace(roleHome);
    } else if (status === 'signedIn' && !inAuthGroup) {
      // Guard against a stale route group left over from role-switching, a
      // deep link, or navigation state surviving a fast-refresh — the active
      // tab group must always match the signed-in user's current role.
      const inRecruiterGroup = group === '(recruiter)';
      const inCandidateGroup = group === '(candidate)';
      if ((role === 'recruiter' && inCandidateGroup) || (role !== 'recruiter' && inRecruiterGroup)) {
        router.replace(roleHome);
      }
    }
  }, [status, role, segments, router]);
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const segments = useSegments();
  const [isHydrated, setIsHydrated] = useState(false);
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Poppins_600SemiBold,
  });

  useEffect(() => {
    useAuthStore.getState().hydrate().finally(() => setIsHydrated(true));
  }, []);

  const isReady = isHydrated && fontsLoaded;

  useEffect(() => {
    if (isReady) SplashScreen.hideAsync();
  }, [isReady]);

  useProtectedRoute();
  usePushNotifications();

  if (!isReady) return null;

  // The (auth) screens (login/register/etc.) already carry their own brand
  // treatment via AuthScreenLayout — only show this persistent strip once
  // the user is inside the candidate/recruiter app.
  const showBrandBar = segments[0] !== '(auth)';

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <View style={{ flex: 1 }}>
          {showBrandBar ? <TopBrandBar /> : null}
          <View style={{ flex: 1 }}>
            <Slot />
          </View>
        </View>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
