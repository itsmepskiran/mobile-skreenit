import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, ScrollView, Share, StyleSheet, Switch } from 'react-native';
import { FontAwesome6, Pressable, View } from '@/components/scoped';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Radius, cardSurface } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError, type UploadFile } from '@/lib/api/client';
import {
  inviteUploadedResumes,
  listResumeUploads,
  startResumeBatch,
  uploadResumeToBatch,
  type ResumeSource,
  type ResumeUploadRow,
  type UploadSkip,
} from '@/lib/api/resume-intake';
import { ASSESSMENT_INVITE_APPLY_URL } from '@/lib/config';

// Phone version of web's recruiter/bulk-resumes.html: upload resumes the recruiter
// downloaded from Naukri, foundit, LinkedIn, email or referrals into this job. The backend
// reads and scores each one and can invite the best ones to the job's assessments.

const MAX_FILES = 200;
const RESUME_NAME = /\.(pdf|docx?|txt|zip)$/i;

const SOURCES: { value: ResumeSource; label: string }[] = [
  { value: 'naukri', label: 'Naukri' },
  { value: 'foundit', label: 'foundit' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'email', label: 'Email' },
  { value: 'referral', label: 'Referrals' },
  { value: 'other', label: 'Other' },
];

type Filter = 'all' | 'invited' | 'not_invited' | 'problems';
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'invited', label: 'Invited' },
  { value: 'not_invited', label: 'Not invited' },
  { value: 'problems', label: 'Duplicates & failed' },
];

const INVITE_LABELS: Record<ResumeUploadRow['invite_status'], { label: string; bg: string; fg: string }> = {
  invited: { label: 'Invited', bg: '#dcfce7', fg: '#166534' },
  already_invited: { label: 'Already invited', bg: '#e0f2fe', fg: '#075985' },
  below_cutoff: { label: 'Below cut-off', bg: '#f1f5f9', fg: '#475569' },
  cap_reached: { label: 'Over invite limit', bg: '#fef3c7', fg: '#92400e' },
  no_email: { label: 'No email in resume', bg: '#fef3c7', fg: '#92400e' },
  needs_assessment: { label: 'Set up assessment first', bg: '#fef3c7', fg: '#92400e' },
  not_invited: { label: 'Not invited', bg: '#f1f5f9', fg: '#475569' },
};

function isInvited(r: ResumeUploadRow) {
  return r.invite_status === 'invited' || r.invite_status === 'already_invited';
}

function canInvite(r: ResumeUploadRow) {
  return r.status === 'done' && !isInvited(r) && !!(r.email || r.phone);
}

function clampNumber(text: string, max: number) {
  const n = parseInt(text, 10);
  return Number.isFinite(n) ? Math.max(0, Math.min(max, n)) : 0;
}

export default function UploadResumesScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { id: jobId, jobTitle } = useLocalSearchParams<{ id: string; jobTitle?: string }>();

  const [files, setFiles] = useState<UploadFile[]>([]);
  const [source, setSource] = useState<ResumeSource>('other');
  const [autoInvite, setAutoInvite] = useState(true);
  const [minScore, setMinScore] = useState('60');
  const [maxInvites, setMaxInvites] = useState('50');
  const [progress, setProgress] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const listQuery = useQuery({
    queryKey: ['recruiter', 'resume-uploads', jobId],
    queryFn: () => listResumeUploads(jobId),
    // Keep checking while resumes are still being read and scored.
    refetchInterval: (query) => (query.state.data?.data.processing ? 4000 : false),
  });
  const list = listQuery.data?.data;
  const rows = useMemo(() => list?.rows ?? [], [list]);

  const visible = useMemo(() => {
    if (filter === 'invited') return rows.filter(isInvited);
    if (filter === 'not_invited') return rows.filter((r) => r.status === 'done' && !isInvited(r));
    if (filter === 'problems') return rows.filter((r) => r.status === 'failed' || r.status === 'duplicate');
    return rows;
  }, [rows, filter]);

  const pickFiles = async () => {
    const picked = await DocumentPicker.getDocumentAsync({
      type: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'application/zip',
        'application/x-zip-compressed',
      ],
      multiple: true,
      copyToCacheDirectory: true,
    });
    if (picked.canceled) return;
    const chosen = picked.assets
      .filter((a) => RESUME_NAME.test(a.name))
      .map((a) => ({ uri: a.uri, name: a.name, type: a.mimeType ?? 'application/octet-stream' }));
    setFiles((prev) => [...prev, ...chosen.filter((c) => !prev.some((p) => p.name === c.name))]);
  };

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const options = {
        source,
        autoInvite,
        minScore: clampNumber(minScore, 100),
        maxInvites: clampNumber(maxInvites, 500),
      };
      let batchId: string | undefined;
      const skipped: UploadSkip[] = [];
      for (let i = 0; i < files.length; i++) {
        setProgress(`Uploading ${i + 1} of ${files.length}…`);
        try {
          const res = await uploadResumeToBatch(jobId, files[i], options, batchId);
          batchId = res.data.batch_id;
          skipped.push(...res.data.skipped);
        } catch (err) {
          const reason = err instanceof ApiError && typeof err.detail === 'string' ? err.detail : 'Upload failed.';
          skipped.push({ file_name: files[i].name, reason });
        }
      }
      if (!batchId) return { queued: 0, skipped };
      setProgress('Starting screening…');
      const started = await startResumeBatch(jobId, batchId);
      return { queued: started.data.queued, skipped };
    },
    onSuccess: ({ queued, skipped }) => {
      setFiles([]);
      queryClient.invalidateQueries({ queryKey: ['recruiter', 'resume-uploads', jobId] });
      if (skipped.length) {
        const lines = skipped.slice(0, 8).map((s) => `• ${s.file_name}: ${s.reason}`).join('\n');
        Alert.alert(
          queued ? `${queued} resume(s) are being screened` : 'Nothing was uploaded',
          `Not uploaded:\n${lines}${skipped.length > 8 ? `\n…and ${skipped.length - 8} more` : ''}`,
        );
      }
    },
    onError: (err) => {
      Alert.alert('Upload failed', err instanceof ApiError && typeof err.detail === 'string' ? err.detail : 'Please try again.');
    },
    onSettled: () => setProgress(null),
  });

  const inviteMutation = useMutation({
    mutationFn: (ids: string[]) => inviteUploadedResumes(jobId, ids),
    onSuccess: (res) => {
      setSelected(new Set());
      queryClient.invalidateQueries({ queryKey: ['recruiter', 'resume-uploads', jobId] });
      const already = res.data.skipped.filter((s) => s.reason === 'already_invited').length;
      Alert.alert('Invites sent', `${res.data.sent} invited.${already ? ` ${already} had already been invited to this job.` : ''}`);
    },
    onError: (err) => {
      Alert.alert('Could not invite', err instanceof ApiError && typeof err.detail === 'string' ? err.detail : 'Please try again.');
    },
  });

  const confirmInvite = () => {
    const ids = Array.from(selected);
    Alert.alert(
      `Invite ${ids.length} candidate${ids.length === 1 ? '' : 's'}?`,
      'Invites are free. Those with an email address get it by email; for the others, share their link on WhatsApp.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Invite', onPress: () => inviteMutation.mutate(ids) },
      ],
    );
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const shareLink = (row: ResumeUploadRow) => {
    const url = `${ASSESSMENT_INVITE_APPLY_URL}?token=${encodeURIComponent(row.invite_token ?? '')}`;
    Share.share({ message: `Hi${row.full_name ? ` ${row.full_name}` : ''}, please take the assessment for ${list?.job.job_title ?? jobTitle ?? 'this role'}: ${url}` });
  };

  const counts = list?.counts;
  const waiting = (counts?.queued ?? 0) + (counts?.processing ?? 0);
  let rank = 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View>
          <ThemedText type="subtitle">{list?.job.job_title ?? jobTitle ?? 'Upload Resumes'}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Upload resumes from Naukri, foundit, LinkedIn, email or referrals. Skreenit scores each one against this job and
            can invite the best ones to its assessments.
          </ThemedText>
        </View>

        {list && !list.has_assessment ? (
          <Pressable
            style={[styles.note, { backgroundColor: '#fffbeb', borderColor: '#fde68a' }]}
            onPress={() => router.push({ pathname: '/(recruiter)/premium', params: { jobId } })}
          >
            <FontAwesome6 name="triangle-exclamation" size={14} color="#92400e" />
            <ThemedText type="small" style={{ color: '#92400e', flex: 1 }}>
              This job has no assessment yet. Resumes will still be ranked, but nobody can be invited until you set one up.
              Tap to set it up.
            </ThemedText>
          </Pressable>
        ) : null}

        <View style={[styles.card, cardSurface(theme), { borderColor: theme.border }]}>
          <Pressable style={[styles.dropzone, { borderColor: theme.border }]} onPress={pickFiles}>
            <FontAwesome6 name="file-arrow-up" size={22} color={theme.primary} />
            <ThemedText type="smallBold">{files.length ? 'Add more resumes' : 'Choose resumes'}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
              PDF, Word or text files, or a zip of them. Up to {MAX_FILES} at a time, 5 MB each.
            </ThemedText>
          </Pressable>
          {files.length ? (
            <View style={styles.fileRow}>
              <ThemedText type="small" style={{ flex: 1 }}>
                {files.length} file{files.length === 1 ? '' : 's'} selected
              </ThemedText>
              <Pressable onPress={() => setFiles([])} hitSlop={8}>
                <ThemedText type="small" style={{ color: theme.danger }}>
                  Clear
                </ThemedText>
              </Pressable>
            </View>
          ) : null}

          <ThemedText type="smallBold">Where are these resumes from?</ThemedText>
          <View style={styles.chips}>
            {SOURCES.map((s) => {
              const active = s.value === source;
              return (
                <Pressable
                  key={s.value}
                  onPress={() => setSource(s.value)}
                  style={[styles.chip, { borderColor: active ? theme.primary : theme.border }, active && { backgroundColor: theme.primary }]}
                >
                  <ThemedText type="small" style={active ? { color: '#fff' } : undefined}>
                    {s.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.switchRow}>
            <ThemedText type="small" style={{ flex: 1 }}>
              Invite the best matches to the assessments automatically
            </ThemedText>
            <Switch value={autoInvite} onValueChange={setAutoInvite} />
          </View>
          {autoInvite ? (
            <View style={styles.numbers}>
              <View style={{ flex: 1 }}>
                <TextField label="Minimum score (%)" value={minScore} onChangeText={setMinScore} keyboardType="number-pad" />
              </View>
              <View style={{ flex: 1 }}>
                <TextField label="Invite at most" value={maxInvites} onChangeText={setMaxInvites} keyboardType="number-pad" />
              </View>
            </View>
          ) : null}
          <ThemedText type="small" themeColor="textSecondary">
            Invites are free. The first 10 candidates who complete this job&apos;s assessments are free; after that each
            completed assessment uses 4 coins.
          </ThemedText>

          <Button
            title={progress ?? 'Upload and screen'}
            icon="wand-magic-sparkles"
            onPress={() => {
              if (files.length > MAX_FILES) {
                Alert.alert('Too many files', `You can upload up to ${MAX_FILES} resumes at a time.`);
                return;
              }
              uploadMutation.mutate();
            }}
            loading={uploadMutation.isPending}
            disabled={!files.length}
          />
        </View>

        <View style={[styles.card, cardSurface(theme), { borderColor: theme.border }]}>
          <View style={styles.fileRow}>
            <ThemedText type="smallBold" style={{ flex: 1 }}>
              Ranked candidates
            </ThemedText>
            {selected.size ? (
              <Pressable style={[styles.inviteButton, { backgroundColor: theme.primary }]} onPress={confirmInvite} disabled={inviteMutation.isPending}>
                <FontAwesome6 name="paper-plane" size={12} color="#fff" />
                <ThemedText type="small" style={{ color: '#fff', fontWeight: '600' }}>
                  Invite {selected.size}
                </ThemedText>
              </Pressable>
            ) : null}
          </View>

          {list?.processing ? (
            <View style={[styles.note, { backgroundColor: '#fef3c7', borderColor: '#fcd34d' }]}>
              <ActivityIndicator size="small" color="#92400e" />
              <ThemedText type="small" style={{ color: '#92400e', flex: 1 }}>
                Reading and scoring resumes: {waiting} left. You can leave this screen; screening carries on.
              </ThemedText>
            </View>
          ) : null}

          {counts?.total ? (
            <ThemedText type="small" themeColor="textSecondary">
              {counts.total} uploaded · {counts.done} screened · {counts.invited} invited
              {counts.duplicate ? ` · ${counts.duplicate} duplicate` : ''}
              {counts.failed ? ` · ${counts.failed} could not be read` : ''}
            </ThemedText>
          ) : null}

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {FILTERS.map((f) => {
              const active = f.value === filter;
              return (
                <Pressable
                  key={f.value}
                  onPress={() => setFilter(f.value)}
                  style={[styles.chip, { borderColor: active ? theme.primary : theme.border }, active && { backgroundColor: theme.primary }]}
                >
                  <ThemedText type="small" style={active ? { color: '#fff' } : undefined}>
                    {f.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>

          {listQuery.isLoading ? (
            <ActivityIndicator color={theme.primary} />
          ) : listQuery.isError ? (
            <ThemedText type="small" style={{ color: theme.danger }}>
              Could not load the resumes. Please try again later.
            </ThemedText>
          ) : visible.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
              {rows.length ? 'Nothing in this view.' : 'No resumes uploaded to this job yet.'}
            </ThemedText>
          ) : (
            visible.map((r) => {
              const done = r.status === 'done';
              if (done) rank += 1;
              const badge =
                r.status === 'queued' || r.status === 'processing'
                  ? { label: 'Screening', bg: '#e0f2fe', fg: '#075985' }
                  : r.status === 'failed'
                    ? { label: 'Could not read', bg: '#fee2e2', fg: '#991b1b' }
                    : r.status === 'duplicate'
                      ? { label: 'Duplicate', bg: '#f1f5f9', fg: '#475569' }
                      : INVITE_LABELS[r.invite_status] ?? INVITE_LABELS.not_invited;
              const score = r.match_score ?? 0;
              const scoreColor = score >= 75 ? '#16a34a' : score >= 50 ? '#d97706' : '#dc2626';
              const selectable = canInvite(r);
              return (
                <View key={r.id} style={[styles.row, { borderColor: theme.border }]}>
                  <View style={styles.rowTop}>
                    {selectable ? (
                      <Pressable onPress={() => toggle(r.id)} hitSlop={8}>
                        <FontAwesome6
                          name={selected.has(r.id) ? 'square-check' : 'square'}
                          size={18}
                          color={selected.has(r.id) ? theme.primary : theme.textSecondary}
                        />
                      </Pressable>
                    ) : null}
                    <View style={{ flex: 1 }}>
                      <ThemedText type="smallBold" numberOfLines={1}>
                        {done ? `${rank}. ` : ''}
                        {r.full_name || r.file_name}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
                        {[r.email, r.phone].filter(Boolean).join(' · ') || r.file_name}
                        {r.experience_years ? ` · ${r.experience_years} yr` : ''}
                      </ThemedText>
                    </View>
                    {done && r.match_score != null ? (
                      <ThemedText type="smallBold" style={{ color: scoreColor }}>
                        {r.match_score}%
                      </ThemedText>
                    ) : null}
                  </View>
                  {done && r.match_score != null ? (
                    <View style={[styles.bar, { backgroundColor: theme.border }]}>
                      <View style={{ width: `${score}%`, height: '100%', backgroundColor: scoreColor, borderRadius: 3 }} />
                    </View>
                  ) : null}
                  {r.skills_matched.length ? (
                    <View style={styles.chips}>
                      {r.skills_matched.slice(0, 6).map((s) => (
                        <View key={s} style={styles.skill}>
                          <ThemedText type="small" style={{ color: '#065f46' }}>
                            {s}
                          </ThemedText>
                        </View>
                      ))}
                    </View>
                  ) : null}
                  {r.status === 'failed' && r.error ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      {r.error}
                    </ThemedText>
                  ) : null}
                  <View style={styles.rowBottom}>
                    <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                      <ThemedText type="small" style={{ color: badge.fg, fontWeight: '600' }}>
                        {badge.label}
                      </ThemedText>
                    </View>
                    <View style={{ flex: 1 }} />
                    {r.resume_url ? (
                      <Pressable style={[styles.iconButton, { borderColor: theme.border }]} onPress={() => Linking.openURL(r.resume_url!)}>
                        <FontAwesome6 name="file-lines" size={13} color={theme.text} />
                      </Pressable>
                    ) : null}
                    {r.invite_token ? (
                      <Pressable style={[styles.iconButton, { borderColor: theme.border }]} onPress={() => shareLink(r)}>
                        <FontAwesome6 name="share-nodes" size={13} color={theme.primary} />
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: 20, gap: 14 },
  card: { borderWidth: 1, borderRadius: Radius.lg, padding: 16, gap: 12 },
  center: { textAlign: 'center' },
  dropzone: { borderWidth: 1.5, borderStyle: 'dashed', borderRadius: Radius.md, padding: 20, alignItems: 'center', gap: 6 },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  numbers: { flexDirection: 'row', gap: 12 },
  note: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: Radius.md, padding: 12 },
  inviteButton: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 8 },
  row: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, gap: 8 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowBottom: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  skill: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: '#ecfdf5' },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  iconButton: { borderWidth: 1, borderRadius: Radius.sm, paddingHorizontal: 10, paddingVertical: 6 },
});
