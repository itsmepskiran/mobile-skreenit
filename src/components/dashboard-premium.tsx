import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';
import { FontAwesome6, Pressable, View } from '@/components/scoped';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { describeRate, getCandidateRates } from '@/lib/api/service-rates';
import { COLORS, SERVICES } from '@/lib/premium-services';

// Dashboard panel: the paid candidate services as four quick tiles (live prices from the pricing
// table), with shortcuts to My Purchases and Purchase History. "See all" opens the full Premium
// Services list, which is also still reachable from Profile.
const TILE_COUNT = 4;

export function DashboardPremium() {
  const theme = useTheme();
  const ratesQuery = useQuery({ queryKey: ['subscription', 'candidate-rates'], queryFn: getCandidateRates });
  const rates = ratesQuery.data?.data;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <ThemedText type="smallBold">Premium Services</ThemedText>
        <Pressable onPress={() => router.push('/(candidate)/premium-services')}>
          <ThemedText type="link" themeColor="primary">
            See all
          </ThemedText>
        </Pressable>
      </View>

      <View style={styles.grid}>
        {SERVICES.slice(0, TILE_COUNT).map((svc) => {
          const rate = svc.rate ? describeRate(rates?.[svc.rate], true) : '';
          return (
            <Pressable key={svc.title} style={styles.tileWrap} onPress={() => router.push(svc.href as never)}>
              <ThemedView style={[styles.tile, { borderColor: theme.border }]}>
                <LinearGradient colors={COLORS[svc.icon]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.icon}>
                  <FontAwesome6 name={svc.icon} size={15} color="#fff" />
                </LinearGradient>
                <ThemedText type="smallBold" numberOfLines={2}>
                  {svc.title}
                </ThemedText>
                {rate ? (
                  <ThemedText type="small" style={{ color: '#b45309' }} numberOfLines={2}>
                    {rate}
                  </ThemedText>
                ) : null}
              </ThemedView>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.links}>
        <Pressable style={styles.linkWrap} onPress={() => router.push('/(candidate)/my-purchases')}>
          <ThemedView style={[styles.link, { borderColor: theme.border }]}>
            <FontAwesome6 name="coins" size={13} color={theme.primary} />
            <ThemedText type="smallBold" style={{ flex: 1 }}>My Purchases</ThemedText>
            <FontAwesome6 name="chevron-right" size={11} color={theme.textSecondary} />
          </ThemedView>
        </Pressable>
        <Pressable style={styles.linkWrap} onPress={() => router.push('/(candidate)/purchase-history')}>
          <ThemedView style={[styles.link, { borderColor: theme.border }]}>
            <FontAwesome6 name="receipt" size={13} color={theme.primary} />
            <ThemedText type="smallBold" style={{ flex: 1 }}>Purchase History</ThemedText>
            <FontAwesome6 name="chevron-right" size={11} color={theme.textSecondary} />
          </ThemedView>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tileWrap: { width: '48%', flexGrow: 1 },
  tile: { borderWidth: 1, borderRadius: Radius.lg, padding: 12, gap: 6, minHeight: 112 },
  icon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  links: { flexDirection: 'row', gap: 10 },
  linkWrap: { flex: 1 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 12 },
});
