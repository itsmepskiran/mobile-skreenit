import { LinearGradient } from 'expo-linear-gradient';
import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { FontAwesome6, Pressable, View } from '@/components/scoped';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';

// First-launch walkthrough, shown once (before sign-in) after the welcome logo: what Skreenit does
// for candidates, how practice works, and how coins and plans work.
const SLIDES: { icon: React.ComponentProps<typeof FontAwesome6>['name']; title: string; body: string; colors: [string, string] }[] = [
  {
    icon: 'briefcase',
    title: 'Find roles that fit you',
    body: 'AI ranks open jobs against your skills and assessment scores. Apply in one tap and track every application in one place.',
    colors: ['#667eea', '#764ba2'],
  },
  {
    icon: 'video',
    title: 'Practise and get better',
    body: 'Rehearse with mock interviews and get your intro video analysed. See your speaking, confidence and content scores, with a report to keep.',
    colors: ['#0ea5e9', '#6366f1'],
  },
  {
    icon: 'coins',
    title: 'Pay only for what you use',
    body: 'Sign up and get 100 free coins. Use them on resume writing, reports and practice, or pick a plan if you practise often.',
    colors: ['#f59e0b', '#ef4444'],
  },
];

export function IntroSlides({ onDone }: { onDone: () => void }) {
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const scroller = useRef<ScrollView>(null);
  const last = index === SLIDES.length - 1;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
  };
  const next = () => {
    if (last) onDone();
    else scroller.current?.scrollTo({ x: (index + 1) * width, animated: true });
  };

  return (
    <LinearGradient colors={SLIDES[index].colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fill}>
      <SafeAreaView style={styles.fill}>
        <View style={styles.skipRow}>
          {!last ? (
            <Pressable onPress={onDone} hitSlop={12}>
              <ThemedText type="smallBold" style={{ color: '#fff' }}>Skip</ThemedText>
            </Pressable>
          ) : null}
        </View>
        <ScrollView ref={scroller} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={onScroll} style={styles.fill}>
          {SLIDES.map((s) => (
            <View key={s.title} style={[styles.slide, { width }]}>
              <View style={styles.iconCircle}>
                <FontAwesome6 name={s.icon} size={44} color="#fff" />
              </View>
              <ThemedText type="title" style={styles.title}>{s.title}</ThemedText>
              <ThemedText style={styles.body}>{s.body}</ThemedText>
            </View>
          ))}
        </ScrollView>
        <View style={styles.footer}>
          <View style={styles.dots}>
            {SLIDES.map((s, i) => (
              <View key={s.title} style={[styles.dot, i === index && styles.dotActive]} />
            ))}
          </View>
          <Pressable style={styles.button} onPress={next}>
            <ThemedText type="smallBold" style={{ color: '#4338ca' }}>{last ? 'Get started' : 'Next'}</ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  skipRow: { height: 40, alignItems: 'flex-end', justifyContent: 'center', paddingHorizontal: 24 },
  slide: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36, gap: 18 },
  iconCircle: { width: 110, height: 110, borderRadius: 55, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  title: { color: '#fff', textAlign: 'center' },
  body: { color: 'rgba(255,255,255,0.92)', textAlign: 'center', fontSize: 16, lineHeight: 24 },
  footer: { paddingHorizontal: 24, paddingBottom: 24, gap: 20 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.4)' },
  dotActive: { width: 22, backgroundColor: '#fff' },
  button: { backgroundColor: '#fff', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
});
