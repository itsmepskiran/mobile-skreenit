import { FontAwesome6 } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
  icon?: React.ComponentProps<typeof FontAwesome6>['name'];
  /** Renders an eye / eye-slash toggle and manages secureTextEntry internally. */
  isPassword?: boolean;
}

export function TextField({ label, error, icon, isPassword, style, secureTextEntry, ...rest }: TextFieldProps) {
  const theme = useTheme();
  const [visible, setVisible] = useState(false);

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.labelRow}>
        {icon ? <FontAwesome6 name={icon} size={13} color={theme.text} /> : null}
        <ThemedText type="smallBold">{label}</ThemedText>
      </ThemedView>
      <View>
        <TextInput
          placeholderTextColor={theme.textSecondary}
          secureTextEntry={isPassword ? !visible : secureTextEntry}
          style={[
            styles.input,
            isPassword && styles.inputWithToggle,
            {
              color: theme.text,
              backgroundColor: theme.backgroundElement,
              borderColor: error ? theme.danger : theme.border,
            },
            style,
          ]}
          {...rest}
        />
        {isPassword ? (
          <Pressable style={styles.toggle} onPress={() => setVisible((v) => !v)} hitSlop={8}>
            <FontAwesome6 name={visible ? 'eye-slash' : 'eye'} size={16} color={theme.textSecondary} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <ThemedText type="small" style={{ color: theme.danger }}>
          {error}
        </ThemedText>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  input: {
    fontFamily: Fonts.sans,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  inputWithToggle: {
    paddingRight: 44,
  },
  toggle: {
    position: 'absolute',
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
});
