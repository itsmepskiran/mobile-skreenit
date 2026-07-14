import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { searchColleges, type CollegeOption } from '@/lib/api/applicant';

export interface CollegeAutocompleteProps {
  label: string;
  value: string;
  onChange: (name: string) => void;
}

// Live search-as-you-type against /locations/colleges, matching the web's
// college-search-wrapper dropdown in detailed-application-form.html. The
// value itself is just the free-text college name — the dropdown is purely
// a convenience for finding the right spelling, not a foreign-key reference.
export function CollegeAutocomplete({ label, value, onChange }: CollegeAutocompleteProps) {
  const theme = useTheme();
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<CollegeOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const onChangeText = (text: string) => {
    setQuery(text);
    onChange(text);
    setOpen(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.trim().length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const colleges = await searchColleges(text.trim());
        setResults(colleges);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  const select = (college: CollegeOption) => {
    setQuery(college.name);
    onChange(college.name);
    setOpen(false);
    setResults([]);
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <View>
        <TextInput
          value={query}
          onChangeText={onChangeText}
          onFocus={() => setOpen(true)}
          placeholder="Search college name"
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
        />
        {loading ? <ActivityIndicator style={styles.spinner} size="small" color={theme.primary} /> : null}
      </View>

      {open && results.length > 0 ? (
        <View style={[styles.dropdown, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          {results.map((college) => (
            <Pressable key={college.id} style={styles.optionRow} onPress={() => select(college)}>
              <ThemedText numberOfLines={1}>{college.name}</ThemedText>
              {college.city_name || college.state_name ? (
                <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                  {[college.city_name, college.state_name].filter(Boolean).join(', ')}
                </ThemedText>
              ) : null}
            </Pressable>
          ))}
        </View>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  input: {
    fontFamily: Fonts.sans,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  spinner: { position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center' },
  dropdown: {
    borderWidth: 1,
    borderRadius: Radius.md,
    marginTop: -2,
    maxHeight: 220,
    overflow: 'hidden',
  },
  optionRow: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(148,163,184,0.2)',
  },
});
