import { apiClient } from '../config/api';
import { BackendMedicalRecord } from './dashboardService';

// Frontend types matching records page
export interface Report {
  id: number;
  type: 'lab' | 'imaging' | 'summary' | 'prescription';
  date: string;
  provider: string;
  title: string;
  status: 'New' | 'Reviewed' | 'Pending';
  url: string;
  summary?: string;
}

export interface PatientHistory {
  id: number;
  category: 'condition' | 'allergy' | 'surgery' | 'medication';
  title: string;
  description: string;
  date?: string;
  severity?: 'mild' | 'moderate' | 'severe';
  status: 'active' | 'resolved' | 'ongoing';
  provider?: string;
}

export interface Checkup {
  id: number;
  type: string;
  description: string;
  recommendedDate: string;
  frequency?: string;
  status: 'scheduled' | 'recommended' | 'overdue';
  priority: 'low' | 'medium' | 'high';
  provider?: string;
}

class RecordsService {
  /**
   * Fetch all medical records from backend
   */
  async fetchMedicalRecords(): Promise<BackendMedicalRecord[]> {
    try {
      const records = await apiClient.getMedicalRecords();
      return records as BackendMedicalRecord[];
    } catch (error) {
      console.error('Error fetching medical records:', error);
      throw error;
    }
  }

  /**
   * Transform backend medical records to frontend Report format
   */
  transformReports(backendRecords: BackendMedicalRecord[]): Report[] {
    if (!backendRecords || backendRecords.length === 0) {
      return [];
    }

    return backendRecords.map((record) => {
      // Map backend status to frontend status
      let status: 'New' | 'Reviewed' | 'Pending' = 'Pending';
      if (record.status === 'reviewed') {
        status = 'Reviewed';
      } else if (record.status === 'new') {
        status = 'New';
      } else {
        status = 'Pending';
      }

      // Format date
      let formattedDate = 'Unknown Date';
      try {
        const date = new Date(record.date);
        if (!isNaN(date.getTime())) {
          formattedDate = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          });
        }
      } catch (e) {
        console.error('Error formatting date:', e);
      }

      // Get summary from content or record_data
      let summary = record.content;
      if (!summary && record.record_data) {
        if (typeof record.record_data === 'object') {
          summary = record.record_data.summary || 
                   record.record_data.content ||
                   (record.record_data.value ? `${record.record_data.value} ${record.record_data.unit || ''}` : undefined);
        }
      }

      return {
        id: record.id,
        type: record.record_type as 'lab' | 'imaging' | 'summary' | 'prescription',
        date: formattedDate,
        provider: record.provider || 'Unknown Provider',
        title: record.title || 'Untitled Record',
        status: status,
        url: record.file_url || `https://example.com/reports/${record.id}`,
        summary: summary || undefined,
      };
    });
  }

  /**
   * Transform medical records to patient history format
   * This extracts conditions, allergies, etc. from record data
   */
  transformPatientHistory(backendRecords: BackendMedicalRecord[]): PatientHistory[] {
    const history: PatientHistory[] = [];

    backendRecords.forEach((record) => {
      // Extract history from record_data if available
      if (record.record_data) {
        // Conditions
        if (record.record_data.conditions) {
          record.record_data.conditions.forEach((condition: any, index: number) => {
            history.push({
              id: record.id * 1000 + index,
              category: 'condition',
              title: condition.name || condition.title || 'Medical Condition',
              description: condition.description || condition.notes || '',
              date: condition.date || record.date,
              severity: condition.severity || 'moderate',
              status: condition.status === 'resolved' ? 'resolved' : 'active',
              provider: record.provider,
            });
          });
        }

        // Allergies
        if (record.record_data.allergies) {
          record.record_data.allergies.forEach((allergy: any, index: number) => {
            history.push({
              id: record.id * 1000 + 100 + index,
              category: 'allergy',
              title: allergy.name || allergy.substance || 'Allergy',
              description: allergy.description || allergy.reaction || '',
              severity: allergy.severity || 'moderate',
              status: 'active',
              provider: record.provider,
            });
          });
        }

        // Surgeries
        if (record.record_data.surgeries) {
          record.record_data.surgeries.forEach((surgery: any, index: number) => {
            history.push({
              id: record.id * 1000 + 200 + index,
              category: 'surgery',
              title: surgery.name || surgery.procedure || 'Surgery',
              description: surgery.description || surgery.notes || '',
              date: surgery.date || record.date,
              status: 'resolved',
              provider: record.provider,
            });
          });
        }
      }

      // If record type is summary, try to extract structured data
      if (record.record_type === 'summary' && record.content) {
        // Try to parse summary content for conditions
        const content = record.content.toLowerCase();
        if (content.includes('diabetes') || content.includes('diabetic')) {
          history.push({
            id: record.id * 1000 + 300,
            category: 'condition',
            title: 'Diabetes',
            description: record.content.substring(0, 200),
            date: record.date,
            severity: 'moderate',
            status: 'active',
            provider: record.provider,
          });
        }
        if (content.includes('blood pressure') || content.includes('hypertension')) {
          history.push({
            id: record.id * 1000 + 301,
            category: 'condition',
            title: 'Hypertension',
            description: record.content.substring(0, 200),
            date: record.date,
            severity: 'moderate',
            status: 'active',
            provider: record.provider,
          });
        }
      }

      // Create history entries from lab records with abnormal values
      if (record.record_type === 'lab' && record.record_data) {
        const status = record.record_data.status?.toLowerCase();
        if (status === 'abnormal' || status === 'critical') {
          history.push({
            id: record.id * 1000 + 400,
            category: 'condition',
            title: `Abnormal ${record.title}`,
            description: `Test result: ${record.record_data.value} ${record.record_data.unit || ''}. ${record.content || ''}`,
            date: record.date,
            severity: status === 'critical' ? 'severe' : 'moderate',
            status: 'active',
            provider: record.provider,
          });
        }
      }
    });

    // If no history found, add some default entries based on records
    if (history.length === 0 && backendRecords.length > 0) {
      // Check if there are any summary records that might indicate conditions
      const summaryRecords = backendRecords.filter(r => r.record_type === 'summary');
      if (summaryRecords.length > 0) {
        summaryRecords.forEach((record, index) => {
          history.push({
            id: record.id * 1000 + 500 + index,
            category: 'condition',
            title: 'General Health Status',
            description: record.content?.substring(0, 150) || 'Health information from medical records',
            date: record.date,
            severity: 'moderate',
            status: 'active',
            provider: record.provider,
          });
        });
      }
    }

    return history;
  }

  /**
   * Get recommended checkups from medical records
   * This is a simplified version - in production, this would come from a dedicated endpoint
   */
  getRecommendedCheckups(backendRecords: BackendMedicalRecord[]): Checkup[] {
    const checkups: Checkup[] = [];
    const now = new Date();

    backendRecords.forEach((record) => {
      if (record.record_data?.recommended_checkups) {
        record.record_data.recommended_checkups.forEach((checkup: any, index: number) => {
          const recommendedDate = new Date(checkup.date || checkup.recommended_date);
          const isOverdue = recommendedDate < now;
          const isScheduled = checkup.scheduled === true;

          checkups.push({
            id: record.id * 1000 + 400 + index,
            type: checkup.type || 'Follow-up',
            description: checkup.description || checkup.notes || '',
            recommendedDate: recommendedDate.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            }),
            frequency: checkup.frequency,
            status: isScheduled ? 'scheduled' : isOverdue ? 'overdue' : 'recommended',
            priority: checkup.priority || 'medium',
            provider: record.provider,
          });
        });
      }
    });

    // Add default checkups if none exist
    if (checkups.length === 0) {
      const nextMonth = new Date(now);
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      checkups.push({
        id: 1,
        type: 'Annual Physical',
        description: 'Comprehensive health examination and screening',
        recommendedDate: nextMonth.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }),
        frequency: 'Every 12 months',
        status: 'recommended',
        priority: 'medium',
      });
    }

    return checkups;
  }

  /**
   * Get all records data (reports, history, checkups)
   */
  async getAllRecordsData() {
    try {
      const backendRecords = await this.fetchMedicalRecords();

      return {
        reports: this.transformReports(backendRecords),
        history: this.transformPatientHistory(backendRecords),
        checkups: this.getRecommendedCheckups(backendRecords),
        rawData: backendRecords,
      };
    } catch (error) {
      console.error('Error getting all records data:', error);
      throw error;
    }
  }

  /**
   * Refresh reports
   */
  async refreshReports(): Promise<Report[]> {
    try {
      const records = await this.fetchMedicalRecords();
      return this.transformReports(records);
    } catch (error) {
      console.error('Error refreshing reports:', error);
      throw error;
    }
  }

  /**
   * Refresh patient history
   */
  async refreshHistory(): Promise<PatientHistory[]> {
    try {
      const records = await this.fetchMedicalRecords();
      return this.transformPatientHistory(records);
    } catch (error) {
      console.error('Error refreshing history:', error);
      throw error;
    }
  }

  /**
   * Refresh checkups
   */
  async refreshCheckups(): Promise<Checkup[]> {
    try {
      const records = await this.fetchMedicalRecords();
      return this.getRecommendedCheckups(records);
    } catch (error) {
      console.error('Error refreshing checkups:', error);
      throw error;
    }
  }
}

export const recordsService = new RecordsService();
