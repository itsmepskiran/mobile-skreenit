import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StyleSheet } from 'react-native';
import { FontAwesome6, Pressable, View } from '@/components/scoped';

import { useOnGradient } from '@/components/on-gradient';
import { ThemedText } from '@/components/themed-text';
import { Fonts } from '@/constants/theme';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ComponentProps<typeof FontAwesome6>['name'];
  // Shows a back chevron that does router.replace(backTo).
  backTo?: string;
  colors?: readonly [string, string, ...string[]];
  right?: React.ReactNode;
}

// Gradient banner used at the top of the main candidate screens so they don't read as flat white pages.
export function PageHeader({ title, subtitle, icon, backTo, colors = ['#4f46e5', '#7c3aed'], right }: PageHeaderProps) {
  const onGradient = useOnGradient();
  return (
    <LinearGradient colors={onGradient ? ['transparent', 'transparent'] : colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.banner, onGradient && { borderRadius: 0 }]}>
      <View style={styles.row}>
        {backTo ? (
          <Pressable onPress={() => router.replace(backTo as never)} hitSlop={12} style={styles.back}>
            <FontAwesome6 name="chevron-left" size={14} color="#fff" />
          </Pressable>
        ) : null}
        {icon ? (
          <View style={styles.iconWrap}>
            <FontAwesome6 name={icon} size={16} color="#fff" />
          </View>
        ) : null}
        <View style={{ flex: 1 }}>
          <ThemedText type="subtitle" style={styles.title}>{title}</ThemedText>
          {subtitle ? <ThemedText type="small" style={styles.subtitle}>{subtitle}</ThemedText> : null}
        </View>
        {right}
      </View>
      <View style={styles.blobA} pointerEvents="none" />
      <View style={styles.blobB} pointerEvents="none" />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  banner: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 18, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  iconWrap: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  title: { color: '#fff', fontFamily: Fonts.heading },
  subtitle: { color: 'rgba(255,255,255,0.85)' },
  blobA: { position: 'absolute', right: -30, top: -40, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.1)' },
  blobB: { position: 'absolute', right: 50, bottom: -50, width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(255,255,255,0.07)' },
});
