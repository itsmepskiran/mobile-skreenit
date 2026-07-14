import { FontAwesome6 } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet } from 'react-native';
import { z } from 'zod';

import { register as registerUser, resendConfirmation } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';
import { AuthFooter } from '@/components/auth-footer';
import { AuthScreenLayout } from '@/components/auth-screen-layout';
import { Button } from '@/components/button';
import { RoleToggle } from '@/components/role-toggle';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';

const schema = z
  .object({
    fullName: z.string().min(1, 'Enter your full name'),
    email: z.string().email('Enter a valid email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Confirm your password'),
    mobile: z.string().min(6, 'Enter a valid mobile number'),
    location: z.string().min(1, 'Enter your city'),
    role: z.enum(['candidate', 'recruiter']),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof schema>;

export default function RegisterScreen() {
  const theme = useTheme();
  const [formError, setFormError] = useState<string | null>(null);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent'>('idle');

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      mobile: '',
      location: '',
      role: 'candidate',
    },
  });

  const onSubmit = async (values: FormValues) => {
    setFormError(null);
    try {
      await registerUser(values);
      // Email must be confirmed before login works (see routers/auth.py login()),
      // so don't auto sign-in here — show a "check your inbox" state instead.
      setRegisteredEmail(values.email);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    }
  };

  if (registeredEmail) {
    return (
      <AuthScreenLayout>
        <ThemedText type="subtitle">Check your email</ThemedText>
        <ThemedText>
          We sent a confirmation link to {registeredEmail}. Open it on this device to verify your account, then sign
          in.
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Please check your spam/junk folder if it doesn&apos;t arrive shortly.
        </ThemedText>
        <Button
          title={resendState === 'sent' ? 'Email sent' : 'Resend confirmation email'}
          variant="secondary"
          loading={resendState === 'sending'}
          disabled={resendState === 'sent'}
          onPress={async () => {
            setResendState('sending');
            try {
              await resendConfirmation(registeredEmail);
              setResendState('sent');
            } catch {
              setResendState('idle');
            }
          }}
        />
        <Link href="/(auth)/login" style={styles.link}>
          <ThemedText type="link">Back to sign in</ThemedText>
        </Link>
      </AuthScreenLayout>
    );
  }

  return (
    <AuthScreenLayout>
      <ThemedView style={styles.header}>
        <ThemedView style={styles.titleRow}>
          <FontAwesome6 name="user-plus" size={20} color={theme.text} />
          <ThemedText type="subtitle">Create an Account</ThemedText>
        </ThemedView>
        <ThemedText themeColor="textSecondary">Please enter your details to register</ThemedText>
      </ThemedView>

      <Controller
        control={control}
        name="role"
        render={({ field }) => <RoleToggle label="Register as" value={field.value} onChange={field.onChange} />}
      />

      <Controller
        control={control}
        name="fullName"
        render={({ field }) => (
          <TextField
            label="Full Name"
            placeholder="Enter your name"
            value={field.value}
            onChangeText={field.onChange}
            error={errors.fullName?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="mobile"
        render={({ field }) => (
          <TextField
            label="Mobile"
            placeholder="Enter mobile number"
            keyboardType="phone-pad"
            value={field.value}
            onChangeText={field.onChange}
            error={errors.mobile?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="email"
        render={({ field }) => (
          <TextField
            label="Email"
            placeholder="Enter your email"
            autoCapitalize="none"
            keyboardType="email-address"
            value={field.value}
            onChangeText={field.onChange}
            error={errors.email?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="location"
        render={({ field }) => (
          <TextField
            label="Location"
            placeholder="Enter location"
            value={field.value}
            onChangeText={field.onChange}
            error={errors.location?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field }) => (
          <TextField
            label="Password"
            isPassword
            placeholder="Create password"
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
      <ThemedText type="small" themeColor="textSecondary">
        8+ characters, with uppercase, lowercase, number & special character
      </ThemedText>

      {formError ? (
        <ThemedText type="small" style={{ color: theme.danger }}>
          {formError}
        </ThemedText>
      ) : null}

      <Button title="Create Account" icon="user-plus" onPress={handleSubmit(onSubmit)} loading={isSubmitting} />

      <ThemedText style={styles.link}>
        Already have an account?{' '}
        <Link href="/(auth)/login">
          <ThemedText type="link" themeColor="primary">
            Sign in
          </ThemedText>
        </Link>
      </ThemedText>

      <AuthFooter action="creating" />
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 8,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  link: {
    textAlign: 'center',
    marginTop: 4,
  },
});
