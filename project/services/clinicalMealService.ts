import { apiClient } from '../config/api';

export interface USDAFoodHit {
  fdc_id: number;
  description: string;
}

export interface USDAFoodNutrients {
  fdc_id: number;
  description: string;
  carbs_g_per_100g: number | null;
  energy_kcal_per_100g: number | null;
}

export interface MealGlucosePredictResponse {
  direction: string;
  probability_up: number;
  validation_flags: string[];
  carbs_g_validated: number;
  carbs_recalibrated: boolean;
  glucose_delta_estimate_mg_dl: number | null;
  prediction_rejected: boolean;
  rejection_reason: string | null;
  disclaimer: string;
  features_used?: Record<string, number> | null;
}

export async function searchUsdaFoods(query: string, pageSize = 20): Promise<USDAFoodHit[]> {
  return apiClient.searchUsdaFoods(query, pageSize);
}

export async function getUsdaFoodDetail(fdcId: number): Promise<USDAFoodNutrients> {
  return apiClient.getUsdaFoodDetail(fdcId);
}

export async function patchDiabetesSettings(body: {
  isf_mg_dl_per_unit?: number;
  icr_grams_per_unit?: number;
}): Promise<unknown> {
  return apiClient.patchDiabetesSettings(body);
}

export async function predictMealGlucose(body: {
  carbs_g: number;
  current_glucose_mg_dl: number;
  insulin_units: number;
  meal_hour: number;
  glucose_readings_mg_dl: number[];
  usda_derived_carbs_g?: number | null;
}): Promise<MealGlucosePredictResponse> {
  return apiClient.predictMealGlucose({
    ...body,
    usda_derived_carbs_g: body.usda_derived_carbs_g ?? undefined,
  });
}

export async function dexcomStatus(): Promise<{
  vendor: string;
  models_supported: string[];
  oauth_documentation_url: string;
  configured: boolean;
  note: string;
}> {
  return apiClient.getDexcomIntegrationStatus();
}

export async function importDexcomReadings(glucose_readings_mg_dl: number[]): Promise<{
  readings_mg_dl: number[];
  count: number;
}> {
  return apiClient.importDexcomReadings(glucose_readings_mg_dl);
}
