import { FontAwesome6 } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { formatRelativeTime } from '@/lib/format';
import type { Notification } from '@/lib/api/notifications';

const CATEGORY_ICON: Record<string, React.ComponentProps<typeof FontAwesome6>['name']> = {
  application: 'briefcase',
  application_status: 'briefcase',
  application_received: 'briefcase',
  interview: 'video',
  interview_submitted: 'video',
  video_analysis: 'video',
  face_mismatch: 'circle-exclamation',
  system: 'bullhorn',
};

export interface NotificationRowProps {
  notification: Notification;
  onPress: () => void;
}

export function NotificationRow({ notification, onPress }: NotificationRowProps) {
  const theme = useTheme();
  const icon = CATEGORY_ICON[notification.category] ?? 'bell';
  const unread = !notification.read;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: unread ? theme.backgroundSelected : 'transparent' },
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: theme.background }]}>
        <FontAwesome6 name={icon} size={16} color={theme.primary} />
      </View>
      <ThemedView style={styles.textCol}>
        {notification.title ? <ThemedText type="smallBold">{notification.title}</ThemedText> : null}
        <ThemedText type="small" numberOfLines={2}>
          {notification.message}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {formatRelativeTime(notification.created_at)}
        </ThemedText>
      </ThemedView>
      {unread ? <View style={[styles.dot, { backgroundColor: theme.primary }]} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  pressed: {
    opacity: 0.8,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
});
