import { FontAwesome6 } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet } from 'react-native';
import { z } from 'zod';

import { resetPassword, verifyResetToken } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';
import { AuthScreenLayout } from '@/components/auth-screen-layout';
import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';

const schema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(8, 'Confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof schema>;

type TokenState = { status: 'checking' } | { status: 'valid'; email: string } | { status: 'invalid'; message: string };

export default function ResetPasswordScreen() {
  const theme = useTheme();
  // Reached via the skreenit://reset-password?token=... deep link sent in the reset email.
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [tokenState, setTokenState] = useState<TokenState>(() =>
    token ? { status: 'checking' } : { status: 'invalid', message: 'This reset link is missing its token.' },
  );
  const [done, setDone] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (tokenState.status !== 'checking' || !token) return;
    verifyResetToken(token)
      .then((res) => setTokenState({ status: 'valid', email: res.email }))
      .catch((err) =>
        setTokenState({
          status: 'invalid',
          message: err instanceof ApiError ? err.message : 'This reset link is invalid or has expired.',
        }),
      );
  }, [tokenState.status, token]);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = async (values: FormValues) => {
    if (!token) return;
    setFormError(null);
    try {
      await resetPassword(token, values.password);
      setDone(true);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    }
  };

  return (
    <AuthScreenLayout>
      <ThemedView style={styles.titleRow}>
        <FontAwesome6 name="key" size={20} color={theme.text} />
        <ThemedText type="subtitle">Set Your Password</ThemedText>
      </ThemedView>

      {tokenState.status === 'checking' && <ThemedText>Checking your reset link&hellip;</ThemedText>}

      {tokenState.status === 'invalid' && (
        <>
          <ThemedText style={{ color: theme.danger }}>{tokenState.message}</ThemedText>
          <Link href="/(auth)/forgot-password" style={styles.link}>
            <ThemedText type="link" themeColor="primary">
              Request a new link
            </ThemedText>
          </Link>
        </>
      )}

      {tokenState.status === 'valid' && !done && (
        <>
          <ThemedText themeColor="textSecondary">Resetting password for {tokenState.email}</ThemedText>
          <Controller
            control={control}
            name="password"
            render={({ field }) => (
              <TextField
                label="New Password"
                isPassword
                placeholder="New password"
                value={field.value}
                onChangeText={field.onChange}
                error={errors.password?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="confirmPassword"
            render={({ field }) => (
              <TextField
                label="Confirm Password"
                isPassword
                placeholder="Confirm password"
                value={field.value}
                onChangeText={field.onChange}
                error={errors.confirmPassword?.message}
              />
            )}
          />
          {formError ? <ThemedText style={{ color: theme.danger }}>{formError}</ThemedText> : null}
          <Button title="Reset Password" icon="user-plus" onPress={handleSubmit(onSubmit)} loading={isSubmitting} />
        </>
      )}

      {done && (
        <>
          <ThemedText>Your password has been reset.</ThemedText>
          <Link href="/(auth)/login" style={styles.link}>
            <ThemedText type="link" themeColor="primary">
              Sign in
            </ThemedText>
          </Link>
        </>
      )}
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  link: { alignItems: 'center', marginTop: 4 },
});
