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
import Markdown from 'react-native-markdown-display';
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
import { groqChat, groqSuggestions, MEDICAL_DISCLAIMER, ChatMessage } from '../../config/llm';
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
  const inputRef = useRef<TextInput>(null);
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

  // Helper to simulate word-by-word typewriter effect
  const simulateTyping = (
    text: string,
    messageId: string,
    onDone: (finalText: string) => void
  ) => {
    const words = text.split(/(\s+)/); // Keep spacing intact
    let currentWordIndex = 0;
    let accumulated = '';

    // Ensure initial message object is in the list
    setMessages(prev => {
      if (!prev.some(m => m.id === messageId)) {
        return [
          ...prev,
          {
            id: messageId,
            text: '',
            isUser: false,
            timestamp: new Date(),
            type: 'text'
          }
        ];
      }
      return prev;
    });

    const interval = setInterval(() => {
      if (currentWordIndex >= words.length) {
        clearInterval(interval);
        onDone(text);
        return;
      }

      accumulated += words[currentWordIndex];
      currentWordIndex++;

      setMessages(prev => {
        const index = prev.findIndex(m => m.id === messageId);
        if (index === -1) return prev;
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          text: accumulated
        };
        return updated;
      });
    }, 20); // 20ms typewriter updates
  };

  // 3. Message Handling Logic
  // This function coordinates sending text to the primary AI (Backend)
  // or falling back to a local LLM if the server is unreachable.
  const handleSendMessage = async (overrideText?: string) => {
    // Guard: overrideText must be a string (onPress can pass event objects)
    const textToSend = (typeof overrideText === 'string' ? overrideText : inputText).trim();
    if (!textToSend) return;

    // Clear input immediately and imperatively — fixes React Native multiline retention bug
    setInputText('');
    inputRef.current?.clear();

    const userMessage: Message = {
      id: Date.now().toString(),
      text: textToSend,
      isUser: true,
      timestamp: new Date(),
      type: 'text'
    };

    // Add user message to state, show typing indicator initially
    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);
    setShowQuickActions(false);

    // Save to backend in background (don't block on it, don't use its response)
    if (isAuthenticated) {
      chatbotService.sendMessage(textToSend).catch((e: unknown) => {
        console.warn('[Chat] Backend save failed (non-critical):', e);
      });
    }

    // Convert current messages state (plus the new user message) to LLM format to preserve full context history
    const historyForLLM: ChatMessage[] = messages
      .filter(m => m.type !== 'error' && !m.isError)
      .map(m => ({
        role: m.isUser ? ('user' as const) : ('assistant' as const),
        content: m.text
      }));
    
    historyForLLM.push({
      role: 'user',
      content: textToSend
    });

    const botMessageId = (Date.now() + 1).toString();

    try {
      // Call the non-streaming LLM endpoint directly
      const fullResponse = await groqChat(historyForLLM);
      setIsTyping(false); // Stop typing indicator once response is back

      // Animate the text in-place word-by-word
      simulateTyping(fullResponse, botMessageId, async (finalText) => {
        let suggestions: string[] = [];
        try {
          suggestions = await groqSuggestions(textToSend);
        } catch (e) {
          console.warn('[Chat] Suggestions call failed:', e);
        }

        setMessages(prev => {
          const index = prev.findIndex(m => m.id === botMessageId);
          if (index === -1) {
            return [
              ...prev,
              {
                id: botMessageId,
                text: finalText,
                isUser: false,
                timestamp: new Date(),
                type: 'text',
                suggestions: suggestions.length > 0 ? suggestions : undefined
              }
            ];
          }
          const updated = [...prev];
          updated[index] = {
            ...updated[index],
            text: finalText,
            suggestions: suggestions.length > 0 ? suggestions : undefined
          };
          return updated;
        });
      });

      setChatbotState(prev => ({
        ...prev,
        lastResponse: new Date(),
        isConnected: true,
        errorCount: 0
      }));
    } catch (err) {
      console.error('[Chat] groqChat generation failed:', err);
      setIsTyping(false);

      // Remove the partially generated bot message if it was created
      setMessages(prev => prev.filter(m => m.id !== botMessageId));

      const fallbackResponse = getFallbackResponse(textToSend);
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
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
    }
  };

  // Handle suggestion selection — passes text directly to avoid stale closure bug
  const handleSuggestion = (suggestion: string) => {
    handleSendMessage(suggestion);
  };

  // Handle retry for failed messages
  const handleRetry = async (messageId: string) => {
    // Find the error message index
    const errorIndex = messages.findIndex(m => m.id === messageId);
    if (errorIndex === -1) return;

    // Find the last user message before this error message
    let lastUserMessage: Message | undefined;
    for (let i = errorIndex - 1; i >= 0; i--) {
      if (messages[i].isUser) {
        lastUserMessage = messages[i];
        break;
      }
    }

    if (!lastUserMessage) return;

    // Remove the error message from the messages array
    setMessages(prev => prev.filter(m => m.id !== messageId));

    // Now call handleSendMessage with the text of the last user message
    await handleSendMessage(lastUserMessage.text);
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

      {message.isUser ? (
        // User messages: plain text (they type plain text)
        <Text style={[styles.messageText, styles.userMessageText]}>
          {message.text}
        </Text>
      ) : (
        // Bot messages: render as markdown so bold/lists/headers display correctly
        <Markdown style={buildMarkdownStyles(D, message.isError ?? false)}>
          {message.text}
        </Markdown>
      )}

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
      {!message.isUser && !message.isError && (
        <View style={styles.msgDisclaimer}>
          <AlertCircle size={10} color={'#d97706'} />
          <Text style={styles.msgDisclaimerText}>
            Not a real doctor. Always consult a qualified healthcare provider.
          </Text>
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
              <Text style={styles.pageSub}>Diabetes care guidance · DeepSeek AI</Text>
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
                ref={inputRef}
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
                onPress={() => handleSendMessage()}
                disabled={!inputText.trim() || isTyping}
              >
                <Send size={18} color={inputText.trim() ? D.onPrimary : D.onSurfaceVariant} />
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </CandyCard>

        <View style={styles.disclaimer}>
          <Stethoscope size={12} color={'#d97706'} />
          <Text style={styles.disclaimerText}>
            ⚠️ AI responses are for informational purposes only and are NOT a substitute for professional medical advice, diagnosis, or treatment. Always consult a licensed healthcare provider. In emergencies, call 911.
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
    alignSelf: 'flex-end' as const,
    backgroundColor: D.primary,
    borderBottomRightRadius: 4,
  },
  botMessage: {
    alignSelf: 'flex-start' as const,
    backgroundColor: D.surfaceContainerLow,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: D.borderSubtle,
  },
  errorMessage: { borderColor: 'rgba(229,62,62,0.35)', backgroundColor: '#fef2f2' },
  messageHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, marginBottom: 4 },
  messageTime: { fontFamily: DF.medium, fontSize: 9, color: D.onSurfaceVariant },
  messageText: { fontFamily: DF.medium, fontSize: 14, lineHeight: 20 },
  userMessageText: { color: D.onPrimary },
  botMessageText: { color: D.onSurface },
  errorMessageText: { color: D.error },
  retryButton: { marginLeft: 'auto' as any, padding: 4, borderRadius: 999, backgroundColor: '#fee2e2' },
  suggestionsContainer: { marginTop: 8, gap: 6 },
  suggestionsTitle: { fontFamily: DF.bold, fontSize: 10, color: D.onSurfaceVariant, textTransform: 'uppercase' as const },
  suggestionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: D.surface,
    borderWidth: 1,
    borderColor: D.accentBorder.primary,
  },
  suggestionText: { fontFamily: DF.medium, fontSize: 12, color: D.primary },
  typingIndicator: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8 },
  typingText: { fontFamily: DF.medium, fontSize: 12, color: D.onSurfaceVariant, fontStyle: 'italic' as const },
  inputContainer: {
    flexDirection: 'row' as const,
    alignItems: 'flex-end' as const,
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
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  sendButtonDisabled: { backgroundColor: D.surfaceContainerHigh },
  disclaimer: { flexDirection: 'row' as const, alignItems: 'flex-start' as const, gap: 6, paddingHorizontal: 4, paddingBottom: 4, backgroundColor: '#fffbeb', borderRadius: 10, padding: 8, borderWidth: 1, borderColor: '#fde68a' },
  disclaimerText: { flex: 1, fontFamily: DF.medium, fontSize: 10, color: '#92400e', lineHeight: 14 },
  msgDisclaimer: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4, marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: 'rgba(217,119,6,0.2)' },
  msgDisclaimerText: { flex: 1, fontFamily: DF.medium, fontSize: 9, color: '#d97706', lineHeight: 12, fontStyle: 'italic' as const },
  };
}

// Markdown styles for bot messages — matches the design system
function buildMarkdownStyles(D: DashboardPalette, isError: boolean) {
  const textColor = isError ? D.error : D.onSurface;
  return {
    body: {
      color: textColor,
      fontFamily: DF.medium,
      fontSize: 14,
      lineHeight: 20,
    },
    paragraph: {
      color: textColor,
      fontFamily: DF.medium,
      fontSize: 14,
      lineHeight: 20,
      marginTop: 0,
      marginBottom: 6,
    },
    strong: {
      fontFamily: DF.bold,
      color: textColor,
    },
    em: {
      fontStyle: 'italic' as const,
      color: textColor,
    },
    heading1: {
      fontFamily: DF.bold,
      fontSize: 17,
      color: textColor,
      marginBottom: 6,
      marginTop: 4,
    },
    heading2: {
      fontFamily: DF.bold,
      fontSize: 15,
      color: textColor,
      marginBottom: 4,
      marginTop: 4,
    },
    heading3: {
      fontFamily: DF.bold,
      fontSize: 14,
      color: textColor,
      marginBottom: 4,
      marginTop: 4,
    },
    bullet_list: {
      marginTop: 2,
      marginBottom: 4,
    },
    ordered_list: {
      marginTop: 2,
      marginBottom: 4,
    },
    list_item: {
      color: textColor,
      fontFamily: DF.medium,
      fontSize: 14,
      lineHeight: 20,
      marginBottom: 2,
    },
    bullet_list_icon: {
      color: D.primary,
      marginTop: 4,
    },
    ordered_list_icon: {
      color: D.primary,
      fontFamily: DF.bold,
      fontSize: 13,
    },
    code_inline: {
      backgroundColor: D.surfaceContainerHigh,
      color: D.secondary,
      fontFamily: 'monospace',
      fontSize: 12,
      paddingHorizontal: 4,
      borderRadius: 4,
    },
    fence: {
      backgroundColor: D.surfaceContainerHigh,
      padding: 10,
      borderRadius: 8,
      marginVertical: 6,
    },
    code_block: {
      backgroundColor: D.surfaceContainerHigh,
      color: D.onSurface,
      fontFamily: 'monospace',
      fontSize: 12,
      padding: 10,
      borderRadius: 8,
    },
    blockquote: {
      backgroundColor: D.surfaceContainer,
      borderLeftWidth: 3,
      borderLeftColor: D.primary,
      paddingLeft: 10,
      paddingVertical: 4,
      marginVertical: 4,
      borderRadius: 4,
    },
    hr: {
      backgroundColor: D.borderSubtle,
      height: 1,
      marginVertical: 8,
    },
  };
}
