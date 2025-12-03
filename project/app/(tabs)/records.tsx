import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, Modal, Alert, ActivityIndicator, FlatList, Linking } from 'react-native';
import { FileText, Download, Eye, Calendar, User, MessageCircle, Settings, Search, Heart, Pill, Activity, AlertTriangle, ChevronDown, ChevronUp, CheckCircle, AlertCircle, X, Share, Clock, Bot } from 'lucide-react-native';
import { useRouter, usePathname } from 'expo-router';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'; // Optional for animations

// TypeScript interfaces
interface Report {
  id: number;
  type: 'lab' | 'imaging' | 'summary' | 'prescription';
  date: string;
  provider: string;
  title: string;
  status: 'New' | 'Reviewed' | 'Pending';
  url: string;
  summary?: string;
}

interface PatientHistory {
  id: number;
  category: 'condition' | 'allergy' | 'surgery' | 'medication';
  title: string;
  description: string;
  date?: string;
  severity?: 'mild' | 'moderate' | 'severe';
  status: 'active' | 'resolved' | 'ongoing';
  provider?: string;
}

interface Checkup {
  id: number;
  type: string;
  description: string;
  recommendedDate: string;
  frequency?: string;
  status: 'scheduled' | 'recommended' | 'overdue';
  priority: 'low' | 'medium' | 'high';
  provider?: string;
}

// Helper functions for dynamic style access
const getStatusBadgeStyle = (status: string) => {
  switch (status) {
    case 'New':
      return styles.newBadge;
    case 'Reviewed':
      return styles.reviewedBadge;
    case 'Pending':
      return styles.pendingBadge;
    default:
      return styles.newBadge;
  }
};

// Generic Details Modal Component
const DetailsModal = ({
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
}) => (
  <Modal visible={visible} animationType="slide" transparent>
    <View style={styles.modalBackdrop}>
      <Animated.View style={styles.modalCard} entering={FadeIn} exiting={FadeOut}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{title}</Text>
          <TouchableOpacity onPress={onClose} accessibilityLabel={`Close ${type} details`} accessibilityRole="button">
            <X size={20} color="#1E3A8A" />
          </TouchableOpacity>
        </View>
        <View style={styles.modalBody}>
          {data && (
            <View style={styles.modalDetails}>
              {type === 'report' && (
                <>
                  <Text style={styles.detailLabel}>Provider:</Text>
                  <Text style={styles.detailValue}>{(data as Report).provider}</Text>
                  <Text style={styles.detailLabel}>Date:</Text>
                  <Text style={styles.detailValue}>{(data as Report).date}</Text>
                  <Text style={styles.detailLabel}>Type:</Text>
                  <Text style={styles.detailValue}>
                    {(data as Report).type === 'lab' ? 'Lab Results' : 
                     (data as Report).type === 'imaging' ? 'Imaging' : 
                     (data as Report).type === 'summary' ? 'Visit Summary' : 'Prescription'}
                  </Text>
                  <Text style={styles.detailLabel}>Status:</Text>
                  <Text style={styles.detailValue}>{(data as Report).status}</Text>
                  {(data as Report).summary && (
                    <>
                      <Text style={styles.detailLabel}>Summary:</Text>
                      <Text style={styles.detailValue}>{(data as Report).summary}</Text>
                    </>
                  )}
                </>
              )}
              {type === 'history' && (
                <>
                  <Text style={styles.detailLabel}>Category:</Text>
                  <Text style={styles.detailValue}>
                    {(data as PatientHistory).category === 'condition' ? 'Medical Condition' :
                     (data as PatientHistory).category === 'allergy' ? 'Allergy' :
                     (data as PatientHistory).category === 'surgery' ? 'Surgery' : 'Medication'}
                  </Text>
                  <Text style={styles.detailLabel}>Description:</Text>
                  <Text style={styles.detailValue}>{(data as PatientHistory).description}</Text>
                  {(data as PatientHistory).date && (
                    <>
                      <Text style={styles.detailLabel}>Date:</Text>
                      <Text style={styles.detailValue}>{(data as PatientHistory).date}</Text>
                    </>
                  )}
                  {(data as PatientHistory).severity && (
                    <>
                      <Text style={styles.detailLabel}>Severity:</Text>
                      <Text style={styles.detailValue}>
                        {(() => {
                          const severity = (data as PatientHistory).severity;
                          return severity ? severity.charAt(0).toUpperCase() + severity.slice(1) : '';
                        })()}
                      </Text>
                    </>
                  )}
                  <Text style={styles.detailLabel}>Status:</Text>
                  <Text style={styles.detailValue}>{(data as PatientHistory).status.charAt(0).toUpperCase() + (data as PatientHistory).status.slice(1)}</Text>
                  {(data as PatientHistory).provider && (
                    <>
                      <Text style={styles.detailLabel}>Provider:</Text>
                      <Text style={styles.detailValue}>{(data as PatientHistory).provider}</Text>
                    </>
                  )}
                </>
              )}
              {type === 'checkup' && (
                <>
                  <Text style={styles.detailLabel}>Description:</Text>
                  <Text style={styles.detailValue}>{(data as Checkup).description}</Text>
                  <Text style={styles.detailLabel}>Recommended Date:</Text>
                  <Text style={styles.detailValue}>{(data as Checkup).recommendedDate}</Text>
                  {(data as Checkup).frequency && (
                    <>
                      <Text style={styles.detailLabel}>Frequency:</Text>
                      <Text style={styles.detailValue}>{(data as Checkup).frequency}</Text>
                    </>
                  )}
                  <Text style={styles.detailLabel}>Status:</Text>
                  <Text style={styles.detailValue}>{(data as Checkup).status.charAt(0).toUpperCase() + (data as Checkup).status.slice(1)}</Text>
                  <Text style={styles.detailLabel}>Priority:</Text>
                  <Text style={styles.detailValue}>{(data as Checkup).priority.charAt(0).toUpperCase() + (data as Checkup).priority.slice(1)}</Text>
                  {(data as Checkup).provider && (
                    <>
                      <Text style={styles.detailLabel}>Provider:</Text>
                      <Text style={styles.detailValue}>{(data as Checkup).provider}</Text>
                    </>
                  )}
                </>
              )}
            </View>
          )}
          <View style={styles.modalActions}>
            {type === 'report' && (
              <>
                <TouchableOpacity style={styles.modalActionButton} onPress={() => onAction('download')} accessibilityLabel="Download" accessibilityRole="button">
                  <Download size={16} color="#1E3A8A" />
                  <Text style={styles.modalActionText}>Download</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalActionButton} onPress={() => onAction('share')} accessibilityLabel="Share" accessibilityRole="button">
                  <Share size={16} color="#1E3A8A" />
                  <Text style={styles.modalActionText}>Share</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalActionButton} onPress={() => onAction('message')} accessibilityLabel="Message provider" accessibilityRole="button">
                  <MessageCircle size={16} color="#1E3A8A" />
                  <Text style={styles.modalActionText}>Message</Text>
                </TouchableOpacity>
              </>
            )}
            {type === 'history' && (
              <TouchableOpacity style={styles.modalActionButton} onPress={() => onAction('correct')} accessibilityLabel="Request correction" accessibilityRole="button">
                <MessageCircle size={16} color="#1E3A8A" />
                <Text style={styles.modalActionText}>Request Correction</Text>
              </TouchableOpacity>
            )}
            {type === 'checkup' && (
              <TouchableOpacity style={styles.modalActionButton} onPress={() => onAction('schedule')} accessibilityLabel="Schedule" accessibilityRole="button">
                <Calendar size={16} color="#1E3A8A" />
                <Text style={styles.modalActionText}>Schedule</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Animated.View>
    </View>
  </Modal>
);

// Reusable Card Components
const PatientHistoryCard = ({
  history,
  onViewDetails,
  onRequestCorrection,
}: {
  history: PatientHistory;
  onViewDetails: () => void;
  onRequestCorrection: () => void;
}) => {
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'condition': return <Heart size={20} color="#1E3A8A" />;
      case 'allergy': return <AlertTriangle size={20} color="#ef4444" />;
      case 'surgery': return <Activity size={20} color="#1E3A8A" />;
      case 'medication': return <Pill size={20} color="#059669" />;
      default: return <FileText size={20} color="#1E3A8A" />;
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardInfo}>
          {getCategoryIcon(history.category)}
          <View style={styles.cardDetails}>
            <Text style={styles.cardTitle}>{history.title}</Text>
            <Text style={styles.cardMeta}>{history.date || history.status.charAt(0).toUpperCase() + history.status.slice(1)}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, styles[`${history.status}Badge`]]}>
          <Text style={styles.statusText}>{history.status.charAt(0).toUpperCase() + history.status.slice(1)}</Text>
        </View>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.actionButton} onPress={onViewDetails} accessibilityLabel={`View ${history.title} details`} accessibilityRole="button">
          <Eye size={16} color="#1E3A8A" />
          <Text style={styles.actionButtonText}>Details</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={onRequestCorrection} accessibilityLabel={`Request correction for ${history.title}`} accessibilityRole="button">
          <MessageCircle size={16} color="#1E3A8A" />
          <Text style={styles.actionButtonText}>Correct</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const CheckupCard = ({
  checkup,
  onSchedule,
  onViewDetails,
}: {
  checkup: Checkup;
  onSchedule: () => void;
  onViewDetails: () => void;
}) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled': return <CheckCircle size={20} color="#059669" />;
      case 'recommended': return <Clock size={20} color="#1E3A8A" />;
      case 'overdue': return <AlertCircle size={20} color="#ef4444" />;
      default: return <Calendar size={20} color="#1E3A8A" />;
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardInfo}>
          {getStatusIcon(checkup.status)}
          <View style={styles.cardDetails}>
            <Text style={styles.cardTitle}>{checkup.type}</Text>
            <Text style={styles.cardMeta}>{checkup.recommendedDate} • {checkup.priority.charAt(0).toUpperCase() + checkup.priority.slice(1)}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, styles[`${checkup.status}Status`]]}>
          <Text style={styles.statusText}>{checkup.status.charAt(0).toUpperCase() + checkup.status.slice(1)}</Text>
        </View>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.actionButtonPrimary} onPress={onSchedule} accessibilityLabel={`Schedule ${checkup.type}`} accessibilityRole="button">
          <Calendar size={16} color="#ffffff" />
          <Text style={styles.actionButtonPrimaryText}>Schedule</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={onViewDetails} accessibilityLabel={`View ${checkup.type} details`} accessibilityRole="button">
          <Eye size={16} color="#1E3A8A" />
          <Text style={styles.actionButtonText}>Details</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const ReportCard = ({
  report,
  onView,
  onDownload,
  onShare,
  onMessage,
}: {
  report: Report;
  onView: () => void;
  onDownload: () => void;
  onShare: () => void;
  onMessage: () => void;
}) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <View style={styles.cardInfo}>
        <FileText size={20} color="#1E3A8A" />
        <View style={styles.cardDetails}>
          <Text style={styles.cardTitle}>{report.title}</Text>
          <Text style={styles.cardMeta}>{report.provider} • {report.date}</Text>
        </View>
      </View>
      <View style={[styles.statusBadge, getStatusBadgeStyle(report.status)]}>
        <Text style={styles.statusText}>{report.status}</Text>
      </View>
    </View>
    <View style={styles.cardActions}>
      <TouchableOpacity style={styles.actionButtonPrimary} onPress={onView} accessibilityLabel={`View ${report.title}`} accessibilityRole="button">
        <Eye size={16} color="#ffffff" />
        <Text style={styles.actionButtonPrimaryText}>View</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.actionButton} onPress={onDownload} accessibilityLabel={`Download ${report.title}`} accessibilityRole="button">
        <Download size={16} color="#1E3A8A" />
        <Text style={styles.actionButtonText}>Download</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.actionButton} onPress={onShare} accessibilityLabel={`Share ${report.title}`} accessibilityRole="button">
        <Share size={16} color="#1E3A8A" />
        <Text style={styles.actionButtonText}>Share</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.actionButton} onPress={onMessage} accessibilityLabel={`Message about ${report.title}`} accessibilityRole="button">
        <MessageCircle size={16} color="#1E3A8A" />
        <Text style={styles.actionButtonText}>Message</Text>
      </TouchableOpacity>
    </View>
  </View>
);

export default function RecordsScreen() {
  const [currentTab, setCurrentTab] = useState('records');
  const [currentSection, setCurrentSection] = useState<'history' | 'checkups' | 'reports'>('history');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilters, setSelectedFilters] = useState({ history: 'all', checkups: 'all', reports: 'all' });
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [modalData, setModalData] = useState<{ data: Report | PatientHistory | Checkup | null; type: 'report' | 'history' | 'checkup' }>({ data: null, type: 'report' });
  const [modalVisible, setModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prefEmail, setPrefEmail] = useState(true);
  const [prefSms, setPrefSms] = useState(false);
  const [prefPush, setPrefPush] = useState(true);
  const [reports, setReports] = useState<Report[]>([]);
  const [patientHistory, setPatientHistory] = useState<PatientHistory[]>([]);
  const [checkups, setCheckups] = useState<Checkup[]>([]);
  const router = useRouter();
  const pathname = usePathname();
  const activeTab = React.useMemo(() => {
    if (!pathname) return 'records';
    if (pathname === '/(tabs)') return 'index';
    if (pathname.startsWith('/(tabs)/records')) return 'records';
    if (pathname.startsWith('/(tabs)/appointments')) return 'appointments';
    // messages removed
    if (pathname.startsWith('/(tabs)/profile')) return 'profile';
    if (pathname.startsWith('/(tabs)/chatbot')) return 'chatbot';
    return 'records';
  }, [pathname]);

  // Sample data
  const initialReports: Report[] = [
    { id: 1, type: 'lab', date: '2025-01-15', provider: 'Dr. Mohamed Ahmed', title: 'Complete Blood Count', status: 'New', url: 'https://example.com/reports/1', summary: 'All values within normal range' },
    { id: 2, type: 'imaging', date: '2025-01-10', provider: 'Dr. Sarah Johnson', title: 'Chest X-Ray', status: 'Reviewed', url: 'https://example.com/reports/2', summary: 'No abnormalities detected' },
    // ... other reports
  ];

  const initialHistory: PatientHistory[] = [
    { id: 1, category: 'condition', title: 'Type 2 Diabetes', description: 'Diagnosed in 2020, well-controlled with medication', date: '2020-03-15', severity: 'moderate', status: 'active', provider: 'Dr. Mohamed Ahmed' },
    { id: 2, category: 'allergy', title: 'Penicillin Allergy', description: 'Severe allergic reaction to penicillin antibiotics', severity: 'severe', status: 'active', provider: 'Dr. Sarah Johnson' },
    // ... other history
  ];

  const initialCheckups: Checkup[] = [
    { id: 1, type: 'Annual Physical', description: 'Comprehensive health examination and screening', recommendedDate: '2025-03-15', frequency: 'Every 12 months', status: 'recommended', priority: 'medium', provider: 'Dr. Mohamed Ahmed' },
    { id: 2, type: 'Diabetes Screening', description: 'HbA1c test and diabetes management review', recommendedDate: '2025-02-01', frequency: 'Every 3 months', status: 'overdue', priority: 'high', provider: 'Dr. Mohamed Ahmed' },
    // ... other checkups
  ];

  // Data fetching
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Simulate API calls
        await new Promise(resolve => setTimeout(resolve, 1000));
        setReports(initialReports);
        setPatientHistory(initialHistory);
        setCheckups(initialCheckups);
      } catch (e) {
        setError('Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Handlers
  const handleTabChange = useCallback((tab: string) => {
    setCurrentTab(tab);
    if (tab !== 'records') {
      switch (tab) {
        case 'index':
          router.push('/(tabs)');
          break;
        case 'appointments':
          router.push('/(tabs)/appointments');
          break;
        // messages removed
        case 'profile':
          router.push('/(tabs)/profile');
          break;
        case 'chatbot':
          router.push('/(tabs)/chatbot');
          break;
        default:
          break;
      }
    }
  }, [router]);

  const handleModalAction = useCallback(async (action: 'download' | 'share' | 'message' | 'schedule' | 'correct') => {
    if (!modalData.data) return;
    switch (action) {
      case 'download':
        if (modalData.type === 'report') {
          try {
            await Linking.openURL((modalData.data as Report).url);
          } catch (e) {
            Alert.alert('Error', 'Unable to download report');
          }
        }
        break;
      case 'share':
        if (modalData.type === 'report') {
          try {
            await Linking.openURL(`mailto:?subject=${(modalData.data as Report).title}&body=Please find attached: ${(modalData.data as Report).url}`);
          } catch (e) {
            Alert.alert('Error', 'Unable to share report');
          }
        }
        break;
      case 'message':
      case 'correct':
        // messages removed
        break;
      case 'schedule':
        router.push('/(tabs)/appointments');
        break;
    }
    setModalVisible(false);
  }, [modalData, router]);

  const sendNotifications = useCallback(() => {
    const channels = [prefEmail && 'Email', prefSms && 'SMS', prefPush && 'App'].filter(Boolean);
    if (channels.length) {
      Alert.alert('Success', `Notifications sent via: ${channels.join(', ')}`);
    }
  }, [prefEmail, prefSms, prefPush]);

  // Memoized filtered data
  const filteredData = useMemo(() => ({
    history: patientHistory.filter(h => 
      !searchQuery.trim() || 
      h.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      h.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (h.provider?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
    ).filter(h => selectedFilters.history === 'all' || h.category === selectedFilters.history)
    .sort((a, b) => sortOrder === 'newest' ? (b.date || '').localeCompare(a.date || '') : (a.date || '').localeCompare(b.date || '')),
    
    checkups: checkups.filter(c => 
      !searchQuery.trim() || 
      c.type.toLowerCase().includes(searchQuery.toLowerCase()) || 
      c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.provider?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
    ).filter(c => selectedFilters.checkups === 'all' || c.status === selectedFilters.checkups)
    .sort((a, b) => sortOrder === 'newest' ? b.recommendedDate.localeCompare(a.recommendedDate) : a.recommendedDate.localeCompare(b.recommendedDate)),
    
    reports: reports.filter(r => 
      !searchQuery.trim() || 
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      r.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.type.toLowerCase().includes(searchQuery.toLowerCase())
    ).filter(r => selectedFilters.reports === 'all' || r.type === selectedFilters.reports)
    .sort((a, b) => sortOrder === 'newest' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)),
  }), [patientHistory, checkups, reports, searchQuery, selectedFilters, sortOrder]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
        <View style={styles.header}>
            <View style={styles.profileSection}>
                <User size={24} color="#1E3A8A" />
              <Text style={styles.welcomeText}>Hello Farida</Text>
            </View>
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
        <TouchableOpacity style={styles.settingsButton} accessibilityLabel="Settings" accessibilityRole="button">
          <Settings size={20} color="#1E3A8A" />
            </TouchableOpacity>
      </View>

      {/* Sticky Search and Filters */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search records, history, or check-ups"
          value={searchQuery}
          onChangeText={setSearchQuery}
          accessibilityLabel="Search medical records"
          returnKeyType="search"
          blurOnSubmit
        />
        <View style={styles.sectionTabs}>
          {['history', 'checkups', 'reports'].map(section => (
            <TouchableOpacity 
              key={section}
              style={[styles.sectionTab, currentSection === section && styles.activeSectionTab]}
              onPress={() => setCurrentSection(section as any)}
              accessibilityLabel={`View ${section} section`}
              accessibilityRole="tab"
            >
              <Text style={[styles.sectionTabText, currentSection === section && styles.activeSectionTabText]}>
                {section.charAt(0).toUpperCase() + section.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.filtersRow}>
          {currentSection === 'history' && (
            <View style={styles.filterChips}>
              {['all', 'condition', 'allergy', 'surgery', 'medication'].map(filter => (
                <TouchableOpacity
                  key={filter}
                  style={[styles.filterChip, selectedFilters.history === filter && styles.filterChipActive]}
                  onPress={() => setSelectedFilters(prev => ({ ...prev, history: filter }))}
                  accessibilityLabel={`Filter history by ${filter}`}
                >
                  <Text style={[styles.filterChipText, selectedFilters.history === filter && styles.filterChipTextActive]}>
                    {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {currentSection === 'checkups' && (
            <View style={styles.filterChips}>
              {['all', 'scheduled', 'recommended', 'overdue'].map(filter => (
                <TouchableOpacity
                  key={filter}
                  style={[styles.filterChip, selectedFilters.checkups === filter && styles.filterChipActive]}
                  onPress={() => setSelectedFilters(prev => ({ ...prev, checkups: filter }))}
                  accessibilityLabel={`Filter checkups by ${filter}`}
                >
                  <Text style={[styles.filterChipText, selectedFilters.checkups === filter && styles.filterChipTextActive]}>
                    {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {currentSection === 'reports' && (
            <View style={styles.filterChips}>
              {['all', 'lab', 'imaging', 'summary', 'prescription'].map(filter => (
                <TouchableOpacity
                  key={filter}
                  style={[styles.filterChip, selectedFilters.reports === filter && styles.filterChipActive]}
                  onPress={() => setSelectedFilters(prev => ({ ...prev, reports: filter }))}
                  accessibilityLabel={`Filter reports by ${filter}`}
                >
                  <Text style={[styles.filterChipText, selectedFilters.reports === filter && styles.filterChipTextActive]}>
                    {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
        <View style={styles.sortRow}>
          <Text style={styles.sortLabel}>Sort:</Text>
          <TouchableOpacity
            style={[styles.sortButton, sortOrder === 'newest' && styles.sortButtonActive]}
            onPress={() => setSortOrder('newest')}
            accessibilityLabel="Sort by newest"
          >
            <Text style={[styles.sortButtonText, sortOrder === 'newest' && styles.sortButtonTextActive]}>Newest</Text>
          </TouchableOpacity>
            <TouchableOpacity 
            style={[styles.sortButton, sortOrder === 'oldest' && styles.sortButtonActive]}
            onPress={() => setSortOrder('oldest')}
            accessibilityLabel="Sort by oldest"
          >
            <Text style={[styles.sortButtonText, sortOrder === 'oldest' && styles.sortButtonTextActive]}>Oldest</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.communicationPrefs}>
          <Text style={styles.prefsLabel}>Notify via:</Text>
          <View style={styles.prefsRow}>
            <TouchableOpacity style={[styles.prefChip, prefEmail && styles.prefChipActive]} onPress={() => setPrefEmail(!prefEmail)} accessibilityLabel="Toggle email notifications">
              <Text style={[styles.prefChipText, prefEmail && styles.prefChipTextActive]}>Email</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.prefChip, prefSms && styles.prefChipActive]} onPress={() => setPrefSms(!prefSms)} accessibilityLabel="Toggle SMS notifications">
              <Text style={[styles.prefChipText, prefSms && styles.prefChipTextActive]}>SMS</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.prefChip, prefPush && styles.prefChipActive]} onPress={() => setPrefPush(!prefPush)} accessibilityLabel="Toggle app notifications">
              <Text style={[styles.prefChipText, prefPush && styles.prefChipTextActive]}>App</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Content */}
      <View style={styles.contentContainer}>
        {currentSection === 'history' && filteredData.history.map((item) => (
          <PatientHistoryCard
            key={item.id}
            history={item}
            onViewDetails={() => {
              setModalData({ data: item, type: 'history' });
              setModalVisible(true);
            }}
            onRequestCorrection={() => handleModalAction('correct')}
          />
        ))}
        
        {currentSection === 'checkups' && filteredData.checkups.map((item) => (
          <CheckupCard
            key={item.id}
            checkup={item}
            onSchedule={() => handleModalAction('schedule')}
            onViewDetails={() => {
              setModalData({ data: item, type: 'checkup' });
              setModalVisible(true);
            }}
          />
        ))}
        
        {currentSection === 'reports' && filteredData.reports.map((item) => (
          <ReportCard
            key={item.id}
            report={item}
            onView={() => {
              setModalData({ data: item, type: 'report' });
              setModalVisible(true);
            }}
            onDownload={() => handleModalAction('download')}
            onShare={() => handleModalAction('share')}
            onMessage={() => handleModalAction('message')}
          />
        ))}
                  </View>

      {/* Empty States */}
      {isLoading && (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color="#1E3A8A" />
          <Text style={styles.emptyStateText}>Loading...</Text>
                </View>
      )}
      
      {error && (
        <View style={styles.emptyState}>
          <AlertCircle size={48} color="#ef4444" />
          <Text style={styles.emptyStateText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => setError(null)} accessibilityLabel="Retry loading data">
            <Text style={styles.retryButtonText}>Retry</Text>
                  </TouchableOpacity>
        </View>
      )}
      
      {!isLoading && !error && (
        (currentSection === 'history' && filteredData.history.length === 0) ||
        (currentSection === 'checkups' && filteredData.checkups.length === 0) ||
        (currentSection === 'reports' && filteredData.reports.length === 0)
      ) && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            {currentSection === 'history' ? 'No history records available.' :
             currentSection === 'checkups' ? 'No check-ups recommended.' :
             'No reports available.'}
          </Text>
          <TouchableOpacity style={styles.contactButton} onPress={() => router.push('/(tabs)/messages')} accessibilityLabel="Contact provider">
            <MessageCircle size={16} color="#ffffff" />
            <Text style={styles.contactButtonText}>Contact Provider</Text>
                  </TouchableOpacity>
                </View>
      )}

      {/* Generic Details Modal */}
      <DetailsModal
        visible={modalVisible}
        title={
          modalData.data && 'title' in modalData.data ? modalData.data.title :
          modalData.data && 'type' in modalData.data ? modalData.data.type :
          ''
        }
        data={modalData.data}
        type={modalData.type}
        onClose={() => setModalVisible(false)}
        onAction={handleModalAction}
      />
      </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  welcomeText: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: '#1E3A8A',
  },
  navTabs: {
    display: 'none',
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
  settingsButton: {
    padding: 8,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
  },
  searchContainer: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: '#374151',
    marginBottom: 12,
  },
  sectionTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  sectionTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
  },
  activeSectionTab: {
    backgroundColor: '#1E3A8A',
  },
  sectionTabText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#1E3A8A',
  },
  activeSectionTabText: {
    color: '#ffffff',
  },
  filtersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
  },
  filterChipActive: {
    backgroundColor: '#1E3A8A',
  },
  filterChipText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: '#6b7280',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sortLabel: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#374151',
  },
  sortButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
  },
  sortButtonActive: {
    backgroundColor: '#1E3A8A',
  },
  sortButtonText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: '#6b7280',
  },
  sortButtonTextActive: {
    color: '#ffffff',
  },
  communicationPrefs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  prefsLabel: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: '#6b7280',
  },
  prefsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  prefChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
  },
  prefChipActive: {
    backgroundColor: '#1E3A8A',
  },
  prefChipText: {
    fontSize: 10,
    fontFamily: 'Inter_500Medium',
    color: '#6b7280',
  },
  prefChipTextActive: {
    color: '#ffffff',
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    flex: 1,
  },
  cardDetails: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#1E3A8A',
  },
  cardMeta: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: '#6b7280',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  newBadge: { backgroundColor: '#fef3c7' },
  reviewedBadge: { backgroundColor: '#d1fae5' },
  pendingBadge: { backgroundColor: '#e0e7ff' },
  activeBadge: { backgroundColor: '#e0e7ff' },
  resolvedBadge: { backgroundColor: '#d1fae5' },
  ongoingBadge: { backgroundColor: '#fef3c7' },
  scheduledStatus: { backgroundColor: '#d1fae5' },
  recommendedStatus: { backgroundColor: '#e0e7ff' },
  overdueStatus: { backgroundColor: '#fee2e2' },
  statusText: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: '#1E3A8A',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    gap: 6,
  },
  actionButtonPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#1E3A8A',
    gap: 6,
  },
  actionButtonText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#1E3A8A',
  },
  actionButtonPrimaryText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#ffffff',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#1E3A8A',
  },
  retryButtonText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#ffffff',
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#1E3A8A',
    gap: 8,
  },
  contactButtonText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#ffffff',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: '#1E3A8A',
    flex: 1,
  },
  modalBody: {
    gap: 16,
  },
  modalDetails: {
    gap: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#374151',
  },
  detailValue: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#6b7280',
    marginBottom: 8,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  modalActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    gap: 6,
  },
  modalActionText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#1E3A8A',
  },
});
