import { FontAwesome6 } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { useVideoPlayer, VideoView } from 'expo-video';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/lib/api/client';
import { saveIntroResponse, uploadIntroVideoResponse } from '@/lib/api/applicant';
import { getVideoIntroQuestions, type VideoIntroQuestion } from '@/lib/api/assessment-taking';

const MAX_DURATION_SECONDS = 60;

type RecordingState = 'idle' | 'recording' | 'recorded' | 'uploading';

// The web's "Introduction Test" free assessment (gen_video_intro) bypasses the
// generic section/exercise engine entirely — a separate question source
// (video-intro-questions) and no assessment_sessions row gets created, so
// there's no results screen to navigate to afterward, matching web parity.
export function VideoIntroAssessment() {
  const theme = useTheme();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();

  const [questions, setQuestions] = useState<VideoIntroQuestion[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [state, setState] = useState<RecordingState>('idle');
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    getVideoIntroQuestions()
      .then((res) => setQuestions(res.data.questions))
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : 'Could not load questions. Please try again.'));
  }, []);

  const player = useVideoPlayer(videoUri ?? null, (p) => {
    p.loop = false;
  });

  if (loadError) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerBlock}>
          <FontAwesome6 name="triangle-exclamation" size={32} color={theme.danger} />
          <ThemedText type="small" style={{ color: theme.danger, textAlign: 'center' }}>
            {loadError}
          </ThemedText>
          <Button title="Go back" variant="secondary" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  if (!questions) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ActivityIndicator style={{ marginTop: 60 }} color={theme.primary} />
      </SafeAreaView>
    );
  }

  if (!cameraPermission || !micPermission) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ActivityIndicator style={{ marginTop: 60 }} color={theme.primary} />
      </SafeAreaView>
    );
  }

  if (!cameraPermission.granted || !micPermission.granted) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerBlock}>
          <ThemedText type="subtitle" style={{ textAlign: 'center' }}>
            Camera &amp; microphone access needed
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={{ textAlign: 'center' }}>
            Skreenit needs your camera and microphone to record your video introduction.
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

  if (done) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerBlock}>
          <FontAwesome6 name="circle-check" size={40} color={theme.secondary} />
          <ThemedText type="subtitle">Introduction complete</ThemedText>
          <ThemedText themeColor="textSecondary" style={{ textAlign: 'center' }}>
            Your responses have been saved. Recruiters reviewing your profile will be able to watch them.
          </ThemedText>
          <Button title="Back to Assessments" onPress={() => router.replace('/(candidate)/assessments')} />
        </View>
      </SafeAreaView>
    );
  }

  const question = questions[questionIndex];
  const isLastQuestion = questionIndex === questions.length - 1;

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

  const stopRecording = () => {
    cameraRef.current?.stopRecording();
  };

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
        { uri: videoUri, name: `intro_q${questionIndex}.mp4`, type: 'video/mp4' },
        questionIndex,
        question.question,
      );
      // Web's version of this flow uploads the clip but never saves this
      // metadata, orphaning it in storage — save it here so it's actually
      // retrievable (also updates candidate_profiles.intro_video_url for Q0).
      await saveIntroResponse({
        questionIndex,
        question: question.question,
        videoUrl: uploadRes.data.url,
        videoPath: uploadRes.data.path,
      });

      if (isLastQuestion) {
        setDone(true);
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
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <View style={styles.questionHeader}>
          <ThemedText type="small" themeColor="textSecondary">
            Question {questionIndex + 1} of {questions.length}
          </ThemedText>
          <ThemedText type="smallBold">{question.question}</ThemedText>
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
              title={isLastQuestion ? 'Finish' : 'Use this take'}
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
  container: { flex: 1, padding: 20, gap: 14 },
  centerBlock: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 30 },
  questionHeader: { gap: 4 },
  videoBox: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Radius.md,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
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
