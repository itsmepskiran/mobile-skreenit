import { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Colors } from '@/constants/theme';

const LOGO = require('@/assets/images/splash-icon.png');

const ENTRANCE_DURATION = 650;
const SETTLE_DURATION = 250;
const HOLD_DURATION = 400;

export function WelcomeScreen({ onFinish }: { onFinish: () => void }) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);
  const rotate = useSharedValue(-8);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: ENTRANCE_DURATION, easing: Easing.out(Easing.cubic) });
    scale.value = withSequence(
      withTiming(1.05, { duration: ENTRANCE_DURATION, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: SETTLE_DURATION, easing: Easing.inOut(Easing.quad) }),
    );
    rotate.value = withTiming(0, { duration: ENTRANCE_DURATION + SETTLE_DURATION, easing: Easing.out(Easing.cubic) });

    const timer = setTimeout(() => runOnJS(onFinish)(), ENTRANCE_DURATION + SETTLE_DURATION + HOLD_DURATION);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }, { rotate: `${rotate.value}deg` }],
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={logoStyle}>
        <Image source={LOGO} style={styles.logo} resizeMode="contain" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.primary,
  },
  logo: {
    width: 160,
    height: 160,
  },
});
