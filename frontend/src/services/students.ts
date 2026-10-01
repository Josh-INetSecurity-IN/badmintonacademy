import { api } from './api';
import type { ApiResponse, PaginatedData, Student } from '@/types';

export const getStudents = async (params?: Record<string, unknown>): Promise<PaginatedData<Student>> => {
  const res = await api.get<ApiResponse<PaginatedData<Student>>>('/students', { params });
  return res.data.data;
};

export const getStudent = async (id: number): Promise<Student> => {
  const res = await api.get<ApiResponse<Student>>(`/students/${id}`);
  return res.data.data;
};

export const createStudent = async (data: unknown): Promise<Student> => {
  const res = await api.post<ApiResponse<Student>>('/students', data);
  return res.data.data;
};

export const updateStudent = async (id: number, data: unknown): Promise<Student> => {
  const res = await api.put<ApiResponse<Student>>(`/students/${id}`, data);
  return res.data.data;
};

export const deleteStudent = async (id: number): Promise<void> => {
  await api.delete(`/students/${id}`);
};

export const getStudentsByBatch = async (batchId: number): Promise<Student[]> => {
  const res = await api.get<ApiResponse<Student[]>>(`/students/by-batch/${batchId}`);
  return res.data.data;
};

export const assignBatch = async (studentId: number, batchId: number): Promise<void> => {
  await api.post(`/students/${studentId}/assign-batch`, { batchId });
};

export const transferBatch = async (studentId: number, fromBatchId: number, toBatchId: number): Promise<void> => {
  await api.post(`/students/${studentId}/transfer-batch`, { fromBatchId, toBatchId });
};

export const removeFromBatch = async (studentId: number): Promise<void> => {
  await api.post(`/students/${studentId}/remove-batch`);
};

export const archiveStudent = async (id: number): Promise<void> => {
  await api.post(`/students/${id}/archive`);
};

export const uploadStudentPhoto = async (id: number, file: File): Promise<{ photo: string }> => {
  const formData = new FormData();
  formData.append('photo', file);
  const res = await api.post<ApiResponse<{ photo: string }>>(`/students/${id}/photo`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data;
};

export const exportStudents = async (): Promise<Blob> => {
  const res = await api.get('/students/export', { responseType: 'blob' });
  return res.data;
};
