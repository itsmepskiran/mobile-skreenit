import { FontAwesome6 } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HighlightTile } from '@/components/highlight-tile';
import { StatusBadge } from '@/components/status-badge';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import type { ApplicationStatus } from '@/lib/api/applicant';
import { getCandidateStats, listRecentCandidateApplications } from '@/lib/api/candidate-dashboard';
import { getUnreadCount } from '@/lib/api/notifications';
import { listPricingPlans } from '@/lib/api/subscription';
import { useAuthStore } from '@/lib/auth/store';
import { CATALOG, INDUSTRIES } from '@/lib/assessment-catalog';
import { formatRelativeTime } from '@/lib/format';

export default function CandidateDashboardScreen() {
  const theme = useTheme();
  const user = useAuthStore((state) => state.user);
  const [assessmentsExpanded, setAssessmentsExpanded] = useState(false);

  const statsQuery = useQuery({ queryKey: ['candidate', 'stats'], queryFn: getCandidateStats });
  const applicationsQuery = useQuery({
    queryKey: ['candidate', 'dashboard-applications'],
    queryFn: () => listRecentCandidateApplications({ pageSize: 4 }),
  });
  const unreadQuery = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: getUnreadCount,
    refetchInterval: 30000,
  });
  const freePlansQuery = useQuery({
    queryKey: ['subscription', 'plans', 'general_plan'],
    queryFn: () => listPricingPlans('general_plan'),
    enabled: assessmentsExpanded,
  });

  const stats = statsQuery.data?.data;
  const applications = applicationsQuery.data?.data.applications ?? [];
  const unreadCount = unreadQuery.data?.data.unread_count ?? 0;
  const freePlans = freePlansQuery.data?.data ?? [];

  if (statsQuery.isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ActivityIndicator style={styles.loader} color={theme.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View>
            <ThemedText type="title">Dashboard</ThemedText>
            <ThemedText themeColor="textSecondary">Welcome back, {user?.full_name}</ThemedText>
        </View>
          <Pressable style={styles.bellButton} onPress={() => router.push('/(candidate)/notifications')}>
            <FontAwesome6 name="bell" size={20} color={theme.text} />
            {unreadCount > 0 ? (
              <View style={[styles.badge, { backgroundColor: theme.danger }]}>
                <ThemedText type="small" style={styles.badgeText}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </ThemedText>
              </View>
            ) : null}
          </Pressable>
        </View>

        <View style={styles.statsGrid}>
          <HighlightTile icon="file-lines" label="Applications" value={String(stats?.total_applications ?? 0)} colors={['#667eea', '#764ba2']} />
          <HighlightTile icon="star" label="Shortlisted" value={String(stats?.shortlisted ?? 0)} colors={['#f093fb', '#f5576c']} />
          <HighlightTile icon="video" label="Interviews" value={String(stats?.interviews ?? 0)} colors={['#fa709a', '#fee140']} />
          <HighlightTile
            icon="trophy"
            label="Hired"
            value={String(stats?.hired ?? 0)}
            colors={['#a8edea', '#fed6e3']}
            iconColor="#0f172a"
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText type="smallBold">Assessments</ThemedText>
            <Pressable onPress={() => router.push('/(candidate)/assessments')}>
              <ThemedText type="link" themeColor="primary">
                Browse More
              </ThemedText>
            </Pressable>
          </View>
          <Pressable
            style={[styles.assessmentsToggle, { borderColor: theme.border }]}
            onPress={() => setAssessmentsExpanded((expanded) => !expanded)}
          >
            <FontAwesome6 name="clipboard-list" size={14} color={theme.primary} />
            <ThemedText type="small" themeColor="textSecondary" style={styles.assessmentsToggleText}>
              {assessmentsExpanded ? 'Tap to hide assessments' : 'Tap to view all assessments — free for everyone'}
            </ThemedText>
            <FontAwesome6 name={assessmentsExpanded ? 'chevron-up' : 'chevron-down'} size={12} color={theme.textSecondary} />
          </Pressable>
          {assessmentsExpanded ? (
            freePlansQuery.isLoading ? (
              <ActivityIndicator color={theme.primary} />
            ) : (
              <>
                {freePlans.map((plan) => (
                  <Pressable
                    key={plan.id}
                    style={[styles.row, { borderColor: theme.border }]}
                    onPress={() => router.push(`/(candidate)/assessments/take/${plan.service_key}`)}
                  >
                    <View style={[styles.assessmentIcon, { backgroundColor: theme.backgroundElement }]}>
                      <FontAwesome6 name="star" size={16} color={theme.primary} />
                    </View>
                    <View style={styles.rowText}>
                      <ThemedText type="smallBold" numberOfLines={1}>
                        {plan.name}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        Free
                      </ThemedText>
                    </View>
                    <FontAwesome6 name="chevron-right" size={14} color={theme.textSecondary} />
                  </Pressable>
                ))}
                {CATALOG.map((item) => {
                  const pack = INDUSTRIES.find((i) => i.value === item.industry);
                  return (
                    <Pressable
                      key={item.id}
                      style={[styles.row, { borderColor: theme.border }]}
                      onPress={() => router.push(`/(candidate)/assessments/take/${item.id}`)}
                    >
                      <View style={[styles.assessmentIcon, { backgroundColor: pack?.bg ?? theme.backgroundElement }]}>
                        <FontAwesome6 name={pack?.icon ?? 'clipboard-check'} size={16} color={pack?.color ?? theme.primary} />
                      </View>
                      <View style={styles.rowText}>
                        <ThemedText type="smallBold" numberOfLines={1}>
                          {item.name}
                        </ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          {item.industryLabel}
                        </ThemedText>
                      </View>
                      <FontAwesome6 name="chevron-right" size={14} color={theme.textSecondary} />
                    </Pressable>
                  );
                })}
              </>
            )
          ) : null}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText type="smallBold">Recent Applications</ThemedText>
            <Pressable onPress={() => router.push('/(candidate)/applications')}>
              <ThemedText type="link" themeColor="primary">
                View All
              </ThemedText>
            </Pressable>
          </View>
          {applications.length === 0 ? (
            <ThemedText themeColor="textSecondary">You haven&apos;t applied to any jobs yet.</ThemedText>
          ) : (
            applications.map((app) => (
              <Pressable
                key={app.id}
                style={[styles.row, { borderColor: theme.border }]}
                onPress={() => router.push(`/(candidate)/jobs/${app.job_id}`)}
              >
                <View style={styles.rowText}>
                  <ThemedText type="smallBold" numberOfLines={1}>
                    {app.job_title ?? 'Job'}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Applied {formatRelativeTime(app.applied_at)}
                  </ThemedText>
                  <ThemedText type="small" themeColor="primary">
                    View Job Details
                  </ThemedText>
                </View>
                <StatusBadge status={app.status as ApplicationStatus} />
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  loader: { marginTop: 40 },
  content: { padding: 20, gap: 24 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  bellButton: { padding: 4 },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: '#ffffff', fontSize: 10, lineHeight: 12 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, rowGap: 20 },
  section: { gap: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  rowText: { flex: 1, gap: 2 },
  assessmentIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  assessmentsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  assessmentsToggleText: { flex: 1 },
});
