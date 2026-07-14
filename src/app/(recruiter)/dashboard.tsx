import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthStore } from '@/lib/auth/store';
import { Button } from '@/components/button';
import { RoleSwitcher } from '@/components/role-switcher';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

// Placeholder for Phase 2: analytics/stats against dashboard_new.py, analytics.py.
export default function RecruiterDashboardScreen() {
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <ThemedText type="title">Dashboard</ThemedText>
        <ThemedText themeColor="textSecondary">Welcome, {user?.full_name}</ThemedText>
        <RoleSwitcher />
        <Button title="Sign out" variant="secondary" onPress={() => signOut()} />
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, padding: 24, gap: 12 },
});
