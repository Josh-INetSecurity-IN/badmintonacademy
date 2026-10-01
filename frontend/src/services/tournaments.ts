import { api } from './api';
import type { ApiResponse, PaginatedData, Tournament, TournamentRegistration } from '@/types';

export const getTournaments = async (params?: Record<string, unknown>): Promise<PaginatedData<Tournament>> => {
  const res = await api.get<ApiResponse<PaginatedData<Tournament>>>('/tournaments', { params });
  return res.data.data;
};

export const getTournament = async (id: number): Promise<Tournament> => {
  const res = await api.get<ApiResponse<Tournament>>(`/tournaments/${id}`);
  return res.data.data;
};

export const createTournament = async (data: unknown): Promise<Tournament> => {
  const res = await api.post<ApiResponse<Tournament>>('/tournaments', data);
  return res.data.data;
};

export const updateTournament = async (id: number, data: unknown): Promise<Tournament> => {
  const res = await api.put<ApiResponse<Tournament>>(`/tournaments/${id}`, data);
  return res.data.data;
};

export const deleteTournament = async (id: number): Promise<void> => {
  await api.delete(`/tournaments/${id}`);
};

export const publishTournament = async (id: number): Promise<void> => {
  await api.post(`/tournaments/${id}/publish`);
};

export const registerParticipant = async (id: number, data: unknown): Promise<TournamentRegistration> => {
  const res = await api.post<ApiResponse<TournamentRegistration>>(`/tournaments/${id}/registrations`, data);
  return res.data.data;
};

export const getTournamentParticipants = async (id: number): Promise<TournamentRegistration[]> => {
  const res = await api.get<ApiResponse<TournamentRegistration[]>>(`/tournaments/${id}/participants`);
  return res.data.data;
};
