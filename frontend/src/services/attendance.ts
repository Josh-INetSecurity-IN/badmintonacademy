import { api } from './api';
import type { ApiResponse, PaginatedData, AttendanceRecord } from '@/types';

export const getAttendance = async (params?: Record<string, unknown>): Promise<PaginatedData<AttendanceRecord>> => {
  const res = await api.get<ApiResponse<PaginatedData<AttendanceRecord>>>('/attendance', { params });
  return res.data.data;
};

export const getAttendanceOverview = async (): Promise<Record<string, unknown>> => {
  const res = await api.get<ApiResponse<Record<string, unknown>>>('/attendance/overview');
  return res.data.data;
};

interface BatchAttendanceEntry {
  student: { id: number; firstName: string; lastName: string; admissionNumber?: string | null; photo?: string | null };
  attendance: AttendanceRecord | null;
}

interface BatchAttendanceResponse {
  batch: { id: number; name: string };
  date: string;
  students: BatchAttendanceEntry[];
}

export const getBatchAttendance = async (batchId: number, date?: string): Promise<AttendanceRecord[]> => {
  const res = await api.get<ApiResponse<BatchAttendanceResponse | AttendanceRecord[]>>(`/attendance/batch/${batchId}`, {
    params: date ? { date } : undefined,
  });
  const data = res.data.data;
  if (Array.isArray(data)) return data;
  return (data?.students ?? []).map((entry) => ({
    id: entry.student.id,
    date: entry.attendance?.date ?? data.date,
    studentId: entry.student.id,
    batchId,
    status: entry.attendance?.status ?? 'present',
    notes: entry.attendance?.notes ?? null,
    student: {
      id: entry.student.id,
      firstName: entry.student.firstName,
      lastName: entry.student.lastName,
    },
  }));
};

export const getAttendanceReport = async (params: Record<string, unknown>): Promise<Record<string, unknown>> => {
  const res = await api.get<ApiResponse<Record<string, unknown>>>('/attendance/report', { params });
  return res.data.data;
};

export const getStudentAttendance = async (studentId: number, month?: string): Promise<AttendanceRecord[]> => {
  const res = await api.get<ApiResponse<AttendanceRecord[]>>(`/attendance/student/${studentId}`, { params: { month } });
  return res.data.data;
};

export const getPlayerAttendance = async (playerId: number, month?: string): Promise<AttendanceRecord[]> => {
  const res = await api.get<ApiResponse<AttendanceRecord[]>>(`/attendance/player/${playerId}`, { params: { month } });
  return res.data.data;
};

export const markAttendance = async (data: any): Promise<AttendanceRecord[]> => {
  const records =
    Array.isArray(data?.records) && data.records.length > 0 ? data.records : [{ ...data }];
  const res = await api.post<ApiResponse<AttendanceRecord[]>>('/attendance', { date: data.date, records });
  return res.data.data;
};

export const markBulkAttendance = async (data: unknown): Promise<AttendanceRecord[]> => {
  const res = await api.post<ApiResponse<AttendanceRecord[]>>('/attendance/bulk', data);
  return res.data.data;
};