import React, { useCallback, useMemo, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { MessageCircle, ChevronRight } from 'lucide-react-native';
import { DF, type DashboardPalette } from '../../constants/DashboardColors';
import { doctorChatService } from '../../services/doctorChatService';
import type { DoctorChatSummary } from '../../types/doctorChat';

type Props = {
  D: DashboardPalette;
  patientId?: number;
};

function formatChatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function DoctorChatCard({ D, patientId }: Props) {
  const router = useRouter();
  const s = useMemo(() => createStyles(D), [D]);
  const [chats, setChats] = useState<DoctorChatSummary[]>([]);
  const [loading, setLoading] = useState(Boolean(patientId));

  const load = useCallback(async () => {
    if (!patientId) {
      setChats([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const rows = await doctorChatService.listForPatient(patientId);
      setChats(rows);
    } catch {
      setChats([]);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <View style={s.card}>
      <View style={s.head}>
        <MessageCircle size={16} color={D.secondary} />
        <Text style={s.title}>Doctor Messages</Text>
      </View>
      <Text style={s.subtitle}>Chat history with your care team</Text>

      {loading ? (
        <ActivityIndicator color={D.primary} style={s.loader} />
      ) : chats.length === 0 ? (
        <Text style={s.empty}>No doctor conversations yet.</Text>
      ) : (
        chats.map((chat) => (
          <Pressable
            key={chat.id}
            style={({ pressed }) => [s.row, pressed && s.rowPressed]}
            onPress={() => router.push(`/doctor-chat/${chat.id}` as never)}
          >
            <View style={s.rowBody}>
              <View style={s.rowTop}>
                <Text style={s.chatTitle} numberOfLines={1}>
                  {chat.title}
                </Text>
                {chat.unread_count > 0 ? (
                  <View style={s.badge}>
                    <Text style={s.badgeText}>{chat.unread_count}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={s.doctorName} numberOfLines={1}>
                {chat.doctor_name}
              </Text>
              {chat.last_message_preview ? (
                <Text style={s.preview} numberOfLines={1}>
                  {chat.last_message_preview}
                </Text>
              ) : null}
              <Text style={s.date}>{formatChatDate(chat.last_message_at)}</Text>
            </View>
            <ChevronRight size={18} color={D.onSurfaceVariant} />
          </Pressable>
        ))
      )}
    </View>
  );
}

function createStyles(D: DashboardPalette) {
  return StyleSheet.create({
    card: {
      backgroundColor: D.surfaceContainerLow,
      borderRadius: 20,
      padding: 16,
      borderWidth: 1,
      borderColor: D.outlineVariant,
    },
    head: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 4,
    },
    title: {
      fontFamily: DF.bold,
      fontSize: 11,
      color: D.onSurfaceVariant,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    subtitle: {
      fontFamily: DF.medium,
      fontSize: 12,
      color: D.onSurfaceVariant,
      marginBottom: 12,
    },
    loader: { marginVertical: 16 },
    empty: {
      fontFamily: DF.medium,
      fontSize: 12,
      color: D.onSurfaceVariant,
      textAlign: 'center',
      paddingVertical: 12,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: 12,
      borderRadius: 14,
      backgroundColor: D.surfaceContainerLow,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: D.outlineVariant,
    },
    rowPressed: { opacity: 0.85 },
    rowBody: { flex: 1, gap: 2 },
    rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    chatTitle: {
      flex: 1,
      fontFamily: DF.bold,
      fontSize: 13,
      color: D.onSurface,
    },
    badge: {
      minWidth: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: D.primary,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 6,
    },
    badgeText: {
      fontFamily: DF.bold,
      fontSize: 10,
      color: D.onPrimary,
    },
    doctorName: {
      fontFamily: DF.medium,
      fontSize: 11,
      color: D.secondary,
    },
    preview: {
      fontFamily: DF.medium,
      fontSize: 11,
      color: D.onSurfaceVariant,
    },
    date: {
      fontFamily: DF.medium,
      fontSize: 10,
      color: D.onSurfaceVariant,
      marginTop: 2,
    },
  });
}
