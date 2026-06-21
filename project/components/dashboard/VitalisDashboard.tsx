import React, { useState, useMemo, useEffect } from 'react';
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
  ShoppingCart,
  Phone,
  FlaskConical,
  UtensilsCrossed,
  Microscope,
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
import type { QuickContacts } from '../../types/quickContacts';
import { DF, DashboardPalette, D_LIGHT } from '../../constants/DashboardColors';
import { useD } from '../../hooks/useDashboardTheme';
import { createDashboardScreenTheme } from '../../hooks/dashboardScreenTheme';
import { createSidebarStyles } from '../vitalis/MobileNavDrawer';
import { DiabetesCareHubBrand } from '../brand/DiabetesCareHubBrand';
import { DiabetesStagePredictionCard } from './DiabetesStagePredictionCard';
import { ComplicationRisksCard } from './ComplicationRisksCard';
import type { RiskSummary } from '../../types/riskSummary';
import type { NutritionToday } from '../../types/nutritionToday';
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

type MedItem = {
  slotKey?: string;
  name: string;
  time: string;
  note: string;
  status: 'taken' | 'missed' | 'upcoming' | 'later';
};
type LabItem = { title: string; date: string; status: string; statusColor: string; statusBg: string; highlight?: boolean };

function formatWeightKg(weightKg?: number | null): string {
  if (weightKg == null || !Number.isFinite(weightKg)) return '—';
  return Number.isInteger(weightKg) ? String(weightKg) : weightKg.toFixed(1);
}

function formatHbA1c(value?: number | null): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${Number(value).toFixed(1)}%`;
}

function formatDaysSince(iso?: string | null): string | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const days = Math.floor((Date.now() - then) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

function hba1cStatus(value?: number | null): { label: string; tone: 'green' | 'orange' | 'neutral' } {
  if (value == null || !Number.isFinite(value)) return { label: 'No data', tone: 'neutral' };
  if (value < 7) return { label: 'On target', tone: 'green' };
  if (value < 8) return { label: 'Above target', tone: 'orange' };
  return { label: 'High', tone: 'orange' };
}

function formatBmiGroup(group?: string | null): string | null {
  if (!group) return null;
  const map: Record<string, string> = {
    underweight: 'Underweight',
    normal: 'Normal',
    overweight: 'Overweight',
    obese: 'Obese',
  };
  return map[group.toLowerCase()] ?? group;
}

function bmiMarkerLeft(bmi?: string): `${number}%` {
  const value = Number.parseFloat(bmi ?? '');
  if (!Number.isFinite(value)) return '62%';
  const pct = Math.min(95, Math.max(5, ((value - 15) / 20) * 100));
  return `${pct}%`;
}

function formatKcal(value: number): string {
  return Math.round(value).toLocaleString('en-US');
}

function formatMacroGrams(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function macroPct(total: number, goal: number): number {
  if (!goal) return 0;
  return Math.min(100, Math.round((total / goal) * 100));
}

function retinopathyRiskPct(summary?: RiskSummary | null): number | null {
  const value = summary?.retinopathy_risk;
  if (value == null || !Number.isFinite(value)) return null;
  return Math.round(value <= 1 ? value * 100 : value);
}

function isHighRetinopathyRisk(summary?: RiskSummary | null): boolean {
  if (!summary) return false;
  const level = (summary.retinopathy_risk_level || '').toUpperCase();
  if (level === 'HIGH' || level === 'CRITICAL') return true;
  const pct = retinopathyRiskPct(summary);
  return pct != null && pct >= 50;
}

export type VitalisDashboardProps = {
  userName?: string;
  loading?: boolean;
  bloodPressure?: string;
  bmi?: string;
  weightKg?: number | null;
  bmiGroup?: string | null;
  hba1c?: number | null;
  hba1cMeasuredAt?: string | null;
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
  riskSummary?: RiskSummary | null;
  onRunPrediction?: () => void;
  predictionRunning?: boolean;
  nutritionToday?: NutritionToday | null;
  clinicalProfileIncomplete?: boolean;
  onMarkMedicationTaken?: (slotKey: string) => void;
};

const { ScreenThemeProvider, useScreenTheme } = createDashboardScreenTheme<ReturnType<typeof createStyles>>();

function SectionLabel({ children, style }: { children: string; style?: object }) {
  const { s } = useScreenTheme();
  return <Text style={[s.sectionLabel, style]}>{children}</Text>;
}

function VitalSectionLabel({ children }: { children: string }) {
  const { s } = useScreenTheme();
  return <Text style={s.vitalSectionLabel}>{children}</Text>;
}

function RiskPill({ label, color, bg }: { label: string; color: string; bg: string }) {
  const { s } = useScreenTheme();
  return (
    <View style={[s.riskPill, { backgroundColor: bg }]}>
      <Text style={[s.riskPillText, { color }]}>{label}</Text>
    </View>
  );
}

function ProgressTrack({ pct, color, inline }: { pct: number; color: string; inline?: boolean }) {
  const { s } = useScreenTheme();
  return (
    <View style={inline ? s.progressTrackInline : s.progressTrack}>
      <View style={[s.progressFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: color }]} />
    </View>
  );
}

function SparkPath({ color, d, compact }: { color: string; d: string; compact?: boolean }) {
  return (
    <Svg width="100%" height={compact ? 22 : 32} viewBox="0 0 100 20" preserveAspectRatio="none">
      <Path d={d} fill="none" stroke={color} strokeWidth={compact ? 2 : 3} strokeLinecap="round" />
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
  weightKg,
  bmiGroup,
  hba1c,
  hba1cMeasuredAt,
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
  riskSummary,
  onRunPrediction,
  predictionRunning = false,
  nutritionToday,
  clinicalProfileIncomplete = false,
  onMarkMedicationTaken,
}: VitalisDashboardProps) {
  const router = useRouter();
  const navigateToLabUpload = useNavigateToLabUpload();
  const handleUploadLab = onUploadLab ?? navigateToLabUpload;
  const D = useD();
  const s = useMemo(() => StyleSheet.create(createStyles(D)), [D]);
  const sb = useMemo(() => StyleSheet.create(createSidebarStyles(D)), [D]);
  const { width } = useWindowDimensions();
  const showSidebar = width >= SIDEBAR_BREAKPOINT;
  const isWide = width >= 768;
  const retinopathyPct = retinopathyRiskPct(riskSummary);
  const showRetinopathyAlert = isHighRetinopathyRisk(riskSummary);
  const retinopathyAlertKey = `${retinopathyPct ?? 'na'}-${riskSummary?.retinopathy_risk_level ?? ''}`;
  const hba1cInfo = hba1cStatus(hba1c);
  const hba1cAgo = formatDaysSince(hba1cMeasuredAt);
  const weightCategory = formatBmiGroup(bmiGroup);
  const [retinopathyAlertDismissed, setRetinopathyAlertDismissed] = useState(false);
  const [nearbySheet, setNearbySheet] = useState<NearbyPlaceCategory | null>(null);
  const [callDoctorVisible, setCallDoctorVisible] = useState(false);
  const [careStackHeight, setCareStackHeight] = useState<number | null>(null);
  const [lowerStackHeight, setLowerStackHeight] = useState<number | null>(null);

  const careSingleCardHeight = isWide && careStackHeight ? careStackHeight : undefined;
  const lowerSingleCardHeight = isWide && lowerStackHeight ? lowerStackHeight : undefined;

  useEffect(() => {
    if (!isWide) {
      setCareStackHeight(null);
      setLowerStackHeight(null);
    }
  }, [isWide]);

  useEffect(() => {
    setRetinopathyAlertDismissed(false);
  }, [retinopathyAlertKey]);

  const firstName = useMemo(() => userName.split(' ')[0] || userName, [userName]);
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const takenCount = medications.filter((m) => m.status === 'taken').length;
  const medPct = medications.length ? Math.round((takenCount / medications.length) * 100) : 0;

  const lifestyleRows = useMemo(
    () =>
      [
        {
          icon: Footprints,
          label: 'Steps',
          val: todaySteps !== undefined ? `${todaySteps.toLocaleString()} / 10k` : '8,400 / 10k',
          pct: todaySteps !== undefined ? Math.round((todaySteps / 10000) * 100) : 84,
          color: D.secondary,
          route: '/(tabs)/health' as const,
        },
        {
          icon: Moon,
          label: 'Sleep',
          val: todaySleep !== undefined ? `${todaySleep}h / 8h` : '6.5h / 8h',
          pct: todaySleep !== undefined ? Math.round((todaySleep / 8) * 100) : 81,
          color: D.primary,
          route: '/(tabs)/health' as const,
        },
        { icon: GlassWater, label: 'Water', val: '1.2L / 2.5L ⚠', pct: 45, color: D.orange, route: undefined },
        { icon: Armchair, label: 'Active time', val: '2.8h / 4h', pct: 70, color: D.orange, route: undefined },
      ] as const,
    [D.primary, D.secondary, D.orange, todaySleep, todaySteps]
  );

  const appt = nextAppointment ?? {
    month: 'Jun',
    day: '22',
    title: 'Endocrinology Check-Up',
    doctor: 'Dr. Sarah Mansour',
    time: '10:30 AM',
    location: 'Cairo Medical Centre, Floor 3',
  };

  const nutritionRows = useMemo(() => {
    const n = nutritionToday;
    const caloriesTotal = n?.calories_total ?? 0;
    const caloriesGoal = n?.calories_goal ?? 1900;
    const carbsTotal = n?.carbs_g_total ?? 0;
    const carbsGoal = n?.carbs_g_goal ?? 200;
    const proteinTotal = n?.protein_g_total ?? 0;
    const proteinGoal = n?.protein_g_goal ?? 80;
    const fatTotal = n?.fat_g_total ?? 0;
    const fatGoal = n?.fat_g_goal ?? 60;

    return {
      caloriesTotal,
      caloriesGoal,
      kcalText: `${formatKcal(caloriesTotal)} / ${formatKcal(caloriesGoal)} kcal`,
      rows: [
        {
          l: 'Carbs',
          v: `${formatMacroGrams(carbsTotal)}g / ${carbsGoal}g`,
          pct: macroPct(carbsTotal, carbsGoal),
          c: D.orange,
        },
        {
          l: 'Protein',
          v: `${formatMacroGrams(proteinTotal)}g / ${proteinGoal}g`,
          pct: macroPct(proteinTotal, proteinGoal),
          c: D.secondary,
        },
        {
          l: 'Fat',
          v: `${formatMacroGrams(fatTotal)}g / ${fatGoal}g`,
          pct: macroPct(fatTotal, fatGoal),
          c: D.tertiary,
        },
      ],
    };
  }, [D.orange, D.secondary, D.tertiary, nutritionToday]);

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
              {clinicalProfileIncomplete && (
                <Pressable style={s.clinicalBanner} onPress={() => router.push('/complete-health-profile')}>
                  <View style={s.alertIcon}>
                    <ClipboardList size={18} color={D.primary} />
                  </View>
                  <View style={s.alertBody}>
                    <Text style={s.alertTitle}>Complete your clinical information</Text>
                    <Text style={s.alertSub}>
                      Complete your clinical information to receive AI predictions.
                    </Text>
                  </View>
                  <Text style={s.clinicalBannerCta}>Open</Text>
                </Pressable>
              )}

              {showRetinopathyAlert && !retinopathyAlertDismissed && retinopathyPct != null && (
                <View style={s.alertBanner}>
                  <View style={s.alertIcon}>
                    <AlertTriangle size={18} color={D.primary} />
                  </View>
                  <View style={s.alertBody}>
                    <Text style={s.alertTitle}>
                      Critical: Vision (Retinopathy) risk is at {retinopathyPct}%
                    </Text>
                    <Text style={s.alertSub}>
                      Your latest model estimate is high. Schedule an ophthalmology screening soon.
                    </Text>
                  </View>
                  <Pressable style={s.alertBtn} onPress={() => router.push('/(tabs)/appointments' as never)}>
                    <Text style={s.alertBtnText}>Book now</Text>
                  </Pressable>
                  <Pressable onPress={() => setRetinopathyAlertDismissed(true)} hitSlop={8}>
                    <X size={16} color={D.onSurfaceVariant} />
                  </Pressable>
                </View>
              )}

              <View style={[s.grid4, s.grid4Vital, isWide && s.grid4Wide]}>
                <CandyCard style={s.vitalCard} accent="secondary">
                  <VitalSectionLabel>HbA1c Trend</VitalSectionLabel>
                  <View style={s.vitalTop}>
                    <Text style={s.vitalValue}>{formatHbA1c(hba1c)}</Text>
                    {hba1c != null ? (
                      <View style={hba1cInfo.tone === 'green' ? s.trendBadgeGreen : s.trendBadgeOrange}>
                        {hba1cInfo.tone === 'green' ? (
                          <Check size={10} color={D.green} />
                        ) : (
                          <ArrowUp size={10} color={D.orange} />
                        )}
                        <Text style={hba1cInfo.tone === 'green' ? s.trendGreenText : s.trendOrangeText}>
                          {hba1cInfo.label}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <SparkPath compact color={D.secondary} d="M0,15 L20,12 L40,14 L60,8 L80,10 L100,5" />
                  <Text style={s.vitalFoot}>
                    {hba1c != null
                      ? `Target <7.0%${hba1cAgo ? ` · Last tested ${hba1cAgo}` : ''}`
                      : 'Add your health profile or lab visit to see HbA1c'}
                  </Text>
                </CandyCard>

                <CandyCard style={s.vitalCard} accent="orange">
                  <VitalSectionLabel>Blood Pressure</VitalSectionLabel>
                  <View style={s.vitalTop}>
                    <Text style={s.vitalValue}>{bloodPressure}</Text>
                    <View style={s.trendBadgeOrange}>
                      <ArrowUp size={10} color={D.orange} />
                      <Text style={s.trendOrangeText}>4mmHg</Text>
                    </View>
                  </View>
                  <SparkPath compact color="#fb923c" d="M0,5 L20,8 L40,6 L60,12 L80,10 L100,15" />
                  <Text style={s.vitalFoot}>ADA target {'<'}130/80 · Slightly elevated</Text>
                </CandyCard>

                <CandyCard style={s.vitalCard} accent="primary">
                  <VitalSectionLabel>Heart Rate</VitalSectionLabel>
                  <View style={s.vitalTop}>
                    <Text style={s.vitalValue}>72 <Text style={s.vitalUnit}>bpm</Text></Text>
                    <View style={s.trendBadgeGreen}>
                      <Check size={10} color={D.green} />
                      <Text style={s.trendGreenText}>Normal</Text>
                    </View>
                  </View>
                  <SparkPath compact color={D.primary} d="M0,10 L15,10 L20,3 L25,17 L30,10 L50,10 L55,4 L60,16 L65,10 L100,10" />
                  <Text style={s.vitalFoot}>Resting · Healthy range 60–100 bpm</Text>
                </CandyCard>

                <CandyCard style={s.vitalCard} accent="tertiary">
                  <VitalSectionLabel>Weight · BMI</VitalSectionLabel>
                  <View style={s.vitalTop}>
                    <Text style={s.vitalValue}>
                      {formatWeightKg(weightKg)} <Text style={s.vitalUnit}>kg</Text>
                    </Text>
                    <View style={s.trendBadgeOrange}>
                      <Text style={s.trendOrangeText}>BMI {bmi ?? '—'}</Text>
                    </View>
                  </View>
                  <View style={s.bmiTrack}>
                    <View style={s.bmiGradient} />
                    <View style={[s.bmiMarker, { left: bmiMarkerLeft(bmi) }]} />
                  </View>
                  <View style={s.bmiLabels}>
                    {['Under', 'Normal', 'Over', 'Obese'].map((l) => (
                      <Text key={l} style={s.bmiLabel}>{l}</Text>
                    ))}
                  </View>
                  <Text style={s.vitalFoot}>
                    {weightKg != null
                      ? `${weightCategory ?? 'BMI'} · ${bmi ? `BMI ${bmi}` : 'BMI —'}`
                      : 'Add height and weight in your health profile'}
                  </Text>
                </CandyCard>
              </View>

              <View style={[s.grid2Risk, isWide && s.grid2RiskWide]}>
                <DiabetesStagePredictionCard
                  D={D}
                  summary={riskSummary ?? null}
                  onRunPrediction={onRunPrediction}
                  running={predictionRunning}
                />
                <ComplicationRisksCard D={D} summary={riskSummary ?? null} />
              </View>

              <View style={[s.careRow3, isWide && s.careRow3Wide]}>
                <View
                  style={s.careCol}
                  onLayout={(e) => {
                    const next = Math.round(e.nativeEvent.layout.height);
                    setCareStackHeight((prev) => (prev === next ? prev : next));
                  }}
                >
                  <CandyCard style={s.compactPadCard}>
                    <GlucoseStabilityCard
                      compact
                      days={glucoseDays}
                      D={D}
                      todayDay={glucoseTodayDay}
                      todayStatus={glucoseTodayStatus}
                      onViewTrend={onViewGlucoseHistory}
                      onPressCard={onViewGlucoseHistory}
                      onAddReading={onAddGlucoseReading}
                    />
                  </CandyCard>

                  <CandyCard style={s.compactPadCard}>
                    <SectionLabel>Lifestyle Monitoring</SectionLabel>
                    {lifestyleRows.map((row) => {
                      const rowContent = (
                        <View style={s.lifeRowCompact}>
                          <View style={s.lifeHead}>
                            <View style={s.lifeLeft}>
                              <row.icon size={12} color={row.color} />
                              <Text style={s.lifeLabel}>{row.label}</Text>
                            </View>
                            <Text style={[s.lifeVal, row.label === 'Water' && { color: D.orange }]}>{row.val}</Text>
                          </View>
                          <ProgressTrack inline pct={row.pct} color={row.color} />
                        </View>
                      );
                      if (row.route) {
                        return (
                          <Pressable key={row.label} onPress={() => router.push(row.route as never)}>
                            {rowContent}
                          </Pressable>
                        );
                      }
                      return <View key={row.label}>{rowContent}</View>;
                    })}
                  </CandyCard>
                </View>

                <CandyCard
                  style={[
                    s.compactPadCard,
                    s.careColSingle,
                    careSingleCardHeight != null && { height: careSingleCardHeight },
                  ]}
                  accent="tertiary"
                >
                  <ScrollView
                    style={s.careSingleScroll}
                    contentContainerStyle={s.careSingleScrollContent}
                    showsVerticalScrollIndicator={false}
                  >
                    <WaterIntakeCard compact D={D} patientId={patientId} />
                  </ScrollView>
                </CandyCard>

                <CandyCard
                  style={[
                    s.compactPadCard,
                    s.careColSingle,
                    careSingleCardHeight != null && { height: careSingleCardHeight },
                  ]}
                >
                  <View style={s.careSingleBody}>
                    <View style={s.cardHeadRowCompact}>
                      <ClipboardList size={14} color={D.primary} />
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
                    <ScrollView
                      style={s.careSingleListScroll}
                      contentContainerStyle={s.careSingleList}
                      showsVerticalScrollIndicator={false}
                      nestedScrollEnabled
                    >
                      {medications.map((med, i) => {
                        const isTaken = med.status === 'taken';
                        const canMark = Boolean(med.slotKey && onMarkMedicationTaken && !isTaken);
                        return (
                          <View key={med.slotKey ?? `${med.name}-${i}`} style={[s.medRowCompact, i < medications.length - 1 && s.medBorder]}>
                            <View style={s.medInfo}>
                              <Text style={[s.medName, isTaken && s.medNameTaken]}>{med.name}</Text>
                              <Text style={s.medNote}>{med.time} · {med.note}</Text>
                            </View>
                            <Pressable
                              style={[s.medCheckBtn, isTaken && s.medCheckBtnTaken, !canMark && !isTaken && s.medCheckBtnDisabled]}
                              onPress={() => {
                                if (canMark && med.slotKey) onMarkMedicationTaken?.(med.slotKey);
                              }}
                              disabled={!canMark}
                              accessibilityRole="checkbox"
                              accessibilityState={{ checked: isTaken }}
                              accessibilityLabel={isTaken ? `${med.name} taken` : `Mark ${med.name} as taken`}
                            >
                              {isTaken ? <Check size={16} color="#fff" strokeWidth={3} /> : null}
                            </Pressable>
                          </View>
                        );
                      })}
                    </ScrollView>
                  </View>
                </CandyCard>
              </View>

              <View style={[s.careRow3, isWide && s.careRow3Wide]}>
                <CandyCard
                  style={[
                    s.compactPadCard,
                    s.careColSingle,
                    lowerSingleCardHeight != null && { height: lowerSingleCardHeight },
                  ]}
                >
                  <ScrollView
                    style={s.careSingleScroll}
                    contentContainerStyle={s.careSingleScrollContent}
                    showsVerticalScrollIndicator={false}
                  >
                    <ActivityWeekCard D={D} patientId={patientId} />
                  </ScrollView>
                </CandyCard>

                <CandyCard
                  style={[
                    s.compactPadCard,
                    s.careColSingle,
                    lowerSingleCardHeight != null && { height: lowerSingleCardHeight },
                  ]}
                >
                  <View style={s.careSingleBody}>
                    <View style={s.cardHeadRowCompact}>
                      <UtensilsCrossed size={14} color={D.primary} />
                      <SectionLabel style={s.sectionLabelTight}>Nutrition Today</SectionLabel>
                    </View>
                    <Text style={s.kcalTextCompact}>
                      {formatKcal(nutritionRows.caloriesTotal)}{' '}
                      <Text style={s.kcalSubCompact}> / {formatKcal(nutritionRows.caloriesGoal)} kcal</Text>
                    </Text>
                    {nutritionRows.rows.map((n) => (
                      <View key={n.l} style={s.nutrRowCompact}>
                        <View style={s.nutrHead}>
                          <Text style={s.nutrLbl}>{n.l}</Text>
                          <Text style={s.nutrVal}>{n.v}</Text>
                        </View>
                        <ProgressTrack inline pct={n.pct} color={n.c} />
                      </View>
                    ))}
                    <Pressable style={s.ghostBtnCompact} onPress={() => router.push('/(tabs)/meal-analyzer' as never)}>
                      <Text style={s.ghostBtnTextCompact}>+ Log a meal (GlucoScan)</Text>
                    </Pressable>
                  </View>
                </CandyCard>

                <View
                  style={s.careCol}
                  onLayout={(e) => {
                    const next = Math.round(e.nativeEvent.layout.height);
                    setLowerStackHeight((prev) => (prev === next ? prev : next));
                  }}
                >
                  <CandyCard style={s.compactPadCardSmall}>
                    <View style={s.cardHeadRowCompact}>
                      <Calendar size={12} color={D.secondary} />
                      <SectionLabel style={s.sectionLabelMini}>Next Appointment</SectionLabel>
                    </View>
                    <View style={s.apptBoxSmall}>
                      <View style={s.apptDateSmall}>
                        <Text style={s.apptMonthSmall}>{appt.month}</Text>
                        <Text style={s.apptDaySmall}>{appt.day}</Text>
                      </View>
                      <View style={s.apptInfo}>
                        <Text style={s.apptTitleSmall}>{appt.title}</Text>
                        <Text style={s.apptSubSmall}>{appt.doctor} · {appt.time}</Text>
                        <Text style={s.apptSubSmall} numberOfLines={2}>{appt.location}</Text>
                      </View>
                    </View>
                    <View style={s.apptActionsSmall}>
                      <Pressable style={s.confirmBtnSmall}><Text style={s.confirmBtnTextSmall}>Confirm</Text></Pressable>
                      <Pressable style={s.reschedBtnSmall} onPress={() => router.push('/(tabs)/appointments' as never)}>
                        <Text style={s.reschedBtnTextSmall}>Reschedule</Text>
                      </Pressable>
                    </View>
                  </CandyCard>

                  <CandyCard style={s.compactPadCardSmall}>
                    <SectionLabel style={s.sectionLabelMini}>Quick Actions</SectionLabel>
                    <View style={s.quickGridSmall}>
                      {[
                        { icon: Phone, label: 'Call\nDoctor', color: D.tertiary, action: () => setCallDoctorVisible(true) },
                        {
                          icon: FlaskConical,
                          label: 'Book\nLab Test',
                          color: D.primary,
                          action: () => setNearbySheet('laboratory'),
                        },
                        {
                          icon: ShoppingCart,
                          label: 'Order\nMeds',
                          color: D.secondary,
                          action: () => setNearbySheet('pharmacy'),
                        },
                        { icon: Upload, label: 'Upload\nLab', color: D.tertiaryContainer, action: handleUploadLab },
                      ].map((a) => (
                        <Pressable
                          key={a.label}
                          style={({ pressed }) => [s.quickBtnSmall, pressed && s.quickBtnPressed]}
                          onPress={() => void a.action()}
                        >
                          <a.icon size={18} color={a.color} strokeWidth={2.2} />
                          <Text style={s.quickLabelSmall}>{a.label}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </CandyCard>
                </View>
              </View>

              <View style={[s.grid2Pair, isWide && s.grid2PairWide]}>
                <CandyCard style={[s.padCard, s.pairCol]}>
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

                <View style={s.pairCol}>
                  <DoctorChatCard D={D} patientId={patientId} fill={isWide} />
                </View>
              </View>

              <View style={{ paddingBottom: 100 }} />
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
  clinicalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: D.surfaceContainerLow,
    borderWidth: 1,
    borderColor: D.primary,
  },
  clinicalBannerCta: { fontFamily: DF.bold, fontSize: 12, color: D.primary },
  alertIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(224,64,160,0.12)', alignItems: 'center', justifyContent: 'center' },
  alertBody: { flex: 1 },
  alertTitle: { fontFamily: DF.bold, fontSize: 13, color: D.primary },
  alertSub: { fontFamily: DF.medium, fontSize: 11, color: D.onSurfaceVariant, marginTop: 2 },
  alertBtn: { backgroundColor: D.primary, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999 },
  alertBtnText: { fontFamily: DF.bold, fontSize: 11, color: D.onPrimary },
  grid4: { gap: 16 },
  grid4Vital: { gap: 10 },
  grid4Wide: { flexDirection: 'row', flexWrap: 'wrap' },
  grid2Risk: { gap: 12 },
  grid2RiskWide: { flexDirection: 'row', alignItems: 'stretch' },
  grid2Pair: { gap: 16 },
  grid2PairWide: { flexDirection: 'row', alignItems: 'stretch' },
  pairCol: { flex: 1, minWidth: 260, alignSelf: 'stretch' },
  careRow3: { gap: 10 },
  careRow3Wide: { flexDirection: 'row', alignItems: 'flex-start' },
  careCol: { flex: 1, minWidth: 220, gap: 10, width: '100%', alignSelf: 'flex-start' },
  careColSingle: { flex: 1, minWidth: 200, alignSelf: 'stretch', overflow: 'hidden' as const },
  careSingleScroll: { flex: 1, minHeight: 0 },
  careSingleScrollContent: { flexGrow: 1 },
  careSingleBody: { flex: 1, minHeight: 0, justifyContent: 'flex-start' },
  careSingleListScroll: { flex: 1, maxHeight: 220 },
  careSingleList: { paddingBottom: 4 },
  compactPadCard: { padding: 12, alignSelf: 'stretch', width: '100%' },
  compactPadCardSmall: { padding: 10, alignSelf: 'stretch', width: '100%' },
  grid3: { gap: 16 },
  grid3Wide: { flexDirection: 'row', flexWrap: 'wrap' },
  vitalCard: { padding: 10, flex: 1, minWidth: 130, borderRadius: 16 },
  padCard: { padding: 18, flex: 1, minWidth: 260, alignSelf: 'stretch' },
  sectionLabel: { fontFamily: DF.bold, fontSize: 10, color: D.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 10 },
  sectionLabelTight: { marginBottom: 6, letterSpacing: 1.5, fontSize: 9 },
  sectionLabelMini: { marginBottom: 5, letterSpacing: 1.2, fontSize: 8 },
  vitalSectionLabel: { fontFamily: DF.bold, fontSize: 8, color: D.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 },
  vitalTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 4 },
  vitalValue: { fontFamily: DF.bold, fontSize: 17, color: D.primary },
  vitalUnit: { fontSize: 10, color: D.onSurfaceVariant },
  vitalFoot: { fontFamily: DF.medium, fontSize: 8, color: D.onSurfaceVariant, marginTop: 3 },
  trendBadgeGreen: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: '#f0fdf4', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
  trendGreenText: { fontFamily: DF.bold, fontSize: 9, color: D.green },
  trendBadgeOrange: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: '#fff7ed', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
  trendOrangeText: { fontFamily: DF.bold, fontSize: 9, color: D.orange },
  bmiTrack: { height: 5, backgroundColor: D.surfaceContainer, borderRadius: 999, overflow: 'hidden', position: 'relative', marginTop: 2 },
  bmiGradient: { position: 'absolute', left: 0, top: 0, bottom: 0, width: '100%', backgroundColor: '#4ade80' },
  bmiMarker: { position: 'absolute', left: '62%', top: 0, bottom: 0, width: 2, backgroundColor: D.onSurface, borderRadius: 99 },
  bmiLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  bmiLabel: { fontFamily: DF.bold, fontSize: 7, color: D.onSurfaceVariant, textTransform: 'uppercase' },
  riskPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  riskPillText: { fontFamily: DF.bold, fontSize: 9, textTransform: 'uppercase' },
  ghostBtn: { marginTop: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: D.surfaceContainer, alignItems: 'center' },
  ghostBtnText: { fontFamily: DF.bold, fontSize: 11, color: D.onSurfaceVariant },
  ghostBtnCompact: { marginTop: 8, paddingVertical: 7, borderRadius: 12, backgroundColor: D.surfaceContainer, alignItems: 'center' },
  ghostBtnTextCompact: { fontFamily: DF.bold, fontSize: 10, color: D.onSurfaceVariant },
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
  lifeRowCompact: { marginBottom: 10, width: '100%' },
  lifeHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  lifeLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  lifeLabel: { fontFamily: DF.bold, fontSize: 10, color: D.onSurfaceVariant, textTransform: 'uppercase' },
  lifeVal: { fontFamily: DF.bold, fontSize: 10, color: D.onSurfaceVariant },
  progressTrack: { flex: 1, height: 10, backgroundColor: D.surfaceContainer, borderRadius: 999, overflow: 'hidden' },
  progressTrackInline: { width: '100%', height: 10, backgroundColor: D.surfaceContainer, borderRadius: 999, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999 },
  cardHeadRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, borderBottomWidth: 1, borderBottomColor: D.borderSubtle, paddingBottom: 10 },
  cardHeadRowCompact: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, borderBottomWidth: 1, borderBottomColor: D.borderSubtle, paddingBottom: 8 },
  adherenceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10, backgroundColor: D.surfaceContainerLow, borderRadius: 12, padding: 8 },
  adherenceNum: { fontFamily: DF.bold, fontSize: 18, color: D.primary },
  adherenceLbl: { fontFamily: DF.bold, fontSize: 9, color: D.onSurfaceVariant, textTransform: 'uppercase' },
  adherencePct: { fontFamily: DF.bold, fontSize: 10, color: D.onSurfaceVariant },
  medRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  medRowCompact: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, gap: 8 },
  medInfo: { flex: 1, minWidth: 0 },
  medBorder: { borderBottomWidth: 1, borderBottomColor: D.borderSubtle },
  medName: { fontFamily: DF.bold, fontSize: 12, color: D.onSurface },
  medNameTaken: { color: D.onSurfaceVariant, textDecorationLine: 'line-through' },
  medNote: { fontFamily: DF.medium, fontSize: 9, color: D.onSurfaceVariant, marginTop: 2 },
  medCheckBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: D.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: D.surface,
  },
  medCheckBtnTaken: { backgroundColor: D.green, borderColor: D.green },
  medCheckBtnDisabled: { borderColor: D.outlineVariant, opacity: 0.55 },
  compRow: { marginBottom: 14 },
  compHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  compName: { fontFamily: DF.bold, fontSize: 13, color: D.onSurface },
  compRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  compDelta: { fontFamily: DF.bold, fontSize: 9 },
  compLabel: { fontFamily: DF.bold, fontSize: 11, textTransform: 'uppercase' },
  modelNote: { marginTop: 8, padding: 10, borderRadius: 16, backgroundColor: 'rgba(224,64,160,0.05)', borderWidth: 1, borderColor: 'rgba(224,64,160,0.1)' },
  modelNoteBold: { fontFamily: DF.bold, fontSize: 10, color: D.primary },
  modelNoteSub: { fontFamily: DF.medium, fontSize: 9, color: D.onSurfaceVariant, marginTop: 2 },
  apptBox: { flexDirection: 'row', gap: 10, padding: 10, borderRadius: 14, backgroundColor: 'rgba(124,82,170,0.06)', borderWidth: 1, borderColor: 'rgba(124,82,170,0.1)', marginBottom: 8 },
  apptBoxSmall: { flexDirection: 'row', gap: 8, padding: 8, borderRadius: 12, backgroundColor: 'rgba(124,82,170,0.06)', borderWidth: 1, borderColor: 'rgba(124,82,170,0.1)', marginBottom: 6 },
  apptDate: { width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(124,82,170,0.12)', alignItems: 'center', justifyContent: 'center' },
  apptDateSmall: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(124,82,170,0.12)', alignItems: 'center', justifyContent: 'center' },
  apptMonth: { fontFamily: DF.bold, fontSize: 8, color: D.secondary, textTransform: 'uppercase' },
  apptMonthSmall: { fontFamily: DF.bold, fontSize: 7, color: D.secondary, textTransform: 'uppercase' },
  apptDay: { fontFamily: DF.bold, fontSize: 16, color: D.secondary, lineHeight: 18 },
  apptDaySmall: { fontFamily: DF.bold, fontSize: 14, color: D.secondary, lineHeight: 16 },
  apptInfo: { flex: 1, minWidth: 0 },
  apptTitle: { fontFamily: DF.bold, fontSize: 12, color: D.onSurface },
  apptTitleSmall: { fontFamily: DF.bold, fontSize: 11, color: D.onSurface },
  apptSub: { fontFamily: DF.medium, fontSize: 9, color: D.onSurfaceVariant, marginTop: 1 },
  apptSubSmall: { fontFamily: DF.medium, fontSize: 8, color: D.onSurfaceVariant, marginTop: 1 },
  apptActions: { flexDirection: 'row', gap: 8 },
  apptActionsSmall: { flexDirection: 'row', gap: 6 },
  confirmBtn: { flex: 1, backgroundColor: D.secondary, paddingVertical: 7, borderRadius: 12, alignItems: 'center' },
  confirmBtnSmall: { flex: 1, backgroundColor: D.secondary, paddingVertical: 5, borderRadius: 10, alignItems: 'center' },
  confirmBtnText: { fontFamily: DF.bold, fontSize: 10, color: D.onPrimary },
  confirmBtnTextSmall: { fontFamily: DF.bold, fontSize: 9, color: D.onPrimary },
  reschedBtn: { flex: 1, backgroundColor: D.surfaceContainer, paddingVertical: 7, borderRadius: 12, alignItems: 'center' },
  reschedBtnSmall: { flex: 1, backgroundColor: D.surfaceContainer, paddingVertical: 5, borderRadius: 10, alignItems: 'center' },
  reschedBtnText: { fontFamily: DF.bold, fontSize: 10, color: D.onSurfaceVariant },
  reschedBtnTextSmall: { fontFamily: DF.bold, fontSize: 9, color: D.onSurfaceVariant },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
    columnGap: 10,
  },
  quickGridSmall: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 6,
    columnGap: 6,
  },
  quickBtn: {
    width: '47%',
    minHeight: 84,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: D.surface,
    shadowColor: 'rgba(224, 64, 160, 0.45)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  quickBtnPressed: { opacity: 0.92, transform: [{ scale: 0.98 }] },
  quickBtnSmall: {
    width: '47%',
    minHeight: 68,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: D.surface,
    shadowColor: 'rgba(224, 64, 160, 0.45)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  quickLabel: {
    fontFamily: DF.bold,
    fontSize: 10,
    color: D.onSurface,
    textAlign: 'center',
    lineHeight: 13,
  },
  quickLabelSmall: {
    fontFamily: DF.bold,
    fontSize: 8,
    color: D.onSurface,
    textAlign: 'center',
    lineHeight: 11,
  },
  kcalText: { fontFamily: DF.bold, fontSize: 24, color: D.primary, textAlign: 'center', marginBottom: 12 },
  kcalTextCompact: { fontFamily: DF.bold, fontSize: 20, color: D.primary, textAlign: 'center', marginBottom: 8 },
  kcalSub: { fontSize: 13, color: D.onSurfaceVariant },
  kcalSubCompact: { fontSize: 11, color: D.onSurfaceVariant },
  nutrRow: { marginBottom: 10 },
  nutrRowCompact: { marginBottom: 8 },
  nutrHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  nutrLbl: { fontFamily: DF.bold, fontSize: 9, color: D.onSurfaceVariant, textTransform: 'uppercase' },
  nutrVal: { fontFamily: DF.bold, fontSize: 9, color: D.onSurfaceVariant },
  labRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10, borderRadius: 12, backgroundColor: D.surfaceContainerLow, marginBottom: 8 },
  labHighlight: { backgroundColor: 'rgba(224,64,160,0.05)', borderWidth: 1, borderColor: 'rgba(224,64,160,0.1)' },
  labTitle: { fontFamily: DF.bold, fontSize: 12, color: D.onSurface },
  labDate: { fontFamily: DF.medium, fontSize: 9, color: D.onSurfaceVariant, marginTop: 2 },
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
