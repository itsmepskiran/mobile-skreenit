import { FontAwesome6 } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type Role = 'candidate' | 'recruiter';

export interface RoleToggleProps {
  label: string;
  value: Role;
  onChange: (role: Role) => void;
}

export function RoleToggle({ label, value, onChange }: RoleToggleProps) {
  const theme = useTheme();

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <ThemedView style={styles.row}>
        {(['candidate', 'recruiter'] as const).map((role) => {
          const selected = value === role;
          return (
            <Pressable
              key={role}
              onPress={() => onChange(role)}
              style={[
                styles.option,
                {
                  borderColor: selected ? theme.primary : theme.border,
                  backgroundColor: selected ? theme.primary : 'transparent',
                },
              ]}
            >
              <FontAwesome6
                name={role === 'candidate' ? 'user' : 'building'}
                size={14}
                color={selected ? '#ffffff' : theme.textSecondary}
              />
              <ThemedText themeColor={selected ? undefined : 'textSecondary'} style={selected && styles.textSelected}>
                {role === 'candidate' ? 'Candidate' : 'Recruiter'}
              </ThemedText>
            </Pressable>
          );
        })}
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  option: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    borderWidth: 2,
    borderRadius: Radius.md,
    paddingVertical: 12,
    gap: 8,
    alignItems: 'center',
  },
  textSelected: {
    color: '#ffffff',
  },
});
