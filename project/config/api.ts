// API Configuration
export const API_CONFIG = {
  BASE_URL: 'http://localhost:8000',
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

  constructor(baseUrl: string = API_CONFIG.BASE_URL) {
    this.baseUrl = baseUrl;
  }

  setToken(token: string) {
    this.token = token;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Auth methods
  async login(email: string, password: string) {
    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        username: email,
        password: password,
        grant_type: 'password'
      })
    });

    if (!response.ok) {
      throw new Error(`Login failed: ${response.status}`);
    }

    const data = await response.json();
    this.setToken(data.access_token);
    return data;
  }

  async register(userData: {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
    blood_type?: string;
  }) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
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

  // Medical Records
  async getMedicalRecords() {
    return this.request('/medical-records');
  }

  // Medications
  async getMedications() {
    return this.request('/medications');
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
}

// Export singleton instance
export const apiClient = new ApiClient();
