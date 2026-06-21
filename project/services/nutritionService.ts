import { apiClient } from '../config/api';
import type { NutritionMealLogPayload, NutritionToday } from '../types/nutritionToday';

export const nutritionService = {
  getToday(patientId: number) {
    return apiClient.getNutritionToday(patientId) as Promise<NutritionToday>;
  },

  logMeal(patientId: number, payload: NutritionMealLogPayload) {
    return apiClient.logMealNutrition(patientId, payload) as Promise<NutritionToday>;
  },
};
