import { FontAwesome6 } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet } from 'react-native';
import { z } from 'zod';

import { login, switchRole } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';
import { useAuthStore, type AuthTokens, type AuthUser } from '@/lib/auth/store';
import { AuthFooter } from '@/components/auth-footer';
import { AuthScreenLayout } from '@/components/auth-screen-layout';
import { Button } from '@/components/button';
import { RoleChoiceModal, type Role } from '@/components/role-choice-modal';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';

const schema = z.object({
  loginId: z.string().min(1, 'Enter your email or user ID'),
  password: z.string().min(1, 'Enter your password'),
});

type FormValues = z.infer<typeof schema>;

interface PendingSession {
  tokens: AuthTokens;
  user: AuthUser;
}

export default function LoginScreen() {
  const theme = useTheme();
  const setSession = useAuthStore((state) => state.setSession);
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingSession, setPendingSession] = useState<PendingSession | null>(null);
  const [switchingRole, setSwitchingRole] = useState<Role | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { loginId: '', password: '' },
  });

  const onSubmit = async (values: FormValues) => {
    setFormError(null);
    try {
      const res = await login(values.loginId, values.password);
      const tokens = { accessToken: res.data.access_token, refreshToken: res.data.refresh_token };
      const user = res.data.user;

      // Dual-role accounts pick which dashboard to land on after credentials
      // are verified; single-role accounts go straight in.
      if (user.has_multiple_roles) {
        setPendingSession({ tokens, user });
      } else {
        await setSession(tokens, user);
      }
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    }
  };

  const onSelectRole = async (role: Role) => {
    if (!pendingSession) return;
    if (role === pendingSession.user.role) {
      await setSession(pendingSession.tokens, pendingSession.user);
      setPendingSession(null);
      return;
    }

    setSwitchingRole(role);
    try {
      const switched = await switchRole(role);
      await setSession({ accessToken: switched.access_token, refreshToken: switched.refresh_token }, switched.user);
      setPendingSession(null);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Could not switch role. Please try again.');
      setPendingSession(null);
    } finally {
      setSwitchingRole(null);
    }
  };

  return (
    <AuthScreenLayout>
      <ThemedView style={styles.header}>
        <ThemedView style={styles.titleRow}>
          <FontAwesome6 name="right-to-bracket" size={20} color={theme.text} />
          <ThemedText type="subtitle">Welcome Back</ThemedText>
        </ThemedView>
        <ThemedText themeColor="textSecondary">Sign in to your Skreenit account</ThemedText>
      </ThemedView>

      <Controller
        control={control}
        name="loginId"
        render={({ field }) => (
          <TextField
            label="Email ID / User ID"
            icon="user"
            placeholder="Enter your email or User ID"
            autoCapitalize="none"
            keyboardType="email-address"
            value={field.value}
            onChangeText={field.onChange}
            error={errors.loginId?.message}
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
            placeholder="Enter your password"
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

      <ThemedView style={styles.actionsRow}>
        <Link href="/(auth)/register">
          <ThemedText type="link" themeColor="primary">
            Create account
          </ThemedText>
        </Link>
        <Link href="/(auth)/forgot-password">
          <ThemedText type="link" themeColor="primary">
            Forgot password?
          </ThemedText>
        </Link>
      </ThemedView>

      <AuthFooter action="logging in to" />

      <RoleChoiceModal
        visible={!!pendingSession}
        onClose={() => setPendingSession(null)}
        onSelect={onSelectRole}
        loadingRole={switchingRole}
      />
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
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
