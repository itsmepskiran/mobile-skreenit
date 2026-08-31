import * as SecureStore from 'expo-secure-store';

const ATS_TOKEN_KEY = 'skreenit_ats_access_token';

// The ATS employer console issues a single bearer token with no refresh token
// (routers/ats.py's /ats/login — an 8-hour session, same as the admin
// console). Distinct SecureStore key from the candidate/recruiter tokens in
// token-storage.ts so the two auth domains never collide.
export async function saveAtsToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(ATS_TOKEN_KEY, token);
}

export async function loadAtsToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ATS_TOKEN_KEY);
}

export async function clearAtsToken(): Promise<void> {
  await SecureStore.deleteItemAsync(ATS_TOKEN_KEY);
}
