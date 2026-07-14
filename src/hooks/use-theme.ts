/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { createContext, useContext } from 'react';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// The web login pages have no dark mode — they always render the light brand
// palette. ThemeOverrideProvider lets a subtree (the auth screens) force that
// same fixed appearance regardless of the device's system theme.
const ThemeOverrideContext = createContext<'light' | 'dark' | null>(null);
export const ThemeOverrideProvider = ThemeOverrideContext.Provider;

export function useTheme() {
  const override = useContext(ThemeOverrideContext);
  const scheme = useColorScheme();
  const theme = override ?? (scheme === 'unspecified' ? 'light' : scheme);

  return Colors[theme];
}
