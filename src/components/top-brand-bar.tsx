import { Image, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Matches sql-skreenit's `.mobile-header-brand` (assets/assets/css/mobile.css)
// — a small logobrand.png shown at the top of every dashboard-family page
// once the sidebar collapses on small screens. The mobile app has no sidebar
// to collapse from, so this renders unconditionally as a persistent strip
// above every candidate/recruiter screen (see RootLayout) rather than only
// appearing below a breakpoint. The real logobrand.png has an opaque
// near-black background baked into the file itself, which read as a jarring
// black box — `skreenit-brand-transparent.png` is a locally chroma-keyed copy
// (near-black pixels made transparent) so the app's actual violet brand color
// shows through instead.
export function TopBrandBar() {
  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.bar}>
        <Image
          source={require('@/assets/images/skreenit-brand-transparent.png')}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel="Skreenit"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: '#4F46E5' },
  bar: {
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4F46E5',
  },
  logo: { width: 118, height: 32 },
});
