import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { StyleSheet } from 'react-native';
import { FontAwesome6, Pressable, View } from '@/components/scoped';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getProfile } from '@/lib/api/applicant';
import { listMyAssessments } from '@/lib/api/assessments';
import { getOwnResumeAnalysis } from '@/lib/api/employability-report';
import { getLatestIntroAnalysis } from '@/lib/api/interview';

// "Strengthen your profile" checklist on the dashboard: six steps that make a candidate more
// visible, with a progress bar and a tap-through to each. Hides itself once everything is done.
type Item = { key: string; label: string; done: boolean; href: string };

export function ProfileChecklist() {
  const theme = useTheme();
  const profileQuery = useQuery({ queryKey: ['candidate', 'profile'], queryFn: getProfile });
  const resumeQuery = useQuery({ queryKey: ['candidate', 'resume-analysis'], queryFn: getOwnResumeAnalysis });
  const assessmentsQuery = useQuery({ queryKey: ['candidate', 'my-assessments'], queryFn: listMyAssessments });
  const introQuery = useQuery({ queryKey: ['candidate', 'intro-latest'], queryFn: getLatestIntroAnalysis });

  const profile = profileQuery.data?.data;
  if (!profile) return null;

  const hasSkills = !!profile.skills?.length;
  const items: Item[] = [
    { key: 'profile', label: 'Complete your profile details', done: !!profile.onboarded && !!profile.summary && hasSkills, href: '/(candidate)/profile' },
    { key: 'resume', label: 'Upload your resume', done: !!profile.resume_url, href: '/(candidate)/profile' },
    { key: 'video', label: 'Record your video introduction', done: !!profile.intro_video_url, href: '/(candidate)/profile' },
    { key: 'analysis', label: 'Analyse your resume', done: !!resumeQuery.data?.data, href: '/(candidate)/employability-report' },
    { key: 'assessment', label: 'Take a free assessment', done: (assessmentsQuery.data?.data ?? []).length > 0, href: '/(candidate)/assessments' },
    { key: 'intro', label: 'Get your intro video analysed', done: !!introQuery.data?.data, href: '/(candidate)/intro-video-analysis' },
  ];
  const doneCount = items.filter((i) => i.done).length;
  if (doneCount === items.length) return null;
  const pct = Math.round((doneCount / items.length) * 100);

  return (
    <ThemedView style={[styles.card, { borderColor: theme.border }]}>
      <View style={styles.head}>
        <ThemedText type="smallBold">Strengthen your profile</ThemedText>
        <ThemedText type="smallBold" style={{ color: '#4338ca' }}>{pct}%</ThemedText>
      </View>
      <View style={[styles.track, { backgroundColor: theme.border }]}>
        <View style={[styles.fill, { width: `${pct}%` }]} />
      </View>
      {items.map((item) => (
        <Pressable key={item.key} style={styles.row} onPress={() => !item.done && router.push(item.href as never)} disabled={item.done}>
          <View style={[styles.tick, item.done && { backgroundColor: '#dcfce7', borderColor: '#bbf7d0' }]}>
            {item.done ? <FontAwesome6 name="check" size={10} color="#16a34a" /> : null}
          </View>
          <ThemedText
            type="small"
            style={[{ flex: 1 }, item.done && { textDecorationLine: 'line-through', color: theme.textSecondary }]}
          >
            {item.label}
          </ThemedText>
          {!item.done ? <FontAwesome6 name="chevron-right" size={11} color={theme.textSecondary} /> : null}
        </Pressable>
      ))}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: Radius.lg, padding: 16, gap: 10 },
  head: { flexDirection: 'row', justifyContent: 'space-between' },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4, backgroundColor: '#6366f1' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  tick: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center' },
});
