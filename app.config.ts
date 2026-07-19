import type { ConfigContext, ExpoConfig } from 'expo/config';

// Set per-environment via eas.json build profiles, or a local .env when running `expo start`.
const API_BASE_URL = process.env.API_BASE_URL ?? 'https://api.skreenit.com';

// Apple's free "Personal Team" signing (no paid Developer Program membership)
// cannot provision the Push Notifications capability at all — attempting to
// build with it present fails signing outright. Push isn't functional yet
// anyway (no EAS project ID configured), so skip it for local personal-team
// iOS builds via SKIP_IOS_PUSH=1; Android and EAS/production builds are
// unaffected since this only strips the plugin, not the capability itself.
const skipIOSPush = process.env.SKIP_IOS_PUSH === '1';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'mobile-skreenit',
  slug: 'mobile-skreenit',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'skreenit',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: 'com.skreenit.app',
    // ◄ ADDED THIS INFO PLIST BLOCK FOR THE IPHONE HTTP/TAILSCALE ERROR
    infoPlist: {
      NSAppTransportSecurity: {
        NSAllowsArbitraryLoads: true,
      },
    },
  },
  android: {
    package: 'com.skreenit.app',
    usesCleartextTraffic: true, // ◄ ADDED TO ALLOW HTTP FOR ANDROID AS WELL
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
        microphonePermission: 'Allow Skreenit to access your microphone to record your video introduction.',
      },
    ],
    'expo-image',
    'expo-status-bar',
    'expo-web-browser',
    'expo-video',
    ...(skipIOSPush ? [] : [['expo-notifications', { color: '#4F46E5' }] as [string, object]]),
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    apiBaseUrl: API_BASE_URL,
    eas: {
      projectId: '3b5ea64f-e099-43c3-a9b2-3ce8603602a3',
    },
  },
  owner: 'itsmepskiran',
});
