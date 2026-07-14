import { FontAwesome6 } from '@expo/vector-icons';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

export interface StepDefinition {
  label: string;
  icon: React.ComponentProps<typeof FontAwesome6>['name'];
}

export interface StepperProps {
  steps: StepDefinition[];
  activeIndex: number;
}

// Matches sql-skreenit's detailed-application-form.html .stepper-wrapper —
// a horizontal row of icon-circles + labels, active/completed states colored.
export function Stepper({ steps, activeIndex }: StepperProps) {
  const theme = useTheme();

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {steps.map((step, index) => {
        const isActive = index === activeIndex;
        const isDone = index < activeIndex;
        const color = isActive || isDone ? theme.primary : theme.border;

        return (
          <View key={step.label} style={styles.item}>
            <View style={[styles.circle, { borderColor: color, backgroundColor: isActive || isDone ? theme.primary : 'transparent' }]}>
              {isDone ? (
                <FontAwesome6 name="check" size={14} color="#ffffff" />
              ) : (
                <FontAwesome6 name={step.icon} size={14} color={isActive ? '#ffffff' : theme.textSecondary} />
              )}
            </View>
            <ThemedText type="small" themeColor={isActive ? 'primary' : 'textSecondary'} style={styles.label}>
              {step.label}
            </ThemedText>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 20,
  },
  item: {
    alignItems: 'center',
    gap: 6,
    minWidth: 64,
  },
  circle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    textAlign: 'center',
  },
});
