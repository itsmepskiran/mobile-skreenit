import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { SkillTagInput } from '@/components/skill-tag-input';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { LANGUAGE_OPTIONS, type StepProps } from '@/components/profile-wizard/types';

const LANGUAGE_LABELS: Record<string, string> = {
  english: 'English',
  hindi: 'Hindi',
  kannada: 'Kannada',
  tamil: 'Tamil',
  telugu: 'Telugu',
  marathi: 'Marathi',
};

export function StepSkills({ values, setValue }: StepProps) {
  const theme = useTheme();

  const toggleLanguage = (lang: string) => {
    const has = values.spoken_languages.includes(lang);
    setValue('spoken_languages', has ? values.spoken_languages.filter((l) => l !== lang) : [...values.spoken_languages, lang]);
  };

  const otherLanguages = values.spoken_languages.filter((l) => !LANGUAGE_OPTIONS.includes(l));

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="subtitle">Skills & Languages</ThemedText>

      <ThemedText type="smallBold">Languages known</ThemedText>
      <View style={styles.languageRow}>
        {LANGUAGE_OPTIONS.map((lang) => {
          const active = values.spoken_languages.includes(lang);
          return (
            <Pressable
              key={lang}
              onPress={() => toggleLanguage(lang)}
              style={[
                styles.languageChip,
                { backgroundColor: active ? theme.primary : theme.backgroundElement, borderColor: active ? theme.primary : theme.border },
              ]}
            >
              <ThemedText type="small" style={active ? { color: '#ffffff' } : undefined}>
                {LANGUAGE_LABELS[lang]}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
      <TextInput
        placeholder="Other languages (comma separated)"
        placeholderTextColor={theme.textSecondary}
        defaultValue={otherLanguages.join(', ')}
        onEndEditing={(e) => {
          const extra = e.nativeEvent.text
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
          const base = values.spoken_languages.filter((l) => LANGUAGE_OPTIONS.includes(l));
          setValue('spoken_languages', [...base, ...extra]);
        }}
        style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
      />

      <SkillTagInput label="Technical skills" value={values.skills} onChange={(v) => setValue('skills', v)} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { gap: 14 },
  languageRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  languageChip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  input: {
    fontFamily: Fonts.sans,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
});
