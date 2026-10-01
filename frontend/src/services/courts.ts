import { api } from './api';
import type { ApiResponse, PaginatedData, Court, GuestBooking } from '@/types';

export const getCourts = async (params?: Record<string, unknown>): Promise<PaginatedData<Court>> => {
  const res = await api.get<ApiResponse<PaginatedData<Court>>>('/courts', { params });
  return res.data.data;
};

export const getCourt = async (id: number): Promise<Court> => {
  const res = await api.get<ApiResponse<Court>>(`/courts/${id}`);
  return res.data.data;
};

export const getCourtSchedule = async (params: Record<string, unknown>): Promise<unknown> => {
  const res = await api.get<ApiResponse<unknown>>('/courts/schedule', { params });
  return res.data.data;
};

export const getWeeklyTimetable = async (): Promise<unknown> => {
  const res = await api.get<ApiResponse<unknown>>('/courts/weekly-timetable');
  return res.data.data;
};

export const createCourt = async (data: unknown): Promise<Court> => {
  const res = await api.post<ApiResponse<Court>>('/courts', data);
  return res.data.data;
};

export const updateCourt = async (id: number, data: unknown): Promise<Court> => {
  const res = await api.put<ApiResponse<Court>>(`/courts/${id}`, data);
  return res.data.data;
};

export const deleteCourt = async (id: number): Promise<void> => {
  await api.delete(`/courts/${id}`);
};

export const getGuestBookings = async (params?: Record<string, unknown>): Promise<PaginatedData<GuestBooking>> => {
  const res = await api.get<ApiResponse<PaginatedData<GuestBooking>>>('/guest-bookings', { params });
  return res.data.data;
};

export const createGuestBooking = async (data: unknown): Promise<GuestBooking> => {
  const res = await api.post<ApiResponse<GuestBooking>>('/guest-bookings', data);
  return res.data.data;
};

export const updateGuestBooking = async (id: number, data: unknown): Promise<GuestBooking> => {
  const res = await api.put<ApiResponse<GuestBooking>>(`/guest-bookings/${id}`, data);
  return res.data.data;
};

export const cancelGuestBooking = async (id: number): Promise<void> => {
  await api.post(`/guest-bookings/${id}/cancel`);
};

export const completeGuestBooking = async (id: number): Promise<void> => {
  await api.post(`/guest-bookings/${id}/complete`);
};

export const convertGuestToRegular = async (id: number): Promise<void> => {
  await api.post(`/guest-bookings/${id}/convert-regular`);
};

export const getDailyGuestBookings = async (): Promise<GuestBooking[]> => {
  const res = await api.get<ApiResponse<GuestBooking[]>>('/guest-bookings/daily');
  return res.data.data;
};

export const getGuestRevenue = async (params: Record<string, unknown>): Promise<Record<string, unknown>> => {
  const res = await api.get<ApiResponse<Record<string, unknown>>>('/guest-bookings/revenue', { params });
  return res.data.data;
};
