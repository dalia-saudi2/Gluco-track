import { apiClient } from '../config/api';
import type { DoctorChatDetail, DoctorChatMessage, DoctorChatSummary } from '../types/doctorChat';

class DoctorChatService {
  async listForPatient(patientId: number): Promise<DoctorChatSummary[]> {
    return apiClient.getDoctorChats(patientId) as Promise<DoctorChatSummary[]>;
  }

  async getConversation(patientId: number, chatId: number): Promise<DoctorChatDetail> {
    return apiClient.getDoctorChat(patientId, chatId) as Promise<DoctorChatDetail>;
  }

  async sendMessage(
    patientId: number,
    chatId: number,
    content: string,
  ): Promise<DoctorChatMessage> {
    return apiClient.sendDoctorChatMessage(patientId, chatId, content) as Promise<DoctorChatMessage>;
  }

  async listForDoctor(doctorName: string): Promise<DoctorChatSummary[]> {
    return apiClient.getDoctorPortalChats(doctorName) as Promise<DoctorChatSummary[]>;
  }

  async getForDoctor(chatId: number): Promise<DoctorChatDetail> {
    return apiClient.getDoctorPortalChat(chatId) as Promise<DoctorChatDetail>;
  }

  async sendDoctorMessage(chatId: number, content: string): Promise<DoctorChatMessage> {
    return apiClient.sendDoctorPortalMessage(chatId, content) as Promise<DoctorChatMessage>;
  }
}

export const doctorChatService = new DoctorChatService();
