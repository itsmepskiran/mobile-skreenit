import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, Share, StyleSheet } from 'react-native';
import { FontAwesome6, Pressable, View } from '@/components/scoped';
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
import { csvToCandidates, describeSkipped } from '@/lib/candidate-list';
import { DEFAULT_LINK_VALID_DAYS, formatExpiry, LINK_VALID_DAY_CHOICES, linkExpiryDate } from '@/lib/link-expiry';
import { useSmartBack } from '@/lib/navigation/smart-back';

function applyUrl(token: string) {
  return `${ASSESSMENT_INVITE_APPLY_URL}?token=${encodeURIComponent(token)}`;
}

const TABS: { mode: AssessmentLinkMode; label: string; linkType: string }[] = [
  { mode: 'per_candidate', label: 'Per Candidate', linkType: 'single_use' },
  { mode: 'shared_gated', label: 'Shared (Gated)', linkType: 'gated' },
  { mode: 'open', label: 'Open', linkType: 'reusable' },
];

interface InviteeRow {
  fullName: string;
  email: string;
  phone: string;
}

const EMPTY_ROW: InviteeRow = { fullName: '', email: '', phone: '' };

// Past this many new links, list a summary instead of a QR code per candidate.
const MAX_LINKS_SHOWN = 5;
// Past this many rows (an uploaded list), show each candidate as one line.
const COMPACT_AFTER = 10;

// Fuller sibling of assessment-invite-modal.tsx's single-candidate quick invite —
// ported from web's "Configured Assessments" share-link modal
// (dashboard/js/recruiter-dashboard.js openLinkShareModal), which supports three
// link modes instead of just per-candidate.
export default function AssessmentLinksScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { id: jobId, jobTitle } = useLocalSearchParams<{ id: string; jobTitle?: string }>();
  // Pushed here from Premium (a hidden tab outside this stack, which passes backTo —
  // see src/lib/navigation/smart-back.ts) and from Job Posts (same stack, plain back).
  const { goBack } = useSmartBack();
  const [activeTab, setActiveTab] = useState<AssessmentLinkMode>('per_candidate');
  const [rows, setRows] = useState<InviteeRow[]>([{ ...EMPTY_ROW }]);
  const [sharedToken, setSharedToken] = useState<string | null>(null);
  const [importNote, setImportNote] = useState<{ text: string; error?: boolean } | null>(null);
  const [validDays, setValidDays] = useState(DEFAULT_LINK_VALID_DAYS);
  const expiresOn = linkExpiryDate(validDays);

  const inviteesQuery = useQuery({
    queryKey: ['recruiter', 'assessment-invitees', jobId],
    queryFn: () => listAssessmentInvitees(jobId),
  });

  const openLinkMutation = useMutation({
    mutationFn: () => generateAssessmentLink(jobId, { mode: 'open', expiresOn }),
  });

  const inviteMutation = useMutation({
    mutationFn: (mode: AssessmentLinkMode) =>
      generateAssessmentLink(jobId, {
        mode,
        invitees: rows
          .filter((r) => r.email.trim() || r.phone.trim())
          .map((r) => ({ fullName: r.fullName.trim() || undefined, email: r.email.trim() || undefined, phone: r.phone.trim() || undefined })),
        expiresOn,
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['recruiter', 'assessment-invitees', jobId] });
      setRows([{ ...EMPTY_ROW }]);
      setImportNote(null);
      if (res.data.mode === 'shared_gated') setSharedToken(res.data.token);
    },
  });

  // Bulk upload: the CSV only fills the rows below, so the recruiter can check them before
  // sending. Each candidate still gets their own link and email from the backend.
  const pickCandidateList = async () => {
    const picked = await DocumentPicker.getDocumentAsync({
      type: ['text/csv', 'text/comma-separated-values', 'text/plain', 'application/csv'],
      copyToCacheDirectory: true,
    });
    if (picked.canceled) return;
    const asset = picked.assets[0];
    if (!/\.(csv|txt)$/i.test(asset.name)) {
      setImportNote({ text: 'Please choose a .csv file. In Excel, use Save As > CSV first.', error: true });
      return;
    }
    try {
      const { candidates, problems } = csvToCandidates(await new File(asset.uri).text());
      if (!candidates.length) {
        setImportNote({ text: `No candidates found in ${asset.name}. ${problems.slice(0, 3).join('; ')}`, error: true });
        return;
      }
      setRows((prev) => [...prev.filter((r) => r.fullName.trim() || r.email.trim() || r.phone.trim()), ...candidates]);
      const leftOut = problems.length
        ? `\n${problems.length} row${problems.length === 1 ? '' : 's'} left out: ${problems.slice(0, 3).join('; ')}${problems.length > 3 ? '…' : ''}`
        : '';
      setImportNote({ text: `Loaded ${candidates.length} candidate${candidates.length === 1 ? '' : 's'} from ${asset.name}. Check the list, then send.${leftOut}` });
    } catch {
      setImportNote({ text: 'Could not read that file.', error: true });
    }
  };

  const inviteResult = inviteMutation.data?.data;
  const sentSummary = (() => {
    if (!inviteResult || inviteResult.mode === 'open' || inviteResult.sent === undefined) return null;
    const reused = inviteResult.mode === 'per_candidate' ? inviteResult.invitees.filter((i) => i.already_invited).length : 0;
    const extra = [describeSkipped(inviteResult.skipped), reused ? `${reused} already invited (their existing link still works)` : '']
      .filter(Boolean)
      .join(', ');
    return `Sent ${inviteResult.sent} invite${inviteResult.sent === 1 ? '' : 's'}.${extra ? ` Not sent again: ${extra}.` : ''}`;
  })();

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
        <Pressable onPress={goBack} hitSlop={12}>
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
        <View style={styles.expiryRow}>
          <ThemedText type="small" themeColor="textSecondary">
            Link works for
          </ThemedText>
          {LINK_VALID_DAY_CHOICES.map((days) => (
            <Pressable
              key={days}
              onPress={() => {
                setValidDays(days);
                // A new date means a new open link, so the one shown isn't mistaken for it.
                openLinkMutation.reset();
              }}
              style={[
                styles.expiryChip,
                { borderColor: validDays === days ? theme.primary : theme.border },
                validDays === days && { backgroundColor: theme.primary },
              ]}
            >
              <ThemedText type="small" style={validDays === days ? { color: '#fff' } : undefined}>
                {days} days
              </ThemedText>
            </Pressable>
          ))}
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          New links stop working after {formatExpiry(expiresOn)}. The invite email tells candidates this date.
        </ThemedText>
        {activeTab === 'open' ? (
          <ThemedView style={[styles.card, { borderColor: theme.border }]}>
            <ThemedText type="small" themeColor="textSecondary">
              One stable link anyone can use to apply and take this job&apos;s assessments — no invite needed per
              candidate.
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.danger }}>
              You don&apos;t choose who takes it: everyone who completes it counts toward this job&apos;s 10 free
              assessments, then costs coins. To control spend, invite chosen candidates instead.
            </ThemedText>
            {!openLinkMutation.data && !openLinkMutation.isPending && !openLinkMutation.isError ? (
              <Pressable
                style={[styles.actionButton, { backgroundColor: theme.primary }]}
                onPress={() => openLinkMutation.mutate()}
              >
                <ThemedText type="smallBold" style={{ color: '#fff' }}>
                  Create Open Link
                </ThemedText>
              </Pressable>
            ) : null}
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
                ? 'Each candidate below gets their own one-time link. Only candidates you invite can take it; you pay only when one completes it (10 free per job, then coins).'
                : 'Everyone below shares one link, but must verify their identity before starting.'}
            </ThemedText>
            <Pressable onPress={pickCandidateList} style={[styles.shareButton, { borderColor: theme.border, alignSelf: 'flex-start' }]}>
              <FontAwesome6 name="file-arrow-up" size={12} color={theme.primary} />
              <ThemedText type="small" themeColor="primary">
                Upload list (CSV)
              </ThemedText>
            </Pressable>
            <ThemedText type="small" themeColor="textSecondary">
              Columns: Name, Email, Mobile. Up to 500 at a time; anyone already invited to this job is skipped.
            </ThemedText>
            {importNote ? (
              <ThemedText type="small" style={importNote.error ? { color: theme.danger } : undefined} themeColor={importNote.error ? undefined : 'textSecondary'}>
                {importNote.text}
              </ThemedText>
            ) : null}
            {rows.length > COMPACT_AFTER
              ? rows.map((row, i) => (
                  // A long uploaded list shows one line per candidate instead of three inputs each.
                  <View key={i} style={[styles.compactRow, { borderColor: theme.border }]}>
                    <ThemedText type="small" style={{ flex: 1 }} numberOfLines={1}>
                      {[row.fullName, row.email, row.phone].filter((v) => v.trim()).join(' · ')}
                    </ThemedText>
                    <Pressable onPress={() => setRows((prev) => prev.filter((_, idx) => idx !== i))} hitSlop={10}>
                      <FontAwesome6 name="xmark" size={14} color={theme.danger} />
                    </Pressable>
                  </View>
                ))
              : rows.map((row, i) => (
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
            {(activeTab === 'shared_gated' || rows.length > 1) && rows.length <= COMPACT_AFTER ? (
              <Pressable onPress={() => setRows((prev) => [...prev, { ...EMPTY_ROW }])} style={styles.addRowButton}>
                <FontAwesome6 name="plus" size={12} color={theme.primary} />
                <ThemedText type="small" themeColor="primary">
                  Add another
                </ThemedText>
              </Pressable>
            ) : null}
            <Pressable
              style={[styles.actionButton, { backgroundColor: theme.primary }]}
              // Invites are free; billing happens when a candidate completes the assessments.
              onPress={() => inviteMutation.mutate(activeTab)}
              disabled={inviteMutation.isPending}
            >
              {inviteMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <ThemedText type="small" style={{ color: '#fff', fontWeight: '600' }}>
                  {activeTab === 'per_candidate' ? (rows.length > 1 ? `Send ${rows.length} Invites` : 'Generate Link') : 'Generate Invites'}
                </ThemedText>
              )}
            </Pressable>
            {inviteMutation.isError ? (
              <ThemedText type="small" style={{ color: theme.danger }}>
                {inviteMutation.error instanceof ApiError ? inviteMutation.error.message : 'Could not generate invites.'}
              </ThemedText>
            ) : null}
            {sentSummary ? <ThemedText type="small">{sentSummary}</ThemedText> : null}
            {activeTab === 'per_candidate' && inviteResult?.mode === 'per_candidate' && inviteResult.invitees.length <= MAX_LINKS_SHOWN ? (
              inviteResult.invitees.map((inv) => (
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
  const expired = !used && !!invitee.expired;
  const until = !used && !expired ? formatExpiry(invitee.expires_at) : '';
  return (
    <ThemedView style={[styles.inviteeCard, { borderColor: theme.border }]}>
      <View style={{ flex: 1 }}>
        <ThemedText type="smallBold">{invitee.full_name || invitee.email || 'Invitee'}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {invitee.email ?? '—'}
          {until ? ` · until ${until}` : ''}
        </ThemedText>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: used ? '#f0fff4' : expired ? '#fff5f5' : theme.backgroundElement }]}>
        <ThemedText type="small" style={{ color: used ? '#2f855a' : expired ? theme.danger : theme.textSecondary, fontWeight: '600' }}>
          {used ? 'Used' : expired ? 'Expired' : 'Invited'}
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
  compactRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: 8 },
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
  expiryRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  expiryChip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
});
