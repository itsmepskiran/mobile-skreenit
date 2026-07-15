import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { useAuthStore } from '@/lib/auth/store';
import { registerDeviceToken, unregisterDeviceToken } from '@/lib/api/notifications';

// expo-notifications' remote-push functionality was removed from Expo Go as of
// SDK 53 — on Android in particular, merely `import`-ing the module throws
// synchronously and crashes the whole app (confirmed on-device: the app never
// got past the login screen). It only works in a custom dev/production build.
// So this module is loaded lazily via `require`, guarded by try/catch, instead
// of a static top-level `import` — that keeps the throw local to this file and
// lets the rest of the app run fine under Expo Go, falling back to
// GET /notifications polling exactly as it did before push existed.
type NotificationsModule = typeof import('expo-notifications');
let notificationsModule: NotificationsModule | null | undefined;

function getNotificationsModule(): NotificationsModule | null {
  if (notificationsModule !== undefined) return notificationsModule;

  // `appOwnership === 'expo'` means "running inside the Expo Go app" specifically
  // (as opposed to a custom dev-client or standalone build) — even *requiring*
  // expo-notifications triggers a LogBox-level fatal warning on Android in Expo
  // Go (SDK 53+ removed remote push from it), one that a plain try/catch around
  // the require() does not suppress (confirmed on-device: it survives being
  // wrapped). So this module must never be required at all under Expo Go.
  if (Constants.appOwnership === 'expo') {
    console.warn('Push notifications unavailable in Expo Go (SDK 53+ removed them on Android) — use a dev build.');
    notificationsModule = null;
    return null;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    notificationsModule = require('expo-notifications') as NotificationsModule;
    notificationsModule.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
  } catch (err) {
    console.warn('Push notifications unavailable in this runtime:', err);
    notificationsModule = null;
  }
  return notificationsModule;
}

async function getExpoPushToken(): Promise<string | null> {
  const Notifications = getNotificationsModule();
  if (!Notifications || !Device.isDevice) return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (status !== 'granted') {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== 'granted') return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) {
    // No `eas init` has been run for this app yet — Expo push tokens require
    // a project ID to scope to. Registration is a no-op until then; the app
    // still works fine on GET /notifications polling in the meantime.
    console.warn('Skipping push registration: no EAS projectId configured.');
    return null;
  }

  const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
  return data;
}

// Registers this device's Expo push token with the backend whenever a user is
// signed in, and unregisters it on sign-out — mirrors useProtectedRoute's
// status-watching pattern in _layout.tsx.
export function usePushNotifications() {
  const status = useAuthStore((state) => state.status);
  const registeredToken = useRef<string | null>(null);

  useEffect(() => {
    if (status !== 'signedIn') return;

    let cancelled = false;
    (async () => {
      try {
        const token = await getExpoPushToken();
        if (!token || cancelled) return;
        await registerDeviceToken(token, Platform.OS === 'ios' ? 'ios' : 'android');
        registeredToken.current = token;
      } catch (err) {
        console.warn('Push token registration failed (non-critical):', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [status]);

  useEffect(() => {
    if (status === 'signedOut' && registeredToken.current) {
      unregisterDeviceToken(registeredToken.current).catch(() => {});
      registeredToken.current = null;
    }
  }, [status]);

  useEffect(() => {
    const Notifications = getNotificationsModule();
    if (!Notifications) return;

    const sub = Notifications.addNotificationResponseReceivedListener(() => {
      // Recruiters have no dedicated notifications screen (per product spec —
      // only candidates do), so route each role to where they'd actually see it.
      const role = useAuthStore.getState().user?.role;
      router.push(role === 'recruiter' ? '/(recruiter)/dashboard' : '/(candidate)/notifications');
    });
    return () => sub.remove();
  }, []);
}
