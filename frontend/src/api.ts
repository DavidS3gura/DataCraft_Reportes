/*
 * DataCraft Reportes
 * Desarrollado por Dev DataCraft - Ing. Ivan Mejia
 */
import axios from 'axios';

export const API_URL = import.meta.env.VITE_API_URL || '/api';
export const api = axios.create({ baseURL: API_URL });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('datacraft_access');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use((response) => response, async (error) => {
  const original = error.config;
  if (error.response?.status === 401 && !original?._retry && localStorage.getItem('datacraft_refresh')) {
    original._retry = true;
    try {
      const result = await axios.post(`${API_URL}/auth/refresh`, { refreshToken: localStorage.getItem('datacraft_refresh') });
      localStorage.setItem('datacraft_access', result.data.accessToken);
      original.headers.Authorization = `Bearer ${result.data.accessToken}`;
      return api(original);
    } catch { localStorage.removeItem('datacraft_access'); localStorage.removeItem('datacraft_refresh'); }
  }
  return Promise.reject(error);
});
export function fileUrl(value: string) { return value.startsWith('http') ? value : `${API_URL.replace(/\/api$/, '')}${value}`; }

export type Location = { id: string; name: string; areas: { id: string; name: string; places: { id: string; name: string }[] }[] };
export type User = { id: string; email: string; name: string; role: 'ADMIN' | 'SUPER_ADMIN'; isActive: boolean; createdAt: string };
export type AppSettings = { id: string; notificationPhone?: string; notificationUrl?: string; notificationEnabled: boolean; createdAt: string; updatedAt: string };
export type Report = {
  id: string; code: string; reporterName: string; description: string; priority: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'REPORTED' | 'UNDER_REVIEW' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED'; createdAt: string; updatedAt: string; resolvedAt?: string;
  location: Location; area: { id: string; name: string }; place: { id: string; name: string };
  images: { id: string; url: string; mimeType: string }[];
  statusHistory?: { id: string; from?: string; to: string; note?: string; createdAt: string }[];
  comments?: { id: string; body: string; createdAt: string; isPublic?: boolean; user?: { name: string } }[];
};

export const statusLabel: Record<string, string> = { REPORTED: 'Reportado', UNDER_REVIEW: 'En revisión', IN_PROGRESS: 'En proceso', RESOLVED: 'Subsanado', REJECTED: 'Rechazado' };
export const priorityLabel: Record<string, string> = { LOW: 'Baja', MEDIUM: 'Media', HIGH: 'Alta' };
export const getSettings = () => api.get<AppSettings>('/admin/settings');
export const updateSettings = (data: Partial<AppSettings>) => api.patch<AppSettings>('/admin/settings', data);
