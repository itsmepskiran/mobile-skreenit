import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'skreenit_access_token';
const REFRESH_TOKEN_KEY = 'skreenit_refresh_token';

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
}

// Both platforms currently keep every session alive indefinitely via rolling
// refresh-token rotation, so "remember me" unchecked means session-only
// instead: tokens still work for the current app run (held in the zustand
// store in memory), but nothing is written to SecureStore, so a cold start
// after force-quitting finds nothing to hydrate from and requires re-login.
export async function saveTokens(tokens: StoredTokens, rememberMe = true): Promise<void> {
  if (!rememberMe) {
    // Also clears any previously-remembered tokens, so a stale persisted
    // session can't survive under a new "don't remember me" choice.
    await clearTokens();
    return;
  }
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken),
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken),
  ]);
}

export async function loadTokens(): Promise<StoredTokens | null> {
  const [accessToken, refreshToken] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
  ]);
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}

export async function clearTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
  ]);
}
