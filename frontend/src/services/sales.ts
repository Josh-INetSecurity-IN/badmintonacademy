import { api } from './api';
import type { ApiResponse, PaginatedData, Product, Sale } from '@/types';

export const getProducts = async (params?: Record<string, unknown>): Promise<PaginatedData<Product>> => {
  const res = await api.get<ApiResponse<PaginatedData<Product>>>('/products', { params });
  return res.data.data;
};

export const getProduct = async (id: number): Promise<Product> => {
  const res = await api.get<ApiResponse<Product>>(`/products/${id}`);
  return res.data.data;
};

export const getLowStockProducts = async (): Promise<Product[]> => {
  const res = await api.get<ApiResponse<Product[]>>('/products/low-stock');
  return res.data.data;
};

export const createProduct = async (data: unknown): Promise<Product> => {
  const res = await api.post<ApiResponse<Product>>('/products', data);
  return res.data.data;
};

export const updateProduct = async (id: number, data: unknown): Promise<Product> => {
  const res = await api.put<ApiResponse<Product>>(`/products/${id}`, data);
  return res.data.data;
};

export const deleteProduct = async (id: number): Promise<void> => {
  await api.delete(`/products/${id}`);
};

export const stockIn = async (id: number, data: unknown): Promise<Product> => {
  const res = await api.post<ApiResponse<Product>>(`/products/${id}/stock-in`, data);
  return res.data.data;
};

export const stockAdjust = async (id: number, data: unknown): Promise<Product> => {
  const res = await api.post<ApiResponse<Product>>(`/products/${id}/stock-adjust`, data);
  return res.data.data;
};

export const getSales = async (params?: Record<string, unknown>): Promise<PaginatedData<Sale>> => {
  const res = await api.get<ApiResponse<PaginatedData<Sale>>>('/sales', { params });
  return res.data.data;
};

export const createSale = async (data: unknown): Promise<Sale> => {
  const res = await api.post<ApiResponse<Sale>>('/sales', data);
  return res.data.data;
};

export const getSalesSummary = async (params: Record<string, unknown>): Promise<Record<string, unknown>> => {
  const res = await api.get<ApiResponse<Record<string, unknown>>>('/sales/summary', { params });
  return res.data.data;
};
