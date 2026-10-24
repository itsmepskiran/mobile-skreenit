import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { StyleSheet } from 'react-native';
import { View } from '@/components/scoped';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius } from '@/constants/theme';
import { useBaseTheme } from '@/hooks/use-theme';
import { getRecruiterProfile } from '@/lib/api/recruiter';

// "My Profile" card on the recruiter dashboard: completeness % (same eight items as the web
// dashboard) plus an Update Profile button that opens the profile editor directly.
export function RecruiterProfileCard() {
  const theme = useBaseTheme();
  const profileQuery = useQuery({ queryKey: ['recruiter', 'profile'], queryFn: getRecruiterProfile });
  const raw = profileQuery.data?.data;
  if (!raw) return null;
  const p = 'company_name' in raw ? raw : null;

  const has = (v: unknown) => !!v && String(v).trim().length > 0;
  const items = [
    { label: 'Company name', done: has(p?.company_name) },
    { label: 'Company logo', done: has(p?.company_logo_url) },
    { label: 'Contact name', done: has(p?.contact_name) },
    { label: 'Contact email', done: has(p?.contact_email) },
    { label: 'Website', done: has(p?.company_website) },
    { label: 'Location', done: has(p?.location) },
    { label: 'About company', done: has(p?.company_description) },
    { label: 'Profile photo', done: has(p?.avatar_url) },
  ];
  const pct = Math.round((items.filter((i) => i.done).length / items.length) * 100);
  const color = pct >= 80 ? '#16a34a' : pct >= 50 ? '#d97706' : '#dc2626';
  const missing = items.filter((i) => !i.done).map((i) => i.label);

  return (
    <ThemedView style={[styles.card, { borderColor: theme.border }]}>
      <View style={styles.head}>
        <ThemedText type="smallBold">My Profile</ThemedText>
        <ThemedText type="smallBold" style={{ color }}>{pct}% complete</ThemedText>
      </View>
      <View style={[styles.track, { backgroundColor: theme.border }]}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <ThemedText type="small" style={{ color: theme.textSecondary }}>
        {missing.length ? `Still missing: ${missing.join(', ')}. A company profile is needed to create jobs.` : 'Your profile is complete.'}
      </ThemedText>
      <Button title="Update Profile" icon="pen" onPress={() => router.push('/(recruiter)/profile?edit=true' as never)} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: Radius.lg, padding: 16, gap: 10 },
  head: { flexDirection: 'row', justifyContent: 'space-between' },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
});
