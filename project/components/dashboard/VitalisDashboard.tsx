import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import {
  LayoutDashboard,
  Calendar,
  ScanLine,
  FolderOpen,
  Sparkles,
  Bot,
  User,
  Settings,
  AlertTriangle,
  X,
  Footprints,
  Moon,
  GlassWater,
  Armchair,
  ClipboardList,
  Zap,
  Pill,
  Phone,
  FlaskConical,
  Siren,
  UtensilsCrossed,
  Microscope,
  Wand2,
  Upload,
  LogOut,
  ArrowDown,
  ArrowUp,
  Check,
  Heart,
} from 'lucide-react-native';
import { RemindersBellButton } from './RemindersBellButton';
import { NearbyPlacesSheet } from '../quickActions/NearbyPlacesSheet';
import { CallDoctorSheet } from '../quickActions/CallDoctorSheet';
import type { NearbyPlaceCategory } from '../../types/nearbyPlaces';
import { CandyCard } from './CandyCard';
import { GlucoseStabilityCard, type GlucoseDayPoint } from './GlucoseTrendChart';
import { WaterIntakeCard } from './WaterIntakeCard';
import { DoctorChatCard } from './DoctorChatCard';
import { ActivityWeekCard } from './ActivityWeekCard';
import { useNavigateToLabUpload } from '../../hooks/useNavigateToLabUpload';
import { useNavigateToAppointments } from '../../hooks/useNavigateToAppointments';
import { pickAndCall } from '../../utils/callContact';
import { APPOINTMENTS_ROUTE } from '../../utils/navigateToAppointments';
import type { QuickContacts } from '../../types/quickContacts';
import { DF, DashboardPalette, D_LIGHT } from '../../constants/DashboardColors';
import { useD } from '../../hooks/useDashboardTheme';
import { createDashboardScreenTheme } from '../../hooks/dashboardScreenTheme';
import { createSidebarStyles } from '../vitalis/MobileNavDrawer';
import { DiabetesCareHubBrand } from '../brand/DiabetesCareHubBrand';
import { MobileMenuButton } from '../vitalis/MobileMenuButton';
import { ThemeToggleButton } from '../vitalis/ThemeToggleButton';

const SIDEBAR_BREAKPOINT = 1024;

const NAV = [
  { id: 'index', label: 'Dashboard', icon: LayoutDashboard, route: '/(tabs)' },
  { id: 'appointments', label: 'Appointment', icon: Calendar, route: '/(tabs)/appointments' },
  { id: 'meal-analyzer', label: 'GlucoScan AI', icon: ScanLine, route: '/(tabs)/meal-analyzer' },
  { id: 'health', label: 'Health Sync', icon: Heart, route: '/(tabs)/health' },
  { id: 'records', label: 'Records', icon: FolderOpen, route: '/(tabs)/records' },
  { id: 'chatbot', label: 'AI Assistant', icon: Bot, route: '/(tabs)/chatbot' },
  { id: 'profile', label: 'Profile', icon: User, route: '/(tabs)/profile' },
];

type MedItem = { name: string; time: string; note: string; status: 'taken' | 'missed' | 'upcoming' | 'later' };
type LabItem = { title: string; date: string; status: string; statusColor: string; statusBg: string; highlight?: boolean };

export type VitalisDashboardProps = {
  userName?: string;
  loading?: boolean;
  bloodPressure?: string;
  bmi?: string;
  medications?: MedItem[];
  nextAppointment?: {
    month: string;
    day: string;
    title: string;
    doctor: string;
    time: string;
    location: string;
  } | null;
  labResults?: LabItem[];
  onLogout?: () => void;
  todaySteps?: number;
  todaySleep?: number;
  healthPermissionStatus?: string;
  glucoseDays?: GlucoseDayPoint[];
  glucoseTodayDay?: string;
  glucoseTodayStatus?: string | null;
  onViewGlucoseHistory?: () => void;
  onAddGlucoseReading?: () => void;
  patientId?: number;
  onUploadLab?: () => void;
  quickContacts?: QuickContacts | null;
  isAuthenticated?: boolean;
};

const { ScreenThemeProvider, useScreenTheme } = createDashboardScreenTheme<ReturnType<typeof createStyles>>();

function SectionLabel({ children }: { children: string }) {
  const { s } = useScreenTheme();
  return <Text style={s.sectionLabel}>{children}</Text>;
}

function RiskPill({ label, color, bg }: { label: string; color: string; bg: string }) {
  const { s } = useScreenTheme();
  return (
    <View style={[s.riskPill, { backgroundColor: bg }]}>
      <Text style={[s.riskPillText, { color }]}>{label}</Text>
    </View>
  );
}

function ProgressTrack({ pct, color }: { pct: number; color: string }) {
  const { s } = useScreenTheme();
  return (
    <View style={s.progressTrack}>
      <View style={[s.progressFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: color }]} />
    </View>
  );
}

function SparkPath({ color, d }: { color: string; d: string }) {
  return (
    <Svg width="100%" height={32} viewBox="0 0 100 20" preserveAspectRatio="none">
      <Path d={d} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" />
    </Svg>
  );
}

const DEFAULT_MEDS: MedItem[] = [
  { name: 'Metformin', time: '7:30 AM', note: 'Before breakfast', status: 'taken' },
  { name: 'Insulin Glargine', time: '7:30 AM', note: 'Before breakfast', status: 'missed' },
  { name: 'Lisinopril', time: '12:30 PM', note: 'After lunch', status: 'upcoming' },
  { name: 'Atorvastatin', time: '6:00 PM', note: 'After dinner', status: 'later' },
];

const DEFAULT_LABS: LabItem[] = [
  { title: 'Complete Blood Count', date: '21 Jan 2026', status: 'Normal', statusColor: D_LIGHT.green, statusBg: '#dcfce7' },
  { title: 'Lipid Panel', date: '21 Jan 2026', status: 'Normal', statusColor: D_LIGHT.green, statusBg: '#dcfce7' },
  { title: 'HbA1c', date: 'Overdue · Last 18 Jan', status: 'Due !', statusColor: D_LIGHT.primary, statusBg: 'rgba(224,64,160,0.1)', highlight: true },
  { title: 'Kidney Function', date: '18 Jan 2026', status: 'Monitor', statusColor: D_LIGHT.orange, statusBg: '#ffedd5' },
];

export function VitalisDashboard({
  userName = 'Patient',
  loading,
  bloodPressure = '128/82',
  bmi = '28.4',
  medications = DEFAULT_MEDS,
  nextAppointment,
  labResults = DEFAULT_LABS,
  onLogout,
  todaySteps,
  todaySleep,
  healthPermissionStatus,
  glucoseDays = [],
  glucoseTodayDay = '—',
  glucoseTodayStatus,
  onViewGlucoseHistory,
  onAddGlucoseReading,
  patientId,
  onUploadLab,
  quickContacts,
  isAuthenticated = false,
}: VitalisDashboardProps) {
  const router = useRouter();
  const navigateToLabUpload = useNavigateToLabUpload();
  const goToAppointments = useNavigateToAppointments();
  const handleUploadLab = onUploadLab ?? navigateToLabUpload;
  const contacts = quickContacts ?? {
    emergency_contacts: [],
    labs: [],
    pharmacies: [],
  };
  const D = useD();
  const s = useMemo(() => StyleSheet.create(createStyles(D)), [D]);
  const sb = useMemo(() => StyleSheet.create(createSidebarStyles(D)), [D]);
  const { width } = useWindowDimensions();
  const showSidebar = width >= SIDEBAR_BREAKPOINT;
  const isWide = width >= 768;
  const [alertVisible, setAlertVisible] = useState(true);
  const [nearbySheet, setNearbySheet] = useState<NearbyPlaceCategory | null>(null);
  const [callDoctorVisible, setCallDoctorVisible] = useState(false);

  const firstName = useMemo(() => userName.split(' ')[0] || userName, [userName]);
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const takenCount = medications.filter((m) => m.status === 'taken').length;
  const medPct = medications.length ? Math.round((takenCount / medications.length) * 100) : 0;

  const appt = nextAppointment ?? {
    month: 'Jun',
    day: '22',
    title: 'Endocrinology Check-Up',
    doctor: 'Dr. Sarah Mansour',
    time: '10:30 AM',
    location: 'Cairo Medical Centre, Floor 3',
  };

  if (loading) {
    return (
      <View style={[s.root, s.centered]}>
        <ActivityIndicator size="large" color={D.primary} />
      </View>
    );
  }

  return (
    <ScreenThemeProvider D={D} s={s}>
    <View style={s.root}>
      <SafeAreaView style={s.flex} edges={['top', 'left', 'right']}>
        <View style={s.shell}>
          {showSidebar && (
            <View style={sb.sidebar}>
              <View style={sb.brand}>
                <DiabetesCareHubBrand />
              </View>
              <View style={sb.navList}>
                {NAV.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => router.push(item.route as never)}
                    style={[sb.navItem, item.id === 'index' && sb.navItemActive]}
                  >
                    <item.icon size={16} color={item.id === 'index' ? D.onPrimary : D.onSurfaceVariant} />
                    <Text style={[sb.navLabel, item.id === 'index' && sb.navLabelActive]}>{item.label}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={sb.sidebarFooter}>
                <View style={sb.sidebarUser}>
                  <View style={s.avatarSm}>
                    <Text style={s.avatarLetter}>{firstName[0]?.toUpperCase()}</Text>
                  </View>
                  <View>
                    <Text style={sb.sidebarName}>{userName}</Text>
                    <Text style={sb.sidebarRole}>Diabetes Patient</Text>
                  </View>
                </View>
                <Pressable style={sb.logoutRow} onPress={onLogout}>
                  <LogOut size={16} color={D.onSurfaceVariant} />
                  <Text style={sb.logoutText}>Logout</Text>
                </Pressable>
              </View>
            </View>
          )}

          <View style={s.main}>
            <View style={[s.topBar, showSidebar && s.topBarDesktop]}>
              {!showSidebar ? (
                <View style={s.topBarLeft}>
                  <MobileMenuButton activeNavId="index" userName={userName} onLogout={onLogout} />
                  <Text style={s.topGreeting} numberOfLines={1}>
                    {greeting}, {firstName}.
                  </Text>
                </View>
              ) : (
                <View style={s.greetingWrap}>
                  <Text style={s.topGreeting}>{greeting}, {firstName}.</Text>
                </View>
              )}
              <View style={s.topActions}>
                <ThemeToggleButton />
                <RemindersBellButton iconBtnStyle={s.iconBtn} />
                <Pressable style={s.iconBtn} onPress={() => router.push('/(tabs)/profile' as never)}>
                  <Settings size={20} color={D.onSurfaceVariant} />
                </Pressable>
                <View style={s.userChip}>
                  {showSidebar && (
                    <View style={s.userChipText}>
                      <Text style={s.userChipName}>{userName}</Text>
                      <Text style={s.userChipRole}>Diabetes Patient</Text>
                    </View>
                  )}
                  <View style={s.avatarSm}>
                    <Text style={s.avatarLetter}>{firstName[0]?.toUpperCase()}</Text>
                  </View>
                </View>
              </View>
            </View>

            <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
              {alertVisible && (
                <View style={s.alertBanner}>
                  <View style={s.alertIcon}>
                    <AlertTriangle size={18} color={D.primary} />
                  </View>
                  <View style={s.alertBody}>
                    <Text style={s.alertTitle}>Critical: Vision (Retinopathy) risk is at 68%</Text>
                    <Text style={s.alertSub}>Ophthalmology screening is overdue. Untreated, this may lead to irreversible vision loss.</Text>
                  </View>
                  <Pressable style={s.alertBtn} onPress={() => router.push('/(tabs)/appointments' as never)}>
                    <Text style={s.alertBtnText}>Book now</Text>
                  </Pressable>
                  <Pressable onPress={() => setAlertVisible(false)} hitSlop={8}>
                    <X size={16} color={D.onSurfaceVariant} />
                  </Pressable>
                </View>
              )}

              <View style={[s.grid4, isWide && s.grid4Wide]}>
                <CandyCard style={s.vitalCard} accent="secondary">
                  <SectionLabel>HbA1c Trend</SectionLabel>
                  <View style={s.vitalTop}>
                    <Text style={s.vitalValue}>6.4%</Text>
                    <View style={s.trendBadgeGreen}>
                      <ArrowDown size={12} color={D.green} />
                      <Text style={s.trendGreenText}>0.2%</Text>
                    </View>
                  </View>
                  <SparkPath color={D.secondary} d="M0,15 L20,12 L40,14 L60,8 L80,10 L100,5" />
                  <Text style={s.vitalFoot}>Target {'<'}7.0% · Last tested 42 days ago</Text>
                </CandyCard>

                <CandyCard style={s.vitalCard} accent="orange">
                  <SectionLabel>Blood Pressure</SectionLabel>
                  <View style={s.vitalTop}>
                    <Text style={s.vitalValue}>{bloodPressure}</Text>
                    <View style={s.trendBadgeOrange}>
                      <ArrowUp size={12} color={D.orange} />
                      <Text style={s.trendOrangeText}>4mmHg</Text>
                    </View>
                  </View>
                  <SparkPath color="#fb923c" d="M0,5 L20,8 L40,6 L60,12 L80,10 L100,15" />
                  <Text style={s.vitalFoot}>ADA target {'<'}130/80 · Slightly elevated</Text>
                </CandyCard>

                <CandyCard style={s.vitalCard} accent="primary">
                  <SectionLabel>Heart Rate</SectionLabel>
                  <View style={s.vitalTop}>
                    <Text style={s.vitalValue}>72 <Text style={s.vitalUnit}>bpm</Text></Text>
                    <View style={s.trendBadgeGreen}>
                      <Check size={12} color={D.green} />
                      <Text style={s.trendGreenText}>Normal</Text>
                    </View>
                  </View>
                  <SparkPath color={D.primary} d="M0,10 L15,10 L20,3 L25,17 L30,10 L50,10 L55,4 L60,16 L65,10 L100,10" />
                  <Text style={s.vitalFoot}>Resting · Healthy range 60–100 bpm</Text>
                </CandyCard>

                <CandyCard style={s.vitalCard} accent="tertiary">
                  <SectionLabel>Weight · BMI</SectionLabel>
                  <View style={s.vitalTop}>
                    <Text style={s.vitalValue}>84 <Text style={s.vitalUnit}>kg</Text></Text>
                    <View style={s.trendBadgeOrange}>
                      <Text style={s.trendOrangeText}>BMI {bmi}</Text>
                    </View>
                  </View>
                  <View style={s.bmiTrack}>
                    <View style={s.bmiGradient} />
                    <View style={s.bmiMarker} />
                  </View>
                  <View style={s.bmiLabels}>
                    {['Under', 'Normal', 'Over', 'Obese'].map((l) => (
                      <Text key={l} style={s.bmiLabel}>{l}</Text>
                    ))}
                  </View>
                </CandyCard>
              </View>

              <View style={[s.grid3, isWide && s.grid3Wide]}>
                <CandyCard style={s.padCard}>
                  <GlucoseStabilityCard
                    days={glucoseDays}
                    D={D}
                    todayDay={glucoseTodayDay}
                    todayStatus={glucoseTodayStatus}
                    onViewTrend={onViewGlucoseHistory}
                    onPressCard={onViewGlucoseHistory}
                    onAddReading={onAddGlucoseReading}
                  />
                </CandyCard>

                <CandyCard style={s.padCard} accent="tertiary">
                  <WaterIntakeCard D={D} patientId={patientId} />
                </CandyCard>

                <CandyCard style={s.padCard}>
                  <SectionLabel>Lifestyle Monitoring</SectionLabel>
                  {[
                    {
                      icon: Footprints,
                      label: 'Steps',
                      val: todaySteps !== undefined ? `${todaySteps.toLocaleString()} / 10k` : '8,400 / 10k',
                      pct: todaySteps !== undefined ? Math.round((todaySteps / 10000) * 100) : 84,
                      color: D.secondary,
                      route: '/(tabs)/health'
                    },
                    {
                      icon: Moon,
                      label: 'Sleep',
                      val: todaySleep !== undefined ? `${todaySleep}h / 8h` : '6.5h / 8h',
                      pct: todaySleep !== undefined ? Math.round((todaySleep / 8) * 100) : 81,
                      color: D.primary,
                      route: '/(tabs)/health'
                    },
                    { icon: GlassWater, label: 'Water', val: '1.2L / 2.5L ⚠', pct: 45, color: D.orange, route: undefined },
                    { icon: Armchair, label: 'Active time', val: '2.8h / 4h', pct: 70, color: D.orange, route: undefined },
                  ].map((row) => {
                    const rowContent = (
                      <View style={s.lifeRow}>
                        <View style={s.lifeHead}>
                          <View style={s.lifeLeft}>
                            <row.icon size={12} color={row.color} />
                            <Text style={s.lifeLabel}>{row.label}</Text>
                          </View>
                          <Text style={[s.lifeVal, row.label === 'Water' && { color: D.orange }]}>{row.val}</Text>
                        </View>
                        <ProgressTrack pct={row.pct} color={row.color} />
                      </View>
                    );
                    if (row.route) {
                      return (
                        <Pressable key={row.label} onPress={() => router.push(row.route as never)}>
                          {rowContent}
                        </Pressable>
                      );
                    }
                    return (
                      <View key={row.label}>
                        {rowContent}
                      </View>
                    );
                  })}
                </CandyCard>
              </View>

              <View style={[s.grid3, isWide && s.grid3Wide]}>
                <CandyCard style={s.padCard}>
                  <View style={s.cardHeadRow}>
                    <ClipboardList size={16} color={D.primary} />
                    <SectionLabel>Today's Medications</SectionLabel>
                  </View>
                  <View style={s.adherenceRow}>
                    <View>
                      <Text style={s.adherenceNum}>{takenCount}/{medications.length}</Text>
                      <Text style={s.adherenceLbl}>Taken</Text>
                    </View>
                    <ProgressTrack pct={medPct} color={D.primary} />
                    <Text style={s.adherencePct}>{medPct}%</Text>
                  </View>
                  {medications.map((med, i) => (
                    <View key={i} style={[s.medRow, i < medications.length - 1 && s.medBorder]}>
                      <View>
                        <Text style={s.medName}>{med.name}</Text>
                        <Text style={s.medNote}>{med.time} · {med.note}</Text>
                      </View>
                      <View style={[s.medStatus, med.status === 'taken' && s.medTaken, med.status === 'missed' && s.medMissed]}>
                        <Text style={[s.medStatusText, med.status === 'taken' && { color: D.green }, med.status === 'missed' && { color: D.error }]}>
                          {med.status === 'taken' ? 'Taken ✓' : med.status === 'missed' ? 'Missed' : med.status === 'upcoming' ? 'Upcoming' : 'Later'}
                        </Text>
                      </View>
                    </View>
                  ))}
                </CandyCard>

                <CandyCard style={s.padCard}>
                  <SectionLabel>Complication Risks (5yr)</SectionLabel>
                  {[
                    { name: 'Vision (Retinopathy)', pct: 68, label: '68% (Critical)', color: D.primary, delta: '↑ 14%', critical: true },
                  ].map((r) => (
                    <View key={r.name} style={s.compRow}>
                      <View style={s.compHead}>
                        <Text style={[s.compName, r.critical && { color: D.primary }]}>{r.name}</Text>
                        <View style={s.compRight}>
                          <Text style={[s.compDelta, { color: r.critical ? D.primary : D.green }]}>{r.delta}</Text>
                          <Text style={[s.compLabel, { color: r.color }]}>{r.label}</Text>
                        </View>
                      </View>
                      <ProgressTrack pct={r.pct} color={r.color} />
                    </View>
                  ))}
                  <View style={s.modelNote}>
                    <Text style={s.modelNoteBold}>Predictions based on 6 clinical visits · Last updated today</Text>
                    <Text style={s.modelNoteSub}>Model confidence: High · BiLSTM + XGBoost ensemble</Text>
                  </View>
                </CandyCard>

                <View style={s.colStack}>
                  <CandyCard style={s.padCard}>
                    <View style={s.cardHeadRow}>
                      <Calendar size={16} color={D.secondary} />
                      <SectionLabel>Next Appointment</SectionLabel>
                    </View>
                    <View style={s.apptBox}>
                      <View style={s.apptDate}>
                        <Text style={s.apptMonth}>{appt.month}</Text>
                        <Text style={s.apptDay}>{appt.day}</Text>
                      </View>
                      <View style={s.apptInfo}>
                        <Text style={s.apptTitle}>{appt.title}</Text>
                        <Text style={s.apptSub}>{appt.doctor} · {appt.time}</Text>
                        <Text style={s.apptSub}>{appt.location}</Text>
                      </View>
                    </View>
                    <View style={s.apptActions}>
                      <Pressable style={s.confirmBtn}><Text style={s.confirmBtnText}>Confirm</Text></Pressable>
                      <Pressable style={s.reschedBtn} onPress={() => router.push('/(tabs)/appointments' as never)}>
                        <Text style={s.reschedBtnText}>Reschedule</Text>
                      </Pressable>
                    </View>
                  </CandyCard>

                  <CandyCard style={s.padCard}>
                    <SectionLabel>Quick Actions</SectionLabel>
                    <View style={s.quickGrid}>
                      {[
                        { icon: Phone, label: 'Call Doctor', color: D.secondary, action: () => setCallDoctorVisible(true) },
                        {
                          icon: FlaskConical,
                          label: 'Book Lab Test',
                          color: D.tertiary,
                          action: () => setNearbySheet('laboratory'),
                        },
                        {
                          icon: Pill,
                          label: 'Prescription Order',
                          color: D.secondary,
                          action: () => setNearbySheet('pharmacy'),
                        },
                        { icon: Upload, label: 'Upload Lab Test', color: D.primary, action: handleUploadLab },
                        {
                          icon: Siren,
                          label: 'Emergency',
                          color: D.error,
                          action: () => pickAndCall('Emergency contact', contacts.emergency_contacts),
                        },
                      ].map((a) => (
                        <Pressable
                          key={a.label}
                          style={[s.quickBtn, { borderColor: `${a.color}22`, backgroundColor: `${a.color}0d` }]}
                          onPress={() => {
                            if ('action' in a && a.action) {
                              void a.action();
                              return;
                            }
                            if (a.route === APPOINTMENTS_ROUTE) {
                              goToAppointments();
                              return;
                            }
                            router.push(a.route as never);
                          }}
                        >
                          <a.icon size={18} color={a.color} />
                          <Text style={s.quickLabel}>{a.label}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </CandyCard>
                </View>
              </View>

              <View style={[s.grid4, isWide && s.grid4Wide]}>
                <CandyCard style={s.padCard}>
                  <View style={s.cardHeadRow}>
                    <UtensilsCrossed size={16} color={D.primary} />
                    <SectionLabel>Nutrition Today</SectionLabel>
                  </View>
                  <Text style={s.kcalText}>1,420 <Text style={s.kcalSub}> / 1,900 kcal</Text></Text>
                  {[
                    { l: 'Carbs', v: '142g / 200g', pct: 71, c: D.orange },
                    { l: 'Protein', v: '68g / 80g', pct: 85, c: D.secondary },
                    { l: 'Fat', v: '38g / 60g', pct: 63, c: D.tertiary },
                  ].map((n) => (
                    <View key={n.l} style={s.nutrRow}>
                      <View style={s.nutrHead}><Text style={s.nutrLbl}>{n.l}</Text><Text style={s.nutrVal}>{n.v}</Text></View>
                      <ProgressTrack pct={n.pct} color={n.c} />
                    </View>
                  ))}
                  <Pressable style={s.ghostBtn} onPress={() => router.push('/(tabs)/meal-analyzer' as never)}>
                    <Text style={s.ghostBtnText}>+ Log a meal (GlucoScan)</Text>
                  </Pressable>
                </CandyCard>

                <CandyCard style={s.padCard}>
                  <View style={s.cardHeadRow}>
                    <Microscope size={16} color={D.tertiary} />
                    <SectionLabel>Recent Lab Results</SectionLabel>
                  </View>
                  {labResults.map((lab, i) => (
                    <View key={i} style={[s.labRow, lab.highlight && s.labHighlight]}>
                      <View>
                        <Text style={[s.labTitle, lab.highlight && { color: D.primary }]}>{lab.title}</Text>
                        <Text style={[s.labDate, lab.highlight && { color: 'rgba(224,64,160,0.7)' }]}>{lab.date}</Text>
                      </View>
                      <RiskPill label={lab.status} color={lab.statusColor} bg={lab.statusBg} />
                    </View>
                  ))}
                </CandyCard>

                <CandyCard style={s.padCard}>
                  <View style={s.cardHeadRow}>
                    <Wand2 size={16} color={D.primary} />
                    <SectionLabel>AI Insights</SectionLabel>
                  </View>
                  {[
                    { t: 'Retinopathy rising.', d: 'Risk up 14% since last visit. Book ophthalmology this week.', bg: 'rgba(224,64,160,0.05)', dot: D.primary, bold: D.primary },
                    { t: 'Inactive 5 days.', d: 'Correlates with glucose spikes. 20 min walk helps.', bg: '#fff7ed', dot: D.orange, bold: D.orange },
                    { t: 'Hydration low.', d: 'Only 45% of daily water goal.', bg: '#eff6ff', dot: D.tertiary, bold: D.tertiary },
                    { t: 'BP stable', d: 'for 3 visits. Current regimen is working.', bg: '#f0fdf4', dot: D.green, bold: D.green },
                  ].map((ins, i) => (
                    <View key={i} style={[s.insightRow, { backgroundColor: ins.bg }]}>
                      <View style={[s.insightDot, { backgroundColor: ins.dot }]} />
                      <Text style={s.insightText}>
                        <Text style={{ fontFamily: DF.bold, color: ins.bold }}>{ins.t} </Text>
                        {ins.d}
                      </Text>
                    </View>
                  ))}
                  <Pressable style={s.primaryFullBtn} onPress={() => router.push('/(tabs)/chatbot' as never)}>
                    <Text style={s.primaryFullBtnText}>Full AI Report →</Text>
                  </Pressable>
                </CandyCard>
              </View>

              <DoctorChatCard D={D} patientId={patientId} />

              <View style={[s.grid3, isWide && s.grid3Wide, { paddingBottom: 100 }]}>
                <CandyCard style={s.padCard}>
                  <ActivityWeekCard D={D} patientId={patientId} />
                </CandyCard>

                <CandyCard style={s.padCard}>
                  <View style={s.cardHeadRow}>
                    <Moon size={14} color={D.primary} />
                    <SectionLabel>Sleep Quality</SectionLabel>
                  </View>
                  <View style={s.sleepRow}>
                    <View style={s.sleepScore}>
                      <Text style={s.sleepNum}>72</Text>
                      <Text style={s.sleepLbl}>Score</Text>
                    </View>
                    <View style={s.sleepBars}>
                      {[{ l: 'Deep', v: '2.1h', p: 52, c: D.secondary }, { l: 'REM', v: '1.4h', p: 35, c: D.primary }, { l: 'Light', v: '3.0h', p: 75, c: D.tertiary }].map((sb) => (
                        <View key={sb.l}>
                          <View style={s.sleepBarHead}><Text style={s.sleepBarLbl}>{sb.l}</Text><Text style={s.sleepBarLbl}>{sb.v}</Text></View>
                          <ProgressTrack pct={sb.p} color={sb.c} />
                        </View>
                      ))}
                    </View>
                  </View>
                  <View style={s.tipBox}>
                    <Text style={s.tipText}><Text style={s.tipBold}>Tip: </Text>Sleep below 7h raises glucose variability. Try a consistent 10 PM bedtime.</Text>
                  </View>
                </CandyCard>
              </View>
            </ScrollView>
          </View>
        </View>
      </SafeAreaView>

      <Pressable style={s.fab} onPress={() => router.push('/(tabs)/chatbot' as never)}>
        <Zap size={24} color={D.onPrimary} />
      </Pressable>

      <NearbyPlacesSheet
        visible={nearbySheet != null}
        category={nearbySheet}
        onClose={() => setNearbySheet(null)}
      />
      <CallDoctorSheet
        visible={callDoctorVisible}
        isAuthenticated={isAuthenticated}
        onClose={() => setCallDoctorVisible(false)}
      />
    </View>
    </ScreenThemeProvider>
  );
}

function createStyles(D: DashboardPalette) {
  return {
  root: { flex: 1, backgroundColor: D.background },
  flex: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center' },
  shell: { flex: 1, flexDirection: 'row' },
  main: { flex: 1 },
  topBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    gap: 10,
    backgroundColor: D.topBarBg,
    borderBottomWidth: 1,
    borderBottomColor: D.borderSubtle,
  },
  topBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 },
  topBarDesktop: { justifyContent: 'space-between' },
  greetingWrap: { flex: 1, maxWidth: 360 },
  topGreeting: { fontFamily: DF.bold, fontSize: 16, color: D.primary, flexShrink: 1 },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconBtn: { padding: 8, borderRadius: 999, position: 'relative' },
  userChip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: D.surface, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: D.borderSubtle },
  userChipText: { alignItems: 'flex-end' },
  userChipName: { fontFamily: DF.bold, fontSize: 11, color: D.onSurface },
  userChipRole: { fontFamily: DF.medium, fontSize: 9, color: D.onSurfaceVariant, textTransform: 'uppercase' },
  avatarSm: { width: 32, height: 32, borderRadius: 16, backgroundColor: D.primaryFixed, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(224,64,160,0.2)' },
  avatarLetter: { fontFamily: DF.bold, fontSize: 14, color: D.primary },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, gap: 20, maxWidth: 1280, width: '100%', alignSelf: 'center' },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(224,64,160,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(224,64,160,0.25)',
  },
  alertIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(224,64,160,0.12)', alignItems: 'center', justifyContent: 'center' },
  alertBody: { flex: 1 },
  alertTitle: { fontFamily: DF.bold, fontSize: 13, color: D.primary },
  alertSub: { fontFamily: DF.medium, fontSize: 11, color: D.onSurfaceVariant, marginTop: 2 },
  alertBtn: { backgroundColor: D.primary, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999 },
  alertBtnText: { fontFamily: DF.bold, fontSize: 11, color: D.onPrimary },
  grid4: { gap: 16 },
  grid4Wide: { flexDirection: 'row', flexWrap: 'wrap' },
  grid3: { gap: 16 },
  grid3Wide: { flexDirection: 'row', flexWrap: 'wrap' },
  vitalCard: { padding: 14, flex: 1, minWidth: 150 },
  padCard: { padding: 18, flex: 1, minWidth: 260 },
  colStack: { flex: 1, minWidth: 260, gap: 16 },
  sectionLabel: { fontFamily: DF.bold, fontSize: 10, color: D.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 10 },
  vitalTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 },
  vitalValue: { fontFamily: DF.bold, fontSize: 24, color: D.primary },
  vitalUnit: { fontSize: 13, color: D.onSurfaceVariant },
  vitalFoot: { fontFamily: DF.medium, fontSize: 9, color: D.onSurfaceVariant, marginTop: 6 },
  trendBadgeGreen: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: '#f0fdf4', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  trendGreenText: { fontFamily: DF.bold, fontSize: 11, color: D.green },
  trendBadgeOrange: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: '#fff7ed', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  trendOrangeText: { fontFamily: DF.bold, fontSize: 11, color: D.orange },
  bmiTrack: { height: 8, backgroundColor: D.surfaceContainer, borderRadius: 999, overflow: 'hidden', position: 'relative', marginTop: 4 },
  bmiGradient: { position: 'absolute', left: 0, top: 0, bottom: 0, width: '100%', backgroundColor: '#4ade80' },
  bmiMarker: { position: 'absolute', left: '62%', top: 0, bottom: 0, width: 3, backgroundColor: D.onSurface, borderRadius: 99 },
  bmiLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  bmiLabel: { fontFamily: DF.bold, fontSize: 8, color: D.onSurfaceVariant, textTransform: 'uppercase' },
  riskPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  riskPillText: { fontFamily: DF.bold, fontSize: 9, textTransform: 'uppercase' },
  ghostBtn: { marginTop: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: D.surfaceContainer, alignItems: 'center' },
  ghostBtnText: { fontFamily: DF.bold, fontSize: 11, color: D.onSurfaceVariant },
  glucoseHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  glucoseValue: { fontFamily: DF.bold, fontSize: 28, color: D.primary, marginTop: 2 },
  glucoseSub: { fontFamily: DF.medium, fontSize: 10, color: D.onSurfaceVariant },
  glucoseIcon: { padding: 10, borderRadius: 999, backgroundColor: 'rgba(224,64,160,0.1)' },
  barChart: { flexDirection: 'row', alignItems: 'flex-end', height: 80, gap: 4, marginTop: 8 },
  bar: { flex: 1, borderRadius: 999, minHeight: 8 },
  dayLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  dayLabel: { fontFamily: DF.bold, fontSize: 9, color: D.onSurfaceVariant, textTransform: 'uppercase' },
  chipRow: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  chipGreen: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#dcfce7' },
  chipGreenText: { fontFamily: DF.bold, fontSize: 9, color: D.green },
  chipOrange: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#ffedd5' },
  chipOrangeText: { fontFamily: DF.bold, fontSize: 9, color: D.orange },
  lifeRow: { marginBottom: 14 },
  lifeHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  lifeLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  lifeLabel: { fontFamily: DF.bold, fontSize: 10, color: D.onSurfaceVariant, textTransform: 'uppercase' },
  lifeVal: { fontFamily: DF.bold, fontSize: 10, color: D.onSurfaceVariant },
  progressTrack: { flex: 1, height: 10, backgroundColor: D.surfaceContainer, borderRadius: 999, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999 },
  cardHeadRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, borderBottomWidth: 1, borderBottomColor: D.borderSubtle, paddingBottom: 10 },
  adherenceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14, backgroundColor: D.surfaceContainerLow, borderRadius: 12, padding: 10 },
  adherenceNum: { fontFamily: DF.bold, fontSize: 18, color: D.primary },
  adherenceLbl: { fontFamily: DF.bold, fontSize: 9, color: D.onSurfaceVariant, textTransform: 'uppercase' },
  adherencePct: { fontFamily: DF.bold, fontSize: 10, color: D.onSurfaceVariant },
  medRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  medBorder: { borderBottomWidth: 1, borderBottomColor: D.borderSubtle },
  medName: { fontFamily: DF.bold, fontSize: 13, color: D.onSurface },
  medNote: { fontFamily: DF.medium, fontSize: 10, color: D.onSurfaceVariant, marginTop: 2 },
  medStatus: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: D.surfaceContainer },
  medTaken: { backgroundColor: '#dcfce7' },
  medMissed: { backgroundColor: '#fee2e2' },
  medStatusText: { fontFamily: DF.bold, fontSize: 9, color: D.onSurfaceVariant },
  compRow: { marginBottom: 14 },
  compHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  compName: { fontFamily: DF.bold, fontSize: 13, color: D.onSurface },
  compRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  compDelta: { fontFamily: DF.bold, fontSize: 9 },
  compLabel: { fontFamily: DF.bold, fontSize: 11, textTransform: 'uppercase' },
  modelNote: { marginTop: 8, padding: 10, borderRadius: 16, backgroundColor: 'rgba(224,64,160,0.05)', borderWidth: 1, borderColor: 'rgba(224,64,160,0.1)' },
  modelNoteBold: { fontFamily: DF.bold, fontSize: 10, color: D.primary },
  modelNoteSub: { fontFamily: DF.medium, fontSize: 9, color: D.onSurfaceVariant, marginTop: 2 },
  apptBox: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: 16, backgroundColor: 'rgba(124,82,170,0.06)', borderWidth: 1, borderColor: 'rgba(124,82,170,0.1)', marginBottom: 12 },
  apptDate: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(124,82,170,0.12)', alignItems: 'center', justifyContent: 'center' },
  apptMonth: { fontFamily: DF.bold, fontSize: 9, color: D.secondary, textTransform: 'uppercase' },
  apptDay: { fontFamily: DF.bold, fontSize: 18, color: D.secondary, lineHeight: 20 },
  apptInfo: { flex: 1 },
  apptTitle: { fontFamily: DF.bold, fontSize: 13, color: D.onSurface },
  apptSub: { fontFamily: DF.medium, fontSize: 10, color: D.onSurfaceVariant, marginTop: 2 },
  apptActions: { flexDirection: 'row', gap: 8 },
  confirmBtn: { flex: 1, backgroundColor: D.secondary, paddingVertical: 8, borderRadius: 16, alignItems: 'center' },
  confirmBtnText: { fontFamily: DF.bold, fontSize: 10, color: D.onPrimary },
  reschedBtn: { flex: 1, backgroundColor: D.surfaceContainer, paddingVertical: 8, borderRadius: 16, alignItems: 'center' },
  reschedBtnText: { fontFamily: DF.bold, fontSize: 10, color: D.onSurfaceVariant },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickBtn: { width: '47%', alignItems: 'center', gap: 6, padding: 12, borderRadius: 16, borderWidth: 1 },
  quickLabel: { fontFamily: DF.bold, fontSize: 9, color: D.onSurfaceVariant, textAlign: 'center' },
  kcalText: { fontFamily: DF.bold, fontSize: 24, color: D.primary, textAlign: 'center', marginBottom: 12 },
  kcalSub: { fontSize: 13, color: D.onSurfaceVariant },
  nutrRow: { marginBottom: 10 },
  nutrHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  nutrLbl: { fontFamily: DF.bold, fontSize: 9, color: D.onSurfaceVariant, textTransform: 'uppercase' },
  nutrVal: { fontFamily: DF.bold, fontSize: 9, color: D.onSurfaceVariant },
  labRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10, borderRadius: 12, backgroundColor: D.surfaceContainerLow, marginBottom: 8 },
  labHighlight: { backgroundColor: 'rgba(224,64,160,0.05)', borderWidth: 1, borderColor: 'rgba(224,64,160,0.1)' },
  labTitle: { fontFamily: DF.bold, fontSize: 12, color: D.onSurface },
  labDate: { fontFamily: DF.medium, fontSize: 9, color: D.onSurfaceVariant, marginTop: 2 },
  insightRow: { flexDirection: 'row', gap: 8, padding: 8, borderRadius: 12, marginBottom: 8 },
  insightDot: { width: 6, height: 6, borderRadius: 3, marginTop: 4 },
  insightText: { flex: 1, fontFamily: DF.medium, fontSize: 10, color: D.onSurfaceVariant, lineHeight: 15 },
  primaryFullBtn: { marginTop: 8, backgroundColor: D.primary, paddingVertical: 10, borderRadius: 999, alignItems: 'center' },
  primaryFullBtnText: { fontFamily: DF.bold, fontSize: 10, color: D.onPrimary },
  sleepRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  sleepScore: { alignItems: 'center' },
  sleepNum: { fontFamily: DF.bold, fontSize: 28, color: D.primary },
  sleepLbl: { fontFamily: DF.bold, fontSize: 9, color: D.onSurfaceVariant, textTransform: 'uppercase' },
  sleepBars: { flex: 1, gap: 8 },
  sleepBarHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  sleepBarLbl: { fontFamily: DF.bold, fontSize: 9, color: D.onSurfaceVariant, textTransform: 'uppercase' },
  tipBox: { backgroundColor: D.surfaceContainerLow, borderRadius: 12, padding: 10 },
  tipText: { fontFamily: DF.medium, fontSize: 10, color: D.onSurfaceVariant, lineHeight: 15 },
  tipBold: { fontFamily: DF.bold, color: D.primary },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: D.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: D.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  };
}
