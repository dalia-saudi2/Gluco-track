import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  useWindowDimensions,
  Platform,
  Share,
} from 'react-native';
import {
  X,
  Phone,
  Video,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  UserRound,
} from 'lucide-react-native';
import { DF, type DashboardPalette } from '../../constants/DashboardColors';
import { useD } from '../../hooks/useDashboardTheme';
import { openExternalUrl } from '../../utils/openExternalUrl';
import type { CallDoctorResult } from '../../types/zoom';
import { callDoctor, getZoomAuthorizeUrl, getZoomOAuthStatus } from '../../services/zoomService';

type Props = {
  visible: boolean;
  isAuthenticated: boolean;
  onClose: () => void;
};

type LoadState = 'idle' | 'checking' | 'creating' | 'ready' | 'error' | 'needs_host';

export function CallDoctorSheet({ visible, isAuthenticated, onClose }: Props) {
  const D = useD();
  const { height } = useWindowDimensions();
  const s = useMemo(() => createStyles(D), [D]);

  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [consultation, setConsultation] = useState<CallDoctorResult | null>(null);

  const reset = useCallback(() => {
    setLoadState('idle');
    setErrorMessage(null);
    setConsultation(null);
  }, []);

  const startCall = useCallback(async () => {
    if (!isAuthenticated) {
      setLoadState('error');
      setErrorMessage('Please sign in to start a video consultation with your doctor.');
      return;
    }

    setErrorMessage(null);
    setLoadState('checking');

    try {
      const status = await getZoomOAuthStatus();
      if (!status.configured) {
        setLoadState('error');
        setErrorMessage(
          'Zoom is not configured on the server. Add ZOOM_CLIENT_ID and ZOOM_CLIENT_SECRET to backend .env.'
        );
        return;
      }
      if (!status.host_ready) {
        setLoadState('needs_host');
        return;
      }

      setLoadState('creating');
      const result = await callDoctor();
      setConsultation(result);
      setLoadState('ready');
    } catch (err: unknown) {
      setLoadState('error');
      const message =
        err instanceof Error ? err.message : 'Could not create the Zoom meeting. Please try again.';
      setErrorMessage(message);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (visible) {
      void startCall();
    } else {
      reset();
    }
  }, [visible, startCall, reset]);

  const openJoinUrl = async () => {
    if (!consultation?.join_url) return;
    await openExternalUrl(consultation.join_url);
  };

  const connectDoctorZoom = async () => {
    try {
      const { authorize_url } = await getZoomAuthorizeUrl();
      await openExternalUrl(authorize_url);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Could not open Zoom authorization.');
      setLoadState('error');
    }
  };

  const shareHostLink = async () => {
    if (!consultation?.start_url) return;
    try {
      await Share.share({
        message: `Doctor host link for ${consultation.topic}:\n${consultation.start_url}`,
        url: Platform.OS === 'ios' ? consultation.start_url : undefined,
      });
    } catch {
      /* user cancelled */
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={[s.sheet, { maxHeight: height * 0.82 }]}>
          <View style={s.header}>
            <View style={s.headerLeft}>
              <Video size={20} color={D.secondary} />
              <Text style={s.title}>Call Doctor</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Close">
              <X size={22} color={D.onSurfaceVariant} />
            </Pressable>
          </View>

          {(loadState === 'checking' || loadState === 'creating') && (
            <View style={s.centered}>
              <ActivityIndicator size="large" color={D.secondary} />
              <Text style={s.muted}>
                {loadState === 'checking' ? 'Checking Zoom…' : 'Creating Zoom meeting…'}
              </Text>
            </View>
          )}

          {loadState === 'needs_host' && (
            <View style={s.centered}>
              <UserRound size={40} color={D.secondary} />
              <Text style={s.heading}>Doctor Zoom not connected</Text>
              <Text style={s.muted}>
                Connect a Zoom account once before video visits. For testing, you can connect your own Zoom here.
              </Text>
              <Pressable style={s.primaryBtn} onPress={() => void connectDoctorZoom()}>
                <ExternalLink size={16} color={D.onPrimary} />
                <Text style={s.primaryBtnText}>Connect Zoom</Text>
              </Pressable>
              <Pressable style={s.ghostBtn} onPress={() => void startCall()}>
                <RefreshCw size={14} color={D.onSurfaceVariant} />
                <Text style={s.ghostBtnText}>Try again</Text>
              </Pressable>
            </View>
          )}

          {loadState === 'error' && (
            <View style={s.centered}>
              <AlertCircle size={40} color={D.error} />
              <Text style={s.heading}>Unable to start call</Text>
              <Text style={s.muted}>{errorMessage}</Text>
              <Pressable style={s.primaryBtn} onPress={() => void startCall()}>
                <RefreshCw size={16} color={D.onPrimary} />
                <Text style={s.primaryBtnText}>Retry</Text>
              </Pressable>
            </View>
          )}

          {loadState === 'ready' && consultation && (
            <View style={s.body}>
              <View style={s.successCard}>
                <Phone size={18} color={D.secondary} />
                <View style={s.successText}>
                  <Text style={s.heading}>{consultation.topic}</Text>
                  <Text style={s.muted}>Meeting ID: {consultation.meeting_id}</Text>
                  <Text style={s.muted}>{consultation.message}</Text>
                </View>
              </View>

              <Pressable style={s.joinBtn} onPress={() => void openJoinUrl()}>
                <Video size={18} color={D.onPrimary} />
                <Text style={s.joinBtnText}>Join as patient</Text>
              </Pressable>

              {consultation.start_url ? (
                <Pressable style={s.ghostBtn} onPress={() => void shareHostLink()}>
                  <ExternalLink size={14} color={D.secondary} />
                  <Text style={[s.ghostBtnText, { color: D.secondary }]}>Share doctor host link</Text>
                </Pressable>
              ) : null}

              <Text style={s.hint}>
                Opens in the Zoom app or browser. Waiting room is enabled for your safety.
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

function createStyles(D: DashboardPalette) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: D.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: 24,
      ...DF.shadowLg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: D.outlineVariant,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    title: { fontSize: 18, fontWeight: '700', color: D.onSurface },
    centered: {
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 24,
      paddingVertical: 32,
    },
    body: { paddingHorizontal: 20, paddingTop: 16, gap: 14 },
    heading: { fontSize: 16, fontWeight: '700', color: D.onSurface, textAlign: 'center' },
    muted: {
      fontSize: 14,
      color: D.onSurfaceVariant,
      textAlign: 'center',
      lineHeight: 20,
    },
    successCard: {
      flexDirection: 'row',
      gap: 12,
      padding: 14,
      borderRadius: 14,
      backgroundColor: `${D.secondary}12`,
      borderWidth: 1,
      borderColor: `${D.secondary}33`,
    },
    successText: { flex: 1, gap: 4 },
    primaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: D.secondary,
      paddingHorizontal: 18,
      paddingVertical: 12,
      borderRadius: 12,
      marginTop: 8,
    },
    primaryBtnText: { color: D.onPrimary, fontWeight: '700', fontSize: 14 },
    joinBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: D.secondary,
      paddingVertical: 14,
      borderRadius: 14,
    },
    joinBtnText: { color: D.onPrimary, fontWeight: '700', fontSize: 16 },
    ghostBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 10,
    },
    ghostBtnText: { color: D.onSurfaceVariant, fontWeight: '600', fontSize: 14 },
    hint: { fontSize: 12, color: D.onSurfaceVariant, textAlign: 'center', lineHeight: 18 },
  });
}
