import { FontAwesome6 } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { VideoIntroAssessment } from '@/components/assessment-taking/video-intro-assessment';
import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
    finishAssessment,
    getAssessmentQuestions,
    type AssessmentItem,
    type AssessmentQuestions,
    type AssessmentResponseInput,
    type AssessmentSection,
} from '@/lib/api/assessment-taking';
import { ApiError } from '@/lib/api/client';

const CODING_PLATFORMS = [
  { id: 'python', label: 'Python' },
  { id: 'javascript', label: 'JavaScript' },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'java', label: 'Java' },
  { id: 'cpp', label: 'C++' },
  { id: 'go', label: 'Go' },
];

const EXERCISE_TYPE_LABELS: Record<string, string> = {
  mcq: 'Multiple Choice',
  code: 'Coding Challenge',
  text_response: 'Written Response',
  vocabulary: 'Word Reading',
  read_aloud: 'Reading Aloud',
  repeat_sentence: 'Sentence Repetition',
  qa_verbal: 'Verbal Q&A',
  topic_speaking: 'Topic Speaking',
  voice_scenario: 'Scenario Response',
};

type ResponseValue = { type: string; text?: string; selectedIdx?: number };

type Stage = 'loading' | 'error' | 'locked' | 'platform-select' | 'overview' | 'section-intro' | 'exercise' | 'submitting';

export default function TakeAssessmentScreen() {
  const { planId } = useLocalSearchParams<{ planId: string }>();

  if (planId === 'gen_video_intro') {
    return <VideoIntroAssessment />;
  }

  return <GenericAssessment planId={planId} />;
}

function GenericAssessment({ planId }: { planId: string }) {
  const theme = useTheme();
  const needsPlatform = planId === 'gen_coding_basic';

  const [stage, setStage] = useState<Stage>(needsPlatform ? 'platform-select' : 'loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [platform, setPlatform] = useState<string | null>(null);
  const [data, setData] = useState<AssessmentQuestions | null>(null);
  const [sectionIdx, setSectionIdx] = useState(0);
  const [itemIdx, setItemIdx] = useState(0);
  const [responses, setResponses] = useState<Record<string, ResponseValue>>({});
  const [startTime, setStartTime] = useState<number | null>(null);
  const [textDraft, setTextDraft] = useState('');
  const [mcqRevealed, setMcqRevealed] = useState(false);

  const section: AssessmentSection | null = data?.sections[sectionIdx] ?? null;
  const item: AssessmentItem | null = section?.items[itemIdx] ?? null;
  const responseKey = section && item ? `${section.id}_${item.id}` : null;

  const load = useCallback(async (chosenPlatform?: string, skipLoading = false) => {
    if (!skipLoading) {
      setStage('loading');
    }
    setErrorMsg(null);
    try {
      const res = await getAssessmentQuestions(planId, chosenPlatform);
      setData(res.data);
      setStage('overview');
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setStage('locked');
      } else {
        setErrorMsg(err instanceof ApiError ? err.message : 'Could not load this assessment. Please try again.');
        setStage('error');
      }
    }
  }, [planId]);

  // Non-coding assessments skip straight to loading — the platform picker
  // (which itself triggers `load`) only applies to gen_coding_basic.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!needsPlatform) {
      void load(undefined, true);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [needsPlatform, load]);

  const setResponse = (value: ResponseValue) => {
    if (!responseKey) return;
    setResponses((prev) => ({ ...prev, [responseKey]: { ...prev[responseKey], ...value } }));
  };

  const beginAssessment = () => {
    setSectionIdx(0);
    setItemIdx(0);
    setStartTime(Date.now());
    setStage('section-intro');
  };

  const goToExercise = () => {
    setTextDraft('');
    setMcqRevealed(false);
    setStage('exercise');
  };

  const finishMutationSubmit = async () => {
    if (!data) return;
    setStage('submitting');
    const elapsed = startTime ? Math.round((Date.now() - startTime) / 1000) : 0;
    const responsePayload: AssessmentResponseInput[] = Object.entries(responses).map(([key, val]) => ({
      questionId: key,
      type: val.type,
      text: val.text ?? null,
      hasRecording: false,
      selectedIdx: val.selectedIdx ?? null,
    }));
    try {
      const res = await finishAssessment({
        planId,
        responses: responsePayload,
        timeTakenSeconds: elapsed,
        mcqToken: data.mcq_token,
      });
      router.replace(`/(candidate)/assessments/result/${res.data.session_id}`);
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : 'Could not submit your assessment. Please try again.');
      setStage('error');
    }
  };

  const goNext = () => {
    if (!data || !section) return;
    const isLastItem = itemIdx >= section.items.length - 1;
    const isLastSection = sectionIdx >= data.sections.length - 1;

    if (isLastItem && isLastSection) {
      finishMutationSubmit();
    } else if (isLastItem) {
      setSectionIdx((i) => i + 1);
      setItemIdx(0);
      setStage('section-intro');
    } else {
      setItemIdx((i) => i + 1);
      goToExercise();
    }
  };

  if (stage === 'platform-select') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="subtitle">Choose a language</ThemedText>
          <ThemedText themeColor="textSecondary" type="small">
            Pick the language you&apos;d like to use for this coding challenge.
          </ThemedText>
          {CODING_PLATFORMS.map((p) => (
            <Pressable
              key={p.id}
              style={[styles.platformRow, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
              onPress={() => {
                setPlatform(p.id);
                load(p.id);
              }}
            >
              <ThemedText type="smallBold">{p.label}</ThemedText>
              <FontAwesome6 name="chevron-right" size={13} color={theme.textSecondary} />
            </Pressable>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (stage === 'loading') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ActivityIndicator style={styles.loader} color={theme.primary} />
        <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
          Preparing your assessment...
        </ThemedText>
      </SafeAreaView>
    );
  }

  if (stage === 'locked') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerBlock}>
          <FontAwesome6 name="lock" size={32} color={theme.textSecondary} />
          <ThemedText type="subtitle" style={styles.centerText}>
            Not unlocked yet
          </ThemedText>
          <ThemedText themeColor="textSecondary" type="small" style={styles.centerText}>
            You don&apos;t have an active subscription for this assessment.
          </ThemedText>
          <Button title="Go back" variant="secondary" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  if (stage === 'error') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerBlock}>
          <FontAwesome6 name="triangle-exclamation" size={32} color={theme.danger} />
          <ThemedText type="small" style={[styles.centerText, { color: theme.danger }]}>
            {errorMsg}
          </ThemedText>
          <Button title="Try again" onPress={() => load(platform ?? undefined)} />
        </View>
      </SafeAreaView>
    );
  }

  if (stage === 'submitting') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ActivityIndicator style={styles.loader} color={theme.primary} />
        <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
          Submitting your assessment...
        </ThemedText>
      </SafeAreaView>
    );
  }

  if (!data) return null;

  if (stage === 'overview') {
    const types = [...new Set(data.sections.map((s) => EXERCISE_TYPE_LABELS[s.exercise_type] ?? s.exercise_type))];
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="title">{data.assessment_name}</ThemedText>
          <ThemedText themeColor="textSecondary">{data.format_description}</ThemedText>

          <View style={styles.tagsRow}>
            {types.map((t) => (
              <View key={t} style={[styles.tag, { backgroundColor: theme.backgroundSelected }]}>
                <ThemedText type="small" themeColor="primary">
                  {t}
                </ThemedText>
              </View>
            ))}
          </View>

          {data.sections.map((s, i) => (
            <ThemedView key={s.id} style={[styles.sectionPreview, { borderColor: theme.border }]}>
              <View style={[styles.sectionNum, { backgroundColor: theme.backgroundSelected }]}>
                <ThemedText type="smallBold" themeColor="primary">
                  {i + 1}
                </ThemedText>
              </View>
              <View style={styles.sectionPreviewInfo}>
                <ThemedText type="smallBold">{s.title}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {EXERCISE_TYPE_LABELS[s.exercise_type] ?? s.exercise_type}
                </ThemedText>
              </View>
              <ThemedText type="small" themeColor="textSecondary">
                {s.items.length} exercise{s.items.length !== 1 ? 's' : ''}
              </ThemedText>
            </ThemedView>
          ))}

          <Button title="Begin Assessment" icon="arrow-right" onPress={beginAssessment} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (stage === 'section-intro' && section) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.dotsRow}>
            {data.sections.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  { backgroundColor: i <= sectionIdx ? theme.primary : theme.border },
                ]}
              />
            ))}
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            Section {sectionIdx + 1} of {data.sections.length}
          </ThemedText>
          <ThemedText type="title">{section.title}</ThemedText>
          {section.instruction ? <ThemedText themeColor="textSecondary">{section.instruction}</ThemedText> : null}
          <View style={styles.tagsRow}>
            <View style={[styles.tag, { backgroundColor: theme.backgroundSelected }]}>
              <ThemedText type="small" themeColor="primary">
                {section.items.length} exercise{section.items.length !== 1 ? 's' : ''}
              </ThemedText>
            </View>
            <View style={[styles.tag, { backgroundColor: theme.backgroundSelected }]}>
              <ThemedText type="small" themeColor="primary">
                {EXERCISE_TYPE_LABELS[section.exercise_type] ?? section.exercise_type}
              </ThemedText>
            </View>
          </View>
          <Button title="Begin" icon="arrow-right" onPress={goToExercise} />
        </View>
      </SafeAreaView>
    );
  }

  if (stage === 'exercise' && section && item) {
    const isLastItem = itemIdx >= section.items.length - 1;
    const isLastSection = sectionIdx >= data.sections.length - 1;
    const pct = (itemIdx / section.items.length) * 100;
    const current = responseKey ? responses[responseKey] : undefined;

    let canNext = false;
    let body: React.ReactNode = null;

    if (section.exercise_type === 'mcq') {
      const options = item.options ?? [];
      const letters = ['A', 'B', 'C', 'D'];
      const selectedIdx = current?.selectedIdx;
      canNext = selectedIdx != null;
      body = (
        <View style={styles.gap12}>
          <ThemedText type="smallBold">{item.content}</ThemedText>
          {options.map((opt, i) => {
            const isSelected = selectedIdx === i;
            const isCorrect = item.correct === i;
            let borderColor: string = theme.border;
            let bg: string = theme.backgroundElement;
            if (mcqRevealed && item.correct != null) {
              if (isCorrect) {
                borderColor = theme.secondary;
                bg = 'rgba(34,197,94,0.1)';
              } else if (isSelected) {
                borderColor = theme.danger;
                bg = 'rgba(239,68,68,0.1)';
              }
            } else if (isSelected) {
              borderColor = theme.primary;
              bg = theme.backgroundSelected;
            }
            return (
              <Pressable
                key={i}
                disabled={mcqRevealed}
                style={[styles.mcqOption, { borderColor, backgroundColor: bg }]}
                onPress={() => {
                  setResponse({ type: 'mcq', selectedIdx: i });
                  setTimeout(() => setMcqRevealed(true), 300);
                }}
              >
                <View style={[styles.mcqLetter, { borderColor }]}>
                  <ThemedText type="small">{letters[i]}</ThemedText>
                </View>
                <ThemedText type="small" style={styles.mcqOptionText}>
                  {opt}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      );
    } else if (section.exercise_type === 'code') {
      const starter = item.starter_code ?? '// Write your solution here\n';
      canNext = (current?.text ?? '').trim().length > 0;
      body = (
        <View style={styles.gap12}>
          {item.language ? (
            <View style={[styles.tag, { backgroundColor: theme.backgroundSelected, alignSelf: 'flex-start' }]}>
              <ThemedText type="small" themeColor="primary">
                {item.language.toUpperCase()}
              </ThemedText>
            </View>
          ) : null}
          <ThemedText type="smallBold">{item.content}</ThemedText>
          <TextInput
            multiline
            contextMenuHidden
            style={[styles.codeEditor, { borderColor: theme.border, color: theme.text, backgroundColor: theme.backgroundElement }]}
            defaultValue={current?.text ?? starter}
            placeholder="Write your solution here..."
            placeholderTextColor={theme.textSecondary}
            onChangeText={(text) => setResponse({ type: 'code', text })}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      );
    } else if (section.exercise_type === 'text_response') {
      canNext = true;
      body = (
        <View style={styles.gap12}>
          {item.format_hint || section.format_hint ? (
            <ThemedText type="small" themeColor="textSecondary">
              {item.format_hint ?? section.format_hint}
            </ThemedText>
          ) : null}
          <ThemedText type="smallBold">{item.content}</ThemedText>
          <TextInput
            multiline
            style={[styles.textEditor, { borderColor: theme.border, color: theme.text, backgroundColor: theme.backgroundElement }]}
            value={textDraft}
            placeholder="Write your response here..."
            placeholderTextColor={theme.textSecondary}
            onChangeText={(text) => {
              setTextDraft(text);
              setResponse({ type: 'text', text });
            }}
          />
        </View>
      );
    } else {
      // Voice-based exercise types aren't part of the free assessment set — show a
      // graceful skip rather than nothing, matching the generic engine's `default` case.
      canNext = true;
      body = (
        <ThemedText themeColor="textSecondary">{item.content}</ThemedText>
      );
    }

    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.progressBarTrack, { backgroundColor: theme.border }]}>
          <View style={[styles.progressBarFill, { backgroundColor: theme.primary, width: `${pct}%` }]} />
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.exerciseHeader}>
            <ThemedText type="small" themeColor="textSecondary">
              {section.title}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {itemIdx + 1} / {section.items.length}
            </ThemedText>
          </View>
          {body}
        </ScrollView>
        <ThemedView style={[styles.footer, { borderColor: theme.border }]}>
          <Button
            title={isLastItem && isLastSection ? 'Submit Assessment' : 'Next'}
            icon={isLastItem && isLastSection ? 'check' : 'arrow-right'}
            disabled={!canNext}
            onPress={goNext}
          />
        </ThemedView>
      </SafeAreaView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  loader: { marginTop: 60 },
  centerText: { textAlign: 'center' },
  centerBlock: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 30 },
  content: { padding: 20, gap: 16, paddingBottom: 40 },
  gap12: { gap: 12 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  sectionPreview: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: Radius.lg, padding: 14 },
  sectionNum: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  sectionPreviewInfo: { flex: 1, gap: 2 },
  platformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: 16,
  },
  dotsRow: { flexDirection: 'row', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  progressBarTrack: { height: 4, width: '100%' },
  progressBarFill: { height: 4 },
  exerciseHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  mcqOption: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderRadius: Radius.md, padding: 14 },
  mcqLetter: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  mcqOptionText: { flex: 1 },
  codeEditor: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: 12,
    minHeight: 220,
    fontFamily: 'monospace',
    fontSize: 13,
    textAlignVertical: 'top',
  },
  textEditor: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: 12,
    minHeight: 160,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  footer: { padding: 16, borderTopWidth: StyleSheet.hairlineWidth },
});
