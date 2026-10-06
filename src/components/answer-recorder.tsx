import { FontAwesome6 } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { UploadFile } from '@/lib/api/client';

// Record one video answer to a question: camera preview, record / stop / retake, a countdown to
// the plan's per-answer limit (recording stops by itself when time is up), and submit. Used by
// Mock Interview Practice and Intro Video Analysis — the same flow as the web's
// assets/assets/js/answer-recorder.js. The parent decides what "submit" does with the file and
// remounts this (key={questionIndex}) for each new question.

type State = 'idle' | 'recording' | 'recorded' | 'uploading';

export function AnswerRecorder({
  progress,
  question,
  maxSeconds,
  submitLabel = 'Submit answer',
  onSubmit,
}: {
  progress: string;
  question: string;
  maxSeconds: number;
  submitLabel?: string;
  onSubmit: (file: UploadFile) => Promise<void>;
}) {
  const theme = useTheme();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [state, setState] = useState<State>('idle');
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(maxSeconds);
  const cameraRef = useRef<CameraView>(null);

  const player = useVideoPlayer(videoUri ?? null, (p) => {
    p.loop = false;
  });

  // Visible countdown while recording; the camera's own maxDuration is what actually stops it.
  useEffect(() => {
    if (state !== 'recording') return;
    const timer = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [state]);

  if (!cameraPermission || !micPermission) {
    return <ActivityIndicator style={styles.loader} color={theme.primary} />;
  }

  if (!cameraPermission.granted || !micPermission.granted) {
    return (
      <View style={styles.permission}>
        <ThemedText type="subtitle">Camera &amp; microphone access needed</ThemedText>
        <ThemedText themeColor="textSecondary">Skreenit needs your camera and microphone to record your answers.</ThemedText>
        <Button
          title="Grant access"
          onPress={async () => {
            await requestCameraPermission();
            await requestMicPermission();
          }}
        />
      </View>
    );
  }

  const startRecording = async () => {
    if (!cameraRef.current) return;
    setError(null);
    setSecondsLeft(maxSeconds);
    setState('recording');
    try {
      const video = await cameraRef.current.recordAsync({ maxDuration: maxSeconds });
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

  const retake = () => {
    setVideoUri(null);
    setError(null);
    setState('idle');
  };

  const submit = async () => {
    if (!videoUri) return;
    setState('uploading');
    setError(null);
    try {
      await onSubmit({ uri: videoUri, name: `answer_${Date.now()}.mp4`, type: 'video/mp4' });
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'Upload failed. Please check your connection and try again.');
      setState('recorded');
    }
  };

  const mm = String(Math.floor(secondsLeft / 60));
  const ss = String(secondsLeft % 60).padStart(2, '0');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="small" themeColor="textSecondary">
          {progress}
        </ThemedText>
        <ThemedText type="smallBold">{question}</ThemedText>
      </View>

      <View style={[styles.videoBox, { borderColor: theme.border }]}>
        {videoUri ? (
          <VideoView player={player} style={styles.video} nativeControls />
        ) : (
          <CameraView ref={cameraRef} style={styles.video} facing="front" mode="video" />
        )}
        {state === 'recording' ? (
          <View style={styles.timer}>
            <FontAwesome6 name="circle" size={8} color="#fff" />
            <ThemedText type="smallBold" style={{ color: '#fff' }}>
              {mm}:{ss}
            </ThemedText>
          </View>
        ) : null}
      </View>

      {error ? (
        <ThemedText type="small" style={{ color: theme.danger }}>
          {error}
        </ThemedText>
      ) : null}

      {state === 'idle' || state === 'recording' ? (
        <Pressable
          onPress={state === 'recording' ? () => cameraRef.current?.stopRecording() : startRecording}
          style={[styles.recordButton, { borderColor: theme.danger }]}
        >
          <View style={[styles.recordDot, { backgroundColor: theme.danger }, state === 'recording' && styles.recordDotActive]} />
          <ThemedText type="smallBold">{state === 'recording' ? 'Stop recording' : 'Start recording'}</ThemedText>
        </Pressable>
      ) : (
        <View style={styles.actionRow}>
          <Button title="Retake" variant="secondary" onPress={retake} disabled={state === 'uploading'} style={{ flex: 1 }} />
          <Button title={submitLabel} loading={state === 'uploading'} onPress={submit} style={{ flex: 1 }} />
        </View>
      )}
      <ThemedText type="small" themeColor="textSecondary">
        You have up to {Math.floor(maxSeconds / 60)}:{String(maxSeconds % 60).padStart(2, '0')} for this answer. Recording stops
        automatically when time is up.
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 14 },
  loader: { marginTop: 40 },
  permission: { padding: 20, gap: 14 },
  header: { gap: 4 },
  videoBox: { flex: 1, borderWidth: 1, borderRadius: Radius.md, overflow: 'hidden', backgroundColor: '#000' },
  video: { flex: 1 },
  timer: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(220,38,38,0.85)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
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
