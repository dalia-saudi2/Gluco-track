export type WaterIntakeToday = {
  intake_date: string;
  total_ml: number;
  total_liters: number;
  goal_ml: number;
  goal_liters: number;
  log_count: number;
  cups_equivalent: number;
  glasses_filled: number;
  glasses_total: number;
  goal_reached: boolean;
  updated_at?: string | null;
  last_logged_at?: string | null;
};
