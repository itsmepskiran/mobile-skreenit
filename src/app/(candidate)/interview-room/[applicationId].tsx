import { FontAwesome6 } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  finishInterview,
  getApplicationInterview,
  saveInterviewResponse,
  uploadIntroVideoResponse,
} from '@/lib/api/applicant';

const MAX_DURATION_SECONDS = 120;

// Ported from sql-skreenit's dashboard/interview-room.html + interview-room.js
// (the candidate's per-job self-recorded video response flow, distinct from the
// one-time profile-level video introduction — see step-video-intro.tsx, whose
// camera/upload pattern this closely follows since it's already battle-tested
// against the Android FormData/Blob bugs documented there).
type Phase = 'intro' | 'recording' | 'done';
type RecordingState = 'idle' | 'recording' | 'recorded' | 'uploading';

export default function InterviewRoomScreen() {
  const theme = useTheme();
  const { applicationId } = useLocalSearchParams<{ applicationId: string }>();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();

  const [phase, setPhase] = useState<Phase>('intro');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [state, setState] = useState<RecordingState>('idle');
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const cameraRef = useRef<CameraView>(null);

  const interviewQuery = useQuery({
    queryKey: ['applicant', 'application-interview', applicationId],
    queryFn: () => getApplicationInterview(applicationId),
  });

  const player = useVideoPlayer(videoUri ?? null, (p) => {
    p.loop = false;
  });

  if (interviewQuery.isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ActivityIndicator style={styles.loader} color={theme.primary} />
      </SafeAreaView>
    );
  }

  if (interviewQuery.isError || !interviewQuery.data?.data.interview_questions.length) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <ThemedText type="subtitle">Could not load your interview</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            No interview questions are available for this application yet.
          </ThemedText>
          <Button title="Back to Applications" onPress={() => router.replace('/(candidate)/applications')} />
        </View>
      </SafeAreaView>
    );
  }

  const interview = interviewQuery.data.data;
  const questions = interview.interview_questions;
  const question = questions[questionIndex];
  const isLastQuestion = questionIndex === questions.length - 1;

  if (phase === 'intro') {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.content}>
          <ThemedText type="title">{interview.job_title}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {interview.company_name}
            {interview.location ? ` · ${interview.location}` : ''}
          </ThemedText>
          <ThemedView style={[styles.card, { borderColor: theme.border }]}>
            <ThemedText type="smallBold">Before you begin</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              You&apos;ll answer {questions.length} question{questions.length === 1 ? '' : 's'} on camera, one at a
              time. Find a quiet, well-lit spot. Each answer can be up to 2 minutes — take a breath and speak
              naturally.
            </ThemedText>
          </ThemedView>
          <Button title="Begin Interview" onPress={() => setPhase('recording')} />
        </View>
      </SafeAreaView>
    );
  }

  if (phase === 'done') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <FontAwesome6 name="circle-check" size={40} color={theme.secondary} />
          <ThemedText type="subtitle">Responses submitted</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            The recruiter has been notified that your interview responses are ready for review.
          </ThemedText>
          <Button title="Back to Applications" onPress={() => router.replace('/(candidate)/applications')} />
        </View>
      </SafeAreaView>
    );
  }

  if (!cameraPermission || !micPermission) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ActivityIndicator style={styles.loader} color={theme.primary} />
      </SafeAreaView>
    );
  }

  if (!cameraPermission.granted || !micPermission.granted) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <ThemedText type="subtitle">Camera & microphone access needed</ThemedText>
          <ThemedText themeColor="textSecondary">
            Skreenit needs your camera and microphone to record your interview responses.
          </ThemedText>
          <Button
            title="Grant access"
            onPress={async () => {
              await requestCameraPermission();
              await requestMicPermission();
            }}
          />
        </View>
      </SafeAreaView>
    );
  }

  const startRecording = async () => {
    if (!cameraRef.current) return;
    setState('recording');
    try {
      const video = await cameraRef.current.recordAsync({ maxDuration: MAX_DURATION_SECONDS });
      if (video?.uri) {
        setVideoUri(video.uri);
        setState('recorded');
      } else {
        setState('idle');
      }
    } catch {
      setState('idle');
    }
  };

  const stopRecording = () => cameraRef.current?.stopRecording();

  const retake = () => {
    setVideoUri(null);
    setState('idle');
    setUploadError(null);
  };

  const confirmAndUpload = async () => {
    if (!videoUri) return;
    setState('uploading');
    setUploadError(null);
    try {
      const uploadRes = await uploadIntroVideoResponse(
        { uri: videoUri, name: `interview_q${questionIndex}.mp4`, type: 'video/mp4' },
        questionIndex,
        question,
        applicationId,
      );
      await saveInterviewResponse(applicationId, {
        question,
        questionIndex,
        videoUrl: uploadRes.data.url,
        videoPath: uploadRes.data.path,
      });

      if (isLastQuestion) {
        await finishInterview(applicationId);
        setPhase('done');
      } else {
        setQuestionIndex((i) => i + 1);
        setVideoUri(null);
        setState('idle');
      }
    } catch {
      setUploadError('Upload failed. Please check your connection and try again.');
      setState('recorded');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ThemedView style={styles.container}>
        <View style={styles.questionHeader}>
          <ThemedText type="small" themeColor="textSecondary">
            Question {questionIndex + 1} of {questions.length}
          </ThemedText>
          <ThemedText type="smallBold">{question}</ThemedText>
        </View>

        <View style={[styles.videoBox, { borderColor: theme.border }]}>
          {videoUri ? (
            <VideoView player={player} style={styles.video} nativeControls />
          ) : (
            <CameraView ref={cameraRef} style={styles.video} facing="front" mode="video" />
          )}
        </View>

        {uploadError ? (
          <ThemedText type="small" style={{ color: theme.danger }}>
            {uploadError}
          </ThemedText>
        ) : null}

        {state === 'idle' || state === 'recording' ? (
          <Pressable
            onPress={state === 'recording' ? stopRecording : startRecording}
            style={[styles.recordButton, { borderColor: theme.danger }]}
          >
            <View style={[styles.recordDot, { backgroundColor: theme.danger }, state === 'recording' && styles.recordDotActive]} />
            <ThemedText type="smallBold">{state === 'recording' ? 'Stop recording' : 'Start recording'}</ThemedText>
          </Pressable>
        ) : (
          <View style={styles.actionRow}>
            <Button title="Retake" variant="secondary" onPress={retake} disabled={state === 'uploading'} style={{ flex: 1 }} />
            <Button
              title={isLastQuestion ? 'Submit & Finish' : 'Use this take'}
              loading={state === 'uploading'}
              onPress={confirmAndUpload}
              style={{ flex: 1 }}
            />
          </View>
        )}
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  loader: { marginTop: 40 },
  content: { padding: 20, gap: 14 },
  card: { borderWidth: 1, borderRadius: Radius.lg, padding: 16, gap: 8 },
  container: { flex: 1, padding: 20, gap: 14 },
  questionHeader: { gap: 4 },
  videoBox: { flex: 1, borderWidth: 1, borderRadius: Radius.md, overflow: 'hidden', backgroundColor: '#000' },
  video: { flex: 1 },
  recordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 2,
    borderRadius: Radius.md,
    paddingVertical: 14,
  },
  recordDot: { width: 12, height: 12, borderRadius: 6 },
  recordDotActive: { borderRadius: 3 },
  actionRow: { flexDirection: 'row', gap: 12 },
});
