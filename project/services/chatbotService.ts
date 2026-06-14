import { apiClient } from '../config/api';

// Backend types
export interface BackendChatSession {
  id: number;
  patient_id: number;
  session_id: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface BackendChatMessage {
  id: number;
  session_id: string;
  content: string;
  message_type: string;
  sender: 'user' | 'ai';
  message_data?: {
    suggestions?: string[];
  };
  created_at: string;
}

// Frontend types
export interface ChatSession {
  id: string;
  sessionId: string;
  createdAt: Date;
  isActive: boolean;
}

export interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  suggestions?: string[];
}

class ChatbotService {
  private currentSessionId: string | null = null;

  /**
   * 1. Session Management
   * Ensures the user has a consistent chat history by linking messages to a session ID.
   * 
   */
  async getOrCreateSession(): Promise<string> {
    if (this.currentSessionId) {
      return this.currentSessionId;
    }

    try {
      const session = await apiClient.createChatSession();
      this.currentSessionId = (session as BackendChatSession).session_id;
      return this.currentSessionId;
    } catch (error) {
      console.error('Error creating chat session:', error);
      // Generate a local session ID if backend fails
      this.currentSessionId = `local_${Date.now()}`;
      return this.currentSessionId;
    }
  }

  /**
   * 2. Message Dispatcher
   * Sends the user's text to the backend and converts the medical AI's 
   * response into a format the mobile UI can display.
   */
  async sendMessage(message: string, sessionId?: string): Promise<ChatMessage> {
    try {
      // Get or create session
      const activeSessionId = sessionId || await this.getOrCreateSession();

      // Send message to backend
      const response = await apiClient.sendMessage(message, activeSessionId);
      const backendMessage = response as BackendChatMessage;

      // Transform to frontend format
      return {
        id: backendMessage.id.toString(),
        text: backendMessage.content,
        isUser: false,
        timestamp: new Date(backendMessage.created_at),
        suggestions: backendMessage.message_data?.suggestions,
      };
    } catch (error) {
      console.error('Error sending message to backend:', error);
      throw error;
    }
  }

  /**
   * 3. Utility Methods
   * resetSession() allows the user to clear the current context and start fresh.
   */
  resetSession(): void {
    this.currentSessionId = null;
  }

  /**
   * Get current session ID
   */
  getCurrentSessionId(): string | null {
    return this.currentSessionId;
  }
}
//same session shared in every app
export const chatbotService = new ChatbotService();
