import React, { ReactNode, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  useWindowDimensions,
  Alert,
  Share,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Calendar,
  Clock,
  MapPin,
  Plus,
  Video,
  RefreshCw,
  AlertTriangle,
  CalendarClock,
  History,
  CheckCircle,
  XCircle,
  Lightbulb,
  Share2,
  RotateCcw,
} from 'lucide-react-native';
import { CandyCard } from '../dashboard/CandyCard';
import { DF, DashboardPalette } from '../../constants/DashboardColors';
import { useD } from '../../hooks/useDashboardTheme';
import { createDashboardScreenTheme } from '../../hooks/dashboardScreenTheme';
import { VitalisShell } from './VitalisShell';
import { Appointment } from '../../services/appointmentsService';
import { telehealthPlatformLabel, joinButtonLabel } from '../../utils/telehealthMeeting';

type SubTab = 'upcoming' | 'past' | 'canceled' | 'schedule';

type Props = {
  userName?: string;
  currentSubTab: SubTab;
  onSubTabChange: (tab: SubTab) => void;
  prefEmail: boolean;
  prefSms: boolean;
  prefPush: boolean;
  onToggleEmail: () => void;
  onToggleSms: () => void;
  onTogglePush: () => void;
  upcoming: Appointment[];
  past: Appointment[];
  canceled: Appointment[];
  stats: { upcoming: number; past: number; completed: number; canceled: number };
  isLoading?: boolean;
  isRefreshing?: boolean;
  authIsLoading?: boolean;
  isAuthenticated?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  onRetry?: () => void;
  onLogout?: () => void;
  onScheduleNew: () => void;
  onReschedule: (id: number) => void;
  onCancel: (id: number) => void;
  onJoinTelehealth: (appointment: Appointment) => void;
  onBookFollowUp: () => void;
  bookingModal: ReactNode;
};

const { ScreenThemeProvider, useScreenTheme } = createDashboardScreenTheme<ReturnType<typeof createStyles>>();

function doctorInitials(name: string) {
  return name
    .replace(/^Dr\.?\s*/i, '')
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function formatDateLabel(dateStr: string) {
  try {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function StatCard({
  value,
  label,
  color,
  icon: Icon,
  bg,
}: {
  value: number | string;
  label: string;
  color: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  bg: string;
}) {
  const { s } = useScreenTheme();
  return (
    <CandyCard style={s.statCard}>
      <View style={[s.statIcon, { backgroundColor: bg }]}>
        <Icon size={20} color={color} />
      </View>
      <View>
        <Text style={[s.statValue, { color }]}>{value}</Text>
        <Text style={s.statLabel}>{label}</Text>
      </View>
    </CandyCard>
  );
}

function NotifyChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { s } = useScreenTheme();
  return (
    <Pressable onPress={onPress} style={[s.notifyChip, active && s.notifyChipOn]}>
      <Text style={[s.notifyChipText, active && s.notifyChipTextOn]}>{label}</Text>
    </Pressable>
  );
}

function AppointmentCard({
  appointment,
  accentColor,
  onReschedule,
  onCancel,
  onJoin,
  onShare,
  showReminder,
}: {
  appointment: Appointment;
  accentColor: string;
  onReschedule?: () => void;
  onCancel?: () => void;
  onJoin?: (appointment: Appointment) => void;
  onShare?: () => void;
  showReminder?: boolean;
}) {
  const { D, s } = useScreenTheme();
  const isTelehealth = appointment.mode === 'telehealth';
  const statusStyle =
    appointment.status === 'Canceled'
      ? s.statusCancelled
      : appointment.status === 'Completed'
        ? s.statusCompleted
        : s.statusConfirmed;

  return (
    <CandyCard style={s.apptCard}>
      <View style={s.apptRow}>
        <View style={[s.accentBar, { backgroundColor: accentColor }]} />
        <View style={s.apptBody}>
          <View style={s.apptHead}>
            <View style={s.apptLeft}>
              <View style={[s.doctorAvatar, { borderColor: `${accentColor}33` }]}>
                <Text style={[s.doctorInitials, { color: accentColor }]}>{doctorInitials(appointment.doctor)}</Text>
              </View>
              <View style={s.apptInfo}>
                <Text style={s.doctorName}>{appointment.doctor}</Text>
                <Text style={s.specialty}>
                  {appointment.specialty} · {appointment.type === 'follow_up' ? 'Follow-up' : appointment.type === 'urgent' ? 'Urgent' : 'Routine'}
                </Text>
                {isTelehealth && appointment.status !== 'Completed' && appointment.status !== 'Canceled' && (
                  <View style={s.teleRow}>
                    <View style={s.teleDot} />
                    <Text style={s.teleText}>Available for telemedicine</Text>
                  </View>
                )}
              </View>
            </View>
            <View style={[s.statusBadge, statusStyle]}>
              <Text style={s.statusBadgeText}>{appointment.status}</Text>
            </View>
          </View>

          <View style={s.divider} />

          <View style={s.detailGrid}>
            <View style={s.detailBox}>
              <Calendar size={16} color={D.primary} />
              <View>
                <Text style={s.detailLbl}>Date</Text>
                <Text style={s.detailVal}>{formatDateLabel(appointment.date)}</Text>
              </View>
            </View>
            <View style={s.detailBox}>
              <Clock size={16} color={D.secondary} />
              <View>
                <Text style={s.detailLbl}>Time</Text>
                <Text style={s.detailVal}>{appointment.time} · ~30 min</Text>
              </View>
            </View>
            <View style={s.detailBox}>
              {isTelehealth ? <Video size={16} color={D.tertiary} /> : <MapPin size={16} color={D.tertiary} />}
              <View>
                <Text style={s.detailLbl}>Location</Text>
                <Text style={[s.detailVal, isTelehealth && s.detailItalic]}>
                  {isTelehealth
                    ? appointment.meetingUrl
                      ? `${telehealthPlatformLabel(appointment.telehealthPlatform)} · Scheduled`
                      : 'Telehealth Visit'
                    : appointment.location}
                </Text>
              </View>
            </View>
          </View>

          {showReminder && (
            <View style={s.reminderBox}>
              <Lightbulb size={16} color={D.primary} />
              <Text style={s.reminderText}>
                <Text style={s.reminderBold}>Before your visit: </Text>
                Bring your glucose log from the last 2 weeks. Fast 8 hours before for accurate lab readings.
              </Text>
            </View>
          )}

          <View style={s.actionRow}>
            {onReschedule && (
              <Pressable style={s.ghostAction} onPress={onReschedule}>
                <RotateCcw size={14} color={D.onSurfaceVariant} />
                <Text style={s.ghostActionText}>Reschedule</Text>
              </Pressable>
            )}
            {onCancel && (
              <Pressable style={s.cancelAction} onPress={onCancel}>
                <XCircle size={14} color={D.error} />
                <Text style={s.cancelActionText}>Cancel</Text>
              </Pressable>
            )}
            {onShare && (
              <Pressable style={s.ghostAction} onPress={onShare}>
                <Share2 size={14} color={D.onSurfaceVariant} />
                <Text style={s.ghostActionText}>Share</Text>
              </Pressable>
            )}
            {onJoin && isTelehealth && (
              <Pressable style={s.joinAction} onPress={() => onJoin(appointment)}>
                <Video size={14} color={D.secondary} />
                <Text style={s.joinActionText}>{joinButtonLabel(appointment.telehealthPlatform)}</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </CandyCard>
  );
}

const SUB_TABS: { id: SubTab; label: string }[] = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'past', label: 'Past' },
  { id: 'canceled', label: 'Cancelled' },
  { id: 'schedule', label: 'Schedule' },
];

export function VitalisAppointmentsScreen({
  userName = 'Patient',
  currentSubTab,
  onSubTabChange,
  prefEmail,
  prefSms,
  prefPush,
  onToggleEmail,
  onToggleSms,
  onTogglePush,
  upcoming,
  past,
  canceled,
  stats,
  isLoading,
  isRefreshing,
  authIsLoading,
  isAuthenticated,
  error,
  onRefresh,
  onRetry,
  onLogout,
  onScheduleNew,
  onReschedule,
  onCancel,
  onJoinTelehealth,
  onBookFollowUp,
  bookingModal,
}: Props) {
  const router = useRouter();
  const D = useD();
  const s = useMemo(() => StyleSheet.create(createStyles(D)), [D]);
  const { width } = useWindowDimensions();
  const isWide = width >= 768;
  const firstName = userName.split(' ')[0] || userName;

  const accentColors = [D.primary, D.secondary, D.tertiary];

  const handleShare = async (appt: Appointment) => {
    try {
      await Share.share({
        message: `Appointment with ${appt.doctor} on ${formatDateLabel(appt.date)} at ${appt.time}`,
      });
    } catch {
      Alert.alert('Error', 'Unable to share appointment details.');
    }
  };

  const listContent = useMemo(() => {
    if (authIsLoading) {
      return (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={D.primary} />
          <Text style={s.mutedText}>Initializing...</Text>
        </View>
      );
    }
    if (!isAuthenticated) {
      return (
        <View style={s.centered}>
          <AlertTriangle size={48} color={D.error} />
          <Text style={s.mutedText}>Please login to view your appointments</Text>
          <Pressable style={s.primaryBtn} onPress={() => router.push('/login')}>
            <Text style={s.primaryBtnText}>Go to Login</Text>
          </Pressable>
        </View>
      );
    }
    if (error) {
      return (
        <View style={s.centered}>
          <AlertTriangle size={48} color={D.error} />
          <Text style={s.mutedText}>{error}</Text>
          {onRetry && (
            <Pressable style={s.primaryBtn} onPress={onRetry}>
              <RefreshCw size={16} color={D.onPrimary} />
              <Text style={s.primaryBtnText}>Retry</Text>
            </Pressable>
          )}
        </View>
      );
    }
    if (isLoading) {
      return (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={D.primary} />
          <Text style={s.mutedText}>Loading appointments...</Text>
        </View>
      );
    }

    if (currentSubTab === 'upcoming') {
      if (upcoming.length === 0) {
        return (
          <View style={s.centered}>
            <CalendarClock size={48} color={D.onSurfaceVariant} />
            <Text style={s.mutedText}>No upcoming appointments. Book one now!</Text>
            <Pressable style={s.primaryBtn} onPress={onScheduleNew}>
              <Plus size={18} color={D.onPrimary} />
              <Text style={s.primaryBtnText}>Schedule New</Text>
            </Pressable>
          </View>
        );
      }
      return upcoming.map((appt, i) => (
        <AppointmentCard
          key={appt.id}
          appointment={appt}
          accentColor={accentColors[i % accentColors.length]}
          showReminder
          onReschedule={() => onReschedule(appt.id)}
          onCancel={() => onCancel(appt.id)}
          onJoin={(appt) => onJoinTelehealth(appt)}
          onShare={() => handleShare(appt)}
        />
      ));
    }

    if (currentSubTab === 'past') {
      if (past.length === 0) {
        return (
          <View style={s.centered}>
            <History size={48} color={D.onSurfaceVariant} />
            <Text style={s.mutedText}>No past appointments found.</Text>
          </View>
        );
      }
      return past.map((appt, i) => (
        <AppointmentCard
          key={appt.id}
          appointment={{ ...appt, status: 'Completed' }}
          accentColor={D.onSurfaceVariant}
        />
      ));
    }

    if (currentSubTab === 'canceled') {
      if (canceled.length === 0) {
        return (
          <View style={s.centered}>
            <XCircle size={48} color={D.onSurfaceVariant} />
            <Text style={s.mutedText}>No cancelled appointments.</Text>
          </View>
        );
      }
      return canceled.map((appt) => (
        <View key={appt.id}>
          <AppointmentCard appointment={appt} accentColor={D.error} />
          <Pressable style={s.rebookBtn} onPress={onBookFollowUp}>
            <Plus size={16} color={D.onPrimary} />
            <Text style={s.rebookBtnText}>Rebook Now</Text>
          </Pressable>
        </View>
      ));
    }

    return (
      <View style={s.centered}>
        <Calendar size={48} color={D.primary} />
        <Text style={s.mutedText}>Book a new appointment with your care team</Text>
        <Pressable style={s.primaryBtn} onPress={onScheduleNew}>
          <Plus size={18} color={D.onPrimary} />
          <Text style={s.primaryBtnText}>New Appointment</Text>
        </Pressable>
      </View>
    );
  }, [
    authIsLoading,
    isAuthenticated,
    error,
    isLoading,
    currentSubTab,
    upcoming,
    past,
    canceled,
    onReschedule,
    onCancel,
    onJoinTelehealth,
    onBookFollowUp,
    onScheduleNew,
    onRetry,
    router,
    D,
    s,
  ]);

  return (
    <ScreenThemeProvider D={D} s={s}>
    <>
      <VitalisShell
        activeNavId="appointments"
        userName={userName}
        onLogout={onLogout}
        onRefresh={onRefresh}
        refreshing={!!isRefreshing}
      >
        <View style={s.pageHead}>
          <View style={s.pageHeadLeft}>
            <Text style={s.pageTitle}>Appointments</Text>
            <Text style={s.pageSub}>
              Hello {firstName}, you have <Text style={s.pageSubBold}>{stats.upcoming} upcoming</Text> appointments
            </Text>
          </View>
          <Pressable style={s.scheduleBtn} onPress={onScheduleNew}>
            <Plus size={16} color={D.onPrimary} />
            <Text style={s.scheduleBtnText}>Schedule New</Text>
          </Pressable>
        </View>

        <View style={[s.statsRow, isWide && s.statsRowWide]}>
          <StatCard value={stats.upcoming} label="Upcoming" color={D.primary} icon={CalendarClock} bg="rgba(224,64,160,0.1)" />
          <StatCard value={stats.completed} label="Completed" color={D.tertiary} icon={CheckCircle} bg="rgba(0,150,204,0.1)" />
          <StatCard value={stats.canceled} label="Cancelled" color={D.error} icon={XCircle} bg="rgba(229,62,62,0.08)" />
        </View>

        <View style={[s.controlsRow, isWide && s.controlsRowWide]}>
          <View style={s.tabPillWrap}>
            {SUB_TABS.map((tab) => (
              <Pressable
                key={tab.id}
                onPress={() => (tab.id === 'schedule' ? onScheduleNew() : onSubTabChange(tab.id))}
                style={[s.tabPill, currentSubTab === tab.id && s.tabPillActive]}
              >
                <Text style={[s.tabPillText, currentSubTab === tab.id && s.tabPillTextActive]}>{tab.label}</Text>
              </Pressable>
            ))}
          </View>
          <View style={s.notifyRow}>
            <Text style={s.notifyLbl}>Remind via:</Text>
            <NotifyChip label="Email" active={prefEmail} onPress={onToggleEmail} />
            <NotifyChip label="SMS" active={prefSms} onPress={onToggleSms} />
            <NotifyChip label="App" active={prefPush} onPress={onTogglePush} />
          </View>
        </View>

        <View style={s.listGap}>{listContent}</View>
      </VitalisShell>
      {bookingModal}
    </>
    </ScreenThemeProvider>
  );
}

function createStyles(D: DashboardPalette) {
  return {
  pageHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 },
  pageHeadLeft: { flex: 1, minWidth: 200 },
  pageTitle: { fontFamily: DF.bold, fontSize: 24, color: D.onSurface },
  pageSub: { fontFamily: DF.medium, fontSize: 13, color: D.onSurfaceVariant, marginTop: 4 },
  pageSubBold: { fontFamily: DF.bold, color: D.primary },
  scheduleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: D.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    shadowColor: D.primary,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  scheduleBtnText: { fontFamily: DF.bold, fontSize: 13, color: D.onPrimary },
  statsRow: { gap: 12 },
  statsRowWide: { flexDirection: 'row', flexWrap: 'wrap' },
  statCard: { flex: 1, minWidth: 140, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  statIcon: { width: 40, height: 40, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontFamily: DF.bold, fontSize: 22 },
  statLabel: { fontFamily: DF.bold, fontSize: 9, color: D.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 },
  controlsRow: { gap: 12 },
  controlsRowWide: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tabPillWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    backgroundColor: D.surfaceContainer,
    padding: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  tabPill: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 999 },
  tabPillActive: { backgroundColor: D.primary, shadowColor: D.primary, shadowOpacity: 0.35, shadowRadius: 8, elevation: 3 },
  tabPillText: { fontFamily: DF.bold, fontSize: 13, color: D.onSurfaceVariant },
  tabPillTextActive: { color: D.onPrimary },
  notifyRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  notifyLbl: { fontFamily: DF.bold, fontSize: 11, color: D.onSurfaceVariant },
  notifyChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: D.surfaceContainer },
  notifyChipOn: { backgroundColor: D.primary },
  notifyChipText: { fontFamily: DF.bold, fontSize: 11, color: D.onSurfaceVariant },
  notifyChipTextOn: { color: D.onPrimary },
  listGap: { gap: 16 },
  centered: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 12 },
  mutedText: { fontFamily: DF.medium, fontSize: 14, color: D.onSurfaceVariant, textAlign: 'center' },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: D.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    marginTop: 8,
  },
  primaryBtnText: { fontFamily: DF.bold, fontSize: 13, color: D.onPrimary },
  apptCard: { marginBottom: 0 },
  apptRow: { flexDirection: 'row' },
  accentBar: { width: 6, borderTopLeftRadius: 24, borderBottomLeftRadius: 24 },
  apptBody: { flex: 1, padding: 20 },
  apptHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  apptLeft: { flexDirection: 'row', gap: 14, flex: 1 },
  doctorAvatar: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(224,64,160,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  doctorInitials: { fontFamily: DF.bold, fontSize: 18 },
  apptInfo: { flex: 1 },
  doctorName: { fontFamily: DF.bold, fontSize: 16, color: D.onSurface },
  specialty: { fontFamily: DF.medium, fontSize: 12, color: D.onSurfaceVariant, marginTop: 2 },
  teleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  teleDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: D.green },
  teleText: { fontFamily: DF.bold, fontSize: 10, color: D.green },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  statusConfirmed: { backgroundColor: 'rgba(52,199,122,0.12)', borderColor: 'rgba(52,199,122,0.2)' },
  statusCompleted: { backgroundColor: 'rgba(0,150,204,0.1)', borderColor: 'rgba(0,150,204,0.2)' },
  statusCancelled: { backgroundColor: 'rgba(229,62,62,0.1)', borderColor: 'rgba(229,62,62,0.18)' },
  statusBadgeText: { fontFamily: DF.bold, fontSize: 9, color: D.onSurface, textTransform: 'uppercase', letterSpacing: 0.5 },
  divider: { height: 1, backgroundColor: 'rgba(220,200,224,0.25)', marginVertical: 16 },
  detailGrid: { gap: 10, marginBottom: 16 },
  detailBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: D.surfaceContainerLow,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  detailLbl: { fontFamily: DF.bold, fontSize: 9, color: D.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.5 },
  detailVal: { fontFamily: DF.bold, fontSize: 12, color: D.onSurface },
  detailItalic: { fontStyle: 'italic', color: D.onSurfaceVariant },
  reminderBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'rgba(224,64,160,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(224,64,160,0.1)',
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  reminderText: { flex: 1, fontFamily: DF.medium, fontSize: 10, color: D.onSurfaceVariant, lineHeight: 16 },
  reminderBold: { fontFamily: DF.bold, color: D.primary },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  ghostAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: D.surfaceContainer,
  },
  ghostActionText: { fontFamily: DF.bold, fontSize: 11, color: D.onSurfaceVariant },
  cancelAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(229,62,62,0.25)',
  },
  cancelActionText: { fontFamily: DF.bold, fontSize: 11, color: D.error },
  joinAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(124,82,170,0.1)',
    marginLeft: 'auto',
  },
  joinActionText: { fontFamily: DF.bold, fontSize: 11, color: D.secondary },
  rebookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: D.primary,
    paddingVertical: 10,
    borderRadius: 999,
    marginTop: -8,
    marginBottom: 8,
  },
  rebookBtnText: { fontFamily: DF.bold, fontSize: 12, color: D.onPrimary },
  };
}
