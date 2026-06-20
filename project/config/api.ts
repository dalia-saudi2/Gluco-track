import { environmentConfig } from './environment';
import { authService } from '../services/authService';

function formatApiErrorDetail(detail: unknown): string {
  if (typeof detail === 'string') {
    return detail;
  }
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object' && 'msg' in item) {
          const loc = Array.isArray((item as { loc?: unknown }).loc)
            ? (item as { loc: unknown[] }).loc
                .filter((part) => part !== 'body')
                .join(' → ')
            : '';
          const msg = String((item as { msg: unknown }).msg);
          return loc ? `${loc}: ${msg}` : msg;
        }
        return String(item);
      })
      .join('\n');
  }
  if (detail && typeof detail === 'object' && 'msg' in detail) {
    return String((detail as { msg: unknown }).msg);
  }
  if (detail == null) {
    return 'An unexpected error occurred.';
  }
  try {
    return JSON.stringify(detail);
  } catch {
    return 'An unexpected error occurred.';
  }
}

function toQueryString(params: Record<string, any>): string {
  return Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
}

// API Configuration
export const API_CONFIG = {
  BASE_URL: 'http://localhost:8000', // Default, will be overridden by environment config
  ENDPOINTS: {
    AUTH: {
      LOGIN: '/auth/login',
      REGISTER: '/auth/register',
      GOOGLE: '/auth/google',
      ME: '/users/me'
    },
    DASHBOARD: '/dashboard',
    APPOINTMENTS: '/appointments',
    MEDICAL_RECORDS: '/medical-records',
    MEDICATIONS: '/medications',
    CHAT: '/chat/messages'
  }
};

// API Helper Functions
export class ApiClient {
  private baseUrl: string;
  private token: string | null = null;
  private isRefreshing = false;
  private refreshPromise: Promise<string | null> | null = null;
  /** When true, 401 responses do not trigger refresh/retry (avoids deadlock inside refreshToken). */
  private suppressAuthRefresh = false;
  private onSessionExpired: (() => void) | null = null;

  constructor(baseUrl?: string) {
    // Use environment config if available, otherwise use default
    this.baseUrl = baseUrl || environmentConfig.getApiBaseUrl() || API_CONFIG.BASE_URL;
  }

  setBaseUrl(url: string) {
    this.baseUrl = url;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  setToken(token: string) {
    this.token = token;
  }

  setSuppressAuthRefresh(suppress: boolean) {
    this.suppressAuthRefresh = suppress;
  }

  setOnSessionExpired(callback: () => void) {
    this.onSessionExpired = callback;
  }

  getToken(): string | null {
    return this.token;
  }

  private async request(endpoint: string, options: RequestInit = {}, retryCount = 0): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    // Ensure we have the latest token
    if (!this.token) {
      const storedToken = await authService.getStoredToken();
      if (storedToken) {
        this.token = storedToken;
      }
    }

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Handle 401 Unauthorized - token expired
      if (response.status === 401 && retryCount === 0 && !this.suppressAuthRefresh) {
        // Try to refresh token
        const refreshed = await authService.refreshTokenIfNeeded();
        if (refreshed) {
          // Retry the request with new token
          const newToken = await authService.getStoredToken();
          if (newToken) {
            this.token = newToken;
            return this.request(endpoint, options, retryCount + 1);
          }
        }
        // If refresh failed, clear token
        this.token = null;
        // Clear stored token
        try {
          const { storageService } = await import('../services/storageService');
          await storageService.clearAuthData();
        } catch (e) {
          console.error('Error clearing auth data:', e);
        }
        this.onSessionExpired?.();
        throw new Error('Session expired. Please login again.');
      }

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `API Error: ${response.status} ${response.statusText}`;

        try {
          const errorData = JSON.parse(errorText);
          const detail = formatApiErrorDetail(errorData.detail ?? errorData.message);
          errorMessage = detail ? `${endpoint}: ${detail}` : `${endpoint}: ${errorMessage}`;
        } catch {
          if (errorText) {
            errorMessage = `${endpoint}: ${errorText}`;
          }
        }

        throw new Error(errorMessage);
      }

      // Handle empty responses
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const text = await response.text();
        return text ? JSON.parse(text) : null;
      }

      return response.json();
    } catch (error) {
      if (error instanceof Error) {
        if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
          throw new Error(
            'Cannot connect to server. Make sure the backend is running at http://localhost:8000'
          );
        }
        throw error;
      }
      throw new Error(`Network error: ${error}`);
    }
  }

  // Auth methods
  async login(email: string, password: string) {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const response = await fetch(`${this.baseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `username=${encodeURIComponent(normalizedEmail)}&password=${encodeURIComponent(password)}&grant_type=password`
      });

      if (!response.ok) {
        // Try to get error message from response
        let errorMessage = `Login failed (${response.status})`;
        try {
          const errorData = await response.json();
          errorMessage = formatApiErrorDetail(errorData.detail ?? errorData.message) || errorMessage;
        } catch {
          const errorText = await response.text();
          if (errorText) {
            try {
              const errorData = JSON.parse(errorText);
              errorMessage = formatApiErrorDetail(errorData.detail ?? errorData.message) || errorMessage;
            } catch {
              errorMessage = errorText || errorMessage;
            }
          }
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      this.setToken(data.access_token);
      return data;
    } catch (error: any) {
      // Handle network errors
      if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
        throw new Error('Cannot connect to server. Please make sure the backend is running on http://localhost:8000');
      }
      throw error;
    }
  }

  async register(userData: {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
    blood_type?: string;
    address?: string;
    gender?: string;
  }) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        ...userData,
        email: userData.email.trim().toLowerCase(),
        full_name: userData.full_name.trim(),
        phone: userData.phone?.trim() || undefined,
      }),
    });
  }

  async loginWithGoogle(idToken: string) {
    const data = await this.request('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ id_token: idToken }),
    });
    if (data?.access_token) {
      this.setToken(data.access_token);
    }
    return data;
  }

  // Dashboard
  async getDashboard() {
    return this.request('/dashboard');
  }

  // Appointments
  async getAppointments() {
    return this.request('/appointments');
  }

  async createAppointment(appointmentData: any) {
    return this.request('/appointments', {
      method: 'POST',
      body: JSON.stringify(appointmentData),
    });
  }

  async updateAppointment(id: number, appointmentData: any) {
    return this.request(`/appointments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(appointmentData),
    });
  }

  async cancelAppointment(id: number) {
    return this.request(`/appointments/${id}/cancel`, {
      method: 'POST',
    });
  }

  async deleteAppointment(id: number) {
    return this.request(`/appointments/${id}`, {
      method: 'DELETE',
    });
  }

  async joinTelehealthMeeting(id: number) {
    return this.request(`/appointments/${id}/telehealth/join`, {
      method: 'POST',
    });
  }

  // Zoom telemedicine (OAuth)
  async getZoomOAuthStatus() {
    return this.request('/zoom/oauth/status');
  }

  async getZoomAuthorizeUrl() {
    return this.request('/zoom/oauth/authorize-url');
  }

  async callDoctorZoom() {
    return this.request('/zoom/consultations/call-doctor', {
      method: 'POST',
    });
  }

  async disconnectZoomOAuth() {
    return this.request('/zoom/oauth/disconnect', {
      method: 'DELETE',
    });
  }

  // Medical Records
  async getMedicalRecords() {
    return this.request('/medical-records');
  }

  // Medications
  async getMedications() {
    return this.request('/medications');
  }

  async createMedication(medicationData: any) {
    return this.request('/medications', {
      method: 'POST',
      body: JSON.stringify(medicationData),
    });
  }

  async updateMedication(id: number, medicationData: any) {
    return this.request(`/medications/${id}`, {
      method: 'PUT',
      body: JSON.stringify(medicationData),
    });
  }

  // Medical Records
  async createMedicalRecord(recordData: any) {
    return this.request('/medical-records', {
      method: 'POST',
      body: JSON.stringify(recordData),
    });
  }

  // User
  async getCurrentUser() {
    return this.request('/users/me');
  }

  async updateUser(userData: any) {
    return this.request('/users/me', {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async updateOnboardingDemographics(data: {
    age?: number;
    date_of_birth?: string;
    gender?: string;
    ethnicity?: string;
    education_level?: string;
    education_major?: string;
    employment_status?: string;
    income_level?: string;
    nationality?: string;
    marital_status?: string;
    caregiver_name?: string;
    caregiver_phone?: string;
    preferred_language?: string;
    onboarding_completed?: boolean;
  }) {
    return this.request('/users/me/onboarding', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async updateDiabeticPath(isDiabeticPath: boolean) {
    return this.request('/users/me/onboarding/diabetic-path', {
      method: 'PATCH',
      body: JSON.stringify({ is_diabetic_path: isDiabeticPath }),
    });
  }

  async updateClinicalProfile(body: Record<string, unknown>) {
    return this.request('/users/me/clinical-profile', {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  async updateOnboardingLabChoice(hasLabResults: boolean) {
    return this.request('/users/me/onboarding/lab-choice', {
      method: 'PATCH',
      body: JSON.stringify({
        onboarding_lab_opt_in: hasLabResults,
      }),
    });
  }

  async completeOnboarding() {
    return this.request('/users/me/onboarding/complete', {
      method: 'PATCH',
      body: JSON.stringify({ onboarding_completed: true }),
    });
  }

  async changePassword(currentPassword: string, newPassword: string) {
    return this.request('/users/me/change-password', {
      method: 'POST',
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    });
  }

  async forgotPassword(email: string) {
    return this.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(email: string, token: string, newPassword: string) {
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        email,
        token,
        new_password: newPassword,
      }),
    });
  }

  // Chat Sessions
  async createChatSession() {
    return this.request('/chat/sessions', {
      method: 'POST',
    });
  }

  // Chat
  async sendMessage(message: string, sessionId?: string) {
    return this.request('/chat/messages', {
      method: 'POST',
      body: JSON.stringify({
        content: message,
        message_type: 'text',
        session_id: sessionId
      }),
    });
  }

  /** Server-side AI Gateway proxy (required on web — browser CORS blocks direct gateway calls). */
  async chatLlm(messages: { role: string; content: string }[]): Promise<{ text: string }> {
    return this.request('/chat/llm', {
      method: 'POST',
      body: JSON.stringify({ messages }),
    });
  }

  /** ISF / ICR personalization for glucose prediction */
  async patchDiabetesSettings(body: { isf_mg_dl_per_unit?: number; icr_grams_per_unit?: number }) {
    return this.request('/users/me/diabetes-settings', {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  async searchUsdaFoods(query: string, pageSize = 20) {
    const qs = toQueryString({ q: query.trim(), page_size: String(pageSize) });
    return this.request(`/nutrition/usda/search?${qs}`);
  }

  async getUsdaFoodDetail(fdcId: number) {
    return this.request(`/nutrition/usda/food/${fdcId}`);
  }

  async predictMealGlucose(body: Record<string, unknown>) {
    return this.request('/glucose/predict-meal', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async getDexcomIntegrationStatus() {
    return this.request('/integrations/dexcom');
  }

  async importDexcomReadings(glucose_readings_mg_dl: number[]) {
    return this.request('/integrations/dexcom/import-readings', {
      method: 'POST',
      body: JSON.stringify({ glucose_readings_mg_dl }),
    });
  }

  async getOnboardingProgress() {
    return this.request('/users/me/onboarding/progress');
  }

  async uploadLabFile(file: Blob | File | { uri: string; name: string; type: string }) {
    return this.uploadMultipartFile('/lab-uploads', file);
  }

  /** Records page: Paddle OCR + save as patient medical record. */
  async uploadMedicalRecordFile(file: Blob | File | { uri: string; name: string; type: string }) {
    return this.uploadMultipartFile('/medical-records/upload', file) as Promise<{
      record: {
        id: number;
        title: string;
        content?: string | null;
        file_url?: string | null;
        record_type: string;
        status: string;
      };
      ocr_status: string;
      ocr_extracted_values?: Record<string, { value?: number; confidence?: number }>;
      ocr_confidence_score?: number | null;
      lab_upload_id?: number | null;
    }>;
  }

  private async uploadMultipartFile(
    endpoint: string,
    file: Blob | File | { uri: string; name: string; type: string }
  ) {
    const url = `${this.baseUrl}${endpoint}`;
    const form = new FormData();

    if (typeof Blob !== 'undefined' && (file instanceof Blob || file instanceof File)) {
      const uploadName =
        file instanceof File && file.name ? file.name : 'lab-report.jpg';
      const uploadType = file.type || 'image/jpeg';
      // Web FormData needs a File with a filename — raw Blob often yields 422 (missing file).
      const uploadFile =
        typeof File !== 'undefined' && !(file instanceof File)
          ? new File([file], uploadName, { type: uploadType })
          : file;
      if (uploadFile.size === 0) {
        throw new Error('The selected file is empty. Please choose another file.');
      }
      form.append('file', uploadFile, uploadName);
    } else {
      const native = file as { uri: string; name: string; type: string };
      if (!native.uri) {
        throw new Error('No file selected.');
      }
      form.append('file', {
        uri: native.uri,
        name: native.name,
        type: native.type,
      } as unknown as Blob);
    }

    if (!this.token) {
      const storedToken = await authService.getStoredToken();
      if (storedToken) this.token = storedToken;
    }

    const headers: Record<string, string> = {};
    if (this.token) headers.Authorization = `Bearer ${this.token}`;

    const response = await fetch(url, { method: 'POST', headers, body: form });
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Upload failed (${response.status})`;
      try {
        const errorData = JSON.parse(errorText);
        const detail = formatApiErrorDetail(errorData.detail ?? errorData.message);
        errorMessage = detail || errorMessage;
      } catch {
        if (errorText) errorMessage = errorText;
      }
      if (response.status === 422) {
        errorMessage = `Upload file rejected: ${errorMessage}. Try choosing the file again.`;
      }
      throw new Error(errorMessage);
    }
    return response.json();
  }

  async getCurrentLabUpload() {
    return this.request('/lab-uploads/current');
  }

  async reviewLabUpload(
    uploadId: number,
    body: Record<string, number | boolean | null | undefined>
  ) {
    return this.request(`/lab-uploads/${uploadId}/review`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  async submitHealthFeatures(body: Record<string, unknown>) {
    return this.request('/onboarding/health-features', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async completeLabData(body: Record<string, unknown>) {
    return this.request('/onboarding/complete-lab-data', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async getRiskSummary() {
    return this.request('/users/me/risk-summary');
  }

  async getAppNotifications() {
    return this.request('/users/me/notifications');
  }

  async getGlucoseReadings(patientId: number, page = 1, limit = 30, order: 'asc' | 'desc' = 'desc') {
    const qs = toQueryString({ page: String(page), limit: String(limit), order });
    return this.request(`/api/patients/${patientId}/glucose-readings?${qs}`);
  }

  async getGlucoseDashboard(patientId: number) {
    return this.request(`/api/patients/${patientId}/glucose-readings/dashboard`);
  }

  async createGlucoseReading(patientId: number, body: Record<string, unknown>) {
    return this.request(`/api/patients/${patientId}/glucose-readings`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async getWaterIntakeToday(patientId: number) {
    return this.request(`/api/patients/${patientId}/water-intake/today`);
  }

  async addWaterIntake(patientId: number, amountMl: number) {
    return this.request(`/api/patients/${patientId}/water-intake/add`, {
      method: 'POST',
      body: JSON.stringify({ amount_ml: amountMl }),
    });
  }

  async syncHealthActivity(
    patientId: number,
    body: {
      records: Array<{
        activity_date: string;
        steps: number;
        sleep_hours: number;
        calories_burned: number;
      }>;
      source: string;
    }
  ) {
    return this.request(`/api/patients/${patientId}/health-activity/sync`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async getHealthActivityHistory(patientId: number, days: number) {
    return this.request(`/api/patients/${patientId}/health-activity/history?days=${days}`);
  }

  async getHealthActivitySummary(patientId: number, period: 'day' | 'week' | 'month') {
    return this.request(`/api/patients/${patientId}/health-activity/summary?period=${period}`);
  }

  async getHealthActivityToday(patientId: number) {
    return this.request(`/api/patients/${patientId}/health-activity/today`);
  }

  async getDoctorChats(patientId: number) {
    return this.request(`/api/patients/${patientId}/doctor-chats`);
  }

  async getDoctorChat(patientId: number, chatId: number) {
    return this.request(`/api/patients/${patientId}/doctor-chats/${chatId}`);
  }

  async sendDoctorChatMessage(patientId: number, chatId: number, content: string) {
    return this.request(`/api/patients/${patientId}/doctor-chats/${chatId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  async getDoctorPortalChats(doctorName: string) {
    const qs = toQueryString({ doctor_name: doctorName });
    return this.request(`/api/doctor/chats?${qs}`);
  }

  async getDoctorPortalChat(chatId: number) {
    return this.request(`/api/doctor/chats/${chatId}`);
  }

  async sendDoctorPortalMessage(chatId: number, content: string) {
    return this.request(`/api/doctor/chats/${chatId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  async getNearbyPlaces(params: {
    category: 'pharmacy' | 'laboratory';
    lat: number;
    lng: number;
    radiusM: number;
  }) {
    const qs = toQueryString({
      category: params.category,
      lat: String(params.lat),
      lng: String(params.lng),
      radius_m: String(params.radiusM),
    });
    return this.request(`/places/nearby?${qs}`);
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Initialize API client with environment config
environmentConfig.initialize().then(() => {
  apiClient.setBaseUrl(environmentConfig.getApiBaseUrl());
});
