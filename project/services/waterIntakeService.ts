import { apiClient } from '../config/api';
import type { WaterIntakeToday } from '../types/waterIntake';

export const waterIntakeService = {
  getToday(patientId: number) {
    return apiClient.getWaterIntakeToday(patientId) as Promise<WaterIntakeToday>;
  },

  add(patientId: number, amountMl: number) {
    return apiClient.addWaterIntake(patientId, amountMl) as Promise<WaterIntakeToday>;
  },
};
