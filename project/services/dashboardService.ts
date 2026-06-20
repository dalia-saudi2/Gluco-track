import { apiClient } from '../config/api';

// Types matching backend schemas
export interface BackendUser {
  id: number;
  email: string;
  full_name: string;
  phone?: string;
  date_of_birth?: string;
  blood_type?: string;
  bmi?: string;
  blood_pressure?: string;
  emergency_contact?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface BackendAppointment {
  id: number;
  patient_id: number;
  doctor_name: string;
  appointment_date: string;
  duration: number;
  location?: string;
  notes?: string;
  appointment_type?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  visit_mode?: 'in_person' | 'telehealth';
  telehealth_platform?: 'zoom';
  meeting_url?: string;
  meeting_provider?: string;
  meeting_id?: string;
  created_at: string;
  updated_at?: string;
}

export interface BackendMedicalRecord {
  id: number;
  patient_id: number;
  record_type: 'lab' | 'imaging' | 'summary' | 'prescription';
  title: string;
  date: string;
  provider?: string;
  critical: boolean;
  content?: string;
  record_data?: any;
  status: string;
  file_url?: string;
  created_at: string;
  updated_at?: string;
}

export interface BackendMedication {
  id: number;
  patient_id: number;
  name: string;
  dosage: string;
  frequency: string;
  start_date?: string;
  end_date?: string;
  critical: boolean;
  category?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface DashboardResponse {
  user: BackendUser;
  upcoming_appointments: BackendAppointment[];
  recent_records: BackendMedicalRecord[];
  current_medications: BackendMedication[];
  unread_messages: number;
  health_metrics: {
    blood_type?: string;
    total_appointments: number;
    active_medications: number;
    unread_messages: number;
  };
}

// Frontend types (matching index.tsx)
export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  isOverdue: boolean;
  nextDose: string;
  critical: boolean;
  category: 'prescription' | 'supplement' | 'vitamin';
}

export interface TestResult {
  id: string;
  type: string;
  date: string;
  value: string;
  status: 'Normal' | 'Abnormal' | 'Critical' | 'Pending';
  isAbnormal: boolean;
  critical: boolean;
  unit: string;
  referenceRange: string;
}

export interface Appointment {
  date: string;
  time: string;
  location: string;
  doctor: string;
  duration?: number;
}

class DashboardService {
  /**
   * Fetch dashboard data from backend
   */
  async fetchDashboard(): Promise<DashboardResponse> {
    try {
      const data = await apiClient.getDashboard();
      return data as DashboardResponse;
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      throw error;
    }
  }

  /**
   * Transform backend medications to frontend format
   */
  transformMedications(backendMedications: BackendMedication[]): Medication[] {
    return backendMedications.map((med) => {
      // Determine category based on medication name or category field
      let category: 'prescription' | 'supplement' | 'vitamin' = 'prescription';
      const nameLower = med.name.toLowerCase();
      if (nameLower.includes('vitamin') || nameLower.includes('vit')) {
        category = 'vitamin';
      } else if (nameLower.includes('supplement') || nameLower.includes('calcium') || nameLower.includes('iron') || nameLower.includes('omega')) {
        category = 'supplement';
      } else if (med.category) {
        category = med.category as 'prescription' | 'supplement' | 'vitamin';
      }

      // Calculate next dose (simplified - in real app, use actual schedule)
      const now = new Date();
      const hours = now.getHours();
      let nextDose = '8:00 AM';
      let isOverdue = false;

      if (med.frequency.toLowerCase().includes('daily') || med.frequency.toLowerCase().includes('once')) {
        if (hours < 8) {
          nextDose = '8:00 AM';
        } else if (hours < 14) {
          nextDose = '2:00 PM';
        } else if (hours < 20) {
          nextDose = '8:00 PM';
        } else {
          nextDose = '8:00 AM';
          isOverdue = true;
        }
      } else if (med.frequency.toLowerCase().includes('twice')) {
        if (hours < 12) {
          nextDose = '12:00 PM';
        } else {
          nextDose = '8:00 PM';
        }
      }

      return {
        id: med.id.toString(),
        name: med.name,
        dosage: med.dosage,
        frequency: med.frequency,
        isOverdue: isOverdue || med.critical,
        nextDose: isOverdue ? `Overdue by ${hours - 8} hours` : nextDose,
        critical: med.critical,
        category,
      };
    });
  }

  /**
   * Transform backend medical records to test results format
   */
  transformTestResults(backendRecords: BackendMedicalRecord[]): TestResult[] {
    return backendRecords
      .filter((record) => record.record_type === 'lab' || record.record_type === 'imaging' || record.record_type === 'summary')
      .map((record) => {
        // Extract value from record_data or content
        let value = 'N/A';
        let unit = '';
        let referenceRange = '';
        let status: 'Normal' | 'Abnormal' | 'Critical' | 'Pending' = 'Pending';

        if (record.record_data) {
          value = record.record_data.value?.toString() || record.record_data.result || 'N/A';
          unit = record.record_data.unit || '';
          referenceRange = record.record_data.reference_range || '';
          status = record.record_data.status || (record.critical ? 'Critical' : 'Normal');
        } else if (record.content) {
          // Try to parse content
          value = record.content;
          // Try to infer status from content or title
          const contentLower = (record.content + ' ' + record.title).toLowerCase();
          if (contentLower.includes('abnormal') || contentLower.includes('high') || contentLower.includes('low')) {
            status = record.critical ? 'Critical' : 'Abnormal';
          } else if (contentLower.includes('normal') || contentLower.includes('within range')) {
            status = 'Normal';
          } else {
            status = record.critical ? 'Critical' : 'Normal';
          }
        } else {
          // Default status based on critical flag
          status = record.critical ? 'Critical' : 'Normal';
        }

        // Format date
        const date = new Date(record.date);
        const formattedDate = date.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });

        return {
          id: record.id.toString(),
          type: record.title,
          date: formattedDate,
          value: value,
          status: status,
          isAbnormal: status === 'Abnormal' || status === 'Critical',
          critical: record.critical,
          unit: unit,
          referenceRange: referenceRange,
        };
      });
  }

  /**
   * Transform backend appointments to frontend format
   */
  transformAppointments(backendAppointments: BackendAppointment[]): Appointment[] {
    return backendAppointments.map((apt) => {
      const date = new Date(apt.appointment_date);
      const formattedDate = date.toLocaleDateString('en-US', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });

      const startTime = date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });

      const endTime = new Date(date.getTime() + apt.duration * 60000).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });

      return {
        date: formattedDate,
        time: `${startTime} - ${endTime} - ${apt.duration} mins`,
        location: apt.location || 'Not specified',
        doctor: apt.doctor_name,
        duration: apt.duration,
      };
    });
  }

  /**
   * Transform medications to prescription format with times
   */
  transformPrescriptions(backendMedications: BackendMedication[]): Array<{ time: string; medication: string; completed: boolean }> {
    return backendMedications.map((med) => {
      // Generate time based on frequency
      let time = '8:00 AM';
      const frequency = med.frequency.toLowerCase();

      if (frequency.includes('morning') || frequency.includes('breakfast')) {
        time = '7:30 (Before Breakfast)';
      } else if (frequency.includes('after breakfast') || frequency.includes('afternoon')) {
        time = '8:30 (After Breakfast)';
      } else if (frequency.includes('lunch') || frequency.includes('midday')) {
        time = '12:30 (After Lunch)';
      } else if (frequency.includes('evening') || frequency.includes('dinner')) {
        time = '6:00 PM (After Dinner)';
      } else if (frequency.includes('night') || frequency.includes('bedtime')) {
        time = '9:00 PM (Before Bed)';
      }

      // Check if medication should be completed based on current time
      const now = new Date();
      const hours = now.getHours();
      let completed = false;

      if (time.includes('7:30') && hours >= 7 && hours < 8) completed = true;
      if (time.includes('8:30') && hours >= 8 && hours < 9) completed = true;
      if (time.includes('12:30') && hours >= 12 && hours < 13) completed = true;
      if (time.includes('6:00 PM') && hours >= 18 && hours < 19) completed = true;
      if (time.includes('9:00 PM') && hours >= 21) completed = true;

      return {
        time,
        medication: med.name,
        completed,
      };
    });
  }

  /**
   * Transform records to reports format
   */
  transformReports(backendRecords: BackendMedicalRecord[]): Array<{ type: string; date: string }> {
    return backendRecords
      .filter((record) => record.record_type === 'lab' || record.record_type === 'imaging' || record.record_type === 'summary')
      .map((record) => {
        const date = new Date(record.date);
        const formattedDate = date.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
        });

        return {
          type: record.title,
          date: formattedDate,
        };
      })
      .sort((a, b) => {
        // Sort by date, most recent first
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
  }

  /**
   * Generate reminders from medications and appointments
   */
  generateReminders(
    medications: BackendMedication[],
    appointments: BackendAppointment[]
  ): Array<{ id: string; text: string; time: string; type: 'medication' | 'appointment' | 'test' | 'general'; priority: 'low' | 'medium' | 'high' | 'critical'; completed: boolean }> {
    const reminders: Array<{ id: string; text: string; time: string; type: 'medication' | 'appointment' | 'test' | 'general'; priority: 'low' | 'medium' | 'high' | 'critical'; completed: boolean }> = [];

    // Medication reminders
    medications.forEach((med) => {
      const now = new Date();
      const hours = now.getHours();

      if (med.frequency.toLowerCase().includes('evening') && hours >= 18 && hours < 20) {
        reminders.push({
          id: `med-${med.id}`,
          text: `Take ${med.name}`,
          time: '1 hour ago',
          type: 'medication',
          priority: med.critical ? 'high' : 'medium',
          completed: false,
        });
      }
    });

    // Appointment reminders (24 hours before)
    appointments.forEach((apt) => {
      const aptDate = new Date(apt.appointment_date);
      const now = new Date();
      const hoursUntil = (aptDate.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursUntil > 0 && hoursUntil <= 24) {
        reminders.push({
          id: `apt-${apt.id}`,
          text: `Appointment with ${apt.doctor_name} tomorrow`,
          time: `${Math.round(hoursUntil)} hours`,
          type: 'appointment',
          priority: 'high',
          completed: false,
        });
      }
    });

    // General reminders
    if (reminders.length === 0) {
      reminders.push({
        id: 'general-1',
        text: 'Stay hydrated',
        time: '2 hours ago',
        type: 'general',
        priority: 'low',
        completed: false,
      });
    }

    return reminders.slice(0, 5); // Limit to 5 reminders
  }

  /**
   * Calculate treatment progress from appointments
   */
  async calculateTreatmentProgress(): Promise<{
    completed: number;
    total: number;
    percentage: number;
    sessions: Array<{ text: string; done: boolean; date?: string }>;
  }> {
    try {
      // Get all appointments (not just upcoming)
      const allAppointments = await apiClient.getAppointments() as BackendAppointment[];
      const completed = allAppointments.filter((apt) => apt.status === 'completed').length;
      const scheduled = allAppointments.filter((apt) => apt.status === 'scheduled').length;
      const total = Math.max(completed + scheduled, 6); // Minimum 6 sessions

      // Sort by date
      const sortedAppointments = [...allAppointments].sort(
        (a, b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime()
      );

      const sessions = sortedAppointments
        .slice(0, 5)
        .map((apt, index) => {
          const date = new Date(apt.appointment_date);
          const isCompleted = apt.status === 'completed';
          const isNext = !isCompleted && index === completed && scheduled > 0;

          let text = `Session ${index + 1}`;
          if (isCompleted) {
            text += ' completed';
          } else if (isNext) {
            const day = date.toLocaleDateString('en-US', { weekday: 'short' });
            const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            text += ` - Next: ${day} ${time}`;
          } else {
            text += ' - Scheduled';
          }

          return {
            text,
            done: isCompleted,
            date: apt.appointment_date,
          };
        });

      // Fill remaining slots if less than 5
      while (sessions.length < 5) {
        sessions.push({
          text: `Session ${sessions.length + 1} - Scheduled`,
          done: false,
          date: ''
        });
      }

      return {
        completed,
        total,
        percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
        sessions,
      };
    } catch (error) {
      console.error('Error calculating treatment progress:', error);
      // Return default progress
      return {
        completed: 0,
        total: 6,
        percentage: 0,
        sessions: [
          { text: 'Session 1 - Scheduled', done: false, date: '' },
          { text: 'Session 2 - Scheduled', done: false, date: '' },
          { text: 'Session 3 - Scheduled', done: false, date: '' },
          { text: 'Session 4 - Scheduled', done: false, date: '' },
          { text: 'Session 5 - Scheduled', done: false, date: '' },
        ],
      };
    }
  }

  /**
   * Get all dashboard data in a format ready for the frontend
   */
  async getDashboardData() {
    try {
      const dashboardData = await this.fetchDashboard();

      const medications = this.transformMedications(dashboardData.current_medications);
      const appointments = this.transformAppointments(dashboardData.upcoming_appointments);
      const testResults = this.transformTestResults(dashboardData.recent_records);
      const prescriptions = this.transformPrescriptions(dashboardData.current_medications);
      const reports = this.transformReports(dashboardData.recent_records);
      const reminders = this.generateReminders(dashboardData.current_medications, dashboardData.upcoming_appointments);
      const treatmentProgress = await this.calculateTreatmentProgress();

      return {
        user: dashboardData.user,
        medications,
        testResults,
        appointments,
        prescriptions,
        reports,
        reminders,
        treatmentProgress,
        healthMetrics: dashboardData.health_metrics,
        unreadMessages: dashboardData.unread_messages,
        rawData: dashboardData, // Keep raw data for reference
      };
    } catch (error) {
      console.error('Error getting dashboard data:', error);
      throw error;
    }
  }

  /**
   * Refresh medications list
   */
  async refreshMedications(): Promise<Medication[]> {
    try {
      const medications = await apiClient.getMedications();
      return this.transformMedications(medications as BackendMedication[]);
    } catch (error) {
      console.error('Error refreshing medications:', error);
      throw error;
    }
  }

  /**
   * Refresh appointments list
   */
  async refreshAppointments(): Promise<Appointment[]> {
    try {
      const appointments = await apiClient.getAppointments();
      return this.transformAppointments(appointments as BackendAppointment[]);
    } catch (error) {
      console.error('Error refreshing appointments:', error);
      throw error;
    }
  }

  /**
   * Refresh test results
   */
  async refreshTestResults(): Promise<TestResult[]> {
    try {
      const records = await apiClient.getMedicalRecords();
      return this.transformTestResults(records as BackendMedicalRecord[]);
    } catch (error) {
      console.error('Error refreshing test results:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const dashboardService = new DashboardService();
