import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Send, Stethoscope, User } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { doctorChatService } from '../../services/doctorChatService';
import { DF, D_LIGHT } from '../../constants/DashboardColors';
import type { DoctorChatDetail, DoctorChatMessage } from '../../types/doctorChat';

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function DoctorChatScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const chatId = Number(id);
  const { user } = useAuth();
  const scrollRef = useRef<ScrollView>(null);
  const [conversation, setConversation] = useState<DoctorChatDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState('');
  const D = D_LIGHT;
  const s = useMemo(() => createStyles(D), [D]);

  const load = useCallback(async () => {
    if (!user?.id || !chatId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await doctorChatService.getConversation(user.id, chatId);
      setConversation(data);
    } catch {
      setConversation(null);
    } finally {
      setLoading(false);
    }
  }, [user?.id, chatId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (conversation?.messages.length) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [conversation?.messages.length]);

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || !user?.id || !chatId || sending) return;
    try {
      setSending(true);
      const sent = await doctorChatService.sendMessage(user.id, chatId, text);
      setDraft('');
      setConversation((prev) => {
        if (!prev) return prev;
        const nextMessage: DoctorChatMessage = {
          id: sent.id,
          sender: sent.sender,
          content: sent.content,
          created_at: sent.created_at,
        };
        return { ...prev, messages: [...prev.messages, nextMessage] };
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={s.header}>
        <Pressable style={s.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color={D.primary} />
        </Pressable>
        <View style={s.headerText}>
          <Text style={s.headerTitle} numberOfLines={1}>
            {conversation?.title ?? 'Doctor chat'}
          </Text>
          <Text style={s.headerSub} numberOfLines={1}>
            {conversation?.doctor_name ?? 'Loading…'}
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator color={D.primary} size="large" />
        </View>
      ) : !conversation ? (
        <View style={s.centered}>
          <Text style={s.emptyText}>Conversation not found.</Text>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={s.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={8}
        >
          <ScrollView
            ref={scrollRef}
            style={s.messages}
            contentContainerStyle={s.messagesContent}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          >
            {conversation.messages.map((message) => {
              const isPatient = message.sender === 'patient';
              return (
                <View
                  key={message.id}
                  style={[s.bubble, isPatient ? s.bubblePatient : s.bubbleDoctor]}
                >
                  <View style={s.bubbleHead}>
                    {isPatient ? (
                      <User size={14} color={D.onPrimary} />
                    ) : (
                      <Stethoscope size={14} color={D.secondary} />
                    )}
                    <Text style={[s.bubbleTime, isPatient && s.bubbleTimePatient]}>
                      {formatTime(message.created_at)}
                    </Text>
                  </View>
                  <Text style={[s.bubbleText, isPatient && s.bubbleTextPatient]}>
                    {message.content}
                  </Text>
                </View>
              );
            })}
          </ScrollView>

          <View style={s.composer}>
            <TextInput
              style={s.input}
              placeholder="Type a message to your doctor…"
              placeholderTextColor={D.onSurfaceVariant}
              value={draft}
              onChangeText={setDraft}
              multiline
              maxLength={2000}
            />
            <Pressable
              style={[s.sendBtn, (!draft.trim() || sending) && s.sendBtnDisabled]}
              onPress={() => void handleSend()}
              disabled={!draft.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator color={D.onPrimary} size="small" />
              ) : (
                <Send size={18} color={D.onPrimary} />
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

function createStyles(D: typeof D_LIGHT) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: D.background },
    flex: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: D.outlineVariant,
      backgroundColor: D.surfaceContainerLow,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerText: { flex: 1 },
    headerTitle: {
      fontFamily: DF.bold,
      fontSize: 16,
      color: D.onSurface,
    },
    headerSub: {
      fontFamily: DF.medium,
      fontSize: 12,
      color: D.secondary,
      marginTop: 2,
    },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    emptyText: { fontFamily: DF.medium, fontSize: 14, color: D.onSurfaceVariant },
    messages: { flex: 1 },
    messagesContent: { padding: 16, gap: 10 },
    bubble: {
      maxWidth: '85%',
      borderRadius: 16,
      padding: 12,
      marginBottom: 4,
    },
    bubblePatient: {
      alignSelf: 'flex-end',
      backgroundColor: D.primary,
    },
    bubbleDoctor: {
      alignSelf: 'flex-start',
      backgroundColor: D.surfaceContainerLow,
      borderWidth: 1,
      borderColor: D.outlineVariant,
    },
    bubbleHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 6,
    },
    bubbleTime: {
      fontFamily: DF.medium,
      fontSize: 10,
      color: D.onSurfaceVariant,
    },
    bubbleTimePatient: { color: 'rgba(255,255,255,0.8)' },
    bubbleText: {
      fontFamily: DF.medium,
      fontSize: 14,
      lineHeight: 20,
      color: D.onSurface,
    },
    bubbleTextPatient: { color: D.onPrimary },
    composer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: D.outlineVariant,
      backgroundColor: D.surfaceContainerLow,
    },
    input: {
      flex: 1,
      minHeight: 44,
      maxHeight: 120,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: D.outlineVariant,
      backgroundColor: D.surfaceContainerLow,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontFamily: DF.medium,
      fontSize: 14,
      color: D.onSurface,
    },
    sendBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: D.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendBtnDisabled: { opacity: 0.5 },
  });
}
