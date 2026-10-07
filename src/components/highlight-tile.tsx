import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';
import { FontAwesome6, View } from '@/components/scoped';

import { ThemedText } from '@/components/themed-text';
import { cardSurface, Radius } from '@/constants/theme';
import { useBaseTheme } from '@/hooks/use-theme';

export interface HighlightTileProps {
  icon: React.ComponentProps<typeof FontAwesome6>['name'];
  label: string;
  value: string;
  colors: readonly [string, string, ...string[]];
  iconColor?: string;
  // Render as a white raised card (for use on the brand gradient).
  card?: boolean;
}

// Colored gradient icon-square + label/value, matching sql-skreenit's job-details.html
// "Job Highlights" tiles and reused for the recruiter dashboard's stat tiles.
export function HighlightTile({ icon, label, value, colors, iconColor = '#ffffff', card }: HighlightTileProps) {
  const theme = useBaseTheme();
  return (
    <View style={[styles.tile, card && [styles.cardTile, cardSurface(theme)]]}>
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
    width: '47%',
  },
  cardTile: { flexGrow: 1, flexBasis: '47%', width: undefined, borderRadius: Radius.lg, padding: 12 },
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
