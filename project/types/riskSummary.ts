export type RiskSummary = {
  risk_score: number;
  is_estimated: boolean;
  diabetes_stage: number;
  diabetes_stage_label: string;
  features_used: number;
  features_total: number;
  lab_upload_pending: boolean;
  lab_data_complete: boolean;
  profile_completeness_pct: number;
  feature_pills: {
    lifestyle: boolean;
    body: boolean;
    history: boolean;
    lab_results: boolean;
  };
  account_age_days: number;
  imputed_features?: string[];
};

export type AppNotificationItem = {
  id: number;
  type: string;
  title: string;
  body: string;
  pinned: boolean;
  channel: string;
};
