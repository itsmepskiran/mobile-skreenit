import { FontAwesome6 } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';

import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/lib/api/client';
import { ASSESSMENT_INVITE_APPLY_URL } from '@/lib/config';
import {
  generateAssessmentLink,
  listAssessmentInvitees,
  revokeAssessmentInvitee,
  type AssessmentInvitee,
  type AssessmentLinkMode,
} from '@/lib/api/position-assessments';

function applyUrl(token: string) {
  return `${ASSESSMENT_INVITE_APPLY_URL}?token=${encodeURIComponent(token)}`;
}

const TABS: { mode: AssessmentLinkMode; label: string; linkType: string }[] = [
  { mode: 'open', label: 'Open', linkType: 'reusable' },
  { mode: 'per_candidate', label: 'Per Candidate', linkType: 'single_use' },
  { mode: 'shared_gated', label: 'Shared (Gated)', linkType: 'gated' },
];

interface InviteeRow {
  fullName: string;
  email: string;
  phone: string;
}

const EMPTY_ROW: InviteeRow = { fullName: '', email: '', phone: '' };

// Fuller sibling of assessment-invite-modal.tsx's single-candidate quick invite —
// ported from web's "Configured Assessments" share-link modal
// (dashboard/js/recruiter-dashboard.js openLinkShareModal), which supports three
// link modes instead of just per-candidate.
export default function AssessmentLinksScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { id: jobId, jobTitle } = useLocalSearchParams<{ id: string; jobTitle?: string }>();
  const [activeTab, setActiveTab] = useState<AssessmentLinkMode>('open');
  const [rows, setRows] = useState<InviteeRow[]>([{ ...EMPTY_ROW }]);
  const [sharedToken, setSharedToken] = useState<string | null>(null);

  const inviteesQuery = useQuery({
    queryKey: ['recruiter', 'assessment-invitees', jobId],
    queryFn: () => listAssessmentInvitees(jobId),
  });

  const openLinkMutation = useMutation({
    mutationFn: () => generateAssessmentLink(jobId, { mode: 'open' }),
  });

  // Web auto-generates (or reuses the existing) open link the moment that tab is
  // opened, rather than requiring an explicit button press.
  useEffect(() => {
    if (activeTab === 'open' && !openLinkMutation.data && !openLinkMutation.isPending) {
      openLinkMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const inviteMutation = useMutation({
    mutationFn: (mode: AssessmentLinkMode) =>
      generateAssessmentLink(jobId, {
        mode,
        invitees: rows
          .filter((r) => r.fullName.trim() || r.email.trim())
          .map((r) => ({ fullName: r.fullName.trim() || undefined, email: r.email.trim() || undefined, phone: r.phone.trim() || undefined })),
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['recruiter', 'assessment-invitees', jobId] });
      setRows([{ ...EMPTY_ROW }]);
      if (res.data.mode === 'shared_gated') setSharedToken(res.data.token);
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (inviteeId: string) => revokeAssessmentInvitee(jobId, inviteeId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recruiter', 'assessment-invitees', jobId] }),
  });

  const activeTabDef = TABS.find((t) => t.mode === activeTab)!;
  const invitees = (inviteesQuery.data?.data ?? []).filter((inv) => inv.link_type === activeTabDef.linkType);

  const updateRow = (index: number, patch: Partial<InviteeRow>) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <FontAwesome6 name="chevron-left" size={16} color={theme.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <ThemedText type="title">Assessment Links</ThemedText>
          {jobTitle ? (
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {jobTitle}
            </ThemedText>
          ) : null}
        </View>
      </View>

      <View style={[styles.tabRow, { borderColor: theme.border }]}>
        {TABS.map((t) => (
          <Pressable key={t.mode} style={styles.tab} onPress={() => setActiveTab(t.mode)}>
            <ThemedText type="small" themeColor={activeTab === t.mode ? 'primary' : 'textSecondary'}>
              {t.label}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {activeTab === 'open' ? (
          <ThemedView style={[styles.card, { borderColor: theme.border }]}>
            <ThemedText type="small" themeColor="textSecondary">
              One stable link anyone can use to apply and take this job&apos;s assessments — no invite needed per
              candidate.
            </ThemedText>
            {openLinkMutation.isPending ? (
              <ActivityIndicator color={theme.primary} style={styles.centerPad} />
            ) : openLinkMutation.isError ? (
              <ThemedText type="small" style={{ color: theme.danger }}>
                {openLinkMutation.error instanceof ApiError
                  ? openLinkMutation.error.message
                  : 'Could not generate a link. Make sure this job has an assessment configured.'}
              </ThemedText>
            ) : openLinkMutation.data && openLinkMutation.data.data.mode === 'open' ? (
              <LinkShare token={openLinkMutation.data.data.token} />
            ) : null}
          </ThemedView>
        ) : null}

        {activeTab === 'per_candidate' || activeTab === 'shared_gated' ? (
          <ThemedView style={[styles.card, { borderColor: theme.border }]}>
            <ThemedText type="small" themeColor="textSecondary">
              {activeTab === 'per_candidate'
                ? 'Each candidate below gets their own one-time link.'
                : 'Everyone below shares one link, but must verify their identity before starting.'}
            </ThemedText>
            {rows.map((row, i) => (
              <View key={i} style={[styles.inviteeRow, { borderColor: theme.border }]}>
                <TextField label="Name" value={row.fullName} onChangeText={(v) => updateRow(i, { fullName: v })} />
                <TextField label="Email" value={row.email} onChangeText={(v) => updateRow(i, { email: v })} autoCapitalize="none" keyboardType="email-address" />
                <TextField label="Phone (optional)" value={row.phone} onChangeText={(v) => updateRow(i, { phone: v })} keyboardType="phone-pad" />
                {rows.length > 1 ? (
                  <Pressable onPress={() => setRows((prev) => prev.filter((_, idx) => idx !== i))} style={styles.removeRowButton}>
                    <FontAwesome6 name="trash" size={12} color={theme.danger} />
                    <ThemedText type="small" style={{ color: theme.danger }}>
                      Remove
                    </ThemedText>
                  </Pressable>
                ) : null}
              </View>
            ))}
            {activeTab === 'shared_gated' ? (
              <Pressable onPress={() => setRows((prev) => [...prev, { ...EMPTY_ROW }])} style={styles.addRowButton}>
                <FontAwesome6 name="plus" size={12} color={theme.primary} />
                <ThemedText type="small" themeColor="primary">
                  Add another
                </ThemedText>
              </Pressable>
            ) : null}
            <Pressable
              style={[styles.actionButton, { backgroundColor: theme.primary }]}
              onPress={() => inviteMutation.mutate(activeTab)}
              disabled={inviteMutation.isPending}
            >
              {inviteMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <ThemedText type="small" style={{ color: '#fff', fontWeight: '600' }}>
                  {activeTab === 'per_candidate' ? 'Generate Link' : 'Generate Invites'}
                </ThemedText>
              )}
            </Pressable>
            {inviteMutation.isError ? (
              <ThemedText type="small" style={{ color: theme.danger }}>
                {inviteMutation.error instanceof ApiError ? inviteMutation.error.message : 'Could not generate invites.'}
              </ThemedText>
            ) : null}
            {activeTab === 'per_candidate' && inviteMutation.data?.data.mode === 'per_candidate' ? (
              inviteMutation.data.data.invitees.map((inv) => (
                <LinkShare key={inv.token} token={inv.token} label={inv.full_name} />
              ))
            ) : null}
            {activeTab === 'shared_gated' && sharedToken ? <LinkShare token={sharedToken} /> : null}
          </ThemedView>
        ) : null}

        <ThemedText type="subtitle" style={styles.sectionTitle}>
          {activeTabDef.label} Invitees
        </ThemedText>
        {inviteesQuery.isLoading ? (
          <ActivityIndicator color={theme.primary} />
        ) : invitees.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            No invitees yet.
          </ThemedText>
        ) : (
          invitees.map((inv) => <InviteeRowCard key={inv.id} invitee={inv} onRevoke={() => revokeMutation.mutate(inv.id)} />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function LinkShare({ token, label }: { token: string; label?: string | null }) {
  const theme = useTheme();
  const url = applyUrl(token);
  return (
    <View style={[styles.linkShare, { borderColor: theme.border }]}>
      {label ? <ThemedText type="smallBold">{label}</ThemedText> : null}
      <View style={styles.qrWrap}>
        <QRCode value={url} size={140} />
      </View>
      <ThemedText type="small" numberOfLines={2} style={styles.linkText}>
        {url}
      </ThemedText>
      <Pressable style={[styles.shareButton, { borderColor: theme.border }]} onPress={() => Share.share({ message: url })}>
        <FontAwesome6 name="share-nodes" size={12} color={theme.primary} />
        <ThemedText type="small" themeColor="primary">
          Share link
        </ThemedText>
      </Pressable>
    </View>
  );
}

function InviteeRowCard({ invitee, onRevoke }: { invitee: AssessmentInvitee; onRevoke: () => void }) {
  const theme = useTheme();
  const used = invitee.status === 'used';
  return (
    <ThemedView style={[styles.inviteeCard, { borderColor: theme.border }]}>
      <View style={{ flex: 1 }}>
        <ThemedText type="smallBold">{invitee.full_name || invitee.email || 'Invitee'}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {invitee.email ?? '—'}
        </ThemedText>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: used ? '#f0fff4' : theme.backgroundElement }]}>
        <ThemedText type="small" style={{ color: used ? '#2f855a' : theme.textSecondary, fontWeight: '600' }}>
          {used ? 'Used' : 'Invited'}
        </ThemedText>
      </View>
      {!used ? (
        <Pressable onPress={onRevoke} hitSlop={10} style={styles.revokeButton}>
          <FontAwesome6 name="trash" size={13} color={theme.danger} />
        </Pressable>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  tabRow: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 20 },
  tab: { paddingVertical: 10, marginRight: 20 },
  content: { padding: 20, gap: 14 },
  card: { borderWidth: 1, borderRadius: Radius.lg, padding: 16, gap: 12 },
  centerPad: { marginVertical: 12 },
  inviteeRow: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, gap: 10 },
  removeRowButton: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  addRowButton: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  actionButton: { borderRadius: Radius.md, paddingVertical: 12, alignItems: 'center' },
  linkShare: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, alignItems: 'center', gap: 10 },
  qrWrap: { padding: 10, backgroundColor: '#fff', borderRadius: Radius.md },
  linkText: { textAlign: 'center' },
  shareButton: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: Radius.md, paddingVertical: 10, paddingHorizontal: 16 },
  sectionTitle: { marginTop: 4 },
  inviteeCard: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: Radius.md, padding: 12 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  revokeButton: { padding: 4 },
});
