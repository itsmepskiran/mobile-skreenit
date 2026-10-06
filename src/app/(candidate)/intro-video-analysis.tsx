import { FontAwesome6 } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnalysisCards } from '@/components/analysis-cards';
import { AnswerRecorder } from '@/components/answer-recorder';
import { Button } from '@/components/button';
import { useCoinConsent } from '@/components/coin-consent-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { uploadResume } from '@/lib/api/applicant';
import { analyzeOwnResume } from '@/lib/api/employability-report';
import {
  downloadSessionReport,
  getIntroSession,
  getIntroStatus,
  startIntroSession,
  submitIntroAnswer,
  type InterviewSession,
} from '@/lib/api/interview';

const DEFAULT_ANSWER_SECONDS = 120;
const POLL_MS = 6000;

// Mobile twin of the web's applicant/intro-video-analysis.html: resume -> resume analysis ->
// AI questions from the resume -> answer each on video -> analysis report as a row of cards.
// The latest completed report is also shown on the profile screen.
export default function IntroVideoAnalysisScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { confirmSpend, consentModal } = useCoinConsent();
  // undefined = not touched yet: show the unfinished session, else the latest report.
  const [local, setSession] = useState<InterviewSession | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null); // label of the step in progress
  const [downloading, setDownloading] = useState(false);

  const statusQuery = useQuery({ queryKey: ['candidate', 'intro-status'], queryFn: getIntroStatus });
  const status = statusQuery.data?.data;
  const session = local === undefined ? (status?.current ?? status?.latest ?? null) : local;

  // While answers are being analysed, poll the session until it completes.
  useEffect(() => {
    if (!session || session.status === 'completed') return;
    if (!session.answers.some((a) => a.status === 'analyzing')) return;
    const timer = setTimeout(async () => {
      try {
        setSession((await getIntroSession(session.id)).data);
      } catch {
        /* keep polling on the next tick */
      }
    }, POLL_MS);
    return () => clearTimeout(timer);
  }, [session]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['candidate', 'intro-status'] });

  const pickResume = async () => {
    setError(null);
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
    try {
      setBusy('Uploading your resume…');
      await uploadResume({ uri: asset.uri, name: asset.name, type: asset.mimeType ?? 'application/octet-stream' });
      setBusy('Reading your resume… this takes about a minute.');
      await analyzeOwnResume();
      await refresh();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'Could not process your resume. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const analyzeResume = async () => {
    setError(null);
    try {
      setBusy('Reading your resume… this takes about a minute.');
      await analyzeOwnResume();
      await refresh();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'Resume analysis failed. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const start = async () => {
    setError(null);
    if (!(await confirmSpend({ action: 'video_analysis' }))) return;
    try {
      setBusy('Writing your questions…');
      setSession((await startIntroSession()).data);
      refresh();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'Could not start the analysis.');
    } finally {
      setBusy(null);
    }
  };

  const nextQuestion = session?.answers.find((a) => a.status === 'pending' || a.status === 'failed');

  const download = async () => {
    if (!session) return;
    setDownloading(true);
    try {
      await downloadSessionReport('intro', session.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not download the report.');
    } finally {
      setDownloading(false);
    }
  };

  const submitAnswer = useMutation({
    mutationFn: async ({ index, file }: { index: number; file: Parameters<typeof submitIntroAnswer>[2] }) => {
      if (!session) throw new Error('No session in progress.');
      await submitIntroAnswer(session.id, index, file);
      return (await getIntroSession(session.id)).data;
    },
    onSuccess: (updated) => {
      setSession(updated);
      refresh();
    },
  });

  const header = (
    <View style={styles.headerRow}>
      <Pressable onPress={() => router.replace('/(candidate)/premium-services')} hitSlop={12}>
        <FontAwesome6 name="chevron-left" size={16} color={theme.text} />
      </Pressable>
      <ThemedText type="title">Intro Video Analysis</ThemedText>
    </View>
  );

  if (statusQuery.isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        {header}
        <ActivityIndicator style={styles.loader} color={theme.primary} />
      </SafeAreaView>
    );
  }

  // ── Interview: answer the next question ──
  if (session && session.status === 'in_progress' && nextQuestion) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        {header}
        <AnswerRecorder
          key={nextQuestion.question_index}
          progress={`Question ${nextQuestion.question_index + 1} of ${session.answers.length}`}
          question={nextQuestion.question}
          maxSeconds={session.answer_seconds ?? DEFAULT_ANSWER_SECONDS}
          onSubmit={async (file) => {
            await submitAnswer.mutateAsync({ index: nextQuestion.question_index, file });
          }}
        />
        {consentModal}
      </SafeAreaView>
    );
  }

  // ── Report ──
  if (session) {
    const done = session.status === 'completed';
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        {header}
        <ScrollView contentContainerStyle={styles.content}>
          <AnalysisCards session={session} />
          {error ? <ThemedText type="small" style={{ color: theme.danger }}>{error}</ThemedText> : null}
          {done ? <Button title="Download full report (PDF)" icon="download" loading={downloading} onPress={download} /> : null}
          <Button
            title="Run a new analysis"
            variant="secondary"
            icon="rotate-right"
            onPress={() => {
              setSession(null);
              setError(null);
              refresh();
            }}
          />
        </ScrollView>
        {consentModal}
      </SafeAreaView>
    );
  }

  // ── Prepare: resume -> analysis -> start ──
  const hasResume = !!status?.has_resume;
  const analyzed = !!status?.resume_analyzed;
  const q = status?.quote;
  const cost =
    q?.method === 'unlimited'
      ? 'Included with your Career Pass.'
      : q?.method === 'free'
        ? 'Your first analysis is free.'
        : q
          ? `${q.coins_required} coins per analysis · your balance: ${q.balance} coins.`
          : '';

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      {header}
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="small" themeColor="textSecondary">
          We read your resume, ask you an introduction question plus a few questions based on your own experience, and you answer
          each on camera. Then we analyse your speaking, confidence and content.
        </ThemedText>

        <Step
          icon="file-lines"
          title="1. Your resume"
          sub={hasResume ? status?.resume_name ?? 'Resume uploaded' : 'No resume yet — upload one to continue.'}
          done={hasResume}
          actionLabel={hasResume ? 'Upload a different resume' : 'Upload resume'}
          onAction={pickResume}
          disabled={!!busy}
        />
        <Step
          icon="magnifying-glass-chart"
          title="2. Resume analysis"
          sub={!hasResume ? 'Waiting for your resume' : analyzed ? 'Your resume has been analysed.' : 'Not analysed yet.'}
          done={analyzed}
          actionLabel={hasResume && !analyzed ? 'Analyse my resume' : undefined}
          onAction={analyzeResume}
          disabled={!!busy}
        />
        <Step
          icon="list-check"
          title="3. Your questions"
          sub="We write them from your resume when you start — an introduction plus three about your experience."
        />

        {busy ? (
          <View style={styles.busyRow}>
            <ActivityIndicator color={theme.primary} />
            <ThemedText type="small" themeColor="textSecondary">{busy}</ThemedText>
          </View>
        ) : null}
        {error ? <ThemedText type="small" style={{ color: theme.danger }}>{error}</ThemedText> : null}

        {cost ? (
          <View style={styles.costBox}>
            <FontAwesome6 name="coins" size={14} color="#92400e" />
            <ThemedText type="small" style={{ color: '#92400e', flex: 1 }}>{cost}</ThemedText>
          </View>
        ) : null}
        <Button title="Generate questions & start" icon="play" onPress={start} disabled={!hasResume || !analyzed || !!busy} />
      </ScrollView>
      {consentModal}
    </SafeAreaView>
  );
}

function Step({
  icon,
  title,
  sub,
  done,
  actionLabel,
  onAction,
  disabled,
}: {
  icon: React.ComponentProps<typeof FontAwesome6>['name'];
  title: string;
  sub: string;
  done?: boolean;
  actionLabel?: string;
  onAction?: () => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <ThemedView style={[styles.step, { borderColor: theme.border }]}>
      <View style={[styles.stepIcon, done && { backgroundColor: '#dcfce7' }]}>
        <FontAwesome6 name={done ? 'check' : icon} size={14} color={done ? '#16a34a' : '#94a3b8'} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <ThemedText type="smallBold">{title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">{sub}</ThemedText>
        {actionLabel && onAction ? (
          <Pressable onPress={onAction} disabled={disabled} hitSlop={6}>
            <ThemedText type="smallBold" themeColor="primary">{actionLabel}</ThemedText>
          </Pressable>
        ) : null}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  loader: { marginTop: 40 },
  content: { padding: 20, gap: 14 },
  step: { flexDirection: 'row', gap: 12, borderWidth: 1, borderRadius: Radius.md, padding: 12, alignItems: 'flex-start' },
  stepIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  busyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  costBox: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: '#fffbeb', borderColor: '#fde68a', borderWidth: 1, borderRadius: Radius.md, padding: 10 },
});
