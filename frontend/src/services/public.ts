import { api } from './api';
import type { ApiResponse, Tournament } from '@/types';

export interface PublicBatch {
  id: number;
  type: 'coaching' | 'regular';
  name: string;
  coach?: { id: number; name: string } | null;
  court?: { id: number; name: string } | null;
  daysOfWeek: string[];
  startTime: string;
  endTime: string;
  startDate: string;
  color?: string;
  ageGroup?: string | null;
  skillLevel?: string;
  programType?: string;
  monthlyFee?: number;
  monthlyPrice?: number;
  maxCapacity?: number;
  maxPlayers?: number;
  description?: string | null;
  notes?: string | null;
}

export interface PublicBatchesResponse {
  coaching: PublicBatch[];
  regular: PublicBatch[];
  batches: PublicBatch[];
}

export const getAcademyInfo = async (): Promise<Record<string, unknown>> => {
  const res = await api.get<ApiResponse<Record<string, unknown>>>('/public/academy');
  return res.data.data;
};

export const getPublicBatches = async (): Promise<PublicBatchesResponse> => {
  const res = await api.get<ApiResponse<PublicBatchesResponse>>('/public/batches');
  return res.data.data;
};

export const getPublicTournaments = async (): Promise<Tournament[]> => {
  const res = await api.get<ApiResponse<Tournament[]>>('/public/tournaments');
  return res.data.data;
};

export const getPublicGallery = async (): Promise<unknown[]> => {
  const res = await api.get<ApiResponse<unknown[]>>('/public/gallery');
  return res.data.data;
};

export const submitEnquiry = async (data: unknown): Promise<void> => {
  await api.post('/public/enquiries', data);
};
