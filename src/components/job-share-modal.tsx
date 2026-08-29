import { FontAwesome6 } from '@expo/vector-icons';
import { Modal, Pressable, Share, StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { JOB_DETAILS_URL } from '@/lib/config';

export function jobUrl(jobId: string) {
  return `${JOB_DETAILS_URL}?job_id=${jobId}`;
}

export interface JobShareModalProps {
  job: { id: string; job_title: string } | null;
  onClose: () => void;
  hint?: string;
}

// Extracted from (recruiter)/jobs/index.tsx's per-job QR/share modal so the same
// UI can also be shown right after publishing a new job, matching web's
// post-publish share prompt.
export function JobShareModal({ job, onClose, hint = 'Scan to view or apply to this job' }: JobShareModalProps) {
  const theme = useTheme();

  return (
    <Modal visible={job != null} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={[styles.modalCard, { backgroundColor: theme.backgroundElement }]} onPress={() => {}}>
          {job ? (
            <>
              <ThemedText type="smallBold" style={styles.modalTitle} numberOfLines={2}>
                {job.job_title}
              </ThemedText>
              <View style={styles.modalQrBox}>
                <QRCode value={jobUrl(job.id)} size={220} />
              </View>
              <ThemedText type="small" themeColor="textSecondary" style={styles.modalHint}>
                {hint}
              </ThemedText>
              <View style={styles.modalActions}>
                <Pressable
                  style={[styles.actionButton, { borderColor: theme.border }]}
                  onPress={() => Share.share({ message: jobUrl(job.id) })}
                >
                  <FontAwesome6 name="share-nodes" size={13} color={theme.primary} />
                  <ThemedText type="small" themeColor="primary">
                    Share link
                  </ThemedText>
                </Pressable>
                <Pressable style={[styles.actionButton, { borderColor: theme.border }]} onPress={onClose}>
                  <ThemedText type="small">Close</ThemedText>
                </Pressable>
              </View>
            </>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 320,
    borderRadius: Radius.lg,
    padding: 20,
    gap: 14,
    alignItems: 'center',
  },
  modalTitle: { textAlign: 'center' },
  modalQrBox: { padding: 12, backgroundColor: '#fff', borderRadius: Radius.md },
  modalHint: { textAlign: 'center' },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingVertical: 9,
  },
  modalActions: { flexDirection: 'row', gap: 8, alignSelf: 'stretch' },
});
