import { api } from './api';
import type { ApiResponse, PaginatedData, RegularPlayer } from '@/types';

export const getRegularPlayers = async (params?: Record<string, unknown>): Promise<PaginatedData<RegularPlayer>> => {
  const res = await api.get<ApiResponse<PaginatedData<RegularPlayer>>>('/regular-players', { params });
  return res.data.data;
};

export const getRegularPlayer = async (id: number): Promise<RegularPlayer> => {
  const res = await api.get<ApiResponse<RegularPlayer>>(`/regular-players/${id}`);
  return res.data.data;
};

export const createRegularPlayer = async (data: unknown): Promise<RegularPlayer> => {
  const res = await api.post<ApiResponse<RegularPlayer>>('/regular-players', data);
  return res.data.data;
};

export const updateRegularPlayer = async (id: number, data: unknown): Promise<RegularPlayer> => {
  const res = await api.put<ApiResponse<RegularPlayer>>(`/regular-players/${id}`, data);
  return res.data.data;
};

export const deleteRegularPlayer = async (id: number): Promise<void> => {
  await api.delete(`/regular-players/${id}`);
};

export const assignPlayerToBatch = async (playerId: number, batchId: number): Promise<void> => {
  await api.post(`/regular-players/${playerId}/assign-batch`, { batchId });
};

export const removePlayerFromBatch = async (playerId: number, batchId: number): Promise<void> => {
  await api.post(`/regular-players/${playerId}/remove-batch`, { batchId });
};

export const pausePlayer = async (playerId: number): Promise<void> => {
  await api.post(`/regular-players/${playerId}/pause`);
};

export const resumePlayer = async (playerId: number): Promise<void> => {
  await api.post(`/regular-players/${playerId}/resume`);
};

export const renewPlayer = async (playerId: number): Promise<void> => {
  await api.post(`/regular-players/${playerId}/renew`);
};

export const getExpiredPlayers = async (): Promise<RegularPlayer[]> => {
  const res = await api.get<ApiResponse<RegularPlayer[]>>('/regular-players/expired');
  return res.data.data;
};

export const getUpcomingSessions = async (playerId: number): Promise<unknown> => {
  const res = await api.get<ApiResponse<unknown>>(`/regular-players/upcoming-sessions/${playerId}`);
  return res.data.data;
};
