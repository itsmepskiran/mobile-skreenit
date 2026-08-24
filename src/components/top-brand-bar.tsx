import { Image, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Matches sql-skreenit's `.mobile-header-brand` (assets/assets/css/mobile.css)
// — the real logobanner.webp banner shown at the top of every dashboard-family
// page once the sidebar collapses on small screens. The mobile app has no
// sidebar to collapse from, so this renders unconditionally as a persistent
// strip above every candidate/recruiter screen (see RootLayout) rather than
// only appearing below a breakpoint.
//
// logobanner.webp has an opaque near-black background baked into the file
// itself (~#050206), so this bar is colored to match rather than the
// previous violet (#4F46E5) — a chroma-keyed transparent copy was tried
// before but left the wordmark text looking ghostly, so the real file is
// used here as-is instead.
export function TopBrandBar() {
  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.bar}>
        <Image
          source={require('@/assets/images/logobanner.webp')}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel="Skreenit"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: '#050206' },
  bar: {
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#050206',
  },
  logo: { height: 32, aspectRatio: 600 / 189 },
});
