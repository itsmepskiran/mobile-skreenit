import { FontAwesome6 } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface SkillTagInputProps {
  label?: string;
  value: string[];
  onChange: (skills: string[]) => void;
}

// Text input + "Add" button + removable chips, matching the web's #skillsContainer
// tag style (#e0e7ff bg / #4f46e5 text).
export function SkillTagInput({ label = 'Skills', value, onChange }: SkillTagInputProps) {
  const theme = useTheme();
  const [draft, setDraft] = useState('');

  const addSkill = () => {
    const skill = draft.trim();
    if (!skill || value.includes(skill)) {
      setDraft('');
      return;
    }
    onChange([...value, skill]);
    setDraft('');
  };

  const removeSkill = (skill: string) => onChange(value.filter((s) => s !== skill));

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <View style={styles.inputRow}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Type skill & press Add"
          placeholderTextColor={theme.textSecondary}
          onSubmitEditing={addSkill}
          returnKeyType="done"
          style={[
            styles.input,
            { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border },
          ]}
        />
        <Pressable style={[styles.addButton, { backgroundColor: theme.secondary }]} onPress={addSkill}>
          <ThemedText type="smallBold" style={{ color: '#ffffff' }}>
            Add
          </ThemedText>
        </Pressable>
      </View>

      {value.length ? (
        <View style={styles.tags}>
          {value.map((skill) => (
            <View key={skill} style={styles.tag}>
              <ThemedText type="small" style={styles.tagText}>
                {skill}
              </ThemedText>
              <Pressable onPress={() => removeSkill(skill)} hitSlop={6}>
                <FontAwesome6 name="xmark" size={12} color="#4f46e5" />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    fontFamily: Fonts.sans,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  addButton: {
    borderRadius: Radius.md,
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#e0e7ff',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tagText: {
    color: '#4f46e5',
    fontWeight: '600',
  },
});
