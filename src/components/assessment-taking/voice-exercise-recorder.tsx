import { FontAwesome6 } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as Speech from 'expo-speech';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { uploadIntroVideoResponse } from '@/lib/api/applicant';

const MAX_DURATION_SECONDS = 90;

interface VoiceExerciseRecorderProps {
  questionIndex: number;
  question: string;
  /** When set, the sentence must be played via TTS before recording unlocks — mirrors
   * web's "1. Listen -> 2. Repeat" gate for the repeat_sentence exercise type. */
  ttsText?: string;
  onRecorded: (recordingUrl: string) => void;
}

type RecordingState = 'idle' | 'recording' | 'recorded' | 'uploading' | 'done';

// A focused, embeddable sibling of video-intro-assessment.tsx's recorder — reused
// here for the 6 voice-based exercise types (vocabulary/read-aloud/repeat-sentence/
// verbal-QA/topic-speaking/scenario-response) instead of building separate
// audio-only capture: expo-camera's recordAsync already captures audio+video
// together, and this reuses the same proven permission/record/upload pipeline
// rather than adding new recording infra for no real benefit (the video track is
// discarded server-side — the audio is what's graded).
export function VoiceExerciseRecorder({ questionIndex, question, ttsText, onRecorded }: VoiceExerciseRecorderProps) {
  const theme = useTheme();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [played, setPlayed] = useState(!ttsText);
  const [playing, setPlaying] = useState(false);
  const [state, setState] = useState<RecordingState>('idle');
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const cameraRef = useRef<CameraView>(null);

  const playSentence = () => {
    if (!ttsText) return;
    setPlaying(true);
    Speech.speak(ttsText, {
      rate: 0.85,
      onDone: () => {
        setPlaying(false);
        setPlayed(true);
      },
      onStopped: () => setPlaying(false),
      onError: () => setPlaying(false),
    });
  };

  if (!cameraPermission || !micPermission) {
    return <ActivityIndicator color={theme.primary} style={{ marginVertical: 16 }} />;
  }

  if (!cameraPermission.granted || !micPermission.granted) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText type="small" themeColor="textSecondary">
          Camera and microphone access is needed to record your response.
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

  if (state === 'done') {
    return (
      <ThemedView style={styles.container}>
        <FontAwesome6 name="circle-check" size={28} color={theme.secondary} />
        <ThemedText type="small" themeColor="textSecondary">
          Response recorded.
        </ThemedText>
      </ThemedView>
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
      const res = await uploadIntroVideoResponse(
        { uri: videoUri, name: `voice_q${questionIndex}.mp4`, type: 'video/mp4' },
        questionIndex,
        question,
      );
      onRecorded(res.data.url);
      setState('done');
    } catch {
      setUploadError('Upload failed. Please check your connection and try again.');
      setState('recorded');
    }
  };

  return (
    <ThemedView style={styles.container}>
      {ttsText ? (
        <View style={styles.ttsRow}>
          <View style={[styles.ttsStep, played && styles.ttsStepDone]}>
            <FontAwesome6 name="headphones" size={12} color={played ? theme.secondary : theme.textSecondary} />
            <ThemedText type="small" themeColor={played ? 'secondary' : 'textSecondary'}>
              1. Listen
            </ThemedText>
          </View>
          <FontAwesome6 name="arrow-right" size={11} color={theme.textSecondary} />
          <View style={[styles.ttsStep, played && styles.ttsStepDone]}>
            <FontAwesome6 name="microphone" size={12} color={played ? theme.primary : theme.textSecondary} />
            <ThemedText type="small" themeColor={played ? 'primary' : 'textSecondary'}>
              2. Repeat
            </ThemedText>
          </View>
        </View>
      ) : null}

      {ttsText ? (
        <Pressable
          style={[styles.playButton, { borderColor: theme.border }]}
          onPress={playSentence}
          disabled={playing}
        >
          {playing ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <FontAwesome6 name="play" size={12} color={theme.primary} />
          )}
          <ThemedText type="small" themeColor="primary">
            {played ? 'Play again' : 'Play Sentence'}
          </ThemedText>
        </Pressable>
      ) : null}

      {!played ? null : (
        <>
          <View style={[styles.videoBox, { borderColor: theme.border }]}>
            {videoUri ? (
              <ThemedView style={[styles.videoPreview, { backgroundColor: '#000' }]}>
                <FontAwesome6 name="circle-play" size={28} color="#fff" />
              </ThemedView>
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
                title="Use this take"
                loading={state === 'uploading'}
                onPress={confirmAndUpload}
                style={{ flex: 1 }}
              />
            </View>
          )}
        </>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  ttsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' },
  ttsStep: { flexDirection: 'row', alignItems: 'center', gap: 6, opacity: 0.6 },
  ttsStepDone: { opacity: 1 },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  videoBox: {
    aspectRatio: 3 / 4,
    maxHeight: 260,
    borderWidth: 1,
    borderRadius: Radius.md,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  video: { flex: 1 },
  videoPreview: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  recordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 2,
    borderRadius: Radius.md,
    paddingVertical: 12,
  },
  recordDot: { width: 12, height: 12, borderRadius: 6 },
  recordDotActive: { borderRadius: 3 },
  actionRow: { flexDirection: 'row', gap: 12 },
});
