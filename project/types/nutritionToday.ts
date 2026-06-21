export type NutritionToday = {
  intake_date: string;
  calories_total: number;
  calories_goal: number;
  carbs_g_total: number;
  carbs_g_goal: number;
  protein_g_total: number;
  protein_g_goal: number;
  fat_g_total: number;
  fat_g_goal: number;
  meal_count: number;
  last_logged_at?: string | null;
};

export type NutritionMealLogPayload = {
  source: 'photo' | 'usda' | 'manual';
  meal_label?: string;
  calories?: number;
  carbs_g?: number;
  protein_g?: number;
  fat_g?: number;
  foods_json?: unknown[];
};
