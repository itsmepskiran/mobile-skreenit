import { FontAwesome6 } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface SelectOption {
  label: string;
  value: string;
}

export interface SelectFieldProps {
  label: string;
  icon?: React.ComponentProps<typeof FontAwesome6>['name'];
  value?: string;
  options: SelectOption[];
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  searchable?: boolean;
  onChange: (value: string) => void;
}

// Modal/bottom-sheet dropdown — RN has no native <select>, so this mirrors
// RoleChoiceModal's scrim + white rounded-sheet visual pattern for every
// reference-data dropdown (department, role, job type, notice period, etc.).
export function SelectField({
  label,
  icon,
  value,
  options,
  placeholder = 'Select...',
  error,
  disabled,
  searchable,
  onChange,
}: SelectFieldProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = options.find((o) => o.value === value);
  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.trim().toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.labelRow}>
        {icon ? <FontAwesome6 name={icon} size={13} color={theme.text} /> : null}
        <ThemedText type="smallBold">{label}</ThemedText>
      </ThemedView>

      <Pressable
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={[
          styles.trigger,
          {
            backgroundColor: disabled ? theme.background : theme.backgroundElement,
            borderColor: error ? theme.danger : theme.border,
          },
        ]}
      >
        <ThemedText style={!selected ? { color: theme.textSecondary } : undefined} numberOfLines={1}>
          {selected?.label ?? placeholder}
        </ThemedText>
        <FontAwesome6 name="chevron-down" size={14} color={theme.textSecondary} />
      </Pressable>

      {error ? (
        <ThemedText type="small" style={{ color: theme.danger }}>
          {error}
        </ThemedText>
      ) : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <Pressable style={styles.scrim} onPress={close}>
          <Pressable style={[styles.sheet, { backgroundColor: theme.backgroundElement }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <ThemedText type="subtitle">{label}</ThemedText>
              <Pressable onPress={close} hitSlop={10}>
                <FontAwesome6 name="xmark" size={20} color={theme.textSecondary} />
              </Pressable>
            </View>

            {searchable ? (
              <TextInput
                autoFocus
                value={query}
                onChangeText={setQuery}
                placeholder="Search..."
                placeholderTextColor={theme.textSecondary}
                style={[
                  styles.search,
                  { color: theme.text, backgroundColor: theme.background, borderColor: theme.border },
                ]}
              />
            ) : null}

            <FlatList
              data={filtered}
              keyExtractor={(item) => item.value}
              style={styles.list}
              keyboardShouldPersistTaps="handled"
              ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: theme.border }]} />}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.optionRow}
                  onPress={() => {
                    onChange(item.value);
                    close();
                  }}
                >
                  <ThemedText style={item.value === value ? { color: theme.primary, fontWeight: '600' } : undefined}>
                    {item.label}
                  </ThemedText>
                  {item.value === value ? <FontAwesome6 name="check" size={14} color={theme.primary} /> : null}
                </Pressable>
              )}
              ListEmptyComponent={
                <ThemedText themeColor="textSecondary" style={styles.empty}>
                  No matches found.
                </ThemedText>
              }
            />
          </Pressable>
        </Pressable>
      </Modal>
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
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    padding: 20,
    maxHeight: '75%',
    gap: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  search: {
    fontFamily: Fonts.sans,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  list: {
    flexGrow: 0,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  empty: {
    textAlign: 'center',
    paddingVertical: 24,
  },
});
