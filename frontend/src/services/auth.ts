import { api } from './api';
import type { ApiResponse, ApiUser, LoginResponse } from '@/types';

export const login = async (email: string, password: string): Promise<LoginResponse> => {
  const res = await api.post<ApiResponse<LoginResponse>>('/auth/login', { email, password });
  return res.data.data;
};

export const getProfile = async (): Promise<ApiUser> => {
  const res = await api.get<ApiResponse<ApiUser>>('/auth/profile');
  return res.data.data;
};

export const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
  await api.put('/auth/change-password', { currentPassword, newPassword });
};
