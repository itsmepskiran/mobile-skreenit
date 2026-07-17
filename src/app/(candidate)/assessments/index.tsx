import { FontAwesome6 } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { listMyAssessments } from '@/lib/api/assessments';
import { listPricingPlans } from '@/lib/api/subscription';
import { CATALOG, INDUSTRIES, type CatalogItem } from '@/lib/assessment-catalog';

const STATUS_STYLE: Record<string, { label: string; bg: string; fg: string }> = {
  completed: { label: 'Completed', bg: '#f0fff4', fg: '#2f855a' },
  in_progress: { label: 'In Progress', bg: '#fffaf0', fg: '#c05621' },
  pending: { label: 'Pending', bg: '#ebf8ff', fg: '#2b6cb0' },
};

type Tab = 'browse' | 'results';

export default function AssessmentsScreen() {
  const theme = useTheme();
  const [tab, setTab] = useState<Tab>('browse');
  const [industry, setIndustry] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<CatalogItem | null>(null);

  const assessmentsQuery = useQuery({ queryKey: ['assessments', 'mine'], queryFn: listMyAssessments });
  const assessments = assessmentsQuery.data?.data ?? [];

  const freePlansQuery = useQuery({
    queryKey: ['subscription', 'plans', 'general_plan'],
    queryFn: () => listPricingPlans('general_plan'),
  });
  const freePlans = freePlansQuery.data?.data ?? [];

  const filteredCatalog = useMemo(
    () => (industry ? CATALOG.filter((item) => item.industry === industry) : []),
    [industry],
  );
  const selectedPack = industry ? INDUSTRIES.find((i) => i.value === industry) : undefined;

  const goToBundleCheckout = (industryValue: string) => {
    router.push(`/(candidate)/subscription?serviceType=assessment_bundle&industryKey=${industryValue}`);
  };

  // Matches web's individual-assessment "Unlock" flow (premium-features.js
  // handleAssessmentSelection -> btnUnlockConfirm): this buys just the one
  // test via its own applicant_plan pricing_plans row (item.dbId), not the
  // industry bundle.
  const goToIndividualCheckout = (item: CatalogItem) => {
    router.push(`/(candidate)/subscription?serviceType=applicant_plan&planId=${item.dbId}`);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.headerRow}>
        <ThemedText type="title">Assessments</ThemedText>
      </View>

      <View style={[styles.tabRow, { borderColor: theme.border }]}>
        <Pressable style={styles.tabButton} onPress={() => setTab('browse')}>
          <ThemedText type="smallBold" themeColor={tab === 'browse' ? 'primary' : 'textSecondary'}>
            Browse
          </ThemedText>
          {tab === 'browse' ? <View style={[styles.tabIndicator, { backgroundColor: theme.primary }]} /> : null}
        </Pressable>
        <Pressable style={styles.tabButton} onPress={() => setTab('results')}>
          <ThemedText type="smallBold" themeColor={tab === 'results' ? 'primary' : 'textSecondary'}>
            My Results
          </ThemedText>
          {tab === 'results' ? <View style={[styles.tabIndicator, { backgroundColor: theme.primary }]} /> : null}
        </Pressable>
      </View>

      {tab === 'browse' ? (
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="subtitle">Free Assessments</ThemedText>
          {freePlansQuery.isLoading ? (
            <ActivityIndicator color={theme.primary} />
          ) : freePlans.length === 0 ? (
            <ThemedText themeColor="textSecondary" type="small">
              No free assessments available right now.
            </ThemedText>
          ) : (
            freePlans.map((plan) => (
              <Pressable
                key={plan.id}
                style={[styles.freeCard, { borderColor: theme.border }]}
                onPress={() => router.push(`/(candidate)/assessments/take/${plan.service_key}`)}
              >
                <View style={styles.cardHeader}>
                  <ThemedText type="smallBold" style={styles.cardTitle}>
                    {plan.name}
                  </ThemedText>
                  <View style={[styles.statusBadge, { backgroundColor: '#f0fff4' }]}>
                    <ThemedText type="small" style={{ color: '#2f855a', fontWeight: '600' }}>
                      Free
                    </ThemedText>
                  </View>
                </View>
                {plan.description ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    {plan.description}
                  </ThemedText>
                ) : null}
                <View style={styles.startRow}>
                  <ThemedText type="small" themeColor="primary">
                    Start assessment
                  </ThemedText>
                  <FontAwesome6 name="arrow-right" size={11} color={theme.primary} />
                </View>
              </Pressable>
            ))
          )}

          <ThemedText type="subtitle" style={styles.paidHeading}>
            Paid Assessments
          </ThemedText>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            <Pressable
              onPress={() => setIndustry(null)}
              style={[
                styles.filterChip,
                { borderColor: theme.border },
                industry === null && { backgroundColor: theme.primary, borderColor: theme.primary },
              ]}
            >
              <ThemedText type="small" style={{ color: industry === null ? '#fff' : theme.text }}>
                All Industries
              </ThemedText>
            </Pressable>
            {INDUSTRIES.map((pack) => {
              const active = industry === pack.value;
              return (
                <Pressable
                  key={pack.value}
                  onPress={() => setIndustry(pack.value)}
                  style={[
                    styles.filterChip,
                    { borderColor: theme.border },
                    active && { backgroundColor: theme.primary, borderColor: theme.primary },
                  ]}
                >
                  <ThemedText type="small" style={{ color: active ? '#fff' : theme.text }}>
                    {pack.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>

          {industry === null ? (
            INDUSTRIES.map((pack) => (
              <IndustryPackCard
                key={pack.value}
                pack={pack}
                onBrowse={() => setIndustry(pack.value)}
                onUnlock={() => goToBundleCheckout(pack.value)}
              />
            ))
          ) : (
            <>
              {selectedPack ? (
                <View style={styles.selectedIndustryRow}>
                  <ThemedText type="small" themeColor="textSecondary">
                    {filteredCatalog.length} individual assessments in {selectedPack.label}
                  </ThemedText>
                  <Pressable onPress={() => goToBundleCheckout(selectedPack.value)}>
                    <ThemedText type="small" themeColor="primary">
                      Get full pack (₹{selectedPack.price})
                    </ThemedText>
                  </Pressable>
                </View>
              ) : null}
              {filteredCatalog.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => setDetailItem(item)}
                style={[styles.catalogCard, { borderColor: theme.border }]}
              >
                <View style={styles.cardHeader}>
                  <ThemedText type="smallBold" style={styles.cardTitle} numberOfLines={2}>
                    {item.name}
                  </ThemedText>
                  <FontAwesome6 name="lock" size={13} color={theme.textSecondary} />
                </View>
                <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
                  {item.desc}
                </ThemedText>
                <View style={styles.catalogCardFooter}>
                  <ThemedText type="small" themeColor="primary">
                    ₹{item.price.toLocaleString('en-IN')}
                  </ThemedText>
                  <View style={[styles.detailsButton, { backgroundColor: theme.primary }]}>
                    <ThemedText type="small" style={{ color: '#fff', fontWeight: '600' }}>
                      Tap for details
                    </ThemedText>
                  </View>
                </View>
              </Pressable>
              ))}
            </>
          )}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {assessmentsQuery.isLoading ? (
            <ActivityIndicator color={theme.primary} />
          ) : assessments.length === 0 ? (
            <ThemedText themeColor="textSecondary" style={styles.empty}>
              You haven&apos;t taken any assessments yet.
            </ThemedText>
          ) : (
            assessments.map((session) => {
              const statusStyle = STATUS_STYLE[session.status] ?? STATUS_STYLE.pending;
              return (
                <View
                  key={session.session_id}
                  style={[styles.card, { borderColor: theme.border }]}
                >
                  <View style={styles.cardHeader}>
                    <ThemedText type="smallBold" style={styles.cardTitle} numberOfLines={2}>
                      {session.assessment_name}
                    </ThemedText>
                    <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                      <ThemedText type="small" style={{ color: statusStyle.fg, fontWeight: '600' }}>
                        {statusStyle.label}
                      </ThemedText>
                    </View>
                  </View>

                  <View style={styles.metaRow}>
                    <FontAwesome6 name="layer-group" size={11} color={theme.textSecondary} />
                    <ThemedText type="small" themeColor="textSecondary">
                      {session.format}
                    </ThemedText>
                    {session.is_free ? (
                      <ThemedText type="small" themeColor="secondary">
                        · Free
                      </ThemedText>
                    ) : null}
                  </View>

                  {session.mcq_total != null ? (
                    <View style={styles.metaRow}>
                      <FontAwesome6 name="list-check" size={11} color={theme.textSecondary} />
                      <ThemedText type="small" themeColor="textSecondary">
                        MCQ score: {session.mcq_score ?? 0}/{session.mcq_total}
                      </ThemedText>
                    </View>
                  ) : null}

                  {session.overall_score != null ? (
                    <View style={styles.metaRow}>
                      <FontAwesome6 name="chart-simple" size={11} color={theme.textSecondary} />
                      <ThemedText type="small" themeColor="textSecondary">
                        Overall score: {session.overall_score}
                      </ThemedText>
                    </View>
                  ) : null}

                  {session.completed_at ? (
                    <View style={styles.metaRow}>
                      <FontAwesome6 name="clock" size={11} color={theme.textSecondary} />
                      <ThemedText type="small" themeColor="textSecondary">
                        Completed {new Date(session.completed_at).toLocaleDateString()}
                      </ThemedText>
                    </View>
                  ) : null}
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      <Modal visible={detailItem != null} transparent animationType="fade" onRequestClose={() => setDetailItem(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setDetailItem(null)}>
          <Pressable style={[styles.modalCard, { backgroundColor: theme.backgroundElement }]} onPress={() => {}}>
            {detailItem ? (
              <>
                <ThemedText type="small" themeColor="primary">
                  {detailItem.industryLabel}
                </ThemedText>
                <ThemedText type="subtitle">{detailItem.name}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {detailItem.desc}
                </ThemedText>
                <ThemedText type="small">
                  <ThemedText type="smallBold">Skills measured: </ThemedText>
                  {detailItem.skills}
                </ThemedText>
                <ThemedText type="smallBold" themeColor="primary">
                  One-time price: ₹{detailItem.price.toLocaleString('en-IN')}
                </ThemedText>
                <View style={styles.modalActions}>
                  <Pressable
                    style={[styles.actionButton, { borderColor: theme.border, borderWidth: 1, flex: 1 }]}
                    onPress={() => setDetailItem(null)}
                  >
                    <ThemedText type="small">Maybe Later</ThemedText>
                  </Pressable>
                  <Pressable
                    style={[styles.actionButton, { backgroundColor: theme.primary, flex: 1 }]}
                    onPress={() => {
                      const target = detailItem;
                      setDetailItem(null);
                      goToIndividualCheckout(target);
                    }}
                  >
                    <FontAwesome6 name="unlock" size={12} color="#fff" />
                    <ThemedText type="small" style={{ color: '#fff' }}>
                      Unlock to Take Test
                    </ThemedText>
                  </Pressable>
                </View>
                <Pressable
                  style={[styles.actionButton, { backgroundColor: theme.primary }]}
                  onPress={() => goToBundleCheckout(detailItem.industry)}
                >
                  <FontAwesome6 name="crown" size={12} color="#fff" />
                  <ThemedText type="small" style={{ color: '#fff' }}>
                    Get Full Access
                  </ThemedText>
                </Pressable>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function IndustryPackCard({
  pack,
  onBrowse,
  onUnlock,
  browseLabel = 'Browse',
}: {
  pack: (typeof INDUSTRIES)[number];
  onBrowse: () => void;
  onUnlock: () => void;
  browseLabel?: string;
}) {
  const theme = useTheme();
  const individualTotal = CATALOG.filter((c) => c.industry === pack.value).reduce((sum, c) => sum + c.price, 0);
  const savePct = individualTotal > 0 ? Math.round((1 - pack.price / individualTotal) * 100) : 0;

  return (
    <View style={[styles.packCard, { borderColor: theme.border }]}>
      <View style={styles.packHeader}>
        <View style={[styles.packIcon, { backgroundColor: pack.bg }]}>
          <FontAwesome6 name={pack.icon} size={16} color={pack.color} />
        </View>
        <View style={styles.packHeaderText}>
          <ThemedText type="smallBold">{pack.label}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {pack.count} assessments included
          </ThemedText>
        </View>
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        {pack.desc}
      </ThemedText>
      <View style={styles.packPriceRow}>
        <ThemedText type="smallBold">₹{pack.price}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          / full access
        </ThemedText>
        {savePct > 0 ? (
          <View style={styles.saveBadge}>
            <ThemedText type="small" style={{ color: '#15803d', fontWeight: '600' }}>
              Save {savePct}%
            </ThemedText>
          </View>
        ) : null}
      </View>
      <View style={styles.packButtonRow}>
        <Pressable style={[styles.actionButton, { borderColor: theme.border, borderWidth: 1, flex: 1 }]} onPress={onBrowse}>
          <FontAwesome6 name="magnifying-glass" size={12} color={theme.text} />
          <ThemedText type="small">{browseLabel}</ThemedText>
        </Pressable>
        <Pressable style={[styles.actionButton, { backgroundColor: theme.primary, flex: 1 }]} onPress={onUnlock}>
          <FontAwesome6 name="crown" size={12} color="#fff" />
          <ThemedText type="small" style={{ color: '#fff' }}>
            Get Full Access
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  headerRow: { paddingHorizontal: 20, paddingTop: 12 },
  tabRow: { flexDirection: 'row', paddingHorizontal: 20, marginTop: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 24 },
  tabButton: { paddingBottom: 10, gap: 8 },
  tabIndicator: { height: 2, borderRadius: 1 },
  content: { padding: 20, gap: 12 },
  paidHeading: { marginTop: 12 },
  filterRow: { gap: 8, paddingVertical: 4 },
  filterChip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  empty: { textAlign: 'center', marginTop: 40 },
  card: { borderWidth: 1, borderRadius: Radius.lg, padding: 16, gap: 8 },
  freeCard: { borderWidth: 1, borderRadius: Radius.lg, padding: 14, gap: 6 },
  startRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  catalogCard: { borderWidth: 1, borderRadius: Radius.lg, padding: 14, gap: 6 },
  catalogCardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2, gap: 8 },
  detailsButton: { borderRadius: Radius.md, paddingVertical: 6, paddingHorizontal: 10 },
  selectedIndustryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  cardTitle: { flex: 1 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  packCard: { borderWidth: 1, borderRadius: Radius.lg, padding: 16, gap: 10 },
  packHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  packIcon: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  packHeaderText: { flex: 1, gap: 2 },
  packPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  saveBadge: { backgroundColor: '#dcfce7', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2, marginLeft: 'auto' },
  packButtonRow: { flexDirection: 'row', gap: 8 },
  actionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: Radius.md, paddingVertical: 9, paddingHorizontal: 12 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalCard: { width: '100%', maxWidth: 360, borderRadius: Radius.lg, padding: 20, gap: 10 },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: 6 },
});
