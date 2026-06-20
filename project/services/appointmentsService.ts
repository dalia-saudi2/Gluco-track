import { apiClient } from '../config/api';
import { BackendAppointment } from './dashboardService';

// Frontend appointment type matching the appointments page
export interface Appointment {
  id: number;
  doctor: string;
  specialty: string;
  date: string;
  time: string;
  location: string;
  status: 'Upcoming' | 'Confirmed' | 'Completed' | 'Canceled';
  mode: 'in_person' | 'telehealth';
  type: string;
  meetingUrl?: string;
  meetingProvider?: string;
  telehealthPlatform?: 'zoom';
}

class AppointmentsService {
  /**
   * Fetch all appointments from backend
   */
  async fetchAppointments(): Promise<BackendAppointment[]> {
    try {
      const appointments = await apiClient.getAppointments();
      return appointments as BackendAppointment[];
    } catch (error) {
      console.error('Error fetching appointments:', error);
      throw error;
    }
  }

  /**
   * Transform backend appointments to frontend format
   */
  transformAppointments(backendAppointments: BackendAppointment[]): Appointment[] {
    return backendAppointments.map((apt) => {
      // Format date to YYYY-MM-DD
      const date = new Date(apt.appointment_date);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;

      // Format time
      const formattedTime = date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });

      // Map backend status to frontend status
      let status: 'Upcoming' | 'Confirmed' | 'Completed' | 'Canceled' = 'Upcoming';
      if (apt.status === 'scheduled') {
        status = 'Confirmed';
      } else if (apt.status === 'completed') {
        status = 'Completed';
      } else if (apt.status === 'cancelled') {
        status = 'Canceled';
      }

      // Determine mode (default to in_person, can be enhanced with backend data)
      const mode: 'in_person' | 'telehealth' = apt.visit_mode === 'telehealth' ||
        apt.appointment_type?.includes('telehealth') ||
        apt.location?.toLowerCase().includes('telehealth')
        ? 'telehealth' : 'in_person';

      const specialty = apt.appointment_type || 'General Practitioner';

      const telehealthPlatform: 'zoom' | undefined =
        mode === 'telehealth' ? 'zoom' : undefined;

      return {
        id: apt.id,
        doctor: apt.doctor_name,
        specialty: specialty,
        date: formattedDate,
        time: formattedTime,
        location: apt.location || 'To be provided',
        status: status,
        mode: mode,
        type: apt.appointment_type || 'routine',
        meetingUrl: apt.meeting_url,
        meetingProvider: apt.meeting_provider,
        telehealthPlatform,
      };
    });
  }

  /**
   * Create a new appointment
   */
  async createAppointment(appointmentData: {
    doctor_name: string;
    appointment_date: string; // ISO format
    duration?: number;
    location?: string;
    notes?: string;
    appointment_type?: string;
    visit_mode?: 'in_person' | 'telehealth';
    telehealth_platform?: 'zoom';
  }): Promise<Appointment> {
    try {
      const response = await apiClient.createAppointment(appointmentData);
      const transformed = this.transformAppointments([response as BackendAppointment]);
      return transformed[0];
    } catch (error) {
      console.error('Error creating appointment:', error);
      throw error;
    }
  }

  /**
   * Update an appointment (for rescheduling)
   */
  async updateAppointment(id: number, appointmentData: {
    doctor_name?: string;
    appointment_date?: string;
    duration?: number;
    location?: string;
    notes?: string;
    appointment_type?: string;
    visit_mode?: 'in_person' | 'telehealth';
    telehealth_platform?: 'zoom';
    status?: 'scheduled' | 'completed' | 'cancelled';
  }): Promise<Appointment> {
    try {
      const response = await apiClient.updateAppointment(id, appointmentData);
      const transformed = this.transformAppointments([response as BackendAppointment]);
      return transformed[0];
    } catch (error) {
      console.error('Error updating appointment:', error);
      throw error;
    }
  }

  /**
   * Cancel an appointment
   */
  async cancelAppointment(id: number): Promise<void> {
    try {
      await apiClient.cancelAppointment(id);
    } catch (error) {
      console.error('Error canceling appointment:', error);
      throw error;
    }
  }

  async joinTelehealthMeeting(id: number): Promise<{ meeting_url: string; meeting_provider?: string }> {
    try {
      return await apiClient.joinTelehealthMeeting(id);
    } catch (error) {
      console.error('Error joining telehealth meeting:', error);
      throw error;
    }
  }

  /**
   * Get all appointments data in frontend format
   */
  async getAllAppointments(): Promise<Appointment[]> {
    try {
      const backendAppointments = await this.fetchAppointments();
      return this.transformAppointments(backendAppointments);
    } catch (error) {
      console.error('Error getting all appointments:', error);
      throw error;
    }
  }

  /**
   * Filter appointments by status
   */
  filterByStatus(appointments: Appointment[], status: 'Upcoming' | 'Confirmed' | 'Completed' | 'Canceled'): Appointment[] {
    return appointments.filter(apt => apt.status === status);
  }

  /**
   * Get upcoming appointments (Upcoming or Confirmed)
   */
  getUpcoming(appointments: Appointment[]): Appointment[] {
    return appointments.filter(apt => apt.status === 'Upcoming' || apt.status === 'Confirmed');
  }

  /**
   * Get past appointments (Completed)
   */
  getPast(appointments: Appointment[]): Appointment[] {
    return appointments.filter(apt => apt.status === 'Completed');
  }

  /**
   * Get canceled appointments
   */
  getCanceled(appointments: Appointment[]): Appointment[] {
    return appointments.filter(apt => apt.status === 'Canceled');
  }
}

export const appointmentsService = new AppointmentsService();

