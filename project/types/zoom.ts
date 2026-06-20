export type ZoomOAuthStatus = {
  configured: boolean;
  connected_for_current_user: boolean;
  host_ready: boolean;
  host_user_id: string | null;
};

export type CallDoctorResult = {
  consultation_id: number;
  meeting_id: string;
  topic: string;
  join_url: string;
  start_url?: string | null;
  host_user_id: number;
  message: string;
};
