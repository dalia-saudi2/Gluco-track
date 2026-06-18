export type DoctorChatMessage = {
  id: number;
  sender: 'patient' | 'doctor' | string;
  content: string;
  created_at: string;
};

export type DoctorChatSummary = {
  id: number;
  doctor_name: string;
  title: string;
  last_message_preview?: string | null;
  last_message_at: string;
  unread_count: number;
  patient_name?: string | null;
};

export type DoctorChatDetail = {
  id: number;
  doctor_name: string;
  title: string;
  patient_name?: string | null;
  messages: DoctorChatMessage[];
};
