import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ScrollView, StyleSheet } from 'react-native';
import { FontAwesome6, Pressable, View } from '@/components/scoped';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GradientScreen } from '@/components/on-gradient';
import { PageHeader } from '@/components/page-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { COLORS, SERVICES } from '@/lib/premium-services';
import { describeRate, getCandidateRates } from '@/lib/api/service-rates';

export default function PremiumServicesScreen() {
  const theme = useTheme();
  const ratesQuery = useQuery({ queryKey: ['subscription', 'candidate-rates'], queryFn: getCandidateRates });
  const rates = ratesQuery.data?.data;

  return (
    <GradientScreen>
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <PageHeader title="Premium Services" subtitle="Boost your profile" icon="crown" backTo="/(candidate)/profile" colors={['#f59e0b', '#ef4444']} />
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="small" themeColor="textSecondary">
          Paid add-ons that boost your profile — pay with coins as you go, or go unlimited with Career Pass.
        </ThemedText>
        {SERVICES.map((svc) => {
          const rate = svc.rate ? describeRate(rates?.[svc.rate]) : '';
          return (
            <Pressable key={svc.title} onPress={() => router.push(svc.href as never)}>
              <ThemedView style={[styles.card, { borderColor: theme.border, borderLeftColor: COLORS[svc.icon][0], borderLeftWidth: 4 }]}>
                <View style={styles.cardTitleRow}>
                  <LinearGradient colors={COLORS[svc.icon]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.icon}>
                    <FontAwesome6 name={svc.icon} size={16} color="#fff" />
                  </LinearGradient>
                  <ThemedText style={{ flex: 1, fontWeight: '700' }}>{svc.title}</ThemedText>
                  <FontAwesome6 name="chevron-right" size={12} color={theme.textSecondary} />
                </View>
                <ThemedText type="small" themeColor="textSecondary">
                  {svc.description}
                </ThemedText>
                {rate ? (
                  <ThemedText type="smallBold" style={{ color: '#b45309' }}>
                    {rate}
                    {svc.note ? <ThemedText type="small" themeColor="textSecondary">{`  ·  ${svc.note}`}</ThemedText> : null}
                  </ThemedText>
                ) : null}
              </ThemedView>
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
    </GradientScreen>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  content: { padding: 20, gap: 14 },
  card: { borderWidth: 1, borderRadius: Radius.lg, padding: 16, gap: 8 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
