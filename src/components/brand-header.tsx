import { Image, StyleSheet, View } from 'react-native';

// Same lockup as sql-skreenit's .auth-header.has-image: the transparent logo-banner.webp,
// full card width, sitting directly on the white card (no coloured strip behind it). The
// older logobanner.webp has an opaque near-black background baked in and is no longer used
// on the auth pages.
export function BrandHeader() {
  return (
    <View style={styles.container}>
      <Image
        source={require('@/assets/images/logo-banner.webp')}
        style={styles.image}
        resizeMode="contain"
        accessibilityLabel="Skreenit"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  image: {
    width: '100%',
    aspectRatio: 2520 / 678,
  },
});
