import React, { ReactNode, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  useWindowDimensions,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  History,
  Shield,
  FlaskConical,
  Calendar,
  Upload,
  Download,
  Eye,
  Share2,
  Heart,
  AlertTriangle,
  Activity,
  Pill,
  FileText,
  RefreshCw,
  Clock,
  CheckCircle,
  AlertCircle,
  Stethoscope,
} from 'lucide-react-native';
import { CandyCard } from '../dashboard/CandyCard';
import { DF, DashboardPalette } from '../../constants/DashboardColors';
import { useD } from '../../hooks/useDashboardTheme';
import { createDashboardScreenTheme } from '../../hooks/dashboardScreenTheme';
import { VitalisShell } from './VitalisShell';
import { Report, PatientHistory, Checkup } from '../../services/recordsService';

type Section = 'history' | 'checkups' | 'reports';

type Props = {
  userName?: string;
  currentSection: Section;
  onSectionChange: (s: Section) => void;
  selectedFilters: { history: string; checkups: string; reports: string };
  onFilterChange: (section: Section, filter: string) => void;
  sortOrder: 'newest' | 'oldest';
  onSortChange: (order: 'newest' | 'oldest') => void;
  filteredHistory: PatientHistory[];
  filteredCheckups: Checkup[];
  filteredReports: Report[];
  stats: { history: number; checkups: number; reports: number; lastUpdated: string };
  isLoading?: boolean;
  authIsLoading?: boolean;
  isAuthenticated?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  onRetry?: () => void;
  onLogout?: () => void;
  onUpload: () => void;
  onExportAll: () => void;
  onViewHistory: (item: PatientHistory) => void;
  onViewCheckup: (item: Checkup) => void;
  onViewReport: (item: Report) => void;
  onScheduleCheckup: () => void;
  onDownloadReport: (item: Report) => void;
  onShareReport: (item: Report) => void;
  detailsModal: ReactNode;
  uploadModal?: ReactNode;
};

const SECTION_TABS: { id: Section; label: string }[] = [
  { id: 'history', label: 'History' },
  { id: 'checkups', label: 'Checkups' },
  { id: 'reports', label: 'Reports' },
];

const HISTORY_FILTERS = ['all', 'condition', 'allergy', 'surgery', 'medication'] as const;
const CHECKUP_FILTERS = ['all', 'scheduled', 'recommended', 'overdue'] as const;
const REPORT_FILTERS = ['all', 'lab', 'imaging', 'summary', 'prescription'] as const;

const { ScreenThemeProvider, useScreenTheme } = createDashboardScreenTheme<ReturnType<typeof createStyles>>();

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

function categoryIcon(category: string, D: DashboardPalette) {
  switch (category) {
    case 'condition':
      return <Heart size={22} color={D.primary} />;
    case 'allergy':
      return <AlertTriangle size={22} color={D.error} />;
    case 'surgery':
      return <Activity size={22} color={D.secondary} />;
    case 'medication':
      return <Pill size={22} color={D.tertiary} />;
    default:
      return <FileText size={22} color={D.primary} />;
  }
}

function checkupIcon(status: string, D: DashboardPalette) {
  switch (status) {
    case 'scheduled':
      return <CheckCircle size={22} color={D.green} />;
    case 'overdue':
      return <AlertCircle size={22} color={D.error} />;
    default:
      return <Clock size={22} color={D.secondary} />;
  }
}

function reportIcon(type: string, D: DashboardPalette) {
  switch (type) {
    case 'lab':
      return <FlaskConical size={22} color={D.tertiary} />;
    case 'imaging':
      return <Activity size={22} color={D.secondary} />;
    default:
      return <FileText size={22} color={D.primary} />;
  }
}

function accentForCategory(category: string, D: DashboardPalette) {
  switch (category) {
    case 'allergy':
      return D.error;
    case 'surgery':
      return D.secondary;
    case 'medication':
      return D.tertiary;
    default:
      return D.primary;
  }
}

function HistoryTimelineCard({
  item,
  accent,
  onView,
}: {
  item: PatientHistory;
  accent: string;
  onView: () => void;
}) {
  const { D, s } = useScreenTheme();
  return (
    <View style={s.timelineItem}>
      <View style={[s.timelineDot, { borderColor: accent }]} />
      <CandyCard style={s.recCard}>
        <View style={s.recRow}>
          <View style={[s.accentBar, { backgroundColor: accent }]} />
          <View style={s.recBody}>
            <View style={s.recHead}>
              <View style={s.recLeft}>
                <View style={[s.recIcon, { backgroundColor: `${accent}18` }]}>{categoryIcon(item.category, D)}</View>
                <View style={s.recInfo}>
                  <View style={s.recTitleRow}>
                    <Text style={s.recTitle}>{item.title}</Text>
                    <View style={[s.activePill, { backgroundColor: `${accent}18` }]}>
                      <Text style={[s.activePillText, { color: accent }]}>
                        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                      </Text>
                    </View>
                  </View>
                  <Text style={s.recMeta}>
                    {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                    {item.provider ? ` · ${item.provider}` : ''}
                  </Text>
                  <Text style={s.recDesc} numberOfLines={2}>{item.description}</Text>
                </View>
              </View>
              {item.date && (
                <View style={s.recDate}>
                  <Text style={s.recDateVal}>{item.date}</Text>
                </View>
              )}
            </View>
            <View style={s.recActions}>
              <Pressable style={s.ghostAction} onPress={onView}>
                <Eye size={14} color={D.onSurfaceVariant} />
                <Text style={s.ghostActionText}>View full record</Text>
              </Pressable>
              <Pressable style={s.ghostAction} onPress={() => Alert.alert('Share', 'Sharing record...')}>
                <Share2 size={14} color={D.onSurfaceVariant} />
                <Text style={s.ghostActionText}>Share</Text>
              </Pressable>
              <Pressable style={s.ghostAction} onPress={() => Alert.alert('Download', 'Downloading record...')}>
                <Download size={14} color={D.onSurfaceVariant} />
                <Text style={s.ghostActionText}>Download</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </CandyCard>
    </View>
  );
}

function CheckupTimelineCard({
  item,
  onView,
  onSchedule,
}: {
  item: Checkup;
  onView: () => void;
  onSchedule: () => void;
}) {
  const { D, s } = useScreenTheme();
  const accent = item.status === 'overdue' ? D.error : item.status === 'scheduled' ? D.green : D.secondary;
  return (
    <View style={s.timelineItem}>
      <View style={[s.timelineDot, { borderColor: accent }]} />
      <CandyCard style={s.recCard}>
        <View style={s.recRow}>
          <View style={[s.accentBar, { backgroundColor: accent }]} />
          <View style={s.recBody}>
            <View style={s.recHead}>
              <View style={s.recLeft}>
                <View style={[s.recIcon, { backgroundColor: `${accent}18` }]}>{checkupIcon(item.status, D)}</View>
                <View style={s.recInfo}>
                  <View style={s.recTitleRow}>
                    <Text style={s.recTitle}>{item.type}</Text>
                    <View style={[s.activePill, { backgroundColor: `${accent}18` }]}>
                      <Text style={[s.activePillText, { color: accent }]}>
                        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                      </Text>
                    </View>
                  </View>
                  <Text style={s.recMeta}>{item.description}</Text>
                  <Text style={s.recDesc}>Recommended: {item.recommendedDate}{item.frequency ? ` · ${item.frequency}` : ''}</Text>
                </View>
              </View>
            </View>
            <View style={s.recActions}>
              <Pressable style={s.ghostAction} onPress={onView}>
                <Eye size={14} color={D.onSurfaceVariant} />
                <Text style={s.ghostActionText}>Details</Text>
              </Pressable>
              <Pressable style={[s.scheduleAction, { backgroundColor: `${accent}18` }]} onPress={onSchedule}>
                <Calendar size={14} color={accent} />
                <Text style={[s.scheduleActionText, { color: accent }]}>Schedule</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </CandyCard>
    </View>
  );
}

function ReportTimelineCard({
  item,
  onView,
  onDownload,
  onShare,
}: {
  item: Report;
  onView: () => void;
  onDownload: () => void;
  onShare: () => void;
}) {
  const { D, s } = useScreenTheme();
  const accent = item.type === 'lab' ? D.tertiary : item.type === 'imaging' ? D.secondary : D.primary;
  const statusColor =
    item.status === 'New' ? D.primary : item.status === 'Reviewed' ? D.green : D.orange;

  return (
    <View style={s.timelineItem}>
      <View style={[s.timelineDot, { borderColor: accent }]} />
      <CandyCard style={s.recCard}>
        <View style={s.recRow}>
          <View style={[s.accentBar, { backgroundColor: accent }]} />
          <View style={s.recBody}>
            <View style={s.recHead}>
              <View style={s.recLeft}>
                <View style={[s.recIcon, { backgroundColor: `${accent}18` }]}>{reportIcon(item.type, D)}</View>
                <View style={s.recInfo}>
                  <View style={s.recTitleRow}>
                    <Text style={s.recTitle}>{item.title}</Text>
                    <View style={[s.activePill, { backgroundColor: `${statusColor}18` }]}>
                      <Text style={[s.activePillText, { color: statusColor }]}>{item.status}</Text>
                    </View>
                  </View>
                  <Text style={s.recMeta}>
                    {item.type.charAt(0).toUpperCase() + item.type.slice(1)} · {item.provider}
                  </Text>
                  <Text style={s.recDesc}>{item.date}{item.summary ? ` · ${item.summary}` : ''}</Text>
                </View>
              </View>
            </View>
            <View style={s.recActions}>
              <Pressable style={s.ghostAction} onPress={onView}>
                <Eye size={14} color={D.onSurfaceVariant} />
                <Text style={s.ghostActionText}>View</Text>
              </Pressable>
              <Pressable style={s.ghostAction} onPress={onDownload}>
                <Download size={14} color={D.onSurfaceVariant} />
                <Text style={s.ghostActionText}>Download</Text>
              </Pressable>
              <Pressable style={s.ghostAction} onPress={onShare}>
                <Share2 size={14} color={D.onSurfaceVariant} />
                <Text style={s.ghostActionText}>Share</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </CandyCard>
    </View>
  );
}

export function VitalisRecordsScreen({
  userName = 'Patient',
  currentSection,
  onSectionChange,
  selectedFilters,
  onFilterChange,
  sortOrder,
  onSortChange,
  filteredHistory,
  filteredCheckups,
  filteredReports,
  stats,
  isLoading,
  authIsLoading,
  isAuthenticated,
  error,
  onRefresh,
  onRetry,
  onLogout,
  onUpload,
  onExportAll,
  onViewHistory,
  onViewCheckup,
  onViewReport,
  onScheduleCheckup,
  onDownloadReport,
  onShareReport,
  detailsModal,
  uploadModal,
}: Props) {
  const router = useRouter();
  const D = useD();
  const s = useMemo(() => StyleSheet.create(createStyles(D)), [D]);
  const { width } = useWindowDimensions();
  const isWide = width >= 768;
  const firstName = userName.split(' ')[0] || userName;

  const activeFilters =
    currentSection === 'history'
      ? HISTORY_FILTERS
      : currentSection === 'checkups'
        ? CHECKUP_FILTERS
        : REPORT_FILTERS;

  const activeFilterKey =
    currentSection === 'history' ? selectedFilters.history : currentSection === 'checkups' ? selectedFilters.checkups : selectedFilters.reports;

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
          <Text style={s.mutedText}>Please login to view your records</Text>
          <Pressable style={s.primaryBtn} onPress={() => router.push('/login')}>
            <Text style={s.primaryBtnText}>Go to Login</Text>
          </Pressable>
        </View>
      );
    }
    if (error) {
      return (
        <View style={s.centered}>
          <AlertCircle size={48} color={D.error} />
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
          <Text style={s.mutedText}>Loading records...</Text>
        </View>
      );
    }

    if (currentSection === 'history') {
      if (filteredHistory.length === 0) {
        return (
          <View style={s.centered}>
            <Stethoscope size={48} color={D.onSurfaceVariant} />
            <Text style={s.mutedText}>No history records available.</Text>
          </View>
        );
      }
      return filteredHistory.map((item) => (
        <HistoryTimelineCard
          key={item.id}
          item={item}
          accent={accentForCategory(item.category, D)}
          onView={() => onViewHistory(item)}
        />
      ));
    }

    if (currentSection === 'checkups') {
      if (filteredCheckups.length === 0) {
        return (
          <View style={s.centered}>
            <Shield size={48} color={D.onSurfaceVariant} />
            <Text style={s.mutedText}>No check-ups recommended.</Text>
          </View>
        );
      }
      return filteredCheckups.map((item) => (
        <CheckupTimelineCard
          key={item.id}
          item={item}
          onView={() => onViewCheckup(item)}
          onSchedule={onScheduleCheckup}
        />
      ));
    }

    if (filteredReports.length === 0) {
      return (
        <View style={s.centered}>
          <FileText size={48} color={D.onSurfaceVariant} />
          <Text style={s.mutedText}>No reports available.</Text>
          <Text style={s.mutedSub}>Medical records will appear here once added to your account.</Text>
        </View>
      );
    }
    return filteredReports.map((item) => (
      <ReportTimelineCard
        key={item.id}
        item={item}
        onView={() => onViewReport(item)}
        onDownload={() => onDownloadReport(item)}
        onShare={() => onShareReport(item)}
      />
    ));
  }, [
    authIsLoading,
    isAuthenticated,
    error,
    isLoading,
    currentSection,
    filteredHistory,
    filteredCheckups,
    filteredReports,
    onViewHistory,
    onViewCheckup,
    onViewReport,
    onScheduleCheckup,
    onDownloadReport,
    onShareReport,
    onRetry,
    router,
    D,
    s,
  ]);

  const exportBtn = (
    <Pressable style={s.exportBtn} onPress={onExportAll}>
      <Download size={14} color={D.onSurfaceVariant} />
      <Text style={s.exportBtnText}>Export all</Text>
    </Pressable>
  );

  return (
    <ScreenThemeProvider D={D} s={s}>
    <>
      <VitalisShell
        activeNavId="records"
        userName={userName}
        headerExtra={exportBtn}
        onLogout={onLogout}
        onRefresh={onRefresh}
      >
        <View style={s.pageHead}>
          <View style={s.pageHeadLeft}>
            <Text style={s.pageTitle}>Medical Records</Text>
            <Text style={s.pageSub}>Hello {firstName}, all your health records in one place</Text>
          </View>
          <Pressable style={s.uploadBtn} onPress={onUpload}>
            <Upload size={16} color={D.onPrimary} />
            <Text style={s.uploadBtnText}>Upload Lab Test</Text>
          </Pressable>
        </View>

        <View style={[s.statsRow, isWide && s.statsRowWide]}>
          <StatCard value={stats.history} label="History" color={D.primary} icon={History} bg="rgba(224,64,160,0.1)" />
          <StatCard value={stats.checkups} label="Checkups" color={D.secondary} icon={Shield} bg="rgba(124,82,170,0.1)" />
          <StatCard value={stats.reports} label="Reports" color={D.tertiary} icon={FlaskConical} bg="rgba(0,150,204,0.1)" />
          <StatCard value={stats.lastUpdated} label="Last updated" color={D.onSurface} icon={Calendar} bg={D.surfaceContainerHigh} />
        </View>

        <View style={s.tabPillWrap}>
          {SECTION_TABS.map((tab) => (
            <Pressable
              key={tab.id}
              onPress={() => onSectionChange(tab.id)}
              style={[s.tabPill, currentSection === tab.id && s.tabPillActive]}
            >
              <Text style={[s.tabPillText, currentSection === tab.id && s.tabPillTextActive]}>{tab.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={[s.filterSortRow, isWide && s.filterSortRowWide]}>
          <View style={s.filterWrap}>
            {activeFilters.map((filter) => (
              <Pressable
                key={filter}
                onPress={() => onFilterChange(currentSection, filter)}
                style={[s.filterChip, activeFilterKey === filter && s.filterChipOn]}
              >
                <Text style={[s.filterChipText, activeFilterKey === filter && s.filterChipTextOn]}>
                  {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={s.sortRow}>
            <Text style={s.sortLbl}>Sort:</Text>
            <Pressable style={[s.sortChip, sortOrder === 'newest' && s.sortChipOn]} onPress={() => onSortChange('newest')}>
              <Text style={[s.sortChipText, sortOrder === 'newest' && s.sortChipTextOn]}>Newest</Text>
            </Pressable>
            <Pressable style={[s.sortChip, sortOrder === 'oldest' && s.sortChipOn]} onPress={() => onSortChange('oldest')}>
              <Text style={[s.sortChipText, sortOrder === 'oldest' && s.sortChipTextOn]}>Oldest</Text>
            </Pressable>
          </View>
        </View>

        <View style={s.timeline}>{listContent}</View>
      </VitalisShell>
      {detailsModal}
      {uploadModal}
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
  uploadBtn: {
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
  uploadBtnText: { fontFamily: DF.bold, fontSize: 13, color: D.onPrimary },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: D.surfaceContainer,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  exportBtnText: { fontFamily: DF.bold, fontSize: 11, color: D.onSurfaceVariant },
  statsRow: { gap: 12 },
  statsRowWide: { flexDirection: 'row', flexWrap: 'wrap' },
  statCard: { flex: 1, minWidth: 140, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  statIcon: { width: 40, height: 40, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontFamily: DF.bold, fontSize: 22 },
  statLabel: { fontFamily: DF.bold, fontSize: 9, color: D.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 },
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
  filterSortRow: { gap: 12 },
  filterSortRowWide: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  filterWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: D.surfaceContainer,
    borderWidth: 1,
    borderColor: D.borderMedium,
  },
  filterChipOn: { backgroundColor: D.primary, borderColor: D.primary },
  filterChipText: { fontFamily: DF.bold, fontSize: 11, color: D.onSurfaceVariant },
  filterChipTextOn: { color: D.onPrimary },
  sortRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sortLbl: { fontFamily: DF.bold, fontSize: 11, color: D.onSurfaceVariant },
  sortChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: D.surfaceContainer },
  sortChipOn: { backgroundColor: D.secondary },
  sortChipText: { fontFamily: DF.bold, fontSize: 11, color: D.onSurfaceVariant },
  sortChipTextOn: { color: D.onPrimary },
  timeline: { gap: 4, paddingLeft: 4 },
  timelineItem: { position: 'relative', paddingLeft: 20, marginBottom: 12 },
  timelineDot: {
    position: 'absolute',
    left: 0,
    top: 18,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2.5,
    backgroundColor: D.surface,
    zIndex: 1,
  },
  recCard: { marginBottom: 0 },
  recRow: { flexDirection: 'row' },
  accentBar: { width: 6, borderTopLeftRadius: 24, borderBottomLeftRadius: 24 },
  recBody: { flex: 1, padding: 20 },
  recHead: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  recLeft: { flexDirection: 'row', gap: 14, flex: 1 },
  recIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  recInfo: { flex: 1 },
  recTitleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  recTitle: { fontFamily: DF.bold, fontSize: 14, color: D.onSurface },
  activePill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  activePillText: { fontFamily: DF.bold, fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5 },
  recMeta: { fontFamily: DF.medium, fontSize: 12, color: D.onSurfaceVariant },
  recDesc: { fontFamily: DF.medium, fontSize: 10, color: D.onSurfaceVariant, marginTop: 4, lineHeight: 15 },
  recDate: { alignItems: 'flex-end' },
  recDateVal: { fontFamily: DF.bold, fontSize: 12, color: D.onSurface },
  recActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  ghostAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: D.surfaceContainer,
  },
  ghostActionText: { fontFamily: DF.bold, fontSize: 10, color: D.onSurfaceVariant },
  scheduleAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  scheduleActionText: { fontFamily: DF.bold, fontSize: 10 },
  centered: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 12 },
  mutedText: { fontFamily: DF.medium, fontSize: 14, color: D.onSurfaceVariant, textAlign: 'center' },
  mutedSub: { fontFamily: DF.medium, fontSize: 12, color: D.onSurfaceVariant, textAlign: 'center' },
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
  };
}
