import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { StyleSheet } from 'react-native';
import { View } from '@/components/scoped';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius } from '@/constants/theme';
import { useBaseTheme } from '@/hooks/use-theme';
import { getProfile } from '@/lib/api/applicant';

// "My Profile" card on the dashboard: completeness % (same eleven items, weighted equally, as the
// web dashboard) plus an Update Profile button that opens the profile editor directly.
export function ProfileCompletenessCard() {
  const theme = useBaseTheme();
  const profileQuery = useQuery({ queryKey: ['candidate', 'profile'], queryFn: getProfile });
  const p = profileQuery.data?.data;
  if (!p) return null;

  const has = (v: unknown) => (Array.isArray(v) ? v.length > 0 : !!v && String(v).trim().length > 0);
  const items = [
    { label: 'Profile photo', done: has(p.avatar_url) },
    { label: 'Resume', done: has(p.resume_url) },
    { label: 'Mobile number', done: has(p.phone) },
    { label: 'Date of birth', done: has(p.date_of_birth) },
    { label: 'Gender', done: has(p.gender) },
    { label: 'Current location', done: has(p.current_city) && has(p.current_country) },
    { label: 'Professional summary', done: has(p.summary) },
    { label: 'Skills', done: has(p.skills) },
    { label: 'Education', done: has(p.education) || has(p.highest_qualification) || has(p.graduation) },
    { label: 'Work experience', done: has(p.experience) || has(p.current_company) },
    { label: 'Video introduction', done: has(p.intro_video_url) },
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
        {missing.length ? `Still missing: ${missing.join(', ')}` : 'Your profile is complete.'}
      </ThemedText>
      <Button title="Update Profile" icon="pen" onPress={() => router.push('/(candidate)/profile?edit=true' as never)} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: Radius.lg, padding: 16, gap: 10 },
  head: { flexDirection: 'row', justifyContent: 'space-between' },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
});
