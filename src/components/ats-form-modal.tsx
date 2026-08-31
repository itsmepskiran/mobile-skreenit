import { FontAwesome6 } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Shared bottom-sheet shell for every ATS create/edit form (departments,
// designations, positions, requisitions, jobs, employees, users) — mirrors
// components/schedule-interview-modal.tsx's backdrop/sheet/header pattern so
// every ATS form modal looks and behaves the same instead of being rebuilt
// per screen.
export interface AtsFormModalProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  submitLabel: string;
  onSubmit: () => void;
  submitting?: boolean;
  error?: string | null;
}

export function AtsFormModal({ visible, title, onClose, children, submitLabel, onSubmit, submitting, error }: AtsFormModalProps) {
  const theme = useTheme();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <ThemedView style={[styles.sheet, { backgroundColor: theme.backgroundElement }]}>
          <View style={styles.header}>
            <ThemedText type="subtitle">{title}</ThemedText>
            <Pressable onPress={onClose} hitSlop={12}>
              <FontAwesome6 name="xmark" size={18} color={theme.text} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {children}

            {error ? (
              <ThemedText type="small" style={{ color: theme.danger }}>
                {error}
              </ThemedText>
            ) : null}

            <Button title={submitLabel} onPress={onSubmit} loading={submitting} />
          </ScrollView>
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '90%', borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg, paddingTop: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12 },
  content: { paddingHorizontal: 20, paddingBottom: 40, gap: 12 },
});
