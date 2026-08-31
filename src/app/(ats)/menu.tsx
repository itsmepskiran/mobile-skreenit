import { FontAwesome6 } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useAtsStore } from '@/lib/auth/ats-store';

// Hub grid into the 8 ATS sections — same shape as (recruiter)/ats-services.tsx's
// AtsServiceCard grid.
export default function AtsMenuScreen() {
  const theme = useTheme();
  const user = useAtsStore((state) => state.user);
  const signOut = useAtsStore((state) => state.signOut);

  const confirmLogout = () => {
    Alert.alert('Log out?', 'You will need to sign in again to access the ATS console.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View>
          <ThemedText type="title">Menu</ThemedText>
          <ThemedText themeColor="textSecondary">
            {user?.company_name ?? 'Employer Console'} — {user?.name}
          </ThemedText>
        </View>

        <View style={styles.grid}>
          <MenuCard icon="people-roof" label="Departments" onPress={() => router.push('/(ats)/departments')} />
          <MenuCard icon="id-badge" label="Designations" onPress={() => router.push('/(ats)/designations')} />
          <MenuCard icon="briefcase" label="Positions" onPress={() => router.push('/(ats)/positions')} />
          <MenuCard icon="square-check" label="Requisitions" onPress={() => router.push('/(ats)/requisitions')} />
          <MenuCard icon="file-lines" label="Jobs" onPress={() => router.push('/(ats)/jobs')} />
          <MenuCard icon="user-group" label="Employees" onPress={() => router.push('/(ats)/employees')} />
          <MenuCard icon="user-shield" label="Users" onPress={() => router.push('/(ats)/users')} />
          <MenuCard icon="chart-pie" label="Reports" onPress={() => router.push('/(ats)/reports')} />
        </View>

        <Pressable style={[styles.logout, { borderColor: theme.border }]} onPress={confirmLogout}>
          <FontAwesome6 name="right-from-bracket" size={14} color={theme.danger} />
          <ThemedText style={{ color: theme.danger }}>Log out</ThemedText>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function MenuCard({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof FontAwesome6>['name'];
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable style={[styles.card, { borderColor: theme.border }]} onPress={onPress}>
      <View style={[styles.iconWrap, { backgroundColor: theme.backgroundElement }]}>
        <FontAwesome6 name={icon} size={20} color={theme.primary} />
      </View>
      <ThemedText type="smallBold" style={styles.label}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: 20, gap: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  card: {
    width: '47%',
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    gap: 10,
    alignItems: 'flex-start',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { textAlign: 'left' },
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
  },
});
