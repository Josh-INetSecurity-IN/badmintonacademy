import { api } from './api';
import type { ApiResponse, PaginatedData, Notification } from '@/types';

export const getNotifications = async (params?: Record<string, unknown>): Promise<PaginatedData<Notification>> => {
  const res = await api.get<ApiResponse<PaginatedData<Notification>>>('/notifications', { params });
  return res.data.data;
};

export const getUnreadCount = async (): Promise<{ count: number }> => {
  const res = await api.get<ApiResponse<{ count: number }>>('/notifications/unread-count');
  return res.data.data;
};

export const getDashboardNotifications = async (): Promise<Notification[]> => {
  const res = await api.get<ApiResponse<Notification[]>>('/notifications/dashboard');
  return res.data.data;
};

export const markRead = async (id: number): Promise<void> => {
  await api.put(`/notifications/${id}/read`);
};

export const markAllRead = async (): Promise<void> => {
  await api.put('/notifications/read-all');
};

export const getReminderTemplate = async (data: { invoiceId: number }): Promise<unknown> => {
  const res = await api.post<ApiResponse<unknown>>('/notifications/remainder-template', data);
  return res.data.data;
};
