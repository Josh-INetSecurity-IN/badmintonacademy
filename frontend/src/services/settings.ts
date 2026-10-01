import { api } from './api';
import type { ApiResponse, PaginatedData, Enquiry } from '@/types';

const CONTENT = '/website-content';

export const getSettings = async (): Promise<Record<string, unknown>> => {
  const res = await api.get<ApiResponse<Record<string, unknown>>>('/settings');
  return res.data.data;
};

export const getSettingsGroup = async (group: string): Promise<Record<string, unknown>> => {
  const res = await api.get<ApiResponse<Record<string, unknown>>>(`/settings/group/${group}`);
  return res.data.data;
};

export const updateSettings = async (data: Record<string, string>): Promise<void> => {
  await api.put('/settings', data);
};

export const getHeroSlides = async (): Promise<unknown[]> => {
  const res = await api.get<ApiResponse<unknown[]>>(`${CONTENT}/hero-slides`);
  return res.data.data;
};

export const createHeroSlide = async (data: unknown): Promise<unknown> => {
  const res = await api.post<ApiResponse<unknown>>(`${CONTENT}/hero-slides`, data);
  return res.data.data;
};

export const updateHeroSlide = async (id: number, data: unknown): Promise<unknown> => {
  const res = await api.put<ApiResponse<unknown>>(`${CONTENT}/hero-slides/${id}`, data);
  return res.data.data;
};

export const deleteHeroSlide = async (id: number): Promise<void> => {
  await api.delete(`${CONTENT}/hero-slides/${id}`);
};

export const getPrograms = async (): Promise<unknown[]> => {
  const res = await api.get<ApiResponse<unknown[]>>(`${CONTENT}/programs`);
  return res.data.data;
};

export const createProgram = async (data: unknown): Promise<unknown> => {
  const res = await api.post<ApiResponse<unknown>>(`${CONTENT}/programs`, data);
  return res.data.data;
};

export const updateProgram = async (id: number, data: unknown): Promise<unknown> => {
  const res = await api.put<ApiResponse<unknown>>(`${CONTENT}/programs/${id}`, data);
  return res.data.data;
};

export const deleteProgram = async (id: number): Promise<void> => {
  await api.delete(`${CONTENT}/programs/${id}`);
};

export const getFacilities = async (): Promise<unknown[]> => {
  const res = await api.get<ApiResponse<unknown[]>>(`${CONTENT}/facilities`);
  return res.data.data;
};

export const createFacility = async (data: unknown): Promise<unknown> => {
  const res = await api.post<ApiResponse<unknown>>(`${CONTENT}/facilities`, data);
  return res.data.data;
};

export const updateFacility = async (id: number, data: unknown): Promise<unknown> => {
  const res = await api.put<ApiResponse<unknown>>(`${CONTENT}/facilities/${id}`, data);
  return res.data.data;
};

export const deleteFacility = async (id: number): Promise<void> => {
  await api.delete(`${CONTENT}/facilities/${id}`);
};

export const getGallery = async (): Promise<unknown[]> => {
  const res = await api.get<ApiResponse<unknown[]>>(`${CONTENT}/gallery`);
  return res.data.data;
};

export const uploadGalleryImage = async (data: unknown): Promise<unknown> => {
  const res = await api.post<ApiResponse<unknown>>(`${CONTENT}/gallery`, data);
  return res.data.data;
};

export const updateGalleryImage = async (id: number, data: unknown): Promise<unknown> => {
  const res = await api.put<ApiResponse<unknown>>(`${CONTENT}/gallery/${id}`, data);
  return res.data.data;
};

export const deleteGalleryImage = async (id: number): Promise<void> => {
  await api.delete(`${CONTENT}/gallery/${id}`);
};

export const getTestimonials = async (): Promise<unknown[]> => {
  const res = await api.get<ApiResponse<unknown[]>>(`${CONTENT}/testimonials`);
  return res.data.data;
};

export const createTestimonial = async (data: unknown): Promise<unknown> => {
  const res = await api.post<ApiResponse<unknown>>(`${CONTENT}/testimonials`, data);
  return res.data.data;
};

export const updateTestimonial = async (id: number, data: unknown): Promise<unknown> => {
  const res = await api.put<ApiResponse<unknown>>(`${CONTENT}/testimonials/${id}`, data);
  return res.data.data;
};

export const deleteTestimonial = async (id: number): Promise<void> => {
  await api.delete(`${CONTENT}/testimonials/${id}`);
};

export const getEnquiries = async (params?: Record<string, unknown>): Promise<PaginatedData<Enquiry>> => {
  const res = await api.get<ApiResponse<PaginatedData<Enquiry>>>(`${CONTENT}/enquiries`, { params });
  return res.data.data;
};

export const updateEnquiryStatus = async (id: number, data: unknown): Promise<Enquiry> => {
  const res = await api.put<ApiResponse<Enquiry>>(`${CONTENT}/enquiries/${id}`, data);
  return res.data.data;
};

export const deleteEnquiry = async (id: number): Promise<void> => {
  await api.delete(`${CONTENT}/enquiries/${id}`);
};