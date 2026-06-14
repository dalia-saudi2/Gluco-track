import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Alert, Linking } from 'react-native';
import { Download, Calendar, MessageCircle, X, Share } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useAuth } from '../../contexts/AuthContext';
import { recordsService, Report, PatientHistory, Checkup } from '../../services/recordsService';
import { VitalisRecordsScreen } from '../../components/vitalis/VitalisRecordsScreen';
import { DF, DashboardPalette } from '../../constants/DashboardColors';
import { useD, useDashboardStyles } from '../../hooks/useDashboardTheme';

function createModalStyles(D: DashboardPalette) {
  return {
  modalBackdrop: { flex: 1, backgroundColor: D.overlay, justifyContent: 'flex-end' as const },
  modalCard: {
    backgroundColor: D.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: D.cardBorder,
  },
  modalHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: D.borderSubtle,
  },
  modalTitle: { fontFamily: DF.bold, fontSize: 18, color: D.onSurface },
  modalBody: { padding: 20 },
  modalDetails: { gap: 8, marginBottom: 16 },
  detailLabel: { fontFamily: DF.bold, fontSize: 10, color: D.onSurfaceVariant, textTransform: 'uppercase' as const },
  detailValue: { fontFamily: DF.medium, fontSize: 14, color: D.onSurface, marginBottom: 8 },
  modalActions: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8 },
  modalActionButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: D.surfaceContainer,
  },
  modalActionText: { fontFamily: DF.bold, fontSize: 11, color: D.onSurfaceVariant },
  };
}

function DetailsModal({
  visible,
  title,
  data,
  type,
  onClose,
  onAction,
}: {
  visible: boolean;
  title: string;
  data: Report | PatientHistory | Checkup | null;
  type: 'report' | 'history' | 'checkup';
  onClose: () => void;
  onAction: (action: 'download' | 'share' | 'message' | 'schedule' | 'correct') => void;
}) {
  const D = useD();
  const modalStyles = useDashboardStyles(createModalStyles);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={modalStyles.modalBackdrop}>
        <Animated.View style={modalStyles.modalCard} entering={FadeIn} exiting={FadeOut}>
          <View style={modalStyles.modalHeader}>
            <Text style={modalStyles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={20} color={D.primary} />
            </TouchableOpacity>
          </View>
          <View style={modalStyles.modalBody}>
            {data && (
              <View style={modalStyles.modalDetails}>
                {type === 'report' && (
                  <>
                    <Text style={modalStyles.detailLabel}>Provider</Text>
                    <Text style={modalStyles.detailValue}>{(data as Report).provider}</Text>
                    <Text style={modalStyles.detailLabel}>Date</Text>
                    <Text style={modalStyles.detailValue}>{(data as Report).date}</Text>
                    <Text style={modalStyles.detailLabel}>Status</Text>
                    <Text style={modalStyles.detailValue}>{(data as Report).status}</Text>
                    {(data as Report).summary && (
                      <>
                        <Text style={modalStyles.detailLabel}>Summary</Text>
                        <Text style={modalStyles.detailValue}>{(data as Report).summary}</Text>
                      </>
                    )}
                  </>
                )}
                {type === 'history' && (
                  <>
                    <Text style={modalStyles.detailLabel}>Description</Text>
                    <Text style={modalStyles.detailValue}>{(data as PatientHistory).description}</Text>
                    {(data as PatientHistory).date && (
                      <>
                        <Text style={modalStyles.detailLabel}>Date</Text>
                        <Text style={modalStyles.detailValue}>{(data as PatientHistory).date}</Text>
                      </>
                    )}
                    <Text style={modalStyles.detailLabel}>Status</Text>
                    <Text style={modalStyles.detailValue}>{(data as PatientHistory).status}</Text>
                  </>
                )}
                {type === 'checkup' && (
                  <>
                    <Text style={modalStyles.detailLabel}>Description</Text>
                    <Text style={modalStyles.detailValue}>{(data as Checkup).description}</Text>
                    <Text style={modalStyles.detailLabel}>Recommended Date</Text>
                    <Text style={modalStyles.detailValue}>{(data as Checkup).recommendedDate}</Text>
                    <Text style={modalStyles.detailLabel}>Priority</Text>
                    <Text style={modalStyles.detailValue}>{(data as Checkup).priority}</Text>
                  </>
                )}
              </View>
            )}
            <View style={modalStyles.modalActions}>
              {type === 'report' && (
                <>
                  <TouchableOpacity style={modalStyles.modalActionButton} onPress={() => onAction('download')}>
                    <Download size={16} color={D.primary} />
                    <Text style={modalStyles.modalActionText}>Download</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={modalStyles.modalActionButton} onPress={() => onAction('share')}>
                    <Share size={16} color={D.primary} />
                    <Text style={modalStyles.modalActionText}>Share</Text>
                  </TouchableOpacity>
                </>
              )}
              {type === 'history' && (
                <TouchableOpacity style={modalStyles.modalActionButton} onPress={() => onAction('correct')}>
                  <MessageCircle size={16} color={D.primary} />
                  <Text style={modalStyles.modalActionText}>Request Correction</Text>
                </TouchableOpacity>
              )}
              {type === 'checkup' && (
                <TouchableOpacity style={modalStyles.modalActionButton} onPress={() => onAction('schedule')}>
                  <Calendar size={16} color={D.primary} />
                  <Text style={modalStyles.modalActionText}>Schedule</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

export default function RecordsScreen() {
  const { isAuthenticated, isLoading: authIsLoading, user, logout } = useAuth();
  const router = useRouter();

  const [currentSection, setCurrentSection] = useState<'history' | 'checkups' | 'reports'>('history');
  const [selectedFilters, setSelectedFilters] = useState({ history: 'all', checkups: 'all', reports: 'all' });
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [modalData, setModalData] = useState<{ data: Report | PatientHistory | Checkup | null; type: 'report' | 'history' | 'checkup' }>({ data: null, type: 'report' });
  const [modalVisible, setModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [patientHistory, setPatientHistory] = useState<PatientHistory[]>([]);
  const [checkups, setCheckups] = useState<Checkup[]>([]);

  const mockReports: Report[] = [
    { id: 1, type: 'lab', date: 'Jan 15, 2025', provider: 'Dr. Mohamed Ahmed', title: 'Complete Blood Count', status: 'New', url: 'https://example.com/reports/1', summary: 'All values within normal range' },
    { id: 2, type: 'imaging', date: 'Jan 10, 2025', provider: 'Dr. Sarah Johnson', title: 'Chest X-Ray', status: 'Reviewed', url: 'https://example.com/reports/2', summary: 'No abnormalities detected' },
  ];

  const mockHistory: PatientHistory[] = [
    { id: 1, category: 'condition', title: 'Type 2 Diabetes Mellitus', description: 'Diagnosed in 2020, ongoing management with Metformin + Insulin', date: 'March 12, 2020', severity: 'moderate', status: 'active', provider: 'Dr. Amira Mansour' },
    { id: 2, category: 'condition', title: 'Essential Hypertension', description: 'Managed with ACE inhibitor (Lisinopril 10mg)', date: 'June 5, 2021', severity: 'moderate', status: 'active', provider: 'Dr. Amira Mansour' },
    { id: 3, category: 'allergy', title: 'Penicillin Allergy', description: 'Severe allergic reaction to penicillin antibiotics', severity: 'severe', status: 'active', provider: 'Dr. Sarah Johnson' },
  ];

  const mockCheckups: Checkup[] = [
    { id: 1, type: 'Annual Physical', description: 'Comprehensive health examination and screening', recommendedDate: 'Mar 15, 2025', frequency: 'Every 12 months', status: 'recommended', priority: 'medium', provider: 'Dr. Mohamed Ahmed' },
    { id: 2, type: 'Diabetes Screening', description: 'HbA1c test and diabetes management review', recommendedDate: 'Feb 1, 2025', frequency: 'Every 3 months', status: 'overdue', priority: 'high', provider: 'Dr. Mohamed Ahmed' },
  ];

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) {
      setReports(mockReports);
      setPatientHistory(mockHistory);
      setCheckups(mockCheckups);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const recordsData = await recordsService.getAllRecordsData();
      setReports(recordsData.reports);
      setPatientHistory(recordsData.history);
      setCheckups(recordsData.checkups);
    } catch (e: any) {
      setError(e?.message || 'Failed to load records. Using demo data.');
      setReports(mockReports);
      setPatientHistory(mockHistory);
      setCheckups(mockCheckups);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && !authIsLoading) fetchData();
    else if (!authIsLoading) {
      setReports(mockReports);
      setPatientHistory(mockHistory);
      setCheckups(mockCheckups);
    }
  }, [isAuthenticated, authIsLoading]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchData();
  }, [fetchData]);

  const handleModalAction = useCallback(
    async (action: 'download' | 'share' | 'message' | 'schedule' | 'correct') => {
      if (!modalData.data) return;
      switch (action) {
        case 'download':
          if (modalData.type === 'report') {
            try {
              await Linking.openURL((modalData.data as Report).url);
            } catch {
              Alert.alert('Error', 'Unable to download report');
            }
          }
          break;
        case 'share':
          if (modalData.type === 'report') {
            try {
              const r = modalData.data as Report;
              await Linking.openURL(`mailto:?subject=${r.title}&body=Please find attached: ${r.url}`);
            } catch {
              Alert.alert('Error', 'Unable to share report');
            }
          }
          break;
        case 'schedule':
          router.push('/(tabs)/appointments');
          break;
        case 'correct':
          router.push('/(tabs)/chatbot');
          break;
      }
      setModalVisible(false);
    },
    [modalData, router]
  );

  const filteredData = useMemo(
    () => ({
      history: patientHistory
        .filter((h) => selectedFilters.history === 'all' || h.category === selectedFilters.history)
        .sort((a, b) => (sortOrder === 'newest' ? (b.date || '').localeCompare(a.date || '') : (a.date || '').localeCompare(b.date || ''))),
      checkups: checkups
        .filter((c) => selectedFilters.checkups === 'all' || c.status === selectedFilters.checkups)
        .sort((a, b) => (sortOrder === 'newest' ? b.recommendedDate.localeCompare(a.recommendedDate) : a.recommendedDate.localeCompare(b.recommendedDate))),
      reports: reports
        .filter((r) => selectedFilters.reports === 'all' || r.type === selectedFilters.reports)
        .sort((a, b) => (sortOrder === 'newest' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date))),
    }),
    [patientHistory, checkups, reports, selectedFilters, sortOrder]
  );

  const stats = useMemo(() => {
    const lastReport = reports[0]?.date?.split(' ').slice(1).join(' ') || 'Jan 21';
    return {
      history: patientHistory.length,
      checkups: checkups.length,
      reports: reports.length,
      lastUpdated: lastReport,
    };
  }, [patientHistory, checkups, reports]);

  const handleFilterChange = (section: 'history' | 'checkups' | 'reports', filter: string) => {
    setSelectedFilters((prev) => ({ ...prev, [section]: filter }));
  };

  const modalTitle =
    modalData.data && 'title' in modalData.data
      ? modalData.data.title
      : modalData.data && 'type' in modalData.data
        ? (modalData.data as Checkup).type
        : '';

  return (
    <VitalisRecordsScreen
      userName={user?.full_name || 'Patient'}
      currentSection={currentSection}
      onSectionChange={setCurrentSection}
      selectedFilters={selectedFilters}
      onFilterChange={handleFilterChange}
      sortOrder={sortOrder}
      onSortChange={setSortOrder}
      filteredHistory={filteredData.history}
      filteredCheckups={filteredData.checkups}
      filteredReports={filteredData.reports}
      stats={stats}
      isLoading={isLoading}
      authIsLoading={authIsLoading}
      isAuthenticated={isAuthenticated}
      error={error}
      onRefresh={handleRefresh}
      onRetry={fetchData}
      onLogout={logout}
      onUpload={() => Alert.alert('Upload Record', 'Document upload will be available in a future update.')}
      onExportAll={() => Alert.alert('Export', 'Exporting all records...')}
      onViewHistory={(item) => {
        setModalData({ data: item, type: 'history' });
        setModalVisible(true);
      }}
      onViewCheckup={(item) => {
        setModalData({ data: item, type: 'checkup' });
        setModalVisible(true);
      }}
      onViewReport={(item) => {
        setModalData({ data: item, type: 'report' });
        setModalVisible(true);
      }}
      onScheduleCheckup={() => router.push('/(tabs)/appointments')}
      onDownloadReport={async (item) => {
        try {
          await Linking.openURL(item.url);
        } catch {
          Alert.alert('Error', 'Unable to download report');
        }
      }}
      onShareReport={async (item) => {
        try {
          await Linking.openURL(`mailto:?subject=${item.title}&body=Please find attached: ${item.url}`);
        } catch {
          Alert.alert('Error', 'Unable to share report');
        }
      }}
      detailsModal={
        <DetailsModal
          visible={modalVisible}
          title={modalTitle}
          data={modalData.data}
          type={modalData.type}
          onClose={() => setModalVisible(false)}
          onAction={handleModalAction}
        />
      }
    />
  );
}
