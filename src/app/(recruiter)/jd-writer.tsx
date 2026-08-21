import { FontAwesome6 } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { SkillTagInput } from '@/components/skill-tag-input';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { generateJd, getGeneratedJd, listGeneratedJds, type JdWriterRecord } from '@/lib/api/jd-writer';

const STATUS_LABEL: Record<string, string> = {
  pending: 'Queued',
  processing: 'Processing…',
  completed: 'Ready',
  failed: 'Failed',
};

function contentToText(record: JdWriterRecord): string {
  const c = record.generated_content;
  if (!c) return '';
  const lines: string[] = [record.job_title.toUpperCase(), ''];
  if (c.about_company) lines.push('ABOUT THE COMPANY', c.about_company, '');
  lines.push('POSITION OVERVIEW', c.position_overview, '');
  if (c.key_responsibilities?.length) {
    lines.push('KEY RESPONSIBILITIES');
    c.key_responsibilities.forEach((section) => {
      lines.push(`${section.category}:`);
      section.bullets.forEach((b) => lines.push(`  • ${b}`));
    });
    lines.push('');
  }
  if (c.qualifications?.length) {
    lines.push('QUALIFICATIONS');
    c.qualifications.forEach((q) => lines.push(`${q.label}: ${q.text}`));
    lines.push('');
  }
  if (c.key_competencies?.length) {
    lines.push('KEY COMPETENCIES', c.key_competencies.join(', '));
  }
  return lines.join('\n');
}

export default function JdWriterScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'available' | 'writer'>('available');

  const listQuery = useQuery({
    queryKey: ['recruiter', 'jd-writer', 'list'],
    queryFn: listGeneratedJds,
    refetchInterval: (query) => {
      const list = query.state.data?.data ?? [];
      const hasPending = list.some((jd) => jd.status === 'pending' || jd.status === 'processing');
      return hasPending ? 8000 : false;
    },
  });
  const jds = listQuery.data?.data ?? [];

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.replace('/(recruiter)/ats-services')} hitSlop={12}>
          <FontAwesome6 name="chevron-left" size={16} color={theme.text} />
        </Pressable>
        <ThemedText type="title">JD Section</ThemedText>
      </View>

      <View style={[styles.tabRow, { borderColor: theme.border }]}>
        <Pressable style={styles.tabButton} onPress={() => setTab('available')}>
          <ThemedText type="smallBold" themeColor={tab === 'available' ? 'primary' : 'textSecondary'}>
            Available JDs
          </ThemedText>
          {tab === 'available' ? <View style={[styles.tabIndicator, { backgroundColor: theme.primary }]} /> : null}
        </Pressable>
        <Pressable style={styles.tabButton} onPress={() => setTab('writer')}>
          <ThemedText type="smallBold" themeColor={tab === 'writer' ? 'primary' : 'textSecondary'}>
            JD Writer
          </ThemedText>
          {tab === 'writer' ? <View style={[styles.tabIndicator, { backgroundColor: theme.primary }]} /> : null}
        </Pressable>
      </View>

      {tab === 'available' ? (
        <ScrollView contentContainerStyle={styles.content}>
          {listQuery.isLoading ? (
            <ActivityIndicator color={theme.primary} />
          ) : jds.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
              No job descriptions generated yet. Use the JD Writer tab to create one.
            </ThemedText>
          ) : (
            jds.map((jd) => <JdListItem key={jd.id} record={jd} />)
          )}
        </ScrollView>
      ) : (
        <JdWriterForm
          onQueued={() => {
            queryClient.invalidateQueries({ queryKey: ['recruiter', 'jd-writer', 'list'] });
            setTab('available');
          }}
        />
      )}
    </SafeAreaView>
  );
}

function JdListItem({ record }: { record: JdWriterRecord }) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const isReady = record.status === 'completed';

  const detailQuery = useQuery({
    queryKey: ['recruiter', 'jd-writer', record.id],
    queryFn: () => getGeneratedJd(record.id),
    enabled: expanded && isReady,
  });

  const fullText = useMemo(() => (detailQuery.data ? contentToText(detailQuery.data.data) : ''), [detailQuery.data]);

  return (
    <ThemedView style={[styles.card, { borderColor: theme.border }]}>
      <View style={styles.cardHeader}>
        <ThemedText type="smallBold" style={{ flex: 1 }}>
          {record.job_title}
        </ThemedText>
        <View style={[styles.statusBadge, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="small">{STATUS_LABEL[record.status] ?? record.status}</ThemedText>
        </View>
      </View>
      {isReady ? (
        <View style={styles.actionRow}>
          <Pressable
            style={[styles.actionButton, { borderColor: theme.border, borderWidth: 1 }]}
            onPress={() => setExpanded((v) => !v)}
          >
            <FontAwesome6 name={expanded ? 'chevron-up' : 'eye'} size={12} color={theme.text} />
            <ThemedText type="small">{expanded ? 'Hide' : 'View / Share'}</ThemedText>
          </Pressable>
          <Pressable
            style={[styles.actionButton, { backgroundColor: theme.primary }]}
            onPress={() => router.push({ pathname: '/(recruiter)/jobs/create', params: { jdId: record.id } })}
          >
            <FontAwesome6 name="paper-plane" size={12} color="#ffffff" />
            <ThemedText type="small" style={{ color: '#ffffff' }}>
              Post this Job
            </ThemedText>
          </Pressable>
        </View>
      ) : record.status === 'failed' ? (
        <ThemedText type="small" style={{ color: theme.danger }}>
          Generation failed.
        </ThemedText>
      ) : (
        <ActivityIndicator size="small" color={theme.primary} />
      )}

      {expanded && detailQuery.data ? (
        <>
          <ThemedText type="small" style={styles.jdText}>
            {fullText}
          </ThemedText>
          <Button
            title="Share"
            icon="share"
            variant="secondary"
            onPress={() => Share.share({ message: fullText, title: record.job_title })}
          />
        </>
      ) : null}
    </ThemedView>
  );
}

function JdWriterForm({ onQueued }: { onQueued: () => void }) {
  const theme = useTheme();
  const [jobTitle, setJobTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [aboutCompany, setAboutCompany] = useState('');
  const [experienceMin, setExperienceMin] = useState('');
  const [experienceMax, setExperienceMax] = useState('');
  const [reportsTo, setReportsTo] = useState('');
  const [coreResponsibilities, setCoreResponsibilities] = useState('');
  const [mustHaveSkills, setMustHaveSkills] = useState<string[]>([]);
  const [competencies, setCompetencies] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [queued, setQueued] = useState(false);

  const mutation = useMutation({
    mutationFn: generateJd,
    onSuccess: () => {
      setQueued(true);
    },
    onError: () => setError('Could not queue the job description. Please try again.'),
  });

  useEffect(() => {
    if (!queued) return;
    const t = setTimeout(onQueued, 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queued]);

  const submit = () => {
    if (!jobTitle.trim()) {
      setError('Please enter a job title.');
      return;
    }
    setError(null);
    mutation.mutate({
      jobTitle: jobTitle.trim(),
      companyName: companyName.trim() || undefined,
      aboutCompany: aboutCompany.trim() || undefined,
      experienceMin: experienceMin ? Number(experienceMin) : undefined,
      experienceMax: experienceMax ? Number(experienceMax) : undefined,
      reportsTo: reportsTo.trim() || undefined,
      coreResponsibilities: coreResponsibilities
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean),
      mustHaveSkills,
      competencies,
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ThemedText type="small" themeColor="textSecondary">
        Generate a job description from scratch with AI. This queues a background job — check the Available JDs tab
        once it&apos;s ready.
      </ThemedText>
      <TextField label="Job Title *" value={jobTitle} onChangeText={setJobTitle} />
      <TextField label="Company Name" value={companyName} onChangeText={setCompanyName} />
      <TextField label="About the Company" value={aboutCompany} onChangeText={setAboutCompany} multiline numberOfLines={3} />
      <View style={styles.expRow}>
        <View style={styles.expField}>
          <TextField label="Experience Min (yrs)" value={experienceMin} onChangeText={setExperienceMin} keyboardType="number-pad" />
        </View>
        <View style={styles.expField}>
          <TextField label="Experience Max (yrs)" value={experienceMax} onChangeText={setExperienceMax} keyboardType="number-pad" />
        </View>
      </View>
      <TextField label="Reports To" value={reportsTo} onChangeText={setReportsTo} />
      <TextField
        label="Core Responsibilities (one per line)"
        value={coreResponsibilities}
        onChangeText={setCoreResponsibilities}
        multiline
        numberOfLines={4}
      />
      <SkillTagInput label="Must-Have Skills" value={mustHaveSkills} onChange={setMustHaveSkills} />
      <SkillTagInput label="Key Competencies" value={competencies} onChange={setCompetencies} />

      {error ? (
        <ThemedText type="small" style={{ color: theme.danger }}>
          {error}
        </ThemedText>
      ) : null}
      {queued ? (
        <ThemedText type="small" style={{ color: '#2f855a' }}>
          Queued! Switching to Available JDs…
        </ThemedText>
      ) : null}

      <Button title="Generate Job Description" onPress={submit} loading={mutation.isPending} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  tabRow: { flexDirection: 'row', paddingHorizontal: 20, borderBottomWidth: StyleSheet.hairlineWidth, gap: 24 },
  tabButton: { paddingBottom: 10, gap: 8 },
  tabIndicator: { height: 2, borderRadius: 1 },
  content: { padding: 20, gap: 12 },
  empty: { textAlign: 'center', marginTop: 24 },
  card: { borderWidth: 1, borderRadius: Radius.lg, padding: 14, gap: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: Radius.md, paddingVertical: 8 },
  jdText: { lineHeight: 20 },
  expRow: { flexDirection: 'row', gap: 12 },
  expField: { flex: 1 },
});
