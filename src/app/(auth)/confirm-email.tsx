import { FontAwesome6 } from '@expo/vector-icons';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { confirmEmail } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';
import { AuthScreenLayout } from '@/components/auth-screen-layout';
import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';

type ConfirmState = { status: 'confirming' } | { status: 'success'; message: string } | { status: 'error'; message: string };

const STATE_ICON = {
  confirming: null,
  success: 'circle-check',
  error: 'circle-exclamation',
} as const;

export default function ConfirmEmailScreen() {
  const theme = useTheme();
  const router = useRouter();
  // Reached via the skreenit://confirm-email?token=...&email=... deep link from the confirmation email.
  const { token, email } = useLocalSearchParams<{ token?: string; email?: string }>();
  const [state, setState] = useState<ConfirmState>(() =>
    token && email ? { status: 'confirming' } : { status: 'error', message: 'This confirmation link is missing information.' },
  );

  useEffect(() => {
    if (state.status !== 'confirming' || !token || !email) return;
    confirmEmail(token, email)
      .then((res) => setState({ status: 'success', message: res.message }))
      .catch((err) =>
        setState({
          status: 'error',
          message: err instanceof ApiError ? err.message : 'We could not confirm your email.',
        }),
      );
  }, [state.status, token, email]);

  const icon = STATE_ICON[state.status];

  return (
    <AuthScreenLayout>
      <ThemedView style={styles.iconWrap}>
        {state.status === 'confirming' ? (
          <ActivityIndicator size="large" color={theme.primary} />
        ) : (
          <FontAwesome6 name={icon!} size={48} color={state.status === 'error' ? theme.danger : theme.secondary} />
        )}
      </ThemedView>

      <ThemedText type="subtitle" style={styles.center}>
        {state.status === 'confirming' ? 'Confirming Your Email…' : 'Email Confirmation'}
      </ThemedText>

      {state.status !== 'confirming' && (
        <ThemedText style={[styles.center, state.status === 'error' ? { color: theme.danger } : undefined]}>
          {state.message}
        </ThemedText>
      )}

      {state.status === 'success' ? (
        <Button title="Proceed to Login" icon="right-to-bracket" onPress={() => router.replace('/(auth)/login')} />
      ) : (
        <Link href="/(auth)/login" style={styles.link}>
          <ThemedText type="link" themeColor="primary">
            Go to sign in
          </ThemedText>
        </Link>
      )}
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    alignItems: 'center',
    marginBottom: 4,
  },
  center: {
    textAlign: 'center',
  },
  link: { alignItems: 'center', marginTop: 4 },
});
