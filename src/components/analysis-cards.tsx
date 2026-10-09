import { ScrollView, StyleSheet } from 'react-native';
import { FontAwesome6, View } from '@/components/scoped';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { InterviewAnswer, InterviewSession } from '@/lib/api/interview';

// The video-analysis report as an overall score plus a horizontally scrolling row of cards, one per
// answered question. Used by Mock Interview Practice, Intro Video Analysis and the profile's
// "latest analysis" panel — mirrors the web's assets/assets/js/analysis-cards.js.

const CARD_WIDTH = 290;

function AnswerCard({ answer }: { answer: InterviewAnswer }) {
  const theme = useTheme();
  const a = answer.analysis;
  const s = a?.summary;
  const strengths = (a?.assessment?.strengths ?? []).slice(0, 3);
  const improve = (a?.assessment?.areas_for_improvement ?? []).slice(0, 3);
  const metrics = [
    s?.speaking_pace ? `${s.speaking_pace} words/min` : '',
    s?.filler_words != null ? `${s.filler_words} filler words` : '',
    s?.eye_contact_rate != null ? `Eye contact ${Math.round(s.eye_contact_rate)}%` : '',
    s?.dominant_emotion && s.dominant_emotion !== 'unknown' ? `Tone: ${s.dominant_emotion}` : '',
  ].filter(Boolean);

  return (
    <ThemedView style={[styles.card, { borderColor: theme.border, backgroundColor: theme.backgroundElement, width: CARD_WIDTH }]}>
      <View style={styles.cardTop}>
        <View style={{ flex: 1, gap: 2 }}>
          <ThemedText type="small" themeColor="textSecondary">
            QUESTION {answer.question_index + 1}
          </ThemedText>
          <ThemedText type="smallBold">{answer.question}</ThemedText>
        </View>
        {answer.status === 'completed' ? (
          <View style={styles.scoreBox}>
            <ThemedText type="subtitle" style={{ color: '#4338ca' }}>
              {answer.overall_score ?? 0}
            </ThemedText>
          </View>
        ) : null}
      </View>

      {answer.status === 'pending' ? (
        <ThemedText type="small" themeColor="textSecondary">Not answered yet.</ThemedText>
      ) : answer.status === 'analyzing' ? (
        <ThemedText type="small" themeColor="textSecondary">Analysing your answer… this can take a few minutes.</ThemedText>
      ) : answer.status === 'failed' ? (
        <ThemedText type="small" style={{ color: theme.danger }}>We couldn&apos;t analyse this answer.</ThemedText>
      ) : (
        <>
          {metrics.length ? (
            <View style={styles.chips}>
              {metrics.map((m) => (
                <View key={m} style={styles.chip}>
                  <ThemedText type="small">{m}</ThemedText>
                </View>
              ))}
            </View>
          ) : null}
          {strengths.length ? (
            <View style={{ gap: 2 }}>
              <ThemedText type="smallBold" style={{ color: '#16a34a' }}>What went well</ThemedText>
              {strengths.map((x) => (
                <ThemedText key={x.label} type="small" themeColor="textSecondary">
                  • {x.label}
                  {x.highlight ? ` — ${x.highlight}` : ''}
                </ThemedText>
              ))}
            </View>
          ) : null}
          {improve.length ? (
            <View style={{ gap: 2 }}>
              <ThemedText type="smallBold" style={{ color: '#b45309' }}>Work on</ThemedText>
              {improve.map((x) => (
                <ThemedText key={x.label} type="small" themeColor="textSecondary">
                  • {x.label}
                  {x.suggestion ? ` — ${x.suggestion}` : ''}
                </ThemedText>
              ))}
            </View>
          ) : null}
        </>
      )}
    </ThemedView>
  );
}

// compact: overall score + one score pill per question, for the Dashboard (the full per-question
// cards are on Profile and the analysis screens).
export function AnalysisCards({ session, compact = false }: { session: InterviewSession; compact?: boolean }) {
  const done = session.status === 'completed';
  const date = session.created_at
    ? new Date(session.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '';
  return (
    <View style={{ gap: 12 }}>
      <View style={styles.head}>
        <View style={styles.overall}>
          <ThemedText type="title" style={{ color: '#4338ca' }}>
            {done ? (session.overall_score ?? '–') : '…'}
          </ThemedText>
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText type="smallBold">{done ? 'Overall score' : 'Analysing your answers…'}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">{date}</ThemedText>
        </View>
        {!done ? <FontAwesome6 name="spinner" size={16} color="#4338ca" /> : null}
      </View>
      {compact ? (
        <View style={styles.chips}>
          {session.answers.map((a) => (
            <View key={a.question_index} style={styles.chip}>
              <ThemedText type="small">
                {`Q${a.question_index + 1}: ${a.status === 'completed' ? (a.overall_score ?? 0) : a.status === 'analyzing' ? '…' : '–'}`}
              </ThemedText>
            </View>
          ))}
        </View>
      ) : (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={CARD_WIDTH + 12} decelerationRate="fast" contentContainerStyle={{ gap: 12 }}>
        {session.answers.map((a) => (
          <AnswerCard key={a.question_index} answer={a} />
        ))}
      </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  overall: { minWidth: 64, height: 64, borderRadius: 16, backgroundColor: '#eef2ff', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  card: { borderWidth: 1, borderRadius: Radius.lg, padding: 14, gap: 8 },
  cardTop: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  scoreBox: { minWidth: 46, height: 46, borderRadius: 12, backgroundColor: '#eef2ff', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { backgroundColor: '#f1f5f9', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
});
