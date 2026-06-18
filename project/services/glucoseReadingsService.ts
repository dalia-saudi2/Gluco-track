import { apiClient } from '../config/api';
import type {
  GlucoseDashboardData,
  GlucoseReadingCreatePayload,
  GlucoseReadingListResponse,
} from '../types/glucoseReading';

export const glucoseReadingsService = {
  list(patientId: number, page = 1, limit = 30, order: 'asc' | 'desc' = 'desc') {
    return apiClient.getGlucoseReadings(patientId, page, limit, order) as Promise<GlucoseReadingListResponse>;
  },

  getDashboard(patientId: number) {
    return apiClient.getGlucoseDashboard(patientId) as Promise<GlucoseDashboardData>;
  },

  create(patientId: number, payload: GlucoseReadingCreatePayload) {
    return apiClient.createGlucoseReading(patientId, payload) as Promise<{
      id: number;
      status: string;
      measured_at: string;
    }>;
  },
};
