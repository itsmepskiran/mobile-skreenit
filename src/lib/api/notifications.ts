import { apiDelete, apiGet, apiPostJson, apiPut } from '@/lib/api/client';

export interface Notification {
  id: string;
  created_by: string;
  title: string | null;
  message: string;
  category: string;
  related_id: string | null;
  is_read: boolean;
  read: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
}

export function listNotifications(params: { unreadOnly?: boolean; limit?: number } = {}) {
  const query = new URLSearchParams();
  if (params.unreadOnly) query.set('unread_only', 'true');
  if (params.limit) query.set('limit', String(params.limit));

  return apiGet<{ ok: boolean; data: { notifications: Notification[]; count: number } }>(
    `/notifications/?${query.toString()}`,
  );
}

export function getUnreadCount() {
  return apiGet<{ ok: boolean; data: { unread_count: number } }>('/notifications/unread-count');
}

export function markAsRead(id: string) {
  return apiPut<{ ok: boolean; message: string }>(`/notifications/${id}/read`);
}

export function markAllAsRead() {
  return apiPut<{ ok: boolean; data: { marked_count: number }; message: string }>('/notifications/read-all');
}

export function deleteNotification(id: string) {
  return apiDelete<{ ok: boolean; message: string }>(`/notifications/${id}`);
}

export function clearAllNotifications() {
  return apiDelete<{ ok: boolean; data: { cleared_count: number }; message: string }>('/notifications/');
}

// Backend has no FCM/APNs infra of its own — it forwards to Expo's push API
// (https://exp.host/--/api/v2/push/send) using tokens registered here.
export function registerDeviceToken(pushToken: string, platform: 'ios' | 'android') {
  return apiPostJson<{ ok: boolean }>('/notifications/register-device', { push_token: pushToken, platform });
}

export function unregisterDeviceToken(pushToken: string) {
  return apiPostJson<{ ok: boolean }>('/notifications/unregister-device', { push_token: pushToken });
}
