import { zodResolver } from '@hookform/resolvers/zod';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { AuthScreenLayout } from '@/components/auth-screen-layout';
import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { atsLogin, AtsApiError } from '@/lib/api/ats';
import { useAtsStore } from '@/lib/auth/ats-store';
import { useTheme } from '@/hooks/use-theme';

const schema = z.object({
  email: z.string().min(1, 'Enter your email').email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
});

type FormValues = z.infer<typeof schema>;

// Matches sql-skreenit's ats/login.html — the Employer Login for the ATS
// console, a separate portal from the candidate/recruiter app with its own
// JWT session (see lib/auth/ats-store.ts).
export default function AtsLoginScreen() {
  const theme = useTheme();
  const setSession = useAtsStore((state) => state.setSession);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: FormValues) => {
    setFormError(null);
    try {
      const res = await atsLogin(values.email, values.password);
      await setSession(res.data.access_token, res.data.user);
      router.replace('/(ats)/dashboard');
    } catch (err) {
      setFormError(err instanceof AtsApiError ? err.message : 'Something went wrong. Please try again.');
    }
  };

  return (
    <AuthScreenLayout>
      <ThemedView style={{ gap: 4, marginBottom: 4 }}>
        <ThemedText type="subtitle">Employer Login</ThemedText>
        <ThemedText themeColor="textSecondary">Sign in to your company&apos;s ATS console</ThemedText>
      </ThemedView>

      <Controller
        control={control}
        name="email"
        render={({ field }) => (
          <TextField
            label="Email Address"
            icon="envelope"
            placeholder="you@company.com"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            value={field.value}
            onChangeText={field.onChange}
            error={errors.email?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="password"
        render={({ field }) => (
          <TextField
            label="Password"
            icon="lock"
            isPassword
            placeholder="••••••••"
            autoComplete="current-password"
            value={field.value}
            onChangeText={field.onChange}
            error={errors.password?.message}
          />
        )}
      />

      {formError ? (
        <ThemedText type="small" style={{ color: theme.danger }}>
          {formError}
        </ThemedText>
      ) : null}

      <Button title="Sign In" icon="right-to-bracket" onPress={handleSubmit(onSubmit)} loading={isSubmitting} />

      <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>
        Credentials are provisioned by Skreenit when your company is registered.
      </ThemedText>

      <Link href="/(auth)/login" replace>
        <ThemedText type="link" themeColor="primary" style={{ textAlign: 'center' }}>
          Not an employer? Candidate / Recruiter login
        </ThemedText>
      </Link>
    </AuthScreenLayout>
  );
}
