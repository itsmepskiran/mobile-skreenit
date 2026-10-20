import * as AppleAuthentication from 'expo-apple-authentication';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { RoleChoiceModal, type Role } from '@/components/role-choice-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { providerLogin, type AuthSession } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';
import { useAuthStore } from '@/lib/auth/store';
import { useTheme } from '@/hooks/use-theme';

const googleWebClientId: string = Constants.expoConfig?.extra?.googleWebClientId ?? '';
const googleIosClientId: string = Constants.expoConfig?.extra?.googleIosClientId ?? '';

// Google sign-in is native code, so it isn't in Expo Go; it works in store and development builds
// once the client IDs in app.config.ts are filled in.
const googleAvailable =
  !!googleWebClientId &&
  (Platform.OS !== 'ios' || !!googleIosClientId) &&
  Platform.OS !== 'web' &&
  Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

type GoogleModule = typeof import('@react-native-google-signin/google-signin');
let googleModule: GoogleModule | null = null;
function google(): GoogleModule {
  if (!googleModule) {
    // Required lazily: importing it where the native module is missing throws at load time.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    googleModule = require('@react-native-google-signin/google-signin') as GoogleModule;
    googleModule.GoogleSignin.configure({ webClientId: googleWebClientId, iosClientId: googleIosClientId || undefined });
  }
  return googleModule;
}

interface PendingToken {
  provider: 'google' | 'apple';
  idToken: string;
  fullName?: string;
}

export interface ProviderSignInProps {
  // Role already chosen on the screen (registration); otherwise a new person is asked.
  role?: Role;
  referralCode?: string;
  onError: (message: string | null) => void;
}

// "Continue with Google", plus "Sign in with Apple" on iPhone (Apple requires it whenever an iOS
// app offers Google login). The backend (POST /google-login, /apple-login) checks the token and
// returns the same session as a password login.
export function ProviderSignIn({ role, referralCode, onError }: ProviderSignInProps) {
  const theme = useTheme();
  const setSession = useAuthStore((state) => state.setSession);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [busy, setBusy] = useState<'google' | 'apple' | null>(null);
  const [needsRole, setNeedsRole] = useState<PendingToken | null>(null);
  const [joiningAs, setJoiningAs] = useState<Role | null>(null);

  useEffect(() => {
    if (Platform.OS === 'ios') AppleAuthentication.isAvailableAsync().then(setAppleAvailable).catch(() => {});
  }, []);

  const finish = async (pending: PendingToken, chosenRole?: Role) => {
    const res = await providerLogin(pending.provider, {
      idToken: pending.idToken,
      role: chosenRole ?? role,
      fullName: pending.fullName,
      referralCode,
    });
    if ('needs_role' in res.data) {
      setNeedsRole(pending);
      return;
    }
    const session = res.data as AuthSession;
    await setSession({ accessToken: session.access_token, refreshToken: session.refresh_token }, session.user, true);
  };

  const run = async (provider: 'google' | 'apple', getToken: () => Promise<PendingToken | null>) => {
    onError(null);
    setBusy(provider);
    try {
      const pending = await getToken();
      if (pending) await finish(pending);
    } catch (err) {
      onError(err instanceof ApiError ? err.message : `Could not sign in with ${provider === 'google' ? 'Google' : 'Apple'}. Please try again.`);
    } finally {
      setBusy(null);
    }
  };

  const signInWithGoogle = () =>
    run('google', async () => {
      const { GoogleSignin, isSuccessResponse } = google();
      await GoogleSignin.hasPlayServices();
      // Always show the account picker, so a shared phone can choose a different Google account.
      await GoogleSignin.signOut().catch(() => {});
      const res = await GoogleSignin.signIn();
      if (!isSuccessResponse(res) || !res.data.idToken) return null;
      return { provider: 'google', idToken: res.data.idToken };
    });

  const signInWithApple = () =>
    run('apple', async () => {
      try {
        const cred = await AppleAuthentication.signInAsync({
          requestedScopes: [
            AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
            AppleAuthentication.AppleAuthenticationScope.EMAIL,
          ],
        });
        if (!cred.identityToken) return null;
        // Apple gives the name only the first time someone signs in to the app.
        const fullName = [cred.fullName?.givenName, cred.fullName?.familyName].filter(Boolean).join(' ') || undefined;
        return { provider: 'apple', idToken: cred.identityToken, fullName };
      } catch (err) {
        if ((err as { code?: string }).code === 'ERR_REQUEST_CANCELED') return null;
        throw err;
      }
    });

  const onChooseRole = async (chosen: Role) => {
    if (!needsRole) return;
    setJoiningAs(chosen);
    try {
      await finish(needsRole, chosen);
      setNeedsRole(null);
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Could not create your account. Please try again.');
      setNeedsRole(null);
    } finally {
      setJoiningAs(null);
    }
  };

  if (!googleAvailable && !appleAvailable) return null;

  return (
    <ThemedView style={styles.wrap}>
      <ThemedView style={styles.dividerRow}>
        <ThemedView style={[styles.line, { backgroundColor: theme.border }]} />
        <ThemedText type="small" themeColor="textSecondary">
          or
        </ThemedText>
        <ThemedView style={[styles.line, { backgroundColor: theme.border }]} />
      </ThemedView>
      {googleAvailable ? (
        <Button title="Continue with Google" icon="google" variant="secondary" onPress={signInWithGoogle} loading={busy === 'google'} disabled={!!busy} />
      ) : null}
      {appleAvailable ? (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={10}
          style={styles.appleButton}
          onPress={() => {
            if (!busy) signInWithApple();
          }}
        />
      ) : null}
      <RoleChoiceModal
        visible={!!needsRole}
        joining
        onClose={() => setNeedsRole(null)}
        onSelect={onChooseRole}
        loadingRole={joiningAs}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  line: { flex: 1, height: StyleSheet.hairlineWidth },
  appleButton: { width: '100%', height: 48 },
});
