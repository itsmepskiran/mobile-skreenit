import { FontAwesome6 } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
    generateInterviewQuestions,
    saveIntroResponse,
    uploadIntroVideoResponse,
    type GeneratedQuestions,
} from '@/lib/api/applicant';

const MAX_DURATION_SECONDS = 60;

interface StepVideoIntroProps {
  resumeUrl: string | null;
  existingIntroVideoUrl: string | null;
  onRecorded: () => void;
}

type RecordingState = 'idle' | 'recording' | 'recorded' | 'uploading';

export function StepVideoIntro({ resumeUrl, existingIntroVideoUrl, onRecorded }: StepVideoIntroProps) {
  const theme = useTheme();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();

  const [rerecording, setRerecording] = useState(false);
  const [questions, setQuestions] = useState<GeneratedQuestions | null>(null);
  const [questionsError, setQuestionsError] = useState<string | null>(null);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  const [questionIndex, setQuestionIndex] = useState(0);
  const [state, setState] = useState<RecordingState>('idle');
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const cameraRef = useRef<CameraView>(null);

  // Enter the recording flow whenever there's no saved intro video yet, or the
  // user explicitly asked to redo it — otherwise just show the completed state.
  const started = rerecording || !existingIntroVideoUrl;

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!started || questions || loadingQuestions) return;
    if (!resumeUrl) {
      setQuestionsError('Upload a resume in the Personal step first — it\'s used to generate your interview questions.');
      return;
    }
    setLoadingQuestions(true);
    setQuestionsError(null);
    generateInterviewQuestions(resumeUrl)
      .then((res) => setQuestions(res.data))
      .catch(() => setQuestionsError('Could not generate interview questions. Please try again.'))
      .finally(() => setLoadingQuestions(false));
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [started, questions, loadingQuestions, resumeUrl]);

  const player = useVideoPlayer(videoUri ?? null, (p) => {
    p.loop = false;
  });

  if (!started) {
    return (
      <IntroCompleted
        videoUrl={existingIntroVideoUrl!}
        onRerecord={() => {
          setRerecording(true);
          setQuestions(null);
          setQuestionIndex(0);
          setState('idle');
          setVideoUri(null);
          setDone(false);
        }}
      />
    );
  }

  if (questionsError || loadingQuestions || !questions) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText type="subtitle">Video Introduction</ThemedText>
        <ThemedText themeColor="textSecondary">
          You&apos;ll be asked 3 personalized questions based on your resume. The first question is always a 30-second
          introduction about yourself.
        </ThemedText>
        {loadingQuestions ? <ActivityIndicator color={theme.primary} style={{ marginTop: 12 }} /> : null}
        {questionsError ? (
          <ThemedText type="small" style={{ color: theme.danger }}>
            {questionsError}
          </ThemedText>
        ) : null}
      </ThemedView>
    );
  }

  if (!cameraPermission || !micPermission) {
    return <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} />;
  }

  if (!cameraPermission.granted || !micPermission.granted) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText type="subtitle">Camera & microphone access needed</ThemedText>
        <ThemedText themeColor="textSecondary">
          Skreenit needs your camera and microphone to record your video introduction.
        </ThemedText>
        <Button
          title="Grant access"
          onPress={async () => {
            await requestCameraPermission();
            await requestMicPermission();
          }}
        />
      </ThemedView>
    );
  }

  if (done) {
    return (
      <ThemedView style={styles.container}>
        <FontAwesome6 name="circle-check" size={40} color={theme.secondary} />
        <ThemedText type="subtitle">Video introduction complete</ThemedText>
        <ThemedText themeColor="textSecondary">
          Your responses have been saved. Recruiters reviewing your profile will be able to watch them.
        </ThemedText>
      </ThemedView>
    );
  }

  const question = questions.questions[questionIndex];
  const isLastQuestion = questionIndex === questions.questions.length - 1;

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
        question,
      );
      await saveIntroResponse({
        questionIndex,
        question,
        videoUrl: uploadRes.data.url,
        videoPath: uploadRes.data.path,
      });

      if (isLastQuestion) {
        setDone(true);
        onRecorded();
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
    <ThemedView style={styles.container}>
      <View style={styles.questionHeader}>
        <ThemedText type="small" themeColor="textSecondary">
          Question {questionIndex + 1} of {questions.questions.length}
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
            title={isLastQuestion ? 'Finish' : 'Use this take'}
            loading={state === 'uploading'}
            onPress={confirmAndUpload}
            style={{ flex: 1 }}
          />
        </View>
      )}
    </ThemedView>
  );
}

function IntroCompleted({ videoUrl, onRerecord }: { videoUrl: string; onRerecord: () => void }) {
  const theme = useTheme();
  const player = useVideoPlayer(videoUrl, (p) => {
    p.loop = false;
  });

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="subtitle">Video Introduction</ThemedText>
      <View style={[styles.videoBox, { borderColor: theme.border }]}>
        <VideoView player={player} style={styles.video} nativeControls />
      </View>
      <Button title="Re-record introduction" variant="secondary" onPress={onRerecord} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { gap: 14 },
  questionHeader: { gap: 4 },
  videoBox: {
    aspectRatio: 3 / 4,
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
