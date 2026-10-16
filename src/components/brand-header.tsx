import { useState } from 'react';
import { Image, StyleSheet, type LayoutChangeEvent } from 'react-native';
import { View } from '@/components/scoped';

// Same lockup as sql-skreenit's .auth-header.has-image: the transparent skreenit-banner-clear.png (same artwork as sql-skreenit's logo-banner.webp, resized for the phone),
// full card width, sitting directly on the white card (no coloured strip behind it). The
// older logobanner.webp has an opaque near-black background baked in and is no longer used
// on the auth pages. Never name two images so they differ only by dashes (logo-banner vs logobanner):
// Android drops the dashes when it names the file, the two collide, and the build keeps only one.
//
// The height is computed from the measured width instead of relying on `aspectRatio` +
// `width: '100%'`: on Android that combination left the 2520x678 image at its intrinsic pixel
// size, so only a huge, cropped piece of the circle logo showed inside the card.
const ASPECT = 1400 / 377;

export function BrandHeader() {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  return (
    <View style={styles.container}>
      <View style={styles.inner} onLayout={onLayout}>
      {width > 0 ? (
        <Image
          source={require('@/assets/images/skreenit-banner-clear.png')}
          style={{ width, height: width / ASPECT }}
          resizeMode="contain"
          accessibilityLabel="Skreenit"
        />
      ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // A little breathing room so the banner doesn't touch the card edges or the strip above it.
  container: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  inner: {
    width: '100%',
  },
});
