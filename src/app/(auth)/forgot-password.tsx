import { FontAwesome6 } from '@/components/scoped';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet } from 'react-native';
import { z } from 'zod';

import { forgotPassword } from '@/lib/api/auth';
import { AuthFooter } from '@/components/auth-footer';
import { AuthScreenLayout } from '@/components/auth-screen-layout';
import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
});

type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordScreen() {
  const theme = useTheme();
  const [sent, setSent] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: '' } });

  const onSubmit = async (values: FormValues) => {
    // Backend always returns ok:true here to avoid leaking whether the email exists.
    await forgotPassword(values.email);
    setSent(true);
  };

  return (
    <AuthScreenLayout showAtsBanner>
      <ThemedView style={styles.header}>
        <ThemedView style={styles.titleRow}>
          <FontAwesome6 name="envelope-open-text" size={20} color={theme.text} />
          <ThemedText type="subtitle" style={styles.title}>Reset Password</ThemedText>
        </ThemedView>
        <ThemedText themeColor="textSecondary" style={styles.centered}>Enter your email to receive a password reset link</ThemedText>
      </ThemedView>

      {sent ? (
        <ThemedText>
          If an account exists for that email, we&apos;ve sent a reset link. Open it on this device to continue.
        </ThemedText>
      ) : (
        <>
          <Controller
            control={control}
            name="email"
            render={({ field }) => (
              <TextField
                label="Registered Email*"
                icon="envelope"
                placeholder="Enter your registered email"
                autoCapitalize="none"
                keyboardType="email-address"
                value={field.value}
                onChangeText={field.onChange}
                error={errors.email?.message}
              />
            )}
          />
          <Button title="Send Reset Link" icon="paper-plane" onPress={handleSubmit(onSubmit)} loading={isSubmitting} />
        </>
      )}

      <Link href="/(auth)/login" style={styles.link}>
        <ThemedView style={styles.linkRow}>
          <FontAwesome6 name="arrow-left" size={12} color={theme.primary} />
          <ThemedText type="link" themeColor="primary">
            Back to Login
          </ThemedText>
        </ThemedView>
      </Link>

      <AuthFooter action="resetting" />
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  header: { gap: 4 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  title: { fontSize: 24, lineHeight: 30 },
  centered: { textAlign: 'center' },
  link: { alignItems: 'center', marginTop: 4 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
