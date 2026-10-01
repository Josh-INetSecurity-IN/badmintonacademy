import { api } from './api';
import type { ApiResponse, PaginatedData, FeeInvoice, Payment, Subscription } from '@/types';

export const getFees = async (params?: Record<string, unknown>): Promise<PaginatedData<FeeInvoice>> => {
  const res = await api.get<ApiResponse<PaginatedData<FeeInvoice>>>('/fees', { params });
  return res.data.data;
};

export const getOverdueFees = async (): Promise<FeeInvoice[]> => {
  const res = await api.get<ApiResponse<FeeInvoice[]>>('/fees/overdue');
  return res.data.data;
};

export const getDueSoonFees = async (): Promise<FeeInvoice[]> => {
  const res = await api.get<ApiResponse<FeeInvoice[]>>('/fees/due-soon');
  return res.data.data;
};

export const getOutstandingFees = async (): Promise<FeeInvoice[]> => {
  const res = await api.get<ApiResponse<FeeInvoice[]>>('/fees/outstanding');
  return res.data.data;
};

export const getStudentFees = async (studentId: number): Promise<FeeInvoice[]> => {
  const res = await api.get<ApiResponse<FeeInvoice[]>>(`/fees/student/${studentId}`);
  return res.data.data;
};

export const getRegularPlayerFees = async (playerId: number): Promise<FeeInvoice[]> => {
  const res = await api.get<ApiResponse<FeeInvoice[]>>(`/fees/regular/${playerId}`);
  return res.data.data;
};

export const generateFees = async (data: { month?: string; type?: string }): Promise<unknown> => {
  const res = await api.post<ApiResponse<unknown>>('/fees/generate', data);
  return res.data.data;
};

export const getPayments = async (params?: Record<string, unknown>): Promise<PaginatedData<Payment>> => {
  const res = await api.get<ApiResponse<PaginatedData<Payment>>>('/payments', { params });
  return res.data.data;
};

export const createPayment = async (data: unknown): Promise<Payment> => {
  const res = await api.post<ApiResponse<Payment>>('/payments', data);
  return res.data.data;
};

export const updatePayment = async (id: number, data: unknown): Promise<Payment> => {
  const res = await api.put<ApiResponse<Payment>>(`/payments/${id}`, data);
  return res.data.data;
};

export const cancelPayment = async (id: number): Promise<void> => {
  await api.post(`/payments/${id}/cancel`);
};

export const getPaymentReceipt = async (id: number): Promise<Blob> => {
  const res = await api.get(`/payments/${id}/receipt`, { responseType: 'blob' });
  return res.data;
};

export const getPaymentSummary = async (params: Record<string, unknown>): Promise<Record<string, unknown>> => {
  const res = await api.get<ApiResponse<Record<string, unknown>>>('/payments/summary', { params });
  return res.data.data;
};

export const getSubscriptions = async (params?: Record<string, unknown>): Promise<PaginatedData<Subscription>> => {
  const res = await api.get<ApiResponse<PaginatedData<Subscription>>>('/subscriptions', { params });
  return res.data.data;
};

export const getSubscriptionStats = async (): Promise<Record<string, unknown>> => {
  const res = await api.get<ApiResponse<Record<string, unknown>>>('/subscriptions/stats');
  return res.data.data;
};
