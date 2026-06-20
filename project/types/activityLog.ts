export type DailyActivityLog = {
  date: string;
  minutes: number;
  calories?: number;
  note?: string;
};

export type ActivityWeekSummary = {
  days: Array<{
    date: string;
    dayLabel: string;
    dateLabel: string;
    minutes: number;
    intensity: number;
  }>;
  activeDays: number;
  totalMinutes: number;
  totalCalories: number;
};
