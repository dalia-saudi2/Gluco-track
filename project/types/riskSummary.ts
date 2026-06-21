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
  retinopathy_risk?: number;
  nephropathy_risk?: number;
  neuropathy_risk?: number;
  retinopathy_risk_level?: string | null;
  nephropathy_risk_level?: string | null;
  neuropathy_risk_level?: string | null;
  predicted_at?: string | null;
  risk_score_confidence?: number | null;
  staging_confidence?: number | null;
  model_name?: string | null;
  complication_model?: string | null;
  complication_confidence?: string | null;
};

export type AppNotificationItem = {
  id: number;
  type: string;
  title: string;
  body: string;
  pinned: boolean;
  channel: string;
};
