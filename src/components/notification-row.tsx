import { FontAwesome6 } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { formatRelativeTime } from '@/lib/format';
import type { Notification } from '@/lib/api/notifications';

// Matches sql-skreenit's notification-manager.js getNotificationIcon() exactly.
const CATEGORY_STYLE: Record<string, { icon: React.ComponentProps<typeof FontAwesome6>['name']; color: string }> = {
  application: { icon: 'user-plus', color: '#10b981' },
  new_application: { icon: 'user-plus', color: '#10b981' },
  application_received: { icon: 'circle-check', color: '#10b981' },
  application_status: { icon: 'circle-info', color: '#f59e0b' },
  status_update: { icon: 'circle-info', color: '#f59e0b' },
  interview: { icon: 'video', color: '#4f46e5' },
  interview_invitation: { icon: 'video', color: '#4f46e5' },
  interview_submitted: { icon: 'circle-check', color: '#4f46e5' },
  video_analysis: { icon: 'chart-bar', color: '#4f46e5' },
  video_analysis_error: { icon: 'triangle-exclamation', color: '#e53e3e' },
};

const DEFAULT_STYLE = { icon: 'bell' as const, color: '#6b7280' };

export interface NotificationRowProps {
  notification: Notification;
  onPress: () => void;
}

export function NotificationRow({ notification, onPress }: NotificationRowProps) {
  const style = CATEGORY_STYLE[notification.category] ?? DEFAULT_STYLE;
  const unread = !notification.read;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, unread && styles.unreadRow, pressed && styles.pressed]}
    >
      <View style={[styles.iconWrap, { backgroundColor: `${style.color}1a` }]}>
        <FontAwesome6 name={style.icon} size={16} color={style.color} />
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
      {unread ? <View style={styles.dot} /> : null}
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
  unreadRow: {
    backgroundColor: 'rgba(79,70,229,0.08)',
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
    backgroundColor: '#4f46e5',
  },
});
