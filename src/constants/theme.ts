/**
 * Brand palette and type scale, ported from sql-skreenit/assets/assets/css/core.css
 * so the mobile app reads as the same product as the web app.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1F2937',
    textSecondary: '#6B7280',
    background: '#F8FAFC',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#EEF2FF',
    primary: '#4F46E5',
    primaryDark: '#4338CA',
    primaryLight: '#6366F1',
    secondary: '#10B981',
    accent: '#F59E0B',
    danger: '#E53E3E',
    border: '#E2E8F0',
  },
  dark: {
    text: '#F8FAFC',
    textSecondary: '#9CA3AF',
    background: '#111827',
    backgroundElement: '#1F2937',
    backgroundSelected: '#312E81',
    primary: '#6366F1',
    primaryDark: '#4F46E5',
    primaryLight: '#818CF8',
    secondary: '#34D399',
    accent: '#FBBF24',
    danger: '#F87171',
    border: '#374151',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

// Matches core.css: body font-family 'Inter', headings font-family 'Poppins'.
export const Fonts = {
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemiBold: 'Inter_600SemiBold',
  sansBold: 'Inter_700Bold',
  heading: 'Poppins_600SemiBold',
  mono: 'ui-monospace',
} as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

// Matches core.css --radius-* tokens.
export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
