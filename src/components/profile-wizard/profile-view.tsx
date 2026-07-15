import { FontAwesome6 } from '@expo/vector-icons';
import { Image, Linking, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { CandidateProfile } from '@/lib/api/applicant';

export interface ProfileViewProps {
  profile: CandidateProfile;
  fullName: string;
  email: string;
  onEdit: () => void;
}

// Read-only profile display, matching the real web's candidate-profile.html
// (a dedicated view page with an "Edit Profile" button that opens the
// multi-step wizard) rather than always landing straight in edit mode.
export function ProfileView({ profile, fullName, email, onEdit }: ProfileViewProps) {
  const theme = useTheme();

  const location = [profile.current_city, profile.current_state, profile.current_country].filter(Boolean).join(', ');
  const degrees = (profile.education ?? []).filter((e) => e.degree || e.institution);
  const certifications = (profile.certifications ?? []).filter((c) => c.name || c.issuer || c.year);
  const experience = (profile.experience ?? []).filter((e) => e.job_title || e.company);
  const skills = profile.skills ?? [];
  const languages = profile.spoken_languages ?? [];

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={[styles.headerCard, { borderColor: theme.border }]}>
        {profile.avatar_url ? (
          <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
        ) : (
          <ThemedView style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: theme.background }]}>
            <FontAwesome6 name="user" size={30} color={theme.textSecondary} />
          </ThemedView>
        )}
        <ThemedText type="subtitle">{fullName || 'Your name'}</ThemedText>
        <ThemedText themeColor="textSecondary">{email}</ThemedText>
        {profile.phone ? (
          <MetaRow icon="phone" label={profile.phone} />
        ) : null}
        {location ? <MetaRow icon="location-dot" label={location} /> : null}

        <Button title="Edit Profile" icon="pen" onPress={onEdit} style={styles.editButton} />
      </ThemedView>

      <SummaryBlock title="Video Introduction">
        <Row label="Status" value={profile.intro_video_url ? 'Recorded' : 'Not recorded yet'} />
      </SummaryBlock>

      <SummaryBlock title="Professional">
        <Row label="Expected salary" value={profile.expected_salary ? `₹${profile.expected_salary} p.a.` : ''} />
        <Row label="Current salary" value={profile.current_salary ? `₹${profile.current_salary} p.a.` : ''} />
        <Row label="Notice period" value={profile.notice_period_days != null ? `${profile.notice_period_days} days` : ''} />
        <Row label="Highest qualification" value={profile.highest_qualification ?? ''} />
        <Row label="LinkedIn" value={profile.linkedin_url ?? ''} link />
        <Row label="Portfolio" value={profile.portfolio_url ?? ''} link />
        <Row label="Summary" value={profile.summary ?? ''} />
      </SummaryBlock>

      <SummaryBlock title="Education">
        <Row label="Schooling" value={profile.schooling ?? ''} />
        <Row label="Pre-university" value={profile.pre_university ?? ''} />
        <Row label="Graduation" value={profile.graduation ?? ''} />
        <Row label="Post-graduation" value={profile.post_graduation ?? ''} />
        {degrees.map((d, i) => (
          <Row key={i} label={`Additional degree ${i + 1}`} value={[d.degree, d.institution].filter(Boolean).join(' — ')} />
        ))}
        {certifications.map((c, i) => (
          <Row key={i} label={`Certification ${i + 1}`} value={[c.name, c.issuer].filter(Boolean).join(' — ')} />
        ))}
      </SummaryBlock>

      <SummaryBlock title="Skills & Languages">
        <Row label="Skills" value={skills.join(', ') || 'None added'} />
        <Row label="Languages" value={languages.join(', ') || 'None selected'} />
      </SummaryBlock>

      <SummaryBlock title="Experience">
        <Row
          label="Current role"
          value={[profile.current_designation, profile.current_company].filter(Boolean).join(' at ')}
        />
        {experience.map((e, i) => (
          <Row key={i} label={e.job_title || `Previous role ${i + 1}`} value={e.company ?? ''} />
        ))}
      </SummaryBlock>

      <SummaryBlock title="Resume">
        {profile.resume_url ? (
          <ThemedText type="link" themeColor="primary" onPress={() => Linking.openURL(profile.resume_url as string)}>
            View Resume
          </ThemedText>
        ) : (
          <ThemedText themeColor="textSecondary">Not uploaded</ThemedText>
        )}
      </SummaryBlock>
    </ThemedView>
  );
}

function MetaRow({ icon, label }: { icon: React.ComponentProps<typeof FontAwesome6>['name']; label: string }) {
  const theme = useTheme();
  return (
    <View style={styles.metaRow}>
      <FontAwesome6 name={icon} size={12} color={theme.textSecondary} />
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

function SummaryBlock({ title, children }: { title: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <ThemedView style={[styles.block, { borderColor: theme.border }]}>
      <ThemedText type="smallBold">{title}</ThemedText>
      {children}
    </ThemedView>
  );
}

function Row({ label, value, link }: { label: string; value: string; link?: boolean }) {
  const theme = useTheme();
  if (!value) return null;
  return (
    <View style={styles.row}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.rowLabel}>
        {label}
      </ThemedText>
      {link ? (
        <ThemedText type="small" style={styles.rowValue} themeColor="primary" numberOfLines={2} onPress={() => Linking.openURL(value)}>
          {value}
        </ThemedText>
      ) : (
        <ThemedText type="small" style={[styles.rowValue, { color: theme.text }]} numberOfLines={3}>
          {value}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 14 },
  headerCard: {
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: 20,
  },
  avatar: { width: 84, height: 84, borderRadius: 42, marginBottom: 8 },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  editButton: { marginTop: 14, alignSelf: 'stretch' },
  block: { borderWidth: 1, borderRadius: Radius.md, padding: 14, gap: 8 },
  row: { flexDirection: 'row', gap: 10 },
  rowLabel: { width: 140 },
  rowValue: { flex: 1 },
});
