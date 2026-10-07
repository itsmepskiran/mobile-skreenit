import {
  Pressable as RNPressable,
  StyleSheet,
  TextInput as RNTextInput,
  View as RNView,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import { forwardRef } from 'react';

import { FontAwesome6 as VectorFontAwesome6 } from '@expo/vector-icons';

import { CardScope, useOnGradient } from '@/components/on-gradient';
import { useBaseTheme } from '@/hooks/use-theme';

// Drop-in View / Pressable / TextInput that know about the brand-gradient background: anything that
// paints its own opaque surface (cards, chips, sheets, buttons) switches its children back to normal
// dark-on-light text, while bare containers stay transparent with white text on the gradient.
export function paintsSurface(style: StyleProp<ViewStyle>) {
  const bg = StyleSheet.flatten(style)?.backgroundColor;
  if (typeof bg !== 'string' || bg === 'transparent') return false;
  const m = bg.match(/^rgba?\(([^)]+)\)$/);
  if (m) {
    const parts = m[1].split(',').map((p) => p.trim());
    return parts.length === 4 ? Number(parts[3]) >= 0.6 : true;
  }
  return true;
}

export const View = forwardRef<RNView, ViewProps>(function View({ style, children, ...rest }, ref) {
  return (
    <RNView ref={ref} style={style} {...rest}>
      {paintsSurface(style) ? <CardScope>{children}</CardScope> : children}
    </RNView>
  );
});

export const Pressable = forwardRef<RNView, PressableProps>(function Pressable({ style, children, ...rest }, ref) {
  const probe = typeof style === 'function' ? style({ pressed: false, hovered: false } as never) : style;
  const surface = paintsSurface(probe as StyleProp<ViewStyle>);
  return (
    <RNPressable ref={ref} style={style} {...rest}>
      {typeof children === 'function'
        ? (state) => (surface ? <CardScope>{children(state)}</CardScope> : children(state))
        : surface
          ? <CardScope>{children}</CardScope>
          : children}
    </RNPressable>
  );
});

// Inputs always sit on a light surface so they read on the gradient (and in dark mode).
export const TextInput = forwardRef<RNTextInput, TextInputProps>(function TextInput({ style, ...rest }, ref) {
  const theme = useBaseTheme();
  return (
    <RNTextInput
      ref={ref}
      style={[{ backgroundColor: theme.backgroundElement }, style, { color: theme.text }]}
      {...rest}
      placeholderTextColor={theme.textSecondary}
    />
  );
});

// Brand-indigo icons would vanish on the gradient; swap them for a warm light tone outside cards.
const INDIGOS = new Set(['#4f46e5', '#6366f1', '#4338ca', '#7c3aed', '#6d28d9', '#818cf8']);
export function FontAwesome6(props: React.ComponentProps<typeof VectorFontAwesome6>) {
  const onGradient = useOnGradient();
  const color = typeof props.color === 'string' && onGradient && INDIGOS.has(props.color.toLowerCase()) ? '#fde68a' : props.color;
  return <VectorFontAwesome6 {...props} color={color} />;
}
