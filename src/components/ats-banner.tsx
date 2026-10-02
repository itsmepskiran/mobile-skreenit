import { FontAwesome6 } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

// Matches sql-skreenit's .ats-banner (login / registration / forgot-password): a tinted strip at
// the top of the auth card that sends corporate users straight to the ATS console login. Colours
// are fixed (like AuthScreenLayout's card) so it reads the same in device dark mode.
export function AtsBanner() {
  return (
    <Pressable style={styles.banner} onPress={() => router.push('/(ats-auth)/login')}>
      <View style={styles.iconBox}>
        <FontAwesome6 name="building" size={15} color="#4F46E5" />
      </View>
      <View style={styles.textBox}>
        <Text style={styles.title}>Hiring for your company?</Text>
        <Text style={styles.sub}>Skip candidate sign-in and go straight to the console.</Text>
      </View>
      <Text style={styles.link}>
        ATS Login <FontAwesome6 name="arrow-right" size={11} color="#4F46E5" />
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    backgroundColor: '#eef2ff',
    borderColor: '#c7d2fe',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: '#e0e7ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBox: { flex: 1 },
  title: { fontSize: 13, fontWeight: '600', color: '#1e293b' },
  sub: { fontSize: 11.5, color: '#1e293b', lineHeight: 16 },
  link: { fontSize: 12.5, fontWeight: '700', color: '#4F46E5' },
});
