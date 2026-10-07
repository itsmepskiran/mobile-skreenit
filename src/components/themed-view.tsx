import { StyleSheet, type ViewProps } from 'react-native';
import { View , paintsSurface } from '@/components/scoped';

import { CardScope, useOnGradient } from '@/components/on-gradient';
import { ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  type?: ThemeColor;
};

export function ThemedView({ style, lightColor, darkColor, type, ...otherProps }: ThemedViewProps) {
  const theme = useTheme();
  const onGradient = useOnGradient();
  const flat = StyleSheet.flatten(style) ?? {};
  // Bordered, rounded boxes are "cards": give them a raised white surface + soft shadow rather than
  // letting them melt into the page background.
  const isCard = !type && flat.backgroundColor === undefined && !!flat.borderWidth && Number(flat.borderRadius ?? 0) >= 12;
  const base = isCard
    ? {
        backgroundColor: theme.backgroundElement,
        shadowColor: '#1e1b4b',
        shadowOpacity: 0.08,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 3 },
        elevation: 3,
      }
    : { backgroundColor: onGradient && !type ? 'transparent' : theme[type ?? 'background'] };

  const view = <View style={[base, style]} {...otherProps} />;
  return isCard || !!type || paintsSurface(style) ? <CardScope>{view}</CardScope> : view;
}
