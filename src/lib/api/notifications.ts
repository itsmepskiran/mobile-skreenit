import { apiDelete, apiGet, apiPut } from '@/lib/api/client';

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
