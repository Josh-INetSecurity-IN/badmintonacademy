import { api } from './api';
import type { ApiResponse, PaginatedData, ApiUser } from '@/types';

export const getUsers = async (params?: Record<string, unknown>): Promise<PaginatedData<ApiUser>> => {
  const res = await api.get<ApiResponse<PaginatedData<ApiUser>>>('/users', { params });
  return res.data.data;
};

export const createUser = async (data: unknown): Promise<ApiUser> => {
  const res = await api.post<ApiResponse<ApiUser>>('/users', data);
  return res.data.data;
};

export const updateUser = async (id: number, data: unknown): Promise<ApiUser> => {
  const res = await api.put<ApiResponse<ApiUser>>(`/users/${id}`, data);
  return res.data.data;
};

export const deleteUser = async (id: number): Promise<void> => {
  await api.delete(`/users/${id}`);
};

export const resetPassword = async (id: number, data: unknown): Promise<void> => {
  await api.post(`/users/${id}/reset-password`, data);
};

export const getUserAuditLogs = async (id: number): Promise<unknown[]> => {
  const res = await api.get<ApiResponse<unknown[]>>(`/users/${id}/audit-logs`);
  return res.data.data;
};
