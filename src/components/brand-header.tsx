import { Image, StyleSheet, View } from 'react-native';

// Same lockup as sql-skreenit's .auth-header.has-image — the real
// logobanner.webp banner, used as-is. That file has an opaque near-black
// background baked in (~#050206), so the container is colored to match
// rather than sitting behind it as a mismatched light strip.
export function BrandHeader() {
  return (
    <View style={styles.container}>
      <Image
        source={require('@/assets/images/logobanner.webp')}
        style={styles.image}
        resizeMode="contain"
        accessibilityLabel="Skreenit"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    backgroundColor: '#050206',
  },
  image: {
    height: 90,
    aspectRatio: 600 / 189,
  },
});
