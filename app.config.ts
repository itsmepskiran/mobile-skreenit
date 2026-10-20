import { withEntitlementsPlist } from 'expo/config-plugins';
import type { ConfigContext, ExpoConfig } from 'expo/config';

// Set per-environment via eas.json build profiles, or a local .env when running `expo start`.
const API_BASE_URL = process.env.API_BASE_URL ?? 'https://api.skreenit.com';

// Apple's free "Personal Team" signing (no paid Developer Program membership)
// cannot provision the Push Notifications capability at all — attempting to
// build with it present fails signing outright. Push isn't functional yet
// anyway, so skip it for local personal-team iOS builds via SKIP_IOS_PUSH=1.
// This must ONLY affect the entitlements (see withoutPushEntitlement below),
// never the `plugins` array — the plugins array feeds the fingerprint-based
// runtimeVersion, and SKIP_IOS_PUSH is set in the local .env but not on EAS
// build servers, so a plugins-array diff here caused local/EAS fingerprint
// mismatches that failed every Android production build.
const skipIOSPush = process.env.SKIP_IOS_PUSH === '1';

// Google sign-in client IDs from Google Cloud Console (APIs & Services > Credentials). Kept as
// constants, not env vars, because the plugin entry below feeds the fingerprint runtimeVersion
// (see the SKIP_IOS_PUSH note). Until they are filled in, the Google button stays hidden.
// The backend's GOOGLE_CLIENT_IDS must include the Web client ID.
const GOOGLE_WEB_CLIENT_ID: string = '';
const GOOGLE_IOS_CLIENT_ID: string = '';
// The iOS client ID reversed, e.g. com.googleusercontent.apps.1234-abcd.
const GOOGLE_IOS_URL_SCHEME = GOOGLE_IOS_CLIENT_ID
  ? GOOGLE_IOS_CLIENT_ID.split('.').reverse().join('.')
  : 'com.googleusercontent.apps.not-configured';

// @expo/prebuild-config auto-discovers expo-notifications/app.plugin.js via
// withVersionedExpoSDKPlugins → createLegacyPlugin → withStaticPlugin, which
// fires regardless of what's in the plugins array. aps-environment ends up in
// the entitlements even when SKIP_IOS_PUSH=1 removes the explicit plugin.
// Applying this at the export level ensures it runs last and strips the
// entitlement so Personal Team local iOS builds can sign successfully.
// Sign in with Apple is a paid-membership capability too, so it goes the same way.
function withoutPushEntitlement(appConfig: ExpoConfig): ExpoConfig {
  return withEntitlementsPlist(appConfig, (c) => {
    delete c.modResults['aps-environment'];
    delete c.modResults['com.apple.developer.applesignin'];
    return c;
  });
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const appConfig: ExpoConfig = {
    ...config,
    name: 'Skreenit',
    slug: 'mobile-skreenit',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'skreenit',
    userInterfaceStyle: 'automatic',
    ios: {
      bundleIdentifier: 'com.skreenit.app',
      usesAppleSignIn: true,
    },
    android: {
      package: 'com.skreenit.app',
      adaptiveIcon: {
        backgroundColor: '#F8FAFC',
        foregroundImage: './assets/images/android-icon-foreground.png',
        backgroundImage: './assets/images/android-icon-background.png',
        monochromeImage: './assets/images/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
    },
    web: {
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      'expo-secure-store',
      'expo-font',
      'expo-sharing',
      '@react-native-community/datetimepicker',
      [
        'expo-splash-screen',
        {
          backgroundColor: '#4F46E5',
          image: './assets/images/splash-icon.png',
          imageWidth: 160,
        },
      ],
      [
        'expo-image-picker',
        {
          photosPermission: 'Allow Skreenit to access your photos to set a profile picture.',
        },
      ],
      [
        'expo-camera',
        {
          cameraPermission: 'Allow Skreenit to access your camera to record your video introduction.',
          microphonePermission:
            'Allow Skreenit to access your microphone to record your video introduction.',
        },
      ],
      'expo-image',
      'expo-status-bar',
      'expo-web-browser',
      'expo-video',
      ['expo-notifications', { color: '#4F46E5' }],
      'expo-apple-authentication',
      ['@react-native-google-signin/google-signin', { iosUrlScheme: GOOGLE_IOS_URL_SCHEME }],
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      apiBaseUrl: API_BASE_URL,
      googleWebClientId: GOOGLE_WEB_CLIENT_ID,
      googleIosClientId: GOOGLE_IOS_CLIENT_ID,
      eas: {
        projectId: '3b5ea64f-e099-43c3-a9b2-3ce8603602a3',
      },
    },
    owner: 'itsmepskiran',
    // 'fingerprint' auto-detects when a change actually touches native code
    // (a new native module, permission, config plugin, etc.) vs. a pure JS/TS
    // change — only installs whose fingerprint matches a given OTA update's
    // build will ever receive it, so a native change can never be
    // misapplied as a JS-only patch.
    runtimeVersion: {
      policy: 'fingerprint',
    },
    updates: {
      url: 'https://u.expo.dev/3b5ea64f-e099-43c3-a9b2-3ce8603602a3',
    },
  };

  return skipIOSPush ? withoutPushEntitlement(appConfig) : appConfig;
};
