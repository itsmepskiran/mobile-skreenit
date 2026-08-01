import { FontAwesome6 } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getCandidateAssessments, getCandidateDetails } from '@/lib/api/recruiter';

// "View Profile" on Interview Schedules — full candidate details plus every
// assessment they've completed (across all jobs) and its score, or an explicit
// empty state if they haven't taken any. Ported from sql-skreenit's
// dashboard/js/interviews-calendar.js showCandidateProfile().
interface Props {
  candidateId: string | null;
  onClose: () => void;
}

export function CandidateProfileModal({ candidateId, onClose }: Props) {
  const theme = useTheme();
  const visible = !!candidateId;

  const detailsQuery = useQuery({
    queryKey: ['recruiter', 'candidate-details', candidateId],
    queryFn: () => getCandidateDetails(candidateId as string),
    enabled: visible,
  });
  const assessmentsQuery = useQuery({
    queryKey: ['recruiter', 'candidate-assessments', candidateId],
    queryFn: () => getCandidateAssessments(candidateId as string),
    enabled: visible,
  });

  const profile = detailsQuery.data?.data.profile;
  const assessments = assessmentsQuery.data?.data ?? [];
  const loading = detailsQuery.isLoading || assessmentsQuery.isLoading;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <ThemedView style={[styles.sheet, { backgroundColor: theme.backgroundElement }]}>
          <View style={styles.header}>
            <ThemedText type="subtitle">Candidate Profile</ThemedText>
            <Pressable onPress={onClose} hitSlop={12}>
              <FontAwesome6 name="xmark" size={18} color={theme.text} />
            </Pressable>
          </View>

          {loading ? (
            <ActivityIndicator style={styles.loader} color={theme.primary} />
          ) : !profile ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.loader}>
              Could not load this candidate&apos;s profile.
            </ThemedText>
          ) : (
            <ScrollView contentContainerStyle={styles.content}>
              <View style={styles.identity}>
                <View style={[styles.avatar, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                  <ThemedText type="subtitle" themeColor="primary">
                    {(profile.full_name || 'C')
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)}
                  </ThemedText>
                </View>
                <ThemedText type="subtitle">{profile.full_name}</ThemedText>
              </View>

              <ThemedView style={[styles.section, { borderColor: theme.border }]}>
                <ThemedText type="smallBold">Contact Information</ThemedText>
                <InfoRow icon="envelope" label={profile.email} />
                {profile.phone ? <InfoRow icon="phone" label={profile.phone} /> : null}
                {profile.current_city || profile.current_state ? (
                  <InfoRow
                    icon="location-dot"
                    label={[profile.current_city, profile.current_state].filter(Boolean).join(', ')}
                  />
                ) : null}
                {profile.linkedin_url ? (
                  <Pressable onPress={() => Linking.openURL(profile.linkedin_url as string)}>
                    <InfoRow icon="linkedin" iconStyle="brand" label="LinkedIn Profile" color={theme.primary} />
                  </Pressable>
                ) : null}
                {profile.resume_url ? (
                  <Pressable onPress={() => Linking.openURL(profile.resume_url as string)}>
                    <InfoRow icon="file-lines" label="View Resume" color={theme.primary} />
                  </Pressable>
                ) : null}
              </ThemedView>

              {profile.summary ? (
                <ThemedView style={[styles.section, { borderColor: theme.border }]}>
                  <ThemedText type="smallBold">Summary</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {profile.summary}
                  </ThemedText>
                </ThemedView>
              ) : null}

              {profile.skills.length > 0 ? (
                <ThemedView style={[styles.section, { borderColor: theme.border }]}>
                  <ThemedText type="smallBold">Skills</ThemedText>
                  <View style={styles.skillsRow}>
                    {profile.skills.map((skill) => (
                      <View key={skill} style={styles.skillChip}>
                        <ThemedText type="small" themeColor="primary">
                          {skill}
                        </ThemedText>
                      </View>
                    ))}
                  </View>
                </ThemedView>
              ) : null}

              <ThemedView style={[styles.section, { borderColor: theme.border }]}>
                <ThemedText type="smallBold">Candidate Assessments</ThemedText>
                {assessments.length === 0 ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    No assessments taken by candidate.
                  </ThemedText>
                ) : (
                  assessments.map((a) => (
                    <View key={a.session_id} style={styles.assessmentRow}>
                      <View style={{ flex: 1 }}>
                        <ThemedText type="small" style={styles.assessmentName}>
                          {a.assessment_name || a.assessment_key}
                        </ThemedText>
                        {a.completed_at ? (
                          <ThemedText type="small" themeColor="textSecondary">
                            {new Date(a.completed_at).toLocaleDateString()}
                          </ThemedText>
                        ) : null}
                      </View>
                      <View style={styles.assessmentScore}>
                        <ThemedText type="smallBold" themeColor="primary">
                          {a.overall_score != null ? `${a.overall_score}%` : '—'}
                        </ThemedText>
                        {a.overall_grade ? (
                          <ThemedText type="small" themeColor="textSecondary">
                            {a.overall_grade}
                          </ThemedText>
                        ) : null}
                      </View>
                    </View>
                  ))
                )}
              </ThemedView>
            </ScrollView>
          )}
        </ThemedView>
      </View>
    </Modal>
  );
}

function InfoRow({
  icon,
  iconStyle,
  label,
  color,
}: {
  icon: React.ComponentProps<typeof FontAwesome6>['name'];
  iconStyle?: React.ComponentProps<typeof FontAwesome6>['iconStyle'];
  label: string;
  color?: string;
}) {
  const theme = useTheme();
  return (
    <View style={styles.infoRow}>
      <FontAwesome6 name={icon} iconStyle={iconStyle} size={13} color={color ?? theme.textSecondary} />
      <ThemedText type="small" style={color ? { color } : undefined}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '85%', borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg, paddingTop: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12 },
  loader: { marginVertical: 40 },
  content: { paddingHorizontal: 20, paddingBottom: 40, gap: 14 },
  identity: { alignItems: 'center', gap: 8 },
  avatar: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  section: { gap: 8, borderWidth: 1, borderRadius: Radius.md, padding: 14 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  skillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  skillChip: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: 'rgba(79,70,229,0.1)' },
  assessmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148,163,184,0.25)',
  },
  assessmentName: { fontWeight: '600' },
  assessmentScore: { alignItems: 'flex-end' },
});
