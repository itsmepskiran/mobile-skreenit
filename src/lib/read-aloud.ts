import * as FileSystem from 'expo-file-system/legacy';
import * as Speech from 'expo-speech';
import { createVideoPlayer, type VideoPlayer } from 'expo-video';
import { Platform } from 'react-native';

import { getSessionController } from '@/lib/auth/session-controller';
import { API_V1 } from '@/lib/config';

// Reads text aloud: a natural Google voice from the backend (GET /speech, MP3) when it is set up,
// otherwise the phone's own voice (expo-speech). Mirrors sql-skreenit's assets/js/read-aloud.js.
// The MP3 plays through expo-video's player, which is already in the app, so no new native module.

let naturalVoiceOff = false; // the backend said the natural voice isn't set up; stop asking
let player: VideoPlayer | null = null;
let turn = 0;

function fileNameFor(text: string): string {
  let hash = 5381;
  for (let i = 0; i < text.length; i++) hash = ((hash * 33) ^ text.charCodeAt(i)) >>> 0;
  return `tts_${hash.toString(36)}_${text.length}.mp3`;
}

export function stopReading() {
  turn++;
  if (player) {
    player.release();
    player = null;
  }
  Speech.stop().catch(() => {});
}

async function naturalVoiceFile(text: string): Promise<string | null> {
  const token = getSessionController().getTokens()?.accessToken;
  if (naturalVoiceOff || !token || Platform.OS === 'web' || text.length > 600 || !FileSystem.cacheDirectory) return null;

  const localUri = `${FileSystem.cacheDirectory}${fileNameFor(text)}`;
  if ((await FileSystem.getInfoAsync(localUri)).exists) return localUri;

  const result = await FileSystem.downloadAsync(`${API_V1}/speech?text=${encodeURIComponent(text)}`, localUri, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (result.status === 200) return localUri;
  if (result.status === 503) naturalVoiceOff = true;
  await FileSystem.deleteAsync(localUri, { idempotent: true }).catch(() => {});
  return null;
}

export async function readAloud(rawText: string) {
  stopReading();
  const myTurn = turn;
  const text = rawText.replace(/\s+/g, ' ').trim();
  if (!text) return;

  try {
    const uri = await naturalVoiceFile(text);
    if (myTurn !== turn) return;
    if (uri) {
      player = createVideoPlayer(uri);
      player.play();
      return;
    }
  } catch {
    if (myTurn !== turn) return;
  }
  Speech.speak(text, { language: 'en-IN', rate: 0.95 });
}
