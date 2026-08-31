import { FontAwesome6 } from '@expo/vector-icons';
import { StyleSheet, TextInput, View } from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Matches (recruiter)/jobs/index.tsx's searchRow markup — reused as-is across
// every ATS list screen instead of re-typed per screen.
export function AtsSearchBar({
  value,
  onChangeText,
  placeholder = 'Search…',
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}) {
  const theme = useTheme();

  return (
    <View style={[styles.row, { borderColor: theme.border }]}>
      <FontAwesome6 name="magnifying-glass" size={14} color={theme.textSecondary} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        style={[styles.input, { color: theme.text }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    marginHorizontal: 20,
    marginTop: 16,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
  },
});
