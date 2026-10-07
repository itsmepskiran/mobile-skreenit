import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import { FontAwesome6, Pressable, TextInput, View } from '@/components/scoped';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnalysisCards } from '@/components/analysis-cards';
import { AnswerRecorder } from '@/components/answer-recorder';
import { Button } from '@/components/button';
import { useCoinConsent } from '@/components/coin-consent-modal';
import { RazorpayCheckout, type RazorpaySuccess } from '@/components/razorpay-checkout';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius } from '@/constants/theme';
import { useOrderReview } from '@/hooks/use-order-review';
import { useTheme } from '@/hooks/use-theme';
import {
  downloadSessionReport,
  getMockQuote,
  getMockSession,
  listMockRoles,
  listMockSessions,
  startMockSession,
  submitMockAnswer,
  type InterviewRole,
  type InterviewSession,
} from '@/lib/api/interview';
import {
  confirmSubscription,
  createSubscription,
  listPricingPlans,
  type PricingPlan,
} from '@/lib/api/subscription';
import { useAuthStore } from '@/lib/auth/store';

const DEFAULT_ANSWER_SECONDS = 120;
const POLL_MS = 6000;
const LEVELS = [
  { label: 'Any', value: '' },
  { label: 'Fresher', value: 'fresher' },
  { label: '1–3 yrs', value: '1-3 years' },
  { label: '3–7 yrs', value: '3-7 years' },
  { label: '7+ yrs', value: '7+ years' },
];
const COUNTS = [3, 4, 5];

function cycleLabel(plan: PricingPlan): string {
  const bc = (plan.billing_cycle ?? '').toLowerCase();
  if (/half/.test(bc)) return '6 months';
  if (/quarter/.test(bc)) return '3 months';
  if (/year|annual/.test(bc)) return 'year';
  if (/month/.test(bc)) return 'month';
  return 'plan';
}

type Checkout = { keyId: string; orderId: string; amount: number; currency: string; name: string; subscriptionId: string };

// Mobile twin of the web's applicant/mock-interview.html: plans, a searchable role picker
// (open job postings or your own role), a video interview with a plan-defined time limit per
// answer, then per-answer feedback cards and a downloadable report.
export default function MockInterviewScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { reviewOrder, reviewElement, showReceipt } = useOrderReview();
  const authUser = useAuthStore((state) => state.user);
  const { confirmSpend, consentModal } = useCoinConsent();

  // undefined = untouched: show the session named by ?session=<id> (from the Practice screen), if any.
  const { session: sessionParam } = useLocalSearchParams<{ session?: string }>();
  const [local, setSession] = useState<InterviewSession | null | undefined>(undefined);
  const paramSession = useQuery({
    queryKey: ['candidate', 'mock-session', sessionParam],
    queryFn: () => getMockSession(sessionParam as string),
    enabled: !!sessionParam,
  });
  const session = local === undefined ? (paramSession.data?.data ?? null) : local;
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [checkout, setCheckout] = useState<Checkout | null>(null);

  // Setup form
  const [roleText, setRoleText] = useState('');
  const [pickedRole, setPickedRole] = useState<InterviewRole | null>(null);
  const [roleFocused, setRoleFocused] = useState(false);
  const [level, setLevel] = useState('');
  const [count, setCount] = useState(3);

  const quoteQuery = useQuery({ queryKey: ['candidate', 'mock-quote'], queryFn: getMockQuote });
  const rolesQuery = useQuery({ queryKey: ['candidate', 'mock-roles'], queryFn: listMockRoles });
  const plansQuery = useQuery({ queryKey: ['subscription', 'plans', 'candidate_addon'], queryFn: () => listPricingPlans('candidate_addon') });
  const pastQuery = useQuery({ queryKey: ['candidate', 'mock-sessions'], queryFn: listMockSessions });
  const quote = quoteQuery.data?.data;
  const roles = useMemo(() => rolesQuery.data?.data ?? [], [rolesQuery.data]);
  const plans = useMemo(
    () =>
      (plansQuery.data?.data ?? [])
        .filter((p) => p.service_key.startsWith('interview_plan_'))
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    [plansQuery.data],
  );

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ['candidate', 'mock-quote'] });
    queryClient.invalidateQueries({ queryKey: ['candidate', 'mock-sessions'] });
    queryClient.invalidateQueries({ queryKey: ['candidate', 'credits-summary'] });
  };

  // Poll while answers are being analysed.
  useEffect(() => {
    if (!session || session.status === 'completed' || !session.answers.some((a) => a.status === 'analyzing')) return;
    const timer = setTimeout(async () => {
      try {
        const updated = (await getMockSession(session.id)).data;
        setSession(updated);
        if (updated.status === 'completed') refreshAll();
      } catch {
        /* retry next tick */
      }
    }, POLL_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const matches = useMemo(() => {
    const q = roleText.trim().toLowerCase();
    return (q ? roles.filter((r) => r.title.toLowerCase().includes(q)) : roles).slice(0, 6);
  }, [roles, roleText]);

  const chosenRole = () => {
    const text = roleText.trim();
    if (pickedRole && pickedRole.title === text) return { job_id: pickedRole.job_id, target_role: null as string | null };
    const exact = roles.find((r) => r.title.toLowerCase() === text.toLowerCase());
    if (exact) return { job_id: exact.job_id, target_role: null as string | null };
    return { job_id: null as string | null, target_role: text };
  };

  const start = async () => {
    setError(null);
    const role = chosenRole();
    if (!role.job_id && (role.target_role ?? '').length < 2) {
      setError('Please search for or type the role you are preparing for.');
      return;
    }
    if (!(await confirmSpend({ action: 'mock_interview' }))) return;
    setBusy(true);
    try {
      const res = await startMockSession({ ...role, experience_level: level || null, question_count: count });
      setSession(res.data);
      refreshAll();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'Could not start the mock interview.');
    } finally {
      setBusy(false);
    }
  };

  const openSession = async (id: string) => {
    try {
      setSession((await getMockSession(id)).data);
    } catch {
      setError('Could not open that session.');
    }
  };

  const submitAnswer = useMutation({
    mutationFn: async ({ index, file }: { index: number; file: Parameters<typeof submitMockAnswer>[2] }) => {
      if (!session) throw new Error('No interview in progress.');
      await submitMockAnswer(session.id, index, file);
      return (await getMockSession(session.id)).data;
    },
    onSuccess: setSession,
  });

  // ── Plan checkout (same Razorpay subscription flow as Career Pass) ──
  const buyPlan = useMutation({
    mutationFn: async (plan: PricingPlan) => {
      const sub = await createSubscription(plan.id);
      return reviewOrder({
        subscriptionId: sub.data.subscription_id,
        name: plan.name,
        priceInr: plan.price_inr,
        serviceType: plan.service_type,
      });
    },
    onSuccess: (next) => {
      if (next) setCheckout(next);
    },
    onError: (err) => setError(err instanceof Error && err.message ? err.message : 'Could not start checkout.'),
  });

  const confirmPlan = useMutation({
    mutationFn: (success: RazorpaySuccess) => {
      if (!checkout) throw new Error('No checkout in progress.');
      return confirmSubscription({
        subscriptionId: checkout.subscriptionId,
        paymentMethod: 'razorpay',
        transactionId: success.razorpay_payment_id,
        amountPaid: checkout.amount / 100,
      });
    },
    onSuccess: (_data, success) => {
      setCheckout(null);
      showReceipt(success, 'confirmed');
      refreshAll();
    },
    onError: (_err, success) => {
      setCheckout(null);
      showReceipt(success, 'unconfirmed');
    },
  });

  const download = async () => {
    if (!session) return;
    setDownloading(true);
    try {
      await downloadSessionReport('mock', session.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not download the report.');
    } finally {
      setDownloading(false);
    }
  };

  const header = (
    <View style={styles.headerRow}>
      <Pressable
        onPress={() => (session ? (setSession(null), refreshAll()) : router.replace('/(candidate)/premium-services'))}
        hitSlop={12}
      >
        <FontAwesome6 name="chevron-left" size={16} color={theme.text} />
      </Pressable>
      <ThemedText type="subtitle">Mock Interview</ThemedText>
    </View>
  );

  const nextQuestion = session?.answers.find((a) => a.status === 'pending' || a.status === 'failed');

  // ── Interview ──
  if (session && session.status === 'in_progress' && nextQuestion) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        {header}
        <AnswerRecorder
          key={nextQuestion.question_index}
          progress={`Question ${nextQuestion.question_index + 1} of ${session.answers.length}`}
          question={nextQuestion.question}
          maxSeconds={session.answer_seconds ?? DEFAULT_ANSWER_SECONDS}
          onSubmit={async (file) => {
            await submitAnswer.mutateAsync({ index: nextQuestion.question_index, file });
          }}
        />
        {consentModal}
      </SafeAreaView>
    );
  }

  // ── Results ──
  if (session) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        {header}
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="subtitle">{session.target_role}</ThemedText>
          <AnalysisCards session={session} />
          {error ? <ThemedText type="small" style={{ color: theme.danger }}>{error}</ThemedText> : null}
          {session.status === 'completed' ? (
            <Button title="Download full report (PDF)" icon="download" loading={downloading} onPress={download} />
          ) : (
            <ThemedText type="small" themeColor="textSecondary">
              You can leave this screen — we&apos;ll notify you when your feedback is ready.
            </ThemedText>
          )}
          <Button title="Practise again" variant="secondary" icon="rotate-right" onPress={() => { setSession(null); refreshAll(); }} />
        </ScrollView>
        {consentModal}
      </SafeAreaView>
    );
  }

  // ── Setup ──
  const blocked = quote?.method === 'blocked';
  const len = quote?.max_minutes ? ` · up to ${quote.max_minutes} min each` : '';
  let allowance = '';
  if (quote) {
    if (blocked) allowance = `You have reached today's limit of ${quote.daily_limit} interviews on your ${quote.plan_name} plan. It resets tomorrow.`;
    else if (quote.source === 'plan')
      allowance =
        quote.plan_remaining == null
          ? `Your ${quote.plan_name} plan: unlimited interviews${quote.daily_limit ? ` (up to ${quote.daily_limit} a day)` : ''}${len}.`
          : `Your ${quote.plan_name} plan: ${quote.plan_remaining} of ${quote.plan_limit} interviews left${len}.`;
    else if (quote.source === 'free') allowance = `Free plan: ${quote.plan_remaining} of ${quote.plan_limit} free interviews left${len}.`;
    else
      allowance = `${quote.exhausted_plan ? `Your ${quote.exhausted_plan} plan is used up` : 'Your free interviews are used up'}. One more interview costs ${quote.coins_required} coins (balance: ${quote.balance})${len} — or choose a plan below.`;
  }
  const past = pastQuery.data?.data ?? [];

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      {header}
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ThemedText type="small" themeColor="textSecondary">
          Pick the role you are preparing for. We ask AI-written questions, you answer on camera, and you get feedback and a detailed
          report.
        </ThemedText>

        {/* Role picker */}
        <View style={{ gap: 6 }}>
          <ThemedText type="smallBold">Target role</ThemedText>
          <TextInput
            value={roleText}
            onChangeText={(t) => {
              setRoleText(t);
              setPickedRole(null);
            }}
            onFocus={() => setRoleFocused(true)}
            onBlur={() => setTimeout(() => setRoleFocused(false), 150)}
            placeholder="Search or type a role…"
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { borderColor: theme.border, color: theme.text }]}
          />
          {roleFocused ? (
            <ThemedView style={[styles.dropdown, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
              {matches.map((r) => (
                <Pressable
                  key={r.job_id}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setPickedRole(r);
                    setRoleText(r.title);
                    setRoleFocused(false);
                  }}
                >
                  <ThemedText type="small">{r.title}</ThemedText>
                </Pressable>
              ))}
              {roleText.trim().length >= 2 && !roles.some((r) => r.title.toLowerCase() === roleText.trim().toLowerCase()) ? (
                <Pressable style={styles.dropdownItem} onPress={() => setRoleFocused(false)}>
                  <ThemedText type="smallBold" themeColor="primary">Use “{roleText.trim()}” as my own role</ThemedText>
                </Pressable>
              ) : null}
              {!matches.length && roleText.trim().length < 2 ? (
                <ThemedText type="small" themeColor="textSecondary" style={styles.dropdownItem}>
                  No open roles right now — type your own.
                </ThemedText>
              ) : null}
            </ThemedView>
          ) : null}
          <ThemedText type="small" themeColor="textSecondary">
            Roles come from jobs open on Skreenit — your questions are based on the job posting. Or type any role.
          </ThemedText>
        </View>

        <View style={{ gap: 6 }}>
          <ThemedText type="smallBold">Experience level</ThemedText>
          <View style={styles.chips}>
            {LEVELS.map((l) => (
              <Chip key={l.label} label={l.label} active={level === l.value} onPress={() => setLevel(l.value)} />
            ))}
          </View>
        </View>
        <View style={{ gap: 6 }}>
          <ThemedText type="smallBold">Number of questions</ThemedText>
          <View style={styles.chips}>
            {COUNTS.map((c) => (
              <Chip key={c} label={String(c)} active={count === c} onPress={() => setCount(c)} />
            ))}
          </View>
        </View>

        {allowance ? (
          <View style={styles.costBox}>
            <FontAwesome6 name="coins" size={14} color="#92400e" />
            <ThemedText type="small" style={{ color: '#92400e', flex: 1 }}>{allowance}</ThemedText>
          </View>
        ) : null}
        {error ? <ThemedText type="small" style={{ color: theme.danger }}>{error}</ThemedText> : null}
        <Button title="Start mock interview" icon="play" loading={busy} disabled={blocked} onPress={start} />

        {/* Plans */}
        <ThemedText type="subtitle" style={{ marginTop: 6 }}>Plans</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          All prices include GST. Each plan shows how long it is valid; the Free plan is one-time. After your interviews run out you can
          still practise for coins.
        </ThemedText>
        {plans.map((p) => {
          const free = Number(p.price_inr) === 0;
          const current = !!quote && quote.source !== 'coins' && quote.plan_name === p.name;
          const countText =
            p.interview_limit == null
              ? `Unlimited interviews${p.interview_daily_limit ? ` (up to ${p.interview_daily_limit} a day)` : ''}`
              : `${p.interview_limit} interviews${free ? ' (one-time)' : ''}`;
          return (
            <ThemedView key={p.id} style={[styles.plan, { borderColor: current ? '#4338ca' : theme.border }]}>
              <View style={styles.planTop}>
                <ThemedText type="subtitle">{p.name}</ThemedText>
                {current ? <ThemedText type="small" style={{ color: '#4338ca', fontWeight: '700' }}>Your plan</ThemedText> : p.service_key === 'interview_plan_popular' ? <ThemedText type="small" style={{ color: '#b45309', fontWeight: '700' }}>Most popular</ThemedText> : null}
              </View>
              <ThemedText type="title">
                {free ? 'Free' : `₹${Number(p.price_inr).toLocaleString('en-IN')}`}
                {!free ? <ThemedText type="small" themeColor="textSecondary">{` / ${cycleLabel(p)}`}</ThemedText> : null}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">✓ {countText}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">✓ Up to {p.interview_max_minutes} min each</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">✓ AI feedback &amp; Detailed Report</ThemedText>
              {!free ? (
                <Button
                  title={current ? 'Renew / extend' : 'Choose plan'}
                  variant="secondary"
                  loading={buyPlan.isPending && buyPlan.variables?.id === p.id}
                  onPress={() => {
                    setError(null);
                    buyPlan.mutate(p);
                  }}
                />
              ) : null}
            </ThemedView>
          );
        })}

        {past.length ? (
          <>
            <ThemedText type="subtitle" style={{ marginTop: 6 }}>Your previous sessions</ThemedText>
            {past.map((s) => (
              <Pressable key={s.id} onPress={() => openSession(s.id)}>
                <ThemedView style={[styles.pastRow, { borderColor: theme.border }]}>
                  <View style={{ flex: 1 }}>
                    <ThemedText type="smallBold">{s.target_role}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {s.created_at ? new Date(s.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''} ·{' '}
                      {s.status === 'completed' ? 'Completed' : 'In progress'}
                    </ThemedText>
                  </View>
                  {s.overall_score != null ? (
                    <ThemedText type="subtitle" style={{ color: '#4338ca' }}>{s.overall_score}</ThemedText>
                  ) : (
                    <FontAwesome6 name="chevron-right" size={12} color={theme.textSecondary} />
                  )}
                </ThemedView>
              </Pressable>
            ))}
          </>
        ) : null}
        {quoteQuery.isLoading || plansQuery.isLoading ? <ActivityIndicator color={theme.primary} /> : null}
      </ScrollView>

      {consentModal}
      {reviewElement}
      {checkout ? (
        <RazorpayCheckout
          visible
          keyId={checkout.keyId}
          orderId={checkout.orderId}
          amount={checkout.amount}
          currency={checkout.currency}
          name="Skreenit Recruitment Platform"
          description={checkout.name}
          prefill={{ name: authUser?.full_name ?? '', email: authUser?.email ?? '' }}
          onSuccess={(success) => confirmPlan.mutate(success)}
          onDismiss={() => setCheckout(null)}
        />
      ) : null}
    </SafeAreaView>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, { borderColor: theme.border }, active && { backgroundColor: theme.primary, borderColor: theme.primary }]}
    >
      <ThemedText type="small" style={{ color: active ? '#fff' : theme.text }}>{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  content: { padding: 20, gap: 14 },
  input: { borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15 },
  dropdown: { borderWidth: 1, borderRadius: Radius.md, overflow: 'hidden' },
  dropdownItem: { paddingHorizontal: 14, paddingVertical: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  costBox: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: '#fffbeb', borderColor: '#fde68a', borderWidth: 1, borderRadius: Radius.md, padding: 10 },
  plan: { borderWidth: 1, borderRadius: Radius.lg, padding: 16, gap: 6 },
  planTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pastRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: Radius.md, padding: 12 },
});
