import * as Linking from 'expo-linking';
import { StyleSheet, Text } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';

const TERMS_URL = 'https://legal.skreenit.com/terms-conditions.html';
const PRIVACY_URL = 'https://legal.skreenit.com/privacy-policy.html';

export interface AuthFooterProps {
  action: 'logging in to' | 'creating';
}

// Matches sql-skreenit's .auth-form-footer on login.html / registration.html.
export function AuthFooter({ action }: AuthFooterProps) {
  return (
    <ThemedText type="small" themeColor="textSecondary" style={styles.text}>
      By {action} your account, you agree to our{' '}
      <Text style={styles.link} onPress={() => Linking.openURL(TERMS_URL)}>
        Terms & Conditions
      </Text>{' '}
      and{' '}
      <Text style={styles.link} onPress={() => Linking.openURL(PRIVACY_URL)}>
        Privacy Policy
      </Text>
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  text: {
    textAlign: 'center',
  },
  link: {
    color: Colors.light.primary,
    fontWeight: '600',
  },
});
