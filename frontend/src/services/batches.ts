import { api } from './api';
import type { ApiResponse, PaginatedData, CoachingBatch, RegularBatch, ApiUser } from '@/types';

export const getCoachingBatches = async (params?: Record<string, unknown>): Promise<PaginatedData<CoachingBatch>> => {
  const res = await api.get<ApiResponse<PaginatedData<CoachingBatch>>>('/coaching-batches', { params });
  return res.data.data;
};

export const getCoachingBatch = async (id: number): Promise<CoachingBatch> => {
  const res = await api.get<ApiResponse<CoachingBatch>>(`/coaching-batches/${id}`);
  return res.data.data;
};

export const getBatchRoster = async (id: number): Promise<unknown> => {
  const res = await api.get<ApiResponse<unknown>>(`/coaching-batches/${id}/roster`);
  return res.data.data;
};

export const getBatchCalendar = async (): Promise<unknown> => {
  const res = await api.get<ApiResponse<unknown>>('/coaching-batches/calendar');
  return res.data.data;
};

export const createCoachingBatch = async (data: unknown): Promise<CoachingBatch> => {
  const res = await api.post<ApiResponse<CoachingBatch>>('/coaching-batches', data);
  return res.data.data;
};

export const updateCoachingBatch = async (id: number, data: unknown): Promise<CoachingBatch> => {
  const res = await api.put<ApiResponse<CoachingBatch>>(`/coaching-batches/${id}`, data);
  return res.data.data;
};

export const deleteCoachingBatch = async (id: number): Promise<void> => {
  await api.delete(`/coaching-batches/${id}`);
};

export const assignStudentsToBatch = async (batchId: number, studentIds: number[]): Promise<void> => {
  await api.post(`/coaching-batches/${batchId}/students`, { studentIds });
};

export const removeStudentFromBatch = async (batchId: number, studentId: number): Promise<void> => {
  await api.delete(`/coaching-batches/${batchId}/students/${studentId}`);
};

export const getCoaches = async (): Promise<ApiUser[]> => {
  const res = await api.get<ApiResponse<ApiUser[]>>('/coaches');
  return res.data.data;
};

export const createCoach = async (data: unknown): Promise<ApiUser> => {
  const res = await api.post<ApiResponse<ApiUser>>('/coaches', data);
  return res.data.data;
};

export const updateCoach = async (id: number, data: unknown): Promise<ApiUser> => {
  const res = await api.put<ApiResponse<ApiUser>>(`/coaches/${id}`, data);
  return res.data.data;
};

export const deleteCoach = async (id: number): Promise<void> => {
  await api.delete(`/coaches/${id}`);
};

export const getRegularBatches = async (params?: Record<string, unknown>): Promise<PaginatedData<RegularBatch>> => {
  const res = await api.get<ApiResponse<PaginatedData<RegularBatch>>>('/regular-batches', { params });
  return res.data.data;
};

export const getRegularBatch = async (id: number): Promise<RegularBatch> => {
  const res = await api.get<ApiResponse<RegularBatch>>(`/regular-batches/${id}`);
  return res.data.data;
};

export const getRegularBatchWeeklySchedule = async (): Promise<unknown> => {
  const res = await api.get<ApiResponse<unknown>>('/regular-batches/weekly-schedule');
  return res.data.data;
};

export const createRegularBatch = async (data: unknown): Promise<RegularBatch> => {
  const res = await api.post<ApiResponse<RegularBatch>>('/regular-batches', data);
  return res.data.data;
};

export const updateRegularBatch = async (id: number, data: unknown): Promise<RegularBatch> => {
  const res = await api.put<ApiResponse<RegularBatch>>(`/regular-batches/${id}`, data);
  return res.data.data;
};

export const deleteRegularBatch = async (id: number): Promise<void> => {
  await api.delete(`/regular-batches/${id}`);
};

export const assignPlayersToRegularBatch = async (batchId: number, playerIds: number[]): Promise<void> => {
  await api.post(`/regular-batches/${batchId}/players`, { playerIds });
};

export const removePlayerFromRegularBatch = async (batchId: number, playerId: number): Promise<void> => {
  await api.delete(`/regular-batches/${batchId}/players/${playerId}`);
};
