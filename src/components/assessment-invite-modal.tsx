import { FontAwesome6 } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Modal, Pressable, Share, StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/lib/api/client';
import { generateAssessmentInviteLink } from '@/lib/api/position-assessments';
import { ASSESSMENT_INVITE_APPLY_URL } from '@/lib/config';

export interface AssessmentInviteContext {
  jobId: string;
  candidateName: string;
  candidateEmail: string;
}

interface Props {
  context: AssessmentInviteContext | null;
  onClose: () => void;
}

// Ported from sql-skreenit's assets/assets/js/assessment-invite-modal.js
// (openCandidateAssessmentModal) -- the "Move to Assessment" action, reused
// from Applications review and Candidate Search on web.
export function AssessmentInviteModal({ context, onClose }: Props) {
  const theme = useTheme();

  const mutation = useMutation({
    mutationFn: (ctx: AssessmentInviteContext) =>
      generateAssessmentInviteLink(ctx.jobId, { fullName: ctx.candidateName, email: ctx.candidateEmail }),
  });

  useEffect(() => {
    if (context) mutation.mutate(context);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context]);

  if (!context) return null;

  const token = mutation.data?.data.invitees[0]?.token;
  const applyUrl = token ? `${ASSESSMENT_INVITE_APPLY_URL}?token=${encodeURIComponent(token)}` : null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.card, { backgroundColor: theme.backgroundElement }]} onPress={() => {}}>
          <View style={styles.header}>
            <ThemedText type="subtitle">Move to Assessment</ThemedText>
            <Pressable onPress={onClose} hitSlop={12}>
              <FontAwesome6 name="xmark" size={16} color={theme.text} />
            </Pressable>
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            {context.candidateName}
          </ThemedText>

          {mutation.isPending ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
              Generating assessment link…
            </ThemedText>
          ) : mutation.isError ? (
            <ThemedText type="small" style={{ color: theme.danger }}>
              {mutation.error instanceof ApiError
                ? mutation.error.message
                : 'Could not generate an invite link. Make sure this job has at least one assessment configured.'}
            </ThemedText>
          ) : applyUrl ? (
            <>
              <View style={styles.qrWrap}>
                <QRCode value={applyUrl} size={180} />
              </View>
              <ThemedText type="small" numberOfLines={2} style={styles.linkText}>
                {applyUrl}
              </ThemedText>
              <Pressable
                style={[styles.shareButton, { backgroundColor: theme.primary }]}
                onPress={() => Share.share({ message: applyUrl, url: applyUrl })}
              >
                <FontAwesome6 name="share" size={13} color="#fff" />
                <ThemedText type="small" style={{ color: '#fff', fontWeight: '600' }}>
                  Share link
                </ThemedText>
              </Pressable>
            </>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 360, borderRadius: Radius.lg, padding: 20, gap: 12, alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' },
  centerText: { textAlign: 'center', paddingVertical: 20 },
  qrWrap: { padding: 12, backgroundColor: '#fff', borderRadius: Radius.md },
  linkText: { textAlign: 'center' },
  shareButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: Radius.md, paddingVertical: 12, paddingHorizontal: 20, width: '100%' },
});
