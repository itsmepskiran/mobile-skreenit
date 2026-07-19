import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

const configuredBaseUrl: string = Constants.expoConfig?.extra?.apiBaseUrl ?? 'http://localhost:8080';

function getExpoDevHost(): string | null {
  const hostUri = Constants.expoConfig?.hostUri;
  if (!hostUri) return null;

  const host = hostUri.split(':')[0];
  if (!host || host === 'localhost' || host === '127.0.0.1') return null;
  return host;
}

function resolveApiBaseUrl(url: string): string {
  const loopbackHostPattern = /localhost|127\.0\.0\.1/;
  if (!loopbackHostPattern.test(url)) return url;

  // Android emulator maps host-loopback to 10.0.2.2; physical devices need the
  // dev machine's LAN host so they can reach local services (for example, API on :8080).
  if (Platform.OS === 'android' && !Device.isDevice) {
    return url.replace(loopbackHostPattern, '10.0.2.2');
  }

  const expoDevHost = getExpoDevHost();
  if (expoDevHost) {
    return url.replace(loopbackHostPattern, expoDevHost);
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
