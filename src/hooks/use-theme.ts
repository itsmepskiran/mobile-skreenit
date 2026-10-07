/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { createContext, useContext } from 'react';

import { useOnGradient } from '@/components/on-gradient';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// The web login pages have no dark mode — they always render the light brand
// palette. ThemeOverrideProvider lets a subtree (the auth screens) force that
// same fixed appearance regardless of the device's system theme.
const ThemeOverrideContext = createContext<'light' | 'dark' | null>(null);
export const ThemeOverrideProvider = ThemeOverrideContext.Provider;

// Palette ignoring the brand-gradient context (for inputs etc. that always sit on a light surface).
export function useBaseTheme() {
  const override = useContext(ThemeOverrideContext);
  const scheme = useColorScheme();
  const theme = override ?? (scheme === 'unspecified' ? 'light' : scheme);

  return Colors[theme];
}

// Over the brand gradient (outside any card) text/border tokens flip to white-ish so bare content stays legible.
export function useTheme() {
  const base = useBaseTheme();
  const onGradient = useOnGradient();
  if (!onGradient) return base;
  return { ...base, text: '#fffffe', textSecondary: 'rgba(255,255,255,0.8)', border: 'rgba(255,255,255,0.35)', primary: '#d97706', primaryDark: '#b45309', primaryLight: '#f59e0b' } as unknown as typeof base;
}
