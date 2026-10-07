import { LinearGradient } from 'expo-linear-gradient';
import { createContext, useContext } from 'react';
import { StyleSheet, View } from 'react-native';

// True while rendering bare content over the brand gradient (text turns white, plain containers go
// transparent). Cards reset it to false so their contents keep the normal dark-on-white look.
export const OnGradientContext = createContext(false);
export const useOnGradient = () => useContext(OnGradientContext);

export function CardScope({ children }: { children: React.ReactNode }) {
  return <OnGradientContext.Provider value={false}>{children}</OnGradientContext.Provider>;
}

export const BRAND_GRADIENT = ['#4338ca', '#6d28d9', '#7c3aed'] as const;

// Full-screen brand gradient (matches the web pages) with white-on-gradient defaults for its children.
export function GradientScreen({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.fill}>
      <LinearGradient colors={BRAND_GRADIENT} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={StyleSheet.absoluteFill} />
      <OnGradientContext.Provider value>{children}</OnGradientContext.Provider>
    </View>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
