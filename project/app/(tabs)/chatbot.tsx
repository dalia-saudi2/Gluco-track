import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity, 
  TextInput, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform,
  Alert,
  ActivityIndicator
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
  Settings,
  ChevronDown,
  X,
  RefreshCw
} from 'lucide-react-native';
import { useRouter, usePathname } from 'expo-router';
import { groqChat, groqSuggestions } from '../../config/llm';

// Types
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
    action: () => {}
  },
  {
    id: 'conditions',
    title: 'Learn About Conditions',
    icon: 'FileText',
    action: () => {}
  },
  {
    id: 'medications',
    title: 'Medication Questions',
    icon: 'Heart',
    action: () => {}
  },
  {
    id: 'emergency',
    title: 'Emergency Help',
    icon: 'Phone',
    action: () => {}
  }
];

// Fallback responses for when Gemini is unavailable
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

export default function ChatbotScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentTab, setCurrentTab] = useState('chatbot');
  const activeTab = React.useMemo(() => {
    if (!pathname) return 'chatbot';
    if (pathname === '/(tabs)') return 'index';
    if (pathname.startsWith('/(tabs)/records')) return 'records';
    if (pathname.startsWith('/(tabs)/appointments')) return 'appointments';
    if (pathname.startsWith('/(tabs)/profile')) return 'profile';
    if (pathname.startsWith('/(tabs)/chatbot')) return 'chatbot';
    return 'chatbot';
  }, [pathname]);

  const handleTabChange = (tab: string) => {
    setCurrentTab(tab);
    if (tab !== 'chatbot') {
      switch (tab) {
        case 'index':
          router.push('/(tabs)');
          break;
        case 'records':
          router.push('/(tabs)/records');
          break;
        case 'appointments':
          router.push('/(tabs)/appointments');
          break;
        case 'profile':
          router.push('/(tabs)/profile');
          break;
        default:
          break;
      }
    }
  };

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hello! I'm your AI healthcare assistant powered by advanced AI. I can answer medical questions, explain conditions, discuss treatments, and provide health guidance. I'm here to help with your healthcare needs - what would you like to know?",
      isUser: false,
      timestamp: new Date(),
      type: 'text',
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

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  // Handle sending a message with Gemini AI
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
      // Generate response using Gemini AI
      const botResponse = await groqChat([{ role: 'user', content: currentInput }]);
      
      // Generate suggestions for follow-up
      const suggestions = await groqSuggestions(currentInput);
      
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
    // Auto-send the suggestion
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
      const botResponse = await groqChat([{ role: 'user', content: message.text }]);
      const suggestions = await groqSuggestions(message.text);
      
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
        Alert.alert(
          'Emergency Contact',
          'For medical emergencies, call 911 immediately. For urgent concerns, contact your healthcare provider.',
          [
            { text: 'Call 911', onPress: () => {/* Implement phone call */} },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
        break;
    }
  };

  // Message bubble component
  const MessageBubble = ({ message }: { message: Message }) => (
    <View style={[
      styles.messageBubble,
      message.isUser ? styles.userMessage : styles.botMessage,
      message.isError && styles.errorMessage
    ]}>
      <View style={styles.messageHeader}>
        {message.isUser ? (
          <User size={16} color="#1E3A8A" />
        ) : (
          <Bot size={16} color={message.isError ? "#ef4444" : "#059669"} />
        )}
        <Text style={styles.messageTime}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
        {message.isError && (
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => handleRetry(message.id)}
            accessibilityLabel="Retry message"
          >
            <RefreshCw size={14} color="#ef4444" />
          </TouchableOpacity>
        )}
      </View>
      <Text style={[
        styles.messageText,
        message.isUser ? styles.userMessageText : styles.botMessageText,
        message.isError && styles.errorMessageText
      ]}>
        {message.text}
      </Text>
      {/* Suggestions */}
      {message.suggestions && message.suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <Text style={styles.suggestionsTitle}>Suggestions:</Text>
          {message.suggestions.map((suggestion, index) => (
            <TouchableOpacity
              key={index}
              style={styles.suggestionButton}
              onPress={() => handleSuggestion(suggestion)}
              accessibilityLabel={`Suggestion: ${suggestion}`}
            >
              <Text style={styles.suggestionText}>{suggestion}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  // Quick actions component
  const QuickActions = () => (
    <View style={styles.quickActionsContainer}>
      <Text style={styles.quickActionsTitle}>Quick Actions</Text>
      <View style={styles.quickActionsGrid}>
        {quickActions.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={styles.quickActionButton}
            onPress={() => handleQuickAction(action)}
            accessibilityLabel={action.title}
          >
            <View style={styles.quickActionIcon}>
              {action.icon === 'Calendar' && <Calendar size={20} color="#1E3A8A" />}
              {action.icon === 'FileText' && <FileText size={20} color="#1E3A8A" />}
              {action.icon === 'Phone' && <Phone size={20} color="#1E3A8A" />}
              {action.icon === 'Heart' && <Heart size={20} color="#1E3A8A" />}
            </View>
            <Text style={styles.quickActionText}>{action.title}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.profileSection}>
            <View style={styles.profileImage}>
              <User size={24} color="#1E3A8A" />
            </View>
            <Text style={styles.welcomeText}>Hello Farida</Text>
          </View>
        </View>
        
        {/* Navigation Options */}
        <View style={styles.navigationSection}>
          <TouchableOpacity 
            style={[styles.navButton, activeTab === 'index' && styles.activeNavButton]}
            onPress={() => handleTabChange('index')}
          >
            <User size={16} color={activeTab === 'index' ? '#ffffff' : '#1E3A8A'} />
            <Text style={[styles.navText, activeTab === 'index' && styles.activeNavText]}>Dashboard</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.navButton, activeTab === 'records' && styles.activeNavButton]}
            onPress={() => handleTabChange('records')}
          >
            <FileText size={16} color={activeTab === 'records' ? '#ffffff' : '#1E3A8A'} />
            <Text style={[styles.navText, activeTab === 'records' && styles.activeNavText]}>Records</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.navButton, activeTab === 'appointments' && styles.activeNavButton]}
            onPress={() => handleTabChange('appointments')}
          >
            <Calendar size={16} color={activeTab === 'appointments' ? '#ffffff' : '#1E3A8A'} />
            <Text style={[styles.navText, activeTab === 'appointments' && styles.activeNavText]}>Appointments</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.navButton, activeTab === 'chatbot' && styles.activeNavButton]}
            onPress={() => handleTabChange('chatbot')}
          >
            <Bot size={16} color={activeTab === 'chatbot' ? '#ffffff' : '#1E3A8A'} />
            <Text style={[styles.navText, activeTab === 'chatbot' && styles.activeNavText]}>AI Assistant</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.navButton, activeTab === 'profile' && styles.activeNavButton]}
            onPress={() => handleTabChange('profile')}
          >
            <User size={16} color={activeTab === 'profile' ? '#ffffff' : '#1E3A8A'} />
            <Text style={[styles.navText, activeTab === 'profile' && styles.activeNavText]}>Profile</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => setShowQuickActions(!showQuickActions)}
            accessibilityLabel="Toggle quick actions"
          >
            {showQuickActions ? <X size={20} color="#1E3A8A" /> : <Settings size={20} color="#1E3A8A" />}
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Actions */}
      {showQuickActions && <QuickActions />}

      {/* Messages */}
      <KeyboardAvoidingView 
        style={styles.messagesContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
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
                <ActivityIndicator size="small" color="#059669" />
                <Text style={styles.typingText}>AI is typing...</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Type your message..."
              placeholderTextColor="#9ca3af"
              multiline
              maxLength={500}
              accessibilityLabel="Message input"
            />
            <TouchableOpacity
              style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
              onPress={handleSendMessage}
              disabled={!inputText.trim()}
              accessibilityLabel="Send message"
            >
              <Send size={20} color={inputText.trim() ? "#ffffff" : "#9ca3af"} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerLeft: {
    minWidth: 200,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  welcomeText: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: '#1E3A8A',
  },
  navigationSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'center',
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'transparent',
    gap: 6,
  },
  activeNavButton: {
    backgroundColor: '#1E3A8A',
  },
  navText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#1E3A8A',
  },
  activeNavText: {
    color: '#ffffff',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  quickActionsContainer: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  quickActionsTitle: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#374151',
    marginBottom: 12,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  quickActionIcon: {
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: '#374151',
    textAlign: 'center',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  messageBubble: {
    maxWidth: '80%',
    marginBottom: 12,
    padding: 12,
    borderRadius: 16,
  },
  userMessage: {
    backgroundColor: '#1E3A8A',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  botMessage: {
    backgroundColor: '#ffffff',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  messageTime: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    color: '#6b7280',
  },
  messageText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
  },
  userMessageText: {
    color: '#ffffff',
  },
  botMessageText: {
    color: '#374151',
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typingText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#6b7280',
    fontStyle: 'italic',
  },
  inputContainer: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#374151',
    maxHeight: 100,
    paddingVertical: 8,
  },
  sendButton: {
    backgroundColor: '#1E3A8A',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#e5e7eb',
  },
  // Error message styles
  errorMessage: {
    borderColor: '#ef4444',
    borderWidth: 1,
  },
  errorMessageText: {
    color: '#ef4444',
  },
  retryButton: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: '#fef2f2',
  },
  // Suggestions styles
  suggestionsContainer: {
    marginTop: 8,
    gap: 6,
  },
  suggestionsTitle: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#6b7280',
    marginBottom: 4,
  },
  suggestionButton: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  suggestionText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: '#374151',
  },
});
