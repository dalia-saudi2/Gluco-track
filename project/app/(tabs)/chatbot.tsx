import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import {
  Send,
  Bot,
  User,
  Phone,
  Calendar,
  FileText,
  Heart,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Stethoscope,
} from 'lucide-react-native';
import { groqChat, groqSuggestions } from '../../config/llm';
import { useAuth } from '../../contexts/AuthContext';
import { useLogoutAndRedirect } from '../../hooks/useLogoutAndRedirect';
import { chatbotService } from '../../services/chatbotService';
import { VitalisShell } from '../../components/vitalis/VitalisShell';
import { CandyCard } from '../../components/dashboard/CandyCard';
import { DF, DashboardPalette } from '../../constants/DashboardColors';
import { useD, useDashboardStyles } from '../../hooks/useDashboardTheme';

/**
 * DATA MODELS (Type Safety)
 * In a medical app, type safety is critical. These interfaces ensure that
 * every message follows a strict structure, reducing UI bugs during clinical use.
 */
interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  type?: 'text' | 'quick_action' | 'suggestion' | 'error';
  quickActions?: QuickAction[];
  suggestions?: string[];
  isError?: boolean;
}

interface QuickAction {
  id: string;
  title: string;
  icon: string;
  action: () => void;
}

interface ChatbotState {
  isTyping: boolean;
  isOnline: boolean;
  lastResponse: Date | null;
  isConnected: boolean;
  errorCount: number;
}

// Quick Actions Data
const quickActions: QuickAction[] = [
  {
    id: 'symptoms',
    title: 'Ask About Symptoms',
    icon: 'Heart',
    action: () => { }
  },
  {
    id: 'conditions',
    title: 'Learn About Conditions',
    icon: 'FileText',
    action: () => { }
  },
  {
    id: 'medications',
    title: 'Medication Questions',
    icon: 'Heart',
    action: () => { }
  },
  {
    id: 'emergency',
    title: 'Emergency Help',
    icon: 'Phone',
    action: () => { }
  }
];

/**
 * CLINICAL SAFETY: DETERMINISTIC FALLBACKS
 * Discussion Point: "What if the AI is unreachable?"
 * This logic ensures the app provides value even without an internet connection.
 * It uses pattern matching to give immediate, safe advice for common medical queries.
 */
const getFallbackResponse = (userMessage: string): string => {
  const message = userMessage.toLowerCase();

  if (message.includes('appointment') || message.includes('schedule')) {
    return "I can help you schedule an appointment! You can view available slots in the Appointments tab or I can assist you with specific scheduling needs.";
  }

  if (message.includes('record') || message.includes('test') || message.includes('lab')) {
    return "Your medical records are available in the Records tab. I can help you understand specific test results or guide you to the right information.";
  }

  if (message.includes('medication') || message.includes('prescription') || message.includes('medicine')) {
    return "For medication-related questions, please check your Records tab for prescriptions, or contact your healthcare provider directly for urgent medication concerns.";
  }

  if (message.includes('emergency') || message.includes('urgent') || message.includes('help')) {
    return "For medical emergencies, please call 911 immediately. For urgent but non-emergency concerns, contact your healthcare provider or use the emergency contact feature.";
  }

  if (message.includes('hello') || message.includes('hi') || message.includes('hey')) {
    return "Hello! I'm your AI healthcare assistant. I can help you with appointments, medical records, medication questions, and general health information. How can I assist you today?";
  }

  // 1. Fallback Logic: When AI API is down or slow, we use these hardcoded rules
  // to ensure the user always gets a helpful response.
  if (message.includes('thank') || message.includes('thanks')) {
    return "You're welcome! I'm here to help whenever you need assistance with your healthcare needs.";
  }

  // Default responses
  const defaultResponses = [
    "I understand you're looking for help. Could you be more specific about what you need assistance with?",
    "I can help you with appointments, medical records, medication questions, or general health information. What would you like to know?",
    "I'm here to assist you with your healthcare needs. Please let me know how I can help you today.",
    "For specific medical advice, I recommend consulting with your healthcare provider. I can help you navigate the app or answer general questions."
  ];

  return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
};
// screen of chatbot
// check token and if can connect to backend or use AI locally
export default function ChatbotScreen() {
  const { isAuthenticated, isLoading: authIsLoading, user } = useAuth();
  const handleLogout = useLogoutAndRedirect();
  const D = useD();
  const styles = useDashboardStyles(createChatStyles);
  const scrollViewRef = useRef<ScrollView>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hello! I'm your AI healthcare assistant powered by advanced AI. I can answer medical questions, explain conditions, discuss treatments, and provide health guidance. I'm here to help with your healthcare needs - what would you like to know?",
      isUser: false,
      timestamp: new Date(),
      type: 'text',
      // DISCUSSION: We start with a comprehensive welcome message to set 
      // expectations about the AI's capabilities as a "healthcare assistant."
      quickActions: quickActions
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const [chatbotState, setChatbotState] = useState<ChatbotState>({
    isTyping: false,
    isOnline: true,
    lastResponse: new Date(),
    isConnected: false,
    errorCount: 0
  });

  // Initialize chat session when authenticated
  useEffect(() => {
    if (isAuthenticated && !authIsLoading) {
      const initializeSession = async () => {
        try {
          setIsInitializing(true);
          await chatbotService.getOrCreateSession();
        } catch (error) {
          console.error('Failed to initialize chat session:', error);
        } finally {
          setIsInitializing(false);
        }
      };
      initializeSession();
    }
  }, [isAuthenticated, authIsLoading]);

  // DISCUSSION: UX - Auto-scroll behavior.
  // In a chat interface, users expect to see the latest message. 
  // This side-effect ensures context-awareness by scrolling to the newest 
  // message whenever the 'messages' array updates.
  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  // 3. Message Handling Logic
  // This function coordindates sending text to the primary AI (Backend)
  // or falling back to a local LLM if the server is unreachable.
  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputText.trim();
    setInputText('');
    setIsTyping(true);
    setShowQuickActions(false);

    try {
      let botResponse: string;
      let suggestions: string[] = [];

      // Try backend first if authenticated
      if (isAuthenticated) {
        try {
          const backendResponse = await chatbotService.sendMessage(currentInput);
          botResponse = backendResponse.text;
          suggestions = backendResponse.suggestions || [];
        } catch (backendError) {
          console.warn('Backend chat failed, falling back to local LLM:', backendError);
          // Fallback to local LLM
          botResponse = await groqChat([{ role: 'user', content: currentInput }]);
          suggestions = await groqSuggestions(currentInput);
        }
      } else {
        // DISCUSSION: "HYBRID AI STRATEGY"
        // 1. Primary: Backend AI (Personalized, has database context)
        // 2. Secondary: Groq/Local LLM (Fast, fallback if server is down)
        // 3. Last Resort: Hardcoded Rules (Deterministic, always works)
        botResponse = await groqChat([{ role: 'user', content: currentInput }]);
        suggestions = await groqSuggestions(currentInput);
      }

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: botResponse,
        isUser: false,
        timestamp: new Date(),
        type: 'text',
        suggestions: suggestions.length > 0 ? suggestions : undefined
      };

      setMessages(prev => [...prev, botMessage]);
      setChatbotState(prev => ({
        ...prev,
        lastResponse: new Date(),
        isConnected: true,
        errorCount: 0
      }));
    } catch (error) {
      console.error('Error getting AI response:', error);

      // Use fallback response
      const fallbackResponse = getFallbackResponse(currentInput);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: fallbackResponse,
        isUser: false,
        timestamp: new Date(),
        type: 'error',
        isError: true
      };

      setMessages(prev => [...prev, errorMessage]);
      setChatbotState(prev => ({
        ...prev,
        lastResponse: new Date(),
        isConnected: false,
        errorCount: prev.errorCount + 1
      }));
    } finally {
      setIsTyping(false);
    }
  };

  // Handle suggestion selection
  const handleSuggestion = (suggestion: string) => {
    setInputText(suggestion);
    // UI/UX DISCUSSION: Immediate feedback.
    // Instead of making the user click 'Send' after clicking a suggestion,
    // we trigger the send logic automatically to reduce friction (tap-to-send).
    setTimeout(() => {
      handleSendMessage();
    }, 100);
  };

  // Handle retry for failed messages
  const handleRetry = async (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message || !message.isUser) return;

    setIsTyping(true);
    try {
      let botResponse: string;
      let suggestions: string[] = [];

      // Try backend first if authenticated
      if (isAuthenticated) {
        try {
          const backendResponse = await chatbotService.sendMessage(message.text);
          botResponse = backendResponse.text;
          suggestions = backendResponse.suggestions || [];
        } catch (backendError) {
          console.warn('Backend retry failed, using local LLM:', backendError);
          botResponse = await groqChat([{ role: 'user', content: message.text }]);
          suggestions = await groqSuggestions(message.text);
        }
      } else {
        botResponse = await groqChat([{ role: 'user', content: message.text }]);
        suggestions = await groqSuggestions(message.text);
      }

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: botResponse,
        isUser: false,
        timestamp: new Date(),
        type: 'text',
        suggestions: suggestions.length > 0 ? suggestions : undefined
      };

      setMessages(prev => [...prev, botMessage]);
      setChatbotState(prev => ({
        ...prev,
        isConnected: true,
        errorCount: 0
      }));
    } catch (error) {
      console.error('Retry failed:', error);
    } finally {
      setIsTyping(false);
    }
  };

  // Handle quick action selection
  const handleQuickAction = (action: QuickAction) => {
    const actionMessage: Message = {
      id: Date.now().toString(),
      text: `I'll help you with ${action.title.toLowerCase()}. Let me guide you to the right place.`,
      isUser: false,
      timestamp: new Date(),
      type: 'quick_action'
    };

    setMessages(prev => [...prev, actionMessage]);
    setShowQuickActions(false);

    // Navigate based on action
    switch (action.id) {
      case 'symptoms':
        setInputText("I'm experiencing some symptoms and need help understanding them");
        break;
      case 'conditions':
        setInputText("Can you explain a medical condition to me?");
        break;
      case 'medications':
        setInputText("I have questions about my medications");
        break;
      case 'emergency':
        // DISCUSSION: Emergency protocols are hardcoded for safety.
        // We never let an AI decide what to do in a life-threatening situation.
        Alert.alert(
          'Emergency Contact',
          'For medical emergencies, call 911 immediately. For urgent concerns, contact your healthcare provider.',
          [
            { text: 'Call 911', onPress: () => {/* Implement phone call */ } },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
        break;
    }
  };

  const resetChat = () => {
    chatbotService.resetSession();
    setMessages([
      {
        id: '1',
        text: "Hello! I'm your Diabetes Care Hub AI assistant. I can help with glucose management, medications, appointments, and general diabetes questions. How can I help you today?",
        isUser: false,
        timestamp: new Date(),
        type: 'text',
        quickActions: quickActions,
      },
    ]);
    setShowQuickActions(true);
  };

  const headerTools = (
    <View style={styles.headerTools}>
      <Pressable style={styles.toolBtn} onPress={resetChat} accessibilityLabel="Start new chat">
        <RefreshCw size={18} color={D.onSurfaceVariant} />
      </Pressable>
      <Pressable
        style={[styles.toolBtn, showQuickActions && styles.toolBtnActive]}
        onPress={() => setShowQuickActions(!showQuickActions)}
        accessibilityLabel="Toggle quick actions"
      >
        <Sparkles size={18} color={showQuickActions ? D.onPrimary : D.onSurfaceVariant} />
      </Pressable>
    </View>
  );

  const MessageBubble = ({ message }: { message: Message }) => (
    <View
      style={[
        styles.messageBubble,
        message.isUser ? styles.userMessage : styles.botMessage,
        message.isError && styles.errorMessage,
      ]}
    >
      <View style={styles.messageHeader}>
        {message.isUser ? (
          <User size={14} color={D.onPrimary} />
        ) : (
          <Bot size={14} color={message.isError ? D.error : D.secondary} />
        )}
        <Text style={styles.messageTime}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
        {message.isError && (
          <TouchableOpacity style={styles.retryButton} onPress={() => handleRetry(message.id)}>
            <RefreshCw size={14} color={D.error} />
          </TouchableOpacity>
        )}
      </View>
      <Text
        style={[
          styles.messageText,
          message.isUser ? styles.userMessageText : styles.botMessageText,
          message.isError && styles.errorMessageText,
        ]}
      >
        {message.text}
      </Text>
      {message.suggestions && message.suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <Text style={styles.suggestionsTitle}>Suggestions</Text>
          {message.suggestions.map((suggestion, index) => (
            <TouchableOpacity
              key={index}
              style={styles.suggestionButton}
              onPress={() => handleSuggestion(suggestion)}
            >
              <Text style={styles.suggestionText}>{suggestion}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  const QuickActionsPanel = () => (
    <View style={styles.quickGrid}>
      {quickActions.map((action) => (
        <Pressable key={action.id} style={styles.quickChip} onPress={() => handleQuickAction(action)}>
          <View style={styles.quickIcon}>
            {action.icon === 'Calendar' && <Calendar size={16} color={D.primary} />}
            {action.icon === 'FileText' && <FileText size={16} color={D.secondary} />}
            {action.icon === 'Phone' && <Phone size={16} color={D.error} />}
            {action.icon === 'Heart' && <Heart size={16} color={D.tertiary} />}
          </View>
          <Text style={styles.quickChipText}>{action.title}</Text>
        </Pressable>
      ))}
    </View>
  );

  return (
    <VitalisShell
      activeNavId="chatbot"
      userName={user?.full_name || 'Patient'}
      onLogout={handleLogout}
      headerExtra={headerTools}
      disableScroll
    >
      <View style={styles.page}>
        <View style={styles.pageHead}>
          <View style={styles.pageHeadLeft}>
            <View style={styles.aiAvatar}>
              <Bot size={22} color={D.onPrimary} />
            </View>
            <View>
              <Text style={styles.pageTitle}>AI Assistant</Text>
              <Text style={styles.pageSub}>Diabetes care guidance · powered by AI</Text>
            </View>
          </View>
          {authIsLoading || isInitializing ? (
            <View style={styles.statusPill}>
              <ActivityIndicator size="small" color={D.primary} />
              <Text style={styles.statusPillText}>Connecting...</Text>
            </View>
          ) : isAuthenticated ? (
            <View style={[styles.statusPill, styles.statusOnline]}>
              <View style={styles.statusDot} />
              <Text style={[styles.statusPillText, styles.statusOnlineText]}>Online</Text>
            </View>
          ) : (
            <View style={[styles.statusPill, styles.statusOffline]}>
              <AlertCircle size={12} color={D.orange} />
              <Text style={styles.statusPillText}>Local AI</Text>
            </View>
          )}
        </View>

        {showQuickActions && (
          <CandyCard style={styles.quickCard}>
            <Text style={styles.quickTitle}>Quick prompts</Text>
            <QuickActionsPanel />
          </CandyCard>
        )}

        <CandyCard style={styles.chatCard}>
          <KeyboardAvoidingView
            style={styles.chatBody}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
          >
            <ScrollView
              ref={scrollViewRef}
              style={styles.messagesList}
              contentContainerStyle={styles.messagesContent}
              showsVerticalScrollIndicator={false}
            >
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              {isTyping && (
                <View style={[styles.messageBubble, styles.botMessage]}>
                  <View style={styles.typingIndicator}>
                    <ActivityIndicator size="small" color={D.primary} />
                    <Text style={styles.typingText}>AI is thinking...</Text>
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                value={inputText}
                onChangeText={setInputText}
                placeholder="Ask about glucose, meds, diet, appointments..."
                placeholderTextColor={D.onSurfaceVariant}
                multiline
                maxLength={500}
              />
              <Pressable
                style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
                onPress={handleSendMessage}
                disabled={!inputText.trim() || isTyping}
              >
                <Send size={18} color={inputText.trim() ? D.onPrimary : D.onSurfaceVariant} />
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </CandyCard>

        <View style={styles.disclaimer}>
          <Stethoscope size={12} color={D.onSurfaceVariant} />
          <Text style={styles.disclaimerText}>
            Not a substitute for professional medical advice. For emergencies, call 911.
          </Text>
        </View>
      </View>
    </VitalisShell>
  );
}

function createChatStyles(D: DashboardPalette) {
  return {
  page: { flex: 1, gap: 12 },
  pageHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  pageHeadLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  aiAvatar: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: D.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageTitle: { fontFamily: DF.bold, fontSize: 22, color: D.onSurface },
  pageSub: { fontFamily: DF.medium, fontSize: 12, color: D.onSurfaceVariant, marginTop: 2 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: D.surfaceContainer,
  },
  statusOnline: { backgroundColor: 'rgba(22,163,74,0.1)' },
  statusOffline: { backgroundColor: '#fff7ed' },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: D.green },
  statusPillText: { fontFamily: DF.bold, fontSize: 10, color: D.onSurfaceVariant },
  statusOnlineText: { color: D.green },
  headerTools: { flexDirection: 'row', gap: 6 },
  toolBtn: {
    padding: 8,
    borderRadius: 999,
    backgroundColor: D.surfaceContainerLow,
    borderWidth: 1,
    borderColor: D.borderMedium,
  },
  toolBtnActive: { backgroundColor: D.primary, borderColor: D.primary },
  quickCard: { padding: 14 },
  quickTitle: {
    fontFamily: DF.bold,
    fontSize: 10,
    color: D.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: D.surfaceContainerLow,
    borderWidth: 1,
    borderColor: D.borderMedium,
    minWidth: '47%',
  },
  quickIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: D.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickChipText: { fontFamily: DF.medium, fontSize: 11, color: D.onSurface, flex: 1 },
  chatCard: { flex: 1, padding: 0, overflow: 'hidden', minHeight: 320 },
  chatBody: { flex: 1 },
  messagesList: { flex: 1 },
  messagesContent: { padding: 14, paddingBottom: 8 },
  messageBubble: { maxWidth: '85%', marginBottom: 10, padding: 12, borderRadius: 18 },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: D.primary,
    borderBottomRightRadius: 4,
  },
  botMessage: {
    alignSelf: 'flex-start',
    backgroundColor: D.surfaceContainerLow,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: D.borderSubtle,
  },
  errorMessage: { borderColor: 'rgba(229,62,62,0.35)', backgroundColor: '#fef2f2' },
  messageHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  messageTime: { fontFamily: DF.medium, fontSize: 9, color: D.onSurfaceVariant },
  messageText: { fontFamily: DF.medium, fontSize: 14, lineHeight: 20 },
  userMessageText: { color: D.onPrimary },
  botMessageText: { color: D.onSurface },
  errorMessageText: { color: D.error },
  retryButton: { marginLeft: 'auto', padding: 4, borderRadius: 999, backgroundColor: '#fee2e2' },
  suggestionsContainer: { marginTop: 8, gap: 6 },
  suggestionsTitle: { fontFamily: DF.bold, fontSize: 10, color: D.onSurfaceVariant, textTransform: 'uppercase' },
  suggestionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: D.surface,
    borderWidth: 1,
    borderColor: D.accentBorder.primary,
  },
  suggestionText: { fontFamily: DF.medium, fontSize: 12, color: D.primary },
  typingIndicator: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typingText: { fontFamily: DF.medium, fontSize: 12, color: D.onSurfaceVariant, fontStyle: 'italic' },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(220,200,224,0.35)',
    backgroundColor: D.surface,
  },
  textInput: {
    flex: 1,
    fontFamily: DF.medium,
    fontSize: 14,
    color: D.onSurface,
    maxHeight: 100,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: D.surfaceContainerLow,
    borderWidth: 1,
    borderColor: D.borderMedium,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: D.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: { backgroundColor: D.surfaceContainerHigh },
  disclaimer: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4, paddingBottom: 4 },
  disclaimerText: { flex: 1, fontFamily: DF.medium, fontSize: 10, color: D.onSurfaceVariant, lineHeight: 14 },
  };
}
