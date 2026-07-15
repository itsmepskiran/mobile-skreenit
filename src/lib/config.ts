import Constants from 'expo-constants';
import { Platform } from 'react-native';

const configuredBaseUrl: string = Constants.expoConfig?.extra?.apiBaseUrl ?? 'http://localhost:8080';

// Inside the Android emulator, "localhost"/"127.0.0.1" refers to the emulator
// itself, not the host machine — Android's documented workaround is 10.0.2.2.
// (Physical Android devices need the host's real LAN IP instead; that's a
// separate manual override via API_BASE_URL, not handled here.)
function resolveApiBaseUrl(url: string): string {
  if (Platform.OS === 'android' && /localhost|127\.0\.0\.1/.test(url)) {
    return url.replace(/localhost|127\.0\.0\.1/, '10.0.2.2');
  }
  return url;
}

export const API_BASE_URL = resolveApiBaseUrl(configuredBaseUrl);

// The backend mounts every router under this prefix (see mac-skreenit/main.py).
export const API_V1 = `${API_BASE_URL}/api/v1`;

// Matches CONFIG.PAGES.JOB_DETAILS in sql-skreenit/assets/assets/js/config.js
// (production branch) — the public web page a job's QR code should resolve
// to. Always the absolute production URL since QR codes get scanned by
// devices off this dev machine's network, unlike API_BASE_URL above.
export const JOB_DETAILS_URL = 'https://dashboard.skreenit.com/job-details.html';

// Passed as `email_redirect_to` to the backend so confirmation/reset emails
// deep-link straight back into this app instead of the web login pages.
export const DEEP_LINK_CONFIRM_EMAIL = 'skreenit://confirm-email';
export const DEEP_LINK_RESET_PASSWORD = 'skreenit://reset-password';
