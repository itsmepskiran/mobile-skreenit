import { FontAwesome6 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';

export interface HighlightTileProps {
  icon: React.ComponentProps<typeof FontAwesome6>['name'];
  label: string;
  value: string;
  colors: readonly [string, string, ...string[]];
  iconColor?: string;
}

// Colored gradient icon-square + label/value, matching sql-skreenit's job-details.html
// "Job Highlights" tiles and reused for the recruiter dashboard's stat tiles.
export function HighlightTile({ icon, label, value, colors, iconColor = '#ffffff' }: HighlightTileProps) {
  return (
    <View style={styles.tile}>
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.iconSquare}>
        <FontAwesome6 name={icon} size={18} color={iconColor} />
      </LinearGradient>
      <View style={styles.textCol}>
        <ThemedText type="small" themeColor="textSecondary">
          {label}
        </ThemedText>
        <ThemedText type="smallBold" numberOfLines={1}>
          {value}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '48%',
  },
  iconSquare: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
    gap: 1,
  },
});
