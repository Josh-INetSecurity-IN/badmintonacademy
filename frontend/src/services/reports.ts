import { api } from './api';
import type { ApiResponse } from '@/types';

export const getRevenueReport = async (params: Record<string, unknown>): Promise<Record<string, unknown>> => {
  const res = await api.get<ApiResponse<Record<string, unknown>>>('/reports/revenue', { params });
  return res.data.data;
};

export const getExpenseReport = async (params: Record<string, unknown>): Promise<Record<string, unknown>> => {
  const res = await api.get<ApiResponse<Record<string, unknown>>>('/reports/expenses', { params });
  return res.data.data;
};

export const getNetIncome = async (params: Record<string, unknown>): Promise<Record<string, unknown>> => {
  const res = await api.get<ApiResponse<Record<string, unknown>>>('/reports/net-income', { params });
  return res.data.data;
};

export const getOutstandingReport = async (): Promise<Record<string, unknown>> => {
  const res = await api.get<ApiResponse<Record<string, unknown>>>('/reports/outstanding');
  return res.data.data;
};

export const getOperationalReport = async (): Promise<Record<string, unknown>> => {
  const res = await api.get<ApiResponse<Record<string, unknown>>>('/reports/operational');
  return res.data.data;
};

export const getCollectedVsPending = async (params: Record<string, unknown>): Promise<Record<string, unknown>> => {
  const res = await api.get<ApiResponse<Record<string, unknown>>>('/reports/collected-vs-pending', { params });
  return res.data.data;
};
