import { FontAwesome6 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Pressable, StyleSheet, View, type PressableProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface ButtonProps extends PressableProps {
  title: string;
  loading?: boolean;
  variant?: 'primary' | 'secondary';
  icon?: React.ComponentProps<typeof FontAwesome6>['name'];
}

export function Button({ title, loading, variant = 'primary', icon, disabled, style, ...rest }: ButtonProps) {
  const theme = useTheme();
  const isSecondary = variant === 'secondary';
  const textColor = isSecondary ? theme.primary : '#ffffff';

  const content = loading ? (
    <ActivityIndicator color={textColor} />
  ) : (
    <View style={styles.contentRow}>
      {icon ? <FontAwesome6 name={icon} size={14} color={textColor} /> : null}
      <ThemedText type="smallBold" style={{ color: textColor }}>
        {title}
      </ThemedText>
    </View>
  );

  return (
    <Pressable
      disabled={disabled || loading}
      style={({ pressed }) => [
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
        typeof style === 'function' ? undefined : style,
      ]}
      {...rest}
    >
      {isSecondary ? (
        <View style={[styles.base, styles.secondary, { borderColor: theme.primary }]}>{content}</View>
      ) : (
        // Matches sql-skreenit's --gradient-secondary used on .btn-primary.
        <LinearGradient
          colors={['#4f46e5', '#7c3aed']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.base}
        >
          {content}
        </LinearGradient>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.85,
  },
});
