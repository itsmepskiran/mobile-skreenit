import type { ConfigContext, ExpoConfig } from 'expo/config';

// Set per-environment via eas.json build profiles, or a local .env when running `expo start`.
const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:8080';

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
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    apiBaseUrl: API_BASE_URL,
  },
});
