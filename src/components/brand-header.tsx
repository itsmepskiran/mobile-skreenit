import { Image, StyleSheet, View } from 'react-native';

import { Colors } from '@/constants/theme';

// Same lockup as sql-skreenit's .auth-header.has-image (logobrand.png banner
// on a white strip). Always light — the web auth header has no dark mode.
export function BrandHeader() {
  return (
    <View style={styles.container}>
      <Image
        source={require('@/assets/images/skreenit-brand.png')}
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
    paddingVertical: 20,
    backgroundColor: Colors.light.backgroundElement,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  image: {
    width: '80%',
    height: 76,
  },
});
