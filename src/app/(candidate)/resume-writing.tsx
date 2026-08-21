import { FontAwesome6 } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { SkillTagInput } from '@/components/skill-tag-input';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  createResumeFromScratch,
  downloadRenderedResume,
  getResumeDraft,
  improveResume,
  listResumeDrafts,
  type ResumeEducationInput,
  type ResumeExperienceInput,
  type ResumeWritingDraft,
} from '@/lib/api/resume-writing';

const STATUS_LABEL: Record<string, string> = {
  pending: 'Queued',
  processing: 'Generating…',
  completed: 'Ready',
  failed: 'Failed',
};

const TEMPLATES: { id: string; name: string; icon: React.ComponentProps<typeof FontAwesome6>['name'] }[] = [
  { id: 'modern', name: 'Modern Professional', icon: 'star' },
  { id: 'ats', name: 'ATS Optimized', icon: 'robot' },
  { id: 'traditional', name: 'Traditional', icon: 'building' },
  { id: 'creative', name: 'Creative', icon: 'palette' },
];

type Tab = 'list' | 'improve' | 'scratch';

export default function ResumeWritingScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('list');

  const listQuery = useQuery({
    queryKey: ['candidate', 'resume-writing', 'list'],
    queryFn: listResumeDrafts,
    refetchInterval: (query) => {
      const list = query.state.data?.data ?? [];
      const hasPending = list.some((d) => d.status === 'pending' || d.status === 'processing');
      return hasPending ? 5000 : false;
    },
  });
  const drafts = listQuery.data?.data ?? [];

  const goToListAndRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['candidate', 'resume-writing', 'list'] });
    setTab('list');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.replace('/(candidate)/profile')} hitSlop={12}>
          <FontAwesome6 name="chevron-left" size={16} color={theme.text} />
        </Pressable>
        <ThemedText type="title">Resume Writing</ThemedText>
      </View>

      <View style={[styles.tabRow, { borderColor: theme.border }]}>
        {(['list', 'improve', 'scratch'] as Tab[]).map((t) => (
          <Pressable key={t} style={styles.tabButton} onPress={() => setTab(t)}>
            <ThemedText type="smallBold" themeColor={tab === t ? 'primary' : 'textSecondary'}>
              {t === 'list' ? 'My Resumes' : t === 'improve' ? 'Improve Upload' : 'Build From Scratch'}
            </ThemedText>
            {tab === t ? <View style={[styles.tabIndicator, { backgroundColor: theme.primary }]} /> : null}
          </Pressable>
        ))}
      </View>

      {tab === 'list' ? (
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="small" themeColor="textSecondary">
            Improve an existing resume with AI, or build one from scratch — free for every candidate.
          </ThemedText>
          {listQuery.isLoading ? (
            <ActivityIndicator color={theme.primary} />
          ) : drafts.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
              No resumes yet. Use the tabs above to get started.
            </ThemedText>
          ) : (
            drafts.map((d) => <DraftCard key={d.id} draft={d} />)
          )}
        </ScrollView>
      ) : tab === 'improve' ? (
        <ImproveTab onQueued={goToListAndRefresh} />
      ) : (
        <ScratchTab onQueued={goToListAndRefresh} />
      )}
    </SafeAreaView>
  );
}

function DraftCard({ draft }: { draft: ResumeWritingDraft }) {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const isReady = draft.status === 'completed';

  const detailQuery = useQuery({
    queryKey: ['candidate', 'resume-writing', draft.id],
    queryFn: () => getResumeDraft(draft.id),
    enabled: expanded && isReady,
  });

  const renderMutation = useMutation({
    mutationFn: (templateId: string) => downloadRenderedResume(draft.id, templateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate', 'resume-writing', 'list'] });
    },
  });

  const content = detailQuery.data?.data.ai_content;

  return (
    <ThemedView style={[styles.card, { borderColor: theme.border }]}>
      <View style={styles.cardHeader}>
        <ThemedText type="smallBold" style={{ flex: 1 }}>
          {draft.title || 'Untitled Resume'}
        </ThemedText>
        <View style={[styles.statusBadge, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="small">{STATUS_LABEL[draft.status] ?? draft.status}</ThemedText>
        </View>
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        {draft.source_type === 'upload' ? 'Improved upload' : 'Built from scratch'}
      </ThemedText>

      {isReady ? (
        <Pressable
          style={[styles.actionButton, { borderColor: theme.border, borderWidth: 1 }]}
          onPress={() => setExpanded((v) => !v)}
        >
          <FontAwesome6 name={expanded ? 'chevron-up' : 'eye'} size={12} color={theme.text} />
          <ThemedText type="small">{expanded ? 'Hide' : 'View & Download'}</ThemedText>
        </Pressable>
      ) : draft.status === 'failed' ? (
        <ThemedText type="small" style={{ color: theme.danger }}>
          Generation failed. {draft.error_message}
        </ThemedText>
      ) : (
        <ActivityIndicator size="small" color={theme.primary} />
      )}

      {expanded && content ? (
        <>
          {content.sections?.summary ? (
            <ThemedView style={[styles.summaryBox, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="small">{content.sections.summary}</ThemedText>
            </ThemedView>
          ) : null}

          <ThemedText type="smallBold">Choose a template</ThemedText>
          <View style={styles.templateGrid}>
            {TEMPLATES.map((t) => (
              <Pressable
                key={t.id}
                style={[styles.templateCard, { borderColor: theme.border }]}
                onPress={() => renderMutation.mutate(t.id)}
                disabled={renderMutation.isPending}
              >
                <FontAwesome6 name={t.icon} size={18} color={theme.primary} />
                <ThemedText type="small">{t.name}</ThemedText>
              </Pressable>
            ))}
          </View>
          {renderMutation.isPending ? <ActivityIndicator size="small" color={theme.primary} /> : null}
          {renderMutation.isError ? (
            <ThemedText type="small" style={{ color: theme.danger }}>
              {(renderMutation.error as Error)?.message || 'Could not generate the CV. Please try again.'}
            </ThemedText>
          ) : null}
        </>
      ) : null}
    </ThemedView>
  );
}

function ImproveTab({ onQueued }: { onQueued: () => void }) {
  const theme = useTheme();
  const [file, setFile] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [queued, setQueued] = useState(false);

  const mutation = useMutation({
    mutationFn: (f: NonNullable<typeof file>) => improveResume(f),
    onSuccess: () => {
      setQueued(true);
      setTimeout(onQueued, 800);
    },
  });

  const pickFile = async () => {
    const picked = await DocumentPicker.getDocumentAsync({
      type: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ],
      copyToCacheDirectory: true,
    });
    if (picked.canceled) return;
    const asset = picked.assets[0];
    const pickedFile = { uri: asset.uri, name: asset.name, type: asset.mimeType ?? 'application/octet-stream' };
    setFile(pickedFile);
    mutation.mutate(pickedFile);
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ThemedText type="small" themeColor="textSecondary">
        Upload your resume — AI will rewrite your summary, experience bullets, and skills for impact.
      </ThemedText>

      {!file ? (
        <Pressable style={[styles.dropzone, { borderColor: theme.border }]} onPress={pickFile}>
          <FontAwesome6 name="file-arrow-up" size={22} color={theme.primary} />
          <ThemedText type="smallBold">Choose a resume (PDF, DOC, DOCX)</ThemedText>
        </Pressable>
      ) : (
        <ThemedView style={[styles.fileRow, { borderColor: theme.border }]}>
          <FontAwesome6 name="file-lines" size={16} color={theme.primary} />
          <ThemedText type="small" numberOfLines={1} style={{ flex: 1 }}>
            {file.name}
          </ThemedText>
        </ThemedView>
      )}

      {mutation.isPending ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={theme.primary} />
          <ThemedText type="small" themeColor="textSecondary">
            Submitting...
          </ThemedText>
        </View>
      ) : null}

      {mutation.isError ? (
        <ThemedText type="small" style={{ color: theme.danger }}>
          Could not start resume improvement. Please try again.
        </ThemedText>
      ) : null}

      {queued ? (
        <ThemedText type="small" style={{ color: '#2f855a' }}>
          Queued! Switching to My Resumes…
        </ThemedText>
      ) : null}
    </ScrollView>
  );
}

function emptyExperience(): ResumeExperienceInput {
  return { company: '', position: '', start_date: '', end_date: '', description: '' };
}
function emptyEducation(): ResumeEducationInput {
  return { degree: '', institution: '', year: '' };
}

function ScratchTab({ onQueued }: { onQueued: () => void }) {
  const theme = useTheme();
  const [fullName, setFullName] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [experience, setExperience] = useState<ResumeExperienceInput[]>([emptyExperience(), emptyExperience()]);
  const [education, setEducation] = useState<ResumeEducationInput[]>([emptyEducation()]);
  const [skills, setSkills] = useState<string[]>([]);
  const [achievementsText, setAchievementsText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [queued, setQueued] = useState(false);

  const mutation = useMutation({
    mutationFn: createResumeFromScratch,
    onSuccess: () => {
      setQueued(true);
      setTimeout(onQueued, 800);
    },
    onError: () => setError('Could not start resume generation. Please try again.'),
  });

  const updateExperience = (index: number, patch: Partial<ResumeExperienceInput>) => {
    setExperience((prev) => prev.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  };
  const updateEducation = (index: number, patch: Partial<ResumeEducationInput>) => {
    setEducation((prev) => prev.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  };

  const submit = () => {
    const cleanedExperience = experience.filter((e) => e.company?.trim() || e.position?.trim());
    const cleanedEducation = education.filter((e) => e.degree?.trim() || e.institution?.trim());
    const achievements = achievementsText.split('\n').map((s) => s.trim()).filter(Boolean);

    if (!cleanedExperience.length && !cleanedEducation.length && !skills.length) {
      setError('Please fill in at least some experience, education, or skills.');
      return;
    }
    setError(null);
    mutation.mutate({
      fullName: fullName.trim() || undefined,
      targetRole: targetRole.trim() || undefined,
      experience: cleanedExperience,
      education: cleanedEducation,
      skills,
      achievements,
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ThemedText type="small" themeColor="textSecondary">
        Answer a few questions and AI will draft a full resume for you — no existing file needed.
      </ThemedText>

      <TextField label="Full Name" value={fullName} onChangeText={setFullName} />
      <TextField label="Target Role" value={targetRole} onChangeText={setTargetRole} placeholder="e.g. Product Manager" />

      <ThemedText type="smallBold">Work Experience</ThemedText>
      {experience.map((entry, i) => (
        <ThemedView key={i} style={[styles.entryBlock, { borderColor: theme.border }]}>
          <TextField label="Company" value={entry.company} onChangeText={(v) => updateExperience(i, { company: v })} />
          <TextField label="Position" value={entry.position} onChangeText={(v) => updateExperience(i, { position: v })} />
          <View style={styles.expRow}>
            <View style={styles.expField}>
              <TextField label="Start" value={entry.start_date} onChangeText={(v) => updateExperience(i, { start_date: v })} />
            </View>
            <View style={styles.expField}>
              <TextField label="End" value={entry.end_date} onChangeText={(v) => updateExperience(i, { end_date: v })} placeholder="Present" />
            </View>
          </View>
          <TextField
            label="Description"
            value={entry.description}
            onChangeText={(v) => updateExperience(i, { description: v })}
            multiline
            numberOfLines={2}
          />
        </ThemedView>
      ))}
      <Button
        title="Add Another Role"
        variant="secondary"
        icon="plus"
        onPress={() => setExperience((prev) => [...prev, emptyExperience()])}
      />

      <ThemedText type="smallBold">Education</ThemedText>
      {education.map((entry, i) => (
        <ThemedView key={i} style={[styles.entryBlock, { borderColor: theme.border }]}>
          <TextField label="Degree" value={entry.degree} onChangeText={(v) => updateEducation(i, { degree: v })} />
          <TextField label="Institution" value={entry.institution} onChangeText={(v) => updateEducation(i, { institution: v })} />
          <TextField label="Year" value={entry.year} onChangeText={(v) => updateEducation(i, { year: v })} keyboardType="number-pad" />
        </ThemedView>
      ))}
      <Button
        title="Add Another Degree"
        variant="secondary"
        icon="plus"
        onPress={() => setEducation((prev) => [...prev, emptyEducation()])}
      />

      <SkillTagInput label="Skills" value={skills} onChange={setSkills} />
      <TextField
        label="Key Achievements (one per line, optional)"
        value={achievementsText}
        onChangeText={setAchievementsText}
        multiline
        numberOfLines={3}
      />

      {error ? (
        <ThemedText type="small" style={{ color: theme.danger }}>
          {error}
        </ThemedText>
      ) : null}
      {queued ? (
        <ThemedText type="small" style={{ color: '#2f855a' }}>
          Queued! Switching to My Resumes…
        </ThemedText>
      ) : null}

      <Button title="Build My Resume" onPress={submit} loading={mutation.isPending} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  tabRow: { flexDirection: 'row', paddingHorizontal: 20, borderBottomWidth: StyleSheet.hairlineWidth, gap: 20 },
  tabButton: { paddingBottom: 10, gap: 8 },
  tabIndicator: { height: 2, borderRadius: 1 },
  content: { padding: 20, gap: 12, paddingBottom: 60 },
  empty: { textAlign: 'center', marginTop: 24 },
  card: { borderWidth: 1, borderRadius: Radius.lg, padding: 14, gap: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  actionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: Radius.md, paddingVertical: 8 },
  summaryBox: { borderRadius: Radius.md, padding: 10 },
  templateGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  templateCard: {
    width: '47%',
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: 14,
    alignItems: 'center',
    gap: 6,
  },
  dropzone: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: Radius.lg,
    padding: 30,
    alignItems: 'center',
    gap: 8,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: 12,
  },
  loadingBox: { alignItems: 'center', gap: 8, paddingVertical: 12 },
  entryBlock: { borderWidth: 1, borderRadius: Radius.md, padding: 12, gap: 8 },
  expRow: { flexDirection: 'row', gap: 12 },
  expField: { flex: 1 },
});
