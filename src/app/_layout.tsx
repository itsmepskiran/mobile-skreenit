import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { Poppins_600SemiBold } from '@expo-google-fonts/poppins';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Slot, ThemeProvider, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { useColorScheme, View } from 'react-native';

import { TopBrandBar } from '@/components/top-brand-bar';
import { WelcomeScreen } from '@/components/welcome-screen';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { useAtsStore } from '@/lib/auth/ats-store';
import { useAuthStore } from '@/lib/auth/store';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1 } },
});

// The ATS Employer Console is a fully separate auth domain (its own JWT, its
// own store — see lib/auth/ats-store.ts) from the candidate/recruiter session
// below. Being signed into one has no bearing on the other, so route
// protection branches entirely on whether the current segment belongs to the
// ATS world before falling through to the candidate/recruiter checks.
function useAtsProtectedRoute(group: string | undefined) {
  const router = useRouter();
  const status = useAtsStore((state) => state.status);

  useEffect(() => {
    if (status === 'loading') return;
    const inAtsAuthGroup = group === '(ats-auth)';
    const inAtsGroup = group === '(ats)' || inAtsAuthGroup;
    if (!inAtsGroup) return;

    if (status === 'signedOut' && !inAtsAuthGroup) {
      router.replace('/(ats-auth)/login');
    } else if (status === 'signedIn' && inAtsAuthGroup) {
      router.replace('/(ats)/dashboard');
    }
  }, [status, group, router]);
}

function useProtectedRoute() {
  const segments = useSegments();
  const router = useRouter();
  const status = useAuthStore((state) => state.status);
  const role = useAuthStore((state) => state.user?.role);
  const onboarded = useAuthStore((state) => state.user?.onboarded);
  const group = segments[0];
  const inAtsWorld = group === '(ats-auth)' || group === '(ats)';

  useAtsProtectedRoute(group);

  useEffect(() => {
    if (status === 'loading' || inAtsWorld) return;

    const inAuthGroup = group === '(auth)';
    // Guest assessment-invite deep links (skreenit://assessment-invite?token=...)
    // are opened by people who, by definition, have no Skreenit account —
    // never force them through login.
    const isPublicRoute = inAuthGroup || group === 'assessment-invite';
    const roleHome = role === 'recruiter' ? '/(recruiter)/ats-services' : '/(candidate)/jobs';

    if (status === 'signedOut' && !isPublicRoute) {
      router.replace('/(auth)/login');
    } else if (status === 'signedIn' && inAuthGroup) {
      // Mirrors web's login-time redirect: an un-onboarded recruiter goes
      // straight to completing their profile instead of the ATS Services
      // landing tab. Only fires on this login-moment transition (leaving the
      // auth group), not on every navigation, so it doesn't trap a recruiter
      // who deliberately backs out of editing.
      if (role === 'recruiter' && onboarded === false) {
        router.replace('/(recruiter)/profile?edit=true');
      } else {
        router.replace(roleHome);
      }
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
  }, [status, role, onboarded, group, inAtsWorld, router]);
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const segments = useSegments();
  const [isHydrated, setIsHydrated] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Poppins_600SemiBold,
  });

  useEffect(() => {
    Promise.all([useAuthStore.getState().hydrate(), useAtsStore.getState().hydrate()]).finally(() => setIsHydrated(true));
  }, []);

  const isReady = isHydrated && fontsLoaded;

  useEffect(() => {
    if (isReady) SplashScreen.hideAsync();
  }, [isReady]);

  useProtectedRoute();
  usePushNotifications();

  if (!isReady) return null;

  if (showWelcome) {
    return <WelcomeScreen onFinish={() => setShowWelcome(false)} />;
  }

  // The (auth) and (ats-auth) screens (login/register/etc.) already carry
  // their own brand treatment via AuthScreenLayout — only show this
  // persistent strip once the user is inside the candidate/recruiter/ATS app.
  const showBrandBar = segments[0] !== '(auth)' && segments[0] !== '(ats-auth)';

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
