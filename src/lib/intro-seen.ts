import * as SecureStore from 'expo-secure-store';

// Whether the first-launch intro slides have been shown on this device.
const KEY = 'skreenit.intro_seen';

export async function hasSeenIntro(): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(KEY)) === '1';
  } catch {
    return true; // storage trouble — never trap the user behind the slides
  }
}

export async function markIntroSeen(): Promise<void> {
  try {
    await SecureStore.setItemAsync(KEY, '1');
  } catch {
    /* ignore */
  }
}
