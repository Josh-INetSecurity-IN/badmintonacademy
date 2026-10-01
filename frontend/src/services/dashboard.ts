import { api } from './api';
import type { ApiResponse } from '@/types';

export const getDashboardSummary = async (): Promise<Record<string, unknown>> => {
  const res = await api.get<ApiResponse<Record<string, unknown>>>('/dashboard/summary');
  return res.data.data;
};

export const getDashboardCharts = async (params?: { range?: string; from?: string; to?: string }): Promise<Record<string, unknown>> => {
  const res = await api.get<ApiResponse<Record<string, unknown>>>('/dashboard/charts', { params });
  return res.data.data;
};
