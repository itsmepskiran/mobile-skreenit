import { FontAwesome6 } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ASSESSMENT_INVITE_APPLY_URL } from '@/lib/config';

// Deep-link landing page for a "Move to Assessment" guest invite link
// (skreenit://assessment-invite?token=... — see the assessment-invite-modal's
// share link/QR code). Guest candidates are, by definition, people without a
// Skreenit account, and the guest apply/take flow (a 6-step details form +
// the full assessment-taking engine, both driven by a temporary guest JWT
// rather than a normal logged-in session) is already fully built and mobile-
// responsive on the web at assessments.skreenit.com. Reimplementing that
// entire flow natively -- including threading a second, guest-scoped auth
// token through every API call and the whole existing assessment-taking
// engine, which currently assumes exactly one logged-in user -- is high risk
// for a flow whose users don't have this app installed anyway. Deliberate
// scope cut: hand off to the browser, which is what would happen on a device
// without the app installed regardless.
export default function AssessmentInviteHandoffScreen() {
  const theme = useTheme();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const url = token ? `${ASSESSMENT_INVITE_APPLY_URL}?token=${encodeURIComponent(token)}` : null;

  useEffect(() => {
    if (url) Linking.openURL(url);
  }, [url]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <FontAwesome6 name="arrow-up-right-from-square" size={28} color={theme.primary} />
        <ThemedText type="subtitle" style={styles.centerText}>
          Opening your assessment invite…
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
          This link opens in your browser to complete your details and take the assessment.
        </ThemedText>
        {url ? (
          <Pressable style={[styles.button, { backgroundColor: theme.primary }]} onPress={() => Linking.openURL(url)}>
            <ThemedText type="smallBold" style={{ color: '#fff' }}>
              Open in Browser
            </ThemedText>
          </Pressable>
        ) : (
          <ThemedText type="small" style={{ color: theme.danger }}>
            This invite link is missing its token.
          </ThemedText>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  centerText: { textAlign: 'center' },
  button: { borderRadius: Radius.md, paddingHorizontal: 24, paddingVertical: 12, marginTop: 8 },
});
