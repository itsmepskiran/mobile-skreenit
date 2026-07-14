import { FontAwesome6 } from '@expo/vector-icons';
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radius } from '@/constants/theme';

export type Role = 'candidate' | 'recruiter';

export interface RoleChoiceModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (role: Role) => void;
  loadingRole?: Role | null;
}

// Shown once, right after credentials are verified, for accounts that have
// both a candidate and a recruiter profile — picks which dashboard to land on.
export function RoleChoiceModal({ visible, onClose, onSelect, loadingRole }: RoleChoiceModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.scrim}>
        <View style={styles.card}>
          <View style={styles.header}>
            <ThemedText type="subtitle" themeColor="text">
              Choose Your Role
            </ThemedText>
            <Pressable onPress={onClose} hitSlop={10}>
              <FontAwesome6 name="xmark" size={20} color={Colors.light.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.optionsRow}>
            <RoleCard
              label="Candidate Dashboard"
              icon="user"
              color={Colors.light.primary}
              loading={loadingRole === 'candidate'}
              disabled={!!loadingRole}
              onPress={() => onSelect('candidate')}
            />
            <RoleCard
              label="Recruiter Dashboard"
              icon="building"
              color={Colors.light.secondary}
              loading={loadingRole === 'recruiter'}
              disabled={!!loadingRole}
              onPress={() => onSelect('recruiter')}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function RoleCard({
  label,
  icon,
  color,
  loading,
  disabled,
  onPress,
}: {
  label: string;
  icon: React.ComponentProps<typeof FontAwesome6>['name'];
  color: string;
  loading: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.option, { backgroundColor: color }, pressed && styles.optionPressed]}
    >
      {loading ? (
        <ActivityIndicator color="#ffffff" />
      ) : (
        <>
          <FontAwesome6 name={icon} size={32} color="#ffffff" />
          <ThemedText type="smallBold" style={styles.optionText}>
            {label}
          </ThemedText>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: Radius.lg,
    padding: 20,
    gap: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  option: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 12,
  },
  optionPressed: {
    opacity: 0.85,
  },
  optionText: {
    color: '#ffffff',
    textAlign: 'center',
  },
});
