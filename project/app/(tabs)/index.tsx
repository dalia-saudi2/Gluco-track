import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Dimensions, Animated, ScrollView, FlatList, Alert, TextInput, Modal, ActivityIndicator, Share, Linking, AccessibilityInfo, findNodeHandle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, Bell, Droplets, FileText, ChevronRight, Activity as ActivityIcon, User, MapPin, Clock, CheckCircle, Circle, Pill, RefreshCw, Clipboard, FileText as ReportIcon, Settings, Bot, Search, Filter, ChevronDown, ChevronUp, AlertTriangle, Star, Heart, Share2, Download, Eye, X, Languages, MessageSquare } from 'lucide-react-native';
import { useRouter, usePathname } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Svg, { Circle as SvgCircle, G } from 'react-native-svg';
import { apiClient } from '../../config/api';

const { width, height } = Dimensions.get('window');

// Enhanced interfaces for better type safety
interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  isOverdue: boolean;
  nextDose: string;
  critical: boolean;
  category: 'prescription' | 'supplement' | 'vitamin';
}

interface TestResult {
  id: string;
  type: string;
  date: string;
  value: string;
  status: 'Normal' | 'Abnormal' | 'Critical' | 'Pending';
  isAbnormal: boolean;
  critical: boolean;
  unit: string;
  referenceRange: string;
}

interface Reminder {
  id: string;
  text: string;
  time: string;
  type: 'medication' | 'appointment' | 'test' | 'general';
  priority: 'low' | 'medium' | 'high' | 'critical';
  completed: boolean;
}

interface Report {
  id: string;
  type: string;
  date: string;
  status: 'new' | 'reviewed' | 'pending';
  critical: boolean;
  url: string;
}

const mockData = {
  patientName: 'Farida',
  healthMetrics: {
    bloodType: 'O+',
    bmi: '36',
    visits: '29',
  },
  currentMedications: [
    { id: '1', name: 'Paracetamol', dosage: '2 pill(s) Daily', frequency: 'Every 8 hours', isOverdue: false, nextDose: '2:00 PM', critical: false, category: 'prescription' as const },
    { id: '2', name: 'Metformin', dosage: '2 pill(s) Daily', frequency: 'Twice daily', isOverdue: true, nextDose: 'Overdue by 2 hours', critical: true, category: 'prescription' as const },
    { id: '3', name: 'Amoxicillin', dosage: '2 pill(s) Daily', frequency: 'Every 12 hours', isOverdue: false, nextDose: '6:00 PM', critical: false, category: 'prescription' as const },
    { id: '4', name: 'Aspirin', dosage: '1 pill(s) Daily', frequency: 'Once daily', isOverdue: false, nextDose: '8:00 AM', critical: false, category: 'prescription' as const },
    { id: '5', name: 'Vitamin D', dosage: '1 pill(s) Daily', frequency: 'Once daily', isOverdue: false, nextDose: '9:00 AM', critical: false, category: 'vitamin' as const },
    { id: '6', name: 'Calcium', dosage: '2 pill(s) Daily', frequency: 'Twice daily', isOverdue: false, nextDose: '7:00 PM', critical: false, category: 'supplement' as const },
    { id: '7', name: 'Iron Supplement', dosage: '1 pill(s) Daily', frequency: 'Once daily', isOverdue: true, nextDose: 'Overdue by 1 hour', critical: true, category: 'supplement' as const },
    { id: '8', name: 'Omega-3', dosage: '2 pill(s) Daily', frequency: 'Twice daily', isOverdue: false, nextDose: '12:00 PM', critical: false, category: 'supplement' as const },
  ],
  treatmentProgress: {
    completed: 2,
    total: 6,
    percentage: 33, // 2/6 * 100 = 33%
  },
  testResults: [
    { id: '1', type: 'CBC (Blood)', date: '12 Jan 2025', value: '13.2', status: 'Normal' as const, isAbnormal: false, critical: false, unit: 'g/dL', referenceRange: '12.0-15.5' },
    { id: '2', type: 'Pathology Reports', date: '12 Jan 2025', value: 'Negative', status: 'Normal' as const, isAbnormal: false, critical: false, unit: '', referenceRange: 'Negative' },
    { id: '3', type: 'Lipid Panel', date: '10 Jan 2025', value: '180', status: 'Normal' as const, isAbnormal: false, critical: false, unit: 'mg/dL', referenceRange: '<200' },
    { id: '4', type: 'Thyroid Function', date: '08 Jan 2025', value: '2.5', status: 'Normal' as const, isAbnormal: false, critical: false, unit: 'mIU/L', referenceRange: '0.4-4.0' },
    { id: '5', type: 'Liver Function', date: '05 Jan 2025', value: '45', status: 'Abnormal' as const, isAbnormal: true, critical: true, unit: 'U/L', referenceRange: '<40' },
    { id: '6', type: 'Kidney Function', date: '03 Jan 2025', value: '1.2', status: 'Normal' as const, isAbnormal: false, critical: false, unit: 'mg/dL', referenceRange: '0.6-1.2' },
  ],
  nextAppointment: {
    date: 'Thursday, 07 September',
    time: '10:30 - 11:00 - 30 mins',
    location: '18 El-maadi Rd',
    doctor: 'Dr Mohamed Ahmed',
  },
  reminders: [
    { id: '1', text: 'Take evening medication', time: '1 hour ago', type: 'medication' as const, priority: 'high' as const, completed: false },
    { id: '2', text: 'Hydration reminder', time: '2 hours ago', type: 'general' as const, priority: 'medium' as const, completed: false },
    { id: '3', text: 'Exercise routine reminder', time: '3 hours ago', type: 'general' as const, priority: 'medium' as const, completed: true },
    { id: '4', text: 'Blood pressure check', time: '4 hours ago', type: 'test' as const, priority: 'high' as const, completed: false },
    { id: '5', text: 'Doctor appointment tomorrow', time: '5 hours ago', type: 'appointment' as const, priority: 'critical' as const, completed: false },
    { id: '6', text: 'Lab results available', time: '6 hours ago', type: 'test' as const, priority: 'high' as const, completed: false },
    { id: '7', text: 'Prescription refill needed', time: '7 hours ago', type: 'medication' as const, priority: 'critical' as const, completed: false },
    { id: '8', text: 'Follow-up appointment', time: '8 hours ago', type: 'appointment' as const, priority: 'medium' as const, completed: false },
  ],
  prescription: [
    { time: '7:30 (Before Breakfast)', medication: 'Cisplatin', completed: true },
    { time: '8:30 (After Breakfast)', medication: 'Doxorubicin', completed: true },
    { time: '12:30 (After Lunch)', medication: 'Paclitaxel', completed: false },
    { time: '12:30 (Before Dinner)', medication: 'Cyclophosphamide', completed: false },
    { time: '18:00 (Evening)', medication: 'Metformin', completed: true },
    { time: '20:00 (Before Bed)', medication: 'Vitamin D', completed: false },
    { time: '22:00 (Night)', medication: 'Calcium', completed: false },
    { time: '23:00 (Late Night)', medication: 'Iron Supplement', completed: false },
  ],
  reports: [
    { id: '1', type: 'Blood Report', date: '15 Aug', status: 'reviewed' as const, critical: false, url: 'https://example.com/report1.pdf' },
    { id: '2', type: 'Diabetes Report', date: '15 Aug', status: 'new' as const, critical: true, url: 'https://example.com/report2.pdf' },
    { id: '3', type: 'Blood Report', date: '20 Aug', status: 'reviewed' as const, critical: false, url: 'https://example.com/report3.pdf' },
    { id: '4', type: 'Diabetes Report', date: '20 Aug', status: 'pending' as const, critical: false, url: 'https://example.com/report4.pdf' },
    { id: '5', type: 'Blood Report', date: '30 Aug', status: 'reviewed' as const, critical: false, url: 'https://example.com/report5.pdf' },
    { id: '6', type: 'X-Ray Report', date: '05 Sep', status: 'new' as const, critical: false, url: 'https://example.com/report6.pdf' },
    { id: '7', type: 'MRI Scan', date: '10 Sep', status: 'reviewed' as const, critical: true, url: 'https://example.com/report7.pdf' },
    { id: '8', type: 'CT Scan', date: '15 Sep', status: 'pending' as const, critical: false, url: 'https://example.com/report8.pdf' },
    { id: '9', type: 'Ultrasound', date: '20 Sep', status: 'reviewed' as const, critical: false, url: 'https://example.com/report9.pdf' },
    { id: '10', type: 'ECG Report', date: '25 Sep', status: 'new' as const, critical: false, url: 'https://example.com/report10.pdf' },
  ],
};

// Reusable Components
const MaskedText = ({ value, label }: { value: string; label?: string }) => {
  const [revealed, setRevealed] = useState(false);
  return (
    <TouchableOpacity
      accessibilityLabel={`${label || 'Sensitive value'} ${revealed ? 'visible' : 'hidden'}`}
      accessibilityRole="button"
      onPress={() => {
        setRevealed(v => !v);
        Haptics.selectionAsync();
      }}
      style={{ alignSelf: 'flex-start' }}
    >
      <Text style={{ fontFamily: 'Inter_500Medium', color: revealed ? '#1E3A8A' : '#6b7280' }}>
        {revealed ? value : '••••'}
      </Text>
    </TouchableOpacity>
  );
};

const MedicationCard = ({ medication, onAction }: { medication: Medication; onAction: (med: Medication, action: 'view' | 'share' | 'message') => void }) => (
  <Animated.View style={[styles.enhancedMedicationCard, medication.critical && styles.criticalCard]}>
    <View style={styles.medicationHeader}>
      <View style={styles.medicationInfo}>
        <Text style={[styles.enhancedMedicationName, medication.critical && styles.criticalText]}>{medication.name}</Text>
        <Text style={styles.enhancedMedicationDosage}>{medication.dosage}</Text>
        <Text style={[styles.medicationNextDose, medication.isOverdue && styles.overdueText]}>
          {medication.isOverdue ? '⚠️ ' : '⏰ '}{medication.nextDose}
        </Text>
      </View>
      {medication.critical && (
        <View style={styles.criticalBadge}>
          <AlertTriangle size={16} color="#ffffff" />
        </View>
      )}
    </View>
    <View style={styles.enhancedMedicationActions}>
      <TouchableOpacity 
        style={styles.enhancedActionButton} 
        onPress={() => onAction(medication, 'view')}
        accessibilityLabel={`View details for ${medication.name}`}
        accessibilityRole="button"
      >
        <Eye size={16} color="#1E3A8A" />
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.enhancedActionButton} 
        onPress={() => onAction(medication, 'share')}
        accessibilityLabel={`Share ${medication.name} information`}
        accessibilityRole="button"
      >
        <Share2 size={16} color="#1E3A8A" />
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.enhancedActionButton} 
        onPress={() => onAction(medication, 'message')}
        accessibilityLabel={`Message doctor about ${medication.name}`}
        accessibilityRole="button"
      >
        <Bot size={16} color="#1E3A8A" />
      </TouchableOpacity>
    </View>
  </Animated.View>
);

const TestResultCard = ({ testResult, onAction }: { testResult: TestResult; onAction: (test: TestResult, action: 'view' | 'share' | 'message') => void }) => (
  <Animated.View style={[styles.testResultCard, testResult.critical && styles.criticalCard]}>
    <View style={styles.testResultHeader}>
      <View style={styles.testResultInfo}>
        <Text style={[styles.testResultType, testResult.critical && styles.criticalText]}>{testResult.type}</Text>
        <Text style={styles.testResultDate}>{testResult.date}</Text>
        <View style={{ gap: 2 }}>
          <MaskedText value={`${testResult.value} ${testResult.unit}`} label="Result value" />
          {testResult.referenceRange ? (
            <Text style={styles.testResultValue}>(Reference: {testResult.referenceRange})</Text>
          ) : null}
        </View>
      </View>
      <View style={[styles.enhancedStatusBadge, testResult.critical ? styles.criticalBadge : styles.normalBadge]}>
        <Text style={[styles.enhancedStatusText, testResult.critical && styles.criticalBadgeText]}>
          {testResult.status}
        </Text>
      </View>
    </View>
    <View style={styles.testResultActions}>
      <TouchableOpacity 
        style={styles.enhancedActionButton} 
        onPress={() => onAction(testResult, 'view')}
        accessibilityLabel={`View details for ${testResult.type}`}
        accessibilityRole="button"
      >
        <Eye size={16} color="#1E3A8A" />
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.enhancedActionButton} 
        onPress={() => onAction(testResult, 'share')}
        accessibilityLabel={`Share ${testResult.type} results`}
        accessibilityRole="button"
      >
        <Share2 size={16} color="#1E3A8A" />
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.enhancedActionButton} 
        onPress={() => onAction(testResult, 'message')}
        accessibilityLabel={`Message doctor about ${testResult.type}`}
        accessibilityRole="button"
      >
        <Bot size={16} color="#1E3A8A" />
      </TouchableOpacity>
    </View>
  </Animated.View>
);

const ReportCard = ({ report, onAction }: { report: Report; onAction: (report: Report, action: 'view' | 'share' | 'download') => void }) => (
  <Animated.View style={[styles.enhancedReportCard, report.critical && styles.criticalCard]}>
    <View style={styles.reportHeader}>
      <View style={styles.reportInfo}>
        <Text style={[styles.enhancedReportType, report.critical && styles.criticalText]}>{report.type}</Text>
        <Text style={styles.enhancedReportDate}>{report.date}</Text>
        <Text style={[styles.reportStatus, report.status === 'new' && styles.newStatus]}>
          {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
        </Text>
      </View>
      {report.critical && (
        <View style={styles.criticalBadge}>
          <AlertTriangle size={16} color="#ffffff" />
        </View>
      )}
    </View>
    <View style={styles.reportActions}>
      <TouchableOpacity 
        style={styles.enhancedActionButton} 
        onPress={() => onAction(report, 'view')}
        accessibilityLabel={`View ${report.type} report`}
        accessibilityRole="button"
      >
        <Eye size={16} color="#1E3A8A" />
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.enhancedActionButton} 
        onPress={() => onAction(report, 'share')}
        accessibilityLabel={`Share ${report.type} report`}
        accessibilityRole="button"
      >
        <Share2 size={16} color="#1E3A8A" />
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.enhancedActionButton} 
        onPress={() => {
          Alert.alert(
            'Download report',
            `Do you want to download ${report.type}?`,
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Download', style: 'default', onPress: () => onAction(report, 'download') },
            ]
          );
        }}
        accessibilityLabel={`Download ${report.type} report`}
        accessibilityRole="button"
      >
        <Download size={16} color="#1E3A8A" />
      </TouchableOpacity>
    </View>
  </Animated.View>
);

const translations = {
  en: {
    welcome: 'Good morning,',
    nextAppointment: 'Next Appointment',
    latestLabResult: 'Latest Lab Result',
    vitals: 'Vitals',
    reminders: 'Reminders',
    heartRate: 'Heart Rate',
    steps: 'Steps',
    bloodPressure: 'Blood Pressure',
    temperature: 'Temperature',
    viewDetails: 'View Details',
    search: 'Search medications, tests, reports...',
    criticalAlerts: 'Critical Alerts',
    medications: 'Current Medications',
    testResults: 'Test Results',
    reports: 'Medical Reports',
    feedback: 'Feedback',
    language: 'Language',
  },
  ar: {
    welcome: 'صباح الخير،',
    nextAppointment: 'الموعد القادم',
    latestLabResult: 'نتيجة التحليل الأخيرة',
    vitals: 'المؤشرات الطبية',
    reminders: 'التذكيرات',
    heartRate: 'النبض',
    steps: 'الخطوات',
    bloodPressure: 'ضغط الدم',
    temperature: 'الحرارة',
    viewDetails: 'عرض التفاصيل',
    search: 'البحث في الأدوية والتحاليل والتقارير...',
    criticalAlerts: 'تنبيهات حرجة',
    medications: 'الأدوية الحالية',
    testResults: 'نتائج التحاليل',
    reports: 'التقارير الطبية',
    feedback: 'التعليقات',
    language: 'اللغة',
  },
  fr: {
    welcome: 'Bonjour,',
    nextAppointment: 'Prochain Rendez-vous',
    latestLabResult: 'Résultat du dernier test',
    vitals: 'Indicateurs de santé',
    reminders: 'Rappels',
    heartRate: 'Fréquence cardiaque',
    steps: 'Pas',
    bloodPressure: 'Tension artérielle',
    temperature: 'Température',
    viewDetails: 'Voir les détails',
    search: 'Rechercher des médicaments, tests, rapports...',
    criticalAlerts: 'Alertes critiques',
    medications: 'Médicaments actuels',
    testResults: 'Résultats de tests',
    reports: 'Rapports médicaux',
    feedback: 'Commentaires',
    language: 'Langue',
  },
};

export default function DashboardScreen() {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [progressAnim] = useState(new Animated.Value(0));
  const [currentTab, setCurrentTab] = useState('index');
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [selectedMedication, setSelectedMedication] = useState<Medication | null>(null);
  const [selectedTestResult, setSelectedTestResult] = useState<TestResult | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [prescriptions, setPrescriptions] = useState(mockData.prescription);
  const [modalVisible, setModalVisible] = useState(false);
  const [reminders, setReminders] = useState(mockData.reminders);
  const [modalType, setModalType] = useState<'medication' | 'test' | 'report' | 'feedback'>('medication');
  
  // Real data from backend
  const [realData, setRealData] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const router = useRouter();
  const contentRef = React.useRef<View | null>(null);

  // Function to fetch real data from backend
  const fetchRealData = async () => {
    try {
      setIsLoadingData(true);
      
      // First, login to get token
      const loginResponse = await apiClient.login('test@example.com', 'test123');
      
      // Then fetch dashboard data
      const dashboardData = await apiClient.getDashboard();
      
      setRealData(dashboardData);
      setIsAuthenticated(true);
      console.log('Real data fetched:', dashboardData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      Alert.alert('Error', 'Failed to connect to backend. Using demo data.');
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
    
    // Fetch real data from backend
    fetchRealData();
  }, []);

  // Calculate progress percentage and animate progress bar
  const progressPercentage = useMemo(() => {
    const { completed, total } = mockData.treatmentProgress;
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  }, []);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progressPercentage / 100,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [progressPercentage]);

  // Get progress bar color based on percentage
  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return '#10b981'; // Green
    if (percentage >= 50) return '#f59e0b'; // Yellow
    return '#ef4444'; // Red
  };

  // Calculate SVG circle properties for accurate progress
  const circleProps = useMemo(() => {
    const size = 80;
    const strokeWidth = 6;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (progressPercentage / 100) * circumference;
    
    return {
      size,
      strokeWidth,
      radius,
      circumference,
      strokeDasharray,
      strokeDashoffset,
      center: size / 2,
    };
  }, [progressPercentage]);

  // Memoized filtered data for performance
  const filteredData = useMemo(() => {
    const medications = mockData.currentMedications.filter(med => 
      searchQuery === '' || med.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    const testResults = mockData.testResults.filter(test => 
      searchQuery === '' || test.type.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    const reminders = mockData.reminders.filter(reminder => 
      searchQuery === '' || reminder.text.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    const reports = mockData.reports.filter(report => 
      searchQuery === '' || report.type.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return { medications, testResults, reminders, reports };
  }, [searchQuery]);

  // Critical alerts count
  const criticalAlerts = useMemo(() => {
    const criticalMedications = mockData.currentMedications.filter(med => med.critical || med.isOverdue).length;
    const criticalTests = mockData.testResults.filter(test => test.critical).length;
    const criticalReminders = mockData.reminders.filter(reminder => reminder.priority === 'critical').length;
    const criticalReports = mockData.reports.filter(report => report.critical).length;
    
    return criticalMedications + criticalTests + criticalReminders + criticalReports;
  }, []);

  // Toggle section collapse
  const toggleSection = useCallback((sectionId: string) => {
    setCollapsedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  }, []);

  // Handle medication actions
  const handleMedicationAction = useCallback((medication: Medication, action: 'view' | 'share' | 'message') => {
    setSelectedMedication(medication);
    setModalType('medication');
    setModalVisible(true);
  }, []);

  // Handle test result actions
  const handleTestResultAction = useCallback((testResult: TestResult, action: 'view' | 'share' | 'message') => {
    setSelectedTestResult(testResult);
    setModalType('test');
    setModalVisible(true);
  }, []);

  // Handle report actions
  const handleReportAction = useCallback((report: Report, action: 'view' | 'share' | 'download') => {
    setSelectedReport(report);
    setModalType('report');
    setModalVisible(true);
  }, []);

  // Handle feedback submission
  const handleFeedbackSubmit = useCallback(() => {
    if (feedbackText.trim()) {
      // Simulate API call
      Alert.alert('Thank you!', 'Your feedback has been submitted successfully.');
      setFeedbackText('');
      setModalVisible(false);
    }
  }, [feedbackText]);

  // Refresh data
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
    setLastUpdated(new Date());
    Haptics.selectionAsync();
  }, []);

  const handleTabChange = (tab: string) => {
    if (tab === 'index') return;
      switch (tab) {
        case 'records':
          router.push('/(tabs)/records');
          break;
        case 'appointments':
          router.push('/(tabs)/appointments');
          break;
        case 'profile':
          router.push('/(tabs)/profile');
          break;
      case 'chatbot':
        router.push('/(tabs)/chatbot');
          break;
        default:
          break;
    }
  };

  // Derive active tab from current route to ensure correct highlight
  const pathname = usePathname();
  const activeTab = React.useMemo(() => {
    if (!pathname) return 'index';
    if (pathname === '/(tabs)') return 'index';
    if (pathname.startsWith('/(tabs)/records')) return 'records';
    if (pathname.startsWith('/(tabs)/appointments')) return 'appointments';
    if (pathname.startsWith('/(tabs)/messages')) return 'messages';
    if (pathname.startsWith('/(tabs)/profile')) return 'profile';
    if (pathname.startsWith('/(tabs)/chatbot')) return 'chatbot';
    return 'index';
  }, [pathname]);

  // Basic deep link support via initial URL params or navigation params
  useEffect(() => {
    // Example: navigate to a specific report: app://dashboard?target=report&id=7
    // In a real app you'd use Linking.getInitialURL() and subscribe to URL events.
    // Here we simulate reading query params if provided via router params.
    const params = (router as any)?.params as { target?: string; id?: string } | undefined;
    if (!params) return;
    if (params.target === 'report' && params.id) {
      const rep = mockData.reports.find(r => r.id === params.id);
      if (rep) {
        setModalType('report');
        setSelectedReport(rep);
        setModalVisible(true);
      }
    } else if (params.target === 'test' && params.id) {
      const tst = mockData.testResults.find(t => t.id === params.id);
      if (tst) {
        setModalType('test');
        setSelectedTestResult(tst);
        setModalVisible(true);
      }
    } else if (params.target === 'appointment') {
      // Scroll focus to appointment card
      AccessibilityInfo.announceForAccessibility('Opening next appointment');
    }
  }, [router]);

  const handleSkipToContent = () => {
    if (contentRef.current) {
      const node = findNodeHandle(contentRef.current);
      if (node) {
        AccessibilityInfo.setAccessibilityFocus(node);
        AccessibilityInfo.announceForAccessibility('Skipped to main content');
      }
    }
  };

  const toggleTheme = () => {
    setIsDarkMode(v => !v);
    Haptics.selectionAsync();
  };


  const handleRefillRequest = () => {
    router.push('/(tabs)/medication-refill');
  };

  const handleSeeAllInteractions = () => {
    Alert.alert(
      'Medication Interactions',
      'This feature will show detailed information about potential drug interactions between your current medications.',
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.profileSection}>
              <View style={styles.profileImage}>
                <User size={24} color="#1E3A8A" />
              </View>
              <Text style={styles.welcomeText}>Hello {mockData.patientName}</Text>
            </View>
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
          
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={toggleTheme} accessibilityLabel="Toggle dark mode" style={styles.settingsButton}>
              <Text style={styles.smallBtnText}>{isDarkMode ? 'Light' : 'Dark'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingsButton}>
              <Settings size={20} color="#1E3A8A" />
            </TouchableOpacity>
          </View>
        </View>

        

        {isLoadingData ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1E3A8A" />
            <Text style={styles.loadingText}>Loading your data...</Text>
          </View>
        ) : (
          <View ref={contentRef} style={styles.metricsRow}>
          <Animated.View style={[styles.metricCard, { opacity: fadeAnim }]}>
              <Droplets size={16} color="#3b82f6" />
              <Text style={styles.metricLabel}>Blood Type</Text>
              <Text style={styles.metricValue}>{realData?.user?.blood_type || mockData.healthMetrics.bloodType}</Text>
          </Animated.View>
          
          <Animated.View style={[styles.metricCard, { opacity: fadeAnim }]}>
            <User size={16} color="#10b981" />
              <Text style={styles.metricLabel}>Appointments</Text>
              <Text style={styles.metricValue}>{realData?.upcoming_appointments?.length || 0}</Text>
          </Animated.View>
          
          <Animated.View style={[styles.metricCard, { opacity: fadeAnim }]}>
            <User size={16} color="#8b5cf6" />
              <Text style={styles.metricLabel}>Medications</Text>
              <Text style={styles.metricValue}>{realData?.current_medications?.length || 0}</Text>
          </Animated.View>
        </View>
        )}

        <View style={styles.contentGrid}>
          <View style={styles.threeCardsRow}>
            <Animated.View style={[styles.card, styles.medicationCard, { opacity: fadeAnim }]}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Current Medication ({realData?.current_medications?.length || mockData.currentMedications.length})</Text>
              </View>
              <ScrollView style={styles.cardScrollView} showsVerticalScrollIndicator={true}>
              <View style={styles.medicationList}>
                {(realData?.current_medications || mockData.currentMedications).map((med: any, index: number) => (
                  <View key={index} style={styles.medicationItem}>
                    <Pill size={16} color="#3b82f6" />
                    <Text style={styles.medicationName}>{med.name}</Text>
                    <Text style={styles.medicationDosage}>{med.dosage}</Text>
                    <ChevronRight size={14} color="#64748b" />
                  </View>
                ))}
              </View>
              </ScrollView>
              <View style={styles.medicationActions}>
                <TouchableOpacity style={styles.linkButton} onPress={handleSeeAllInteractions}>
                  <Text style={styles.linkText}>See all interactions</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.refillButton} onPress={handleRefillRequest}>
                  <RefreshCw size={14} color="#ffffff" />
                  <Text style={styles.refillText}>Request Refill</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>

            <Animated.View style={[styles.card, styles.progressCard, { opacity: fadeAnim }]}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Treatment Progress</Text>
              </View>
              <ScrollView style={styles.cardScrollView} showsVerticalScrollIndicator={true}>
              <View style={styles.progressContent}>
                <View style={styles.progressList}>
                  <View style={styles.progressItem}>
                    <CheckCircle size={16} color="#10b981" />
                    <Text style={styles.progressText}>Session 1 completed</Text>
                  </View>
                  <View style={styles.progressItem}>
                    <CheckCircle size={16} color="#10b981" />
                    <Text style={styles.progressText}>Session 2 completed</Text>
                  </View>
                  <View style={styles.progressItem}>
                    <Circle size={16} color="#d1d5db" />
                    <Text style={styles.progressText}>Session 3 - Next: Thu 10:00</Text>
                  </View>
                  <View style={styles.progressItem}>
                    <Circle size={16} color="#d1d5db" />
                    <Text style={styles.progressText}>Session 4 - Scheduled</Text>
                  </View>
                  <View style={styles.progressItem}>
                    <Circle size={16} color="#d1d5db" />
                    <Text style={styles.progressText}>Session 5 - Scheduled</Text>
                </View>
                  <View style={styles.progressItem}>
                    <Circle size={16} color="#d1d5db" />
                    <Text style={styles.progressText}>Session 6 - Scheduled</Text>
                  </View>
                </View>
                
                 {/* Circular Progress Bar */}
                 <View style={styles.circularProgressContainer}>
                   <Svg width={circleProps.size} height={circleProps.size} style={styles.circularProgressSvg}>
                     {/* Background circle */}
                     <SvgCircle
                       cx={circleProps.center}
                       cy={circleProps.center}
                       r={circleProps.radius}
                       stroke="#e5e7eb"
                       strokeWidth={circleProps.strokeWidth}
                       fill="transparent"
                     />
                     {/* Progress circle */}
                     <SvgCircle
                       cx={circleProps.center}
                       cy={circleProps.center}
                       r={circleProps.radius}
                       stroke={getProgressColor(progressPercentage)}
                       strokeWidth={circleProps.strokeWidth}
                       fill="transparent"
                       strokeDasharray={circleProps.strokeDasharray}
                       strokeDashoffset={circleProps.strokeDashoffset}
                       strokeLinecap="round"
                       transform={`rotate(-90 ${circleProps.center} ${circleProps.center})`}
                     />
                   </Svg>
                   <View style={styles.circularProgressInner}>
                     <Text style={styles.circularProgressText}>{progressPercentage}%</Text>
                     <Text style={styles.circularProgressLabel}>Complete</Text>
                  </View>
                </View>
              </View>
              </ScrollView>
            </Animated.View>

            <Animated.View style={[styles.card, styles.testCard, { opacity: fadeAnim }]}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Latest Test Results</Text>
              </View>
              <ScrollView style={styles.cardScrollView} showsVerticalScrollIndicator={true}>
                <View style={styles.testList}>
                  {mockData.testResults.map((test, index) => (
                    <View key={index} style={styles.testItem}>
                      <View style={styles.testInfo}>
                        <Text style={styles.testType}>{test.type}</Text>
                        <Text style={styles.testDate}>{test.date}</Text>
                      </View>
                      <View style={styles.testResult}>
                        {test.value && <Text style={styles.testValue}>{test.value}</Text>}
                        <View style={styles.statusBadge}>
                          <Text style={styles.statusText}>{test.status}</Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              </ScrollView>
              <TouchableOpacity style={styles.viewDetailsButton}>
                <Text style={styles.viewDetailsText}>View details</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>

          <View style={styles.fourCardsRow}>
            <Animated.View style={[styles.card, styles.appointmentCard, { opacity: fadeAnim }]}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Next appointment</Text>
              </View>
              <ScrollView style={styles.cardScrollView} showsVerticalScrollIndicator={true}>
                <View style={styles.appointmentContent}>
                  {realData?.upcoming_appointments?.[0] ? (
                    <>
                      <Text style={styles.appointmentDate}>
                        {new Date(realData.upcoming_appointments[0].appointment_date).toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </Text>
                  <View style={styles.appointmentTime}>
                    <Clock size={14} color="#64748b" />
                        <Text style={styles.appointmentTimeText}>
                          {new Date(realData.upcoming_appointments[0].appointment_date).toLocaleTimeString('en-US', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })} - {realData.upcoming_appointments[0].duration} mins
                        </Text>
                  </View>
                  <View style={styles.appointmentLocation}>
                    <MapPin size={14} color="#64748b" />
                        <MaskedText value={realData.upcoming_appointments[0].location} label="Appointment location" />
                  </View>
                  <View style={styles.doctorInfo}>
                    <View style={styles.doctorAvatar}>
                      <User size={16} color="#1E3A8A" />
                    </View>
                        <Text style={styles.doctorName}>{realData.upcoming_appointments[0].doctor_name}</Text>
                  </View>
                  <TouchableOpacity style={styles.manageButton}>
                    <Text style={styles.manageButtonText}>Manage Appointment</Text>
                  </TouchableOpacity>
                    </>
                  ) : (
                    <Text style={styles.noDataText}>No upcoming appointments</Text>
                  )}
                </View>
              </ScrollView>
            </Animated.View>

            <Animated.View style={[styles.card, styles.remindersCard, { opacity: fadeAnim }]}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <Bell size={16} color="#8b5cf6" />
                  <Text style={styles.cardTitle}>Reminders</Text>
                </View>
                <TouchableOpacity style={styles.viewAllButton}>
                  <Text style={styles.viewAllText}>View All</Text>
                  <ChevronRight size={12} color="#8b5cf6" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.cardScrollView} showsVerticalScrollIndicator={true}>
              <View style={styles.remindersList}>
                 {reminders.map((reminder, index) => (
                   <View key={`${reminder.id}-${index}`} style={styles.reminderItem}>
                    <Text style={styles.reminderText}>{reminder.text}</Text>
                    <View style={styles.reminderRight}>
                      <Text style={styles.reminderTime}>{reminder.time}</Text>
                       <TouchableOpacity
                         style={styles.doneButton}
                         accessibilityLabel={`Mark reminder '${reminder.text}' as ${reminder.completed ? 'not done' : 'done'}`}
                         accessibilityRole="button"
                         onPress={() => {
                           Haptics.selectionAsync();
                           setReminders(prev => prev.map((r, i) => i === index ? { ...r, completed: !r.completed } : r));
                         }}
                       >
                        <Text style={styles.doneButtonText}>Done</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
              </ScrollView>
            </Animated.View>

            <Animated.View style={[styles.card, styles.prescriptionCard, { opacity: fadeAnim }]}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <Clipboard size={16} color="#3b82f6" />
                  <Text style={styles.cardTitle}>Prescription</Text>
                </View>
              </View>
              <ScrollView style={styles.cardScrollView} showsVerticalScrollIndicator={true}>
              <View style={styles.prescriptionList}>
                 {prescriptions.map((prescription, index) => (
                   <View key={`${prescription.medication}-${index}`} style={styles.prescriptionItem}>
                    <Text style={styles.prescriptionTime}>{prescription.time}</Text>
                    <View style={styles.prescriptionRight}>
                      <Text style={styles.prescriptionMedication}>{prescription.medication}</Text>
                       <TouchableOpacity
                         accessibilityLabel={`Mark ${prescription.medication} at ${prescription.time} as ${prescription.completed ? 'not taken' : 'taken'}`}
                         accessibilityRole="button"
                         onPress={() => {
                           Haptics.selectionAsync();
                           setPrescriptions(prev => prev.map((p, i) => i === index ? { ...p, completed: !p.completed } : p));
                         }}
                       >
                      {prescription.completed ? (
                           <CheckCircle size={18} color="#10b981" />
                      ) : (
                           <Circle size={18} color="#d1d5db" />
                      )}
                       </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
              </ScrollView>
            </Animated.View>

            <Animated.View style={[styles.card, styles.reportsCard, { opacity: fadeAnim }]}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <ReportIcon size={16} color="#ef4444" />
                  <Text style={styles.cardTitle}>My Reports</Text>
                </View>
              </View>
              <ScrollView style={styles.cardScrollView} showsVerticalScrollIndicator={true}>
              <View style={styles.reportsList}>
                {mockData.reports.map((report, index) => (
                  <View key={index} style={styles.reportItem}>
                    <Droplets size={16} color="#ef4444" />
                    <Text style={styles.reportType}>{report.type}</Text>
                    <Text style={styles.reportDate}>{report.date}</Text>
                  </View>
                ))}
              </View>
              </ScrollView>
            </Animated.View>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  containerDark: {
    backgroundColor: '#0f172a',
  },
  safeArea: {
    flex: 1,
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
  topUtilityRow: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  refreshBtn: {
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  refreshBtnText: {
    color: '#ffffff',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  lastUpdatedText: {
    color: '#6b7280',
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  smallBtnText: {
    color: '#1E3A8A',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingsButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 6,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  metricLabel: {
    fontSize: 10,
    fontFamily: 'Inter_500Medium',
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 1,
  },
  metricValue: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: '#1E3A8A',
    textAlign: 'center',
  },
  contentGrid: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 8,
  },
  threeCardsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  fourCardsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardScrollView: {
    maxHeight: 120,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 6,
  },
  cardHeader: {
    marginBottom: 12,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardTitle: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#1E3A8A',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: '#1E3A8A',
  },
  medicationCard: {
    width: width * 0.2,
    marginBottom: 4,
  },
  medicationList: {
    gap: 6,
    marginBottom: 8,
  },
  medicationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    gap: 6,
  },
  medicationName: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#1E3A8A',
  },
  medicationDosage: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: '#6b7280',
  },
  medicationActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  linkButton: {
    paddingVertical: 6,
  },
  linkText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: '#3b82f6',
  },
  refillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  refillText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#ffffff',
  },
  progressCard: {
    flex: 0.8,
    marginBottom: 4,
  },
  progressContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  progressList: {
    flex: 1,
    gap: 6,
  },
  progressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: '#6b7280',
  },
  circularProgressContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
    width: 80,
    height: 80,
    position: 'relative',
  },
  circularProgressSvg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  circularProgressInner: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    height: 80,
    top: 0,
    left: 0,
  },
  circularProgressText: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: '#1E3A8A',
  },
  circularProgressLabel: {
    fontSize: 10,
    fontFamily: 'Inter_500Medium',
    color: '#6b7280',
    marginTop: 2,
  },
  progressCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressCircleInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressPercentage: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: '#1E3A8A',
  },
  testCard: {
    flex: 0.8,
    marginBottom: 4,
  },
  testList: {
    gap: 8,
    marginBottom: 12,
  },
  testItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  testInfo: {
    flex: 1,
  },
  testType: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#1E3A8A',
    marginBottom: 2,
  },
  testDate: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: '#6b7280',
  },
  testResult: {
    alignItems: 'flex-end',
  },
  testValue: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    color: '#1E3A8A',
    marginBottom: 4,
  },
  statusBadge: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: '#ffffff',
  },
  viewDetailsButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
  },
  viewDetailsText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: '#3b82f6',
  },
  appointmentCard: {
    flex: 1,
    marginBottom: 4,
    height: 220,
  },
  appointmentContent: {
    gap: 8,
  },
  appointmentDate: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: '#1E3A8A',
  },
  appointmentTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  appointmentTimeText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: '#6b7280',
  },
  appointmentLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  appointmentLocationText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: '#6b7280',
  },
  doctorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  doctorAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  doctorName: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#1E3A8A',
  },
  manageButton: {
    backgroundColor: '#1E3A8A',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  manageButtonText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#ffffff',
  },
  remindersCard: {
    flex: 1,
    marginBottom: 4,
    height: 220,
  },
  remindersList: {
    gap: 8,
  },
  reminderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  reminderText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#1E3A8A',
    flex: 1,
  },
  reminderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reminderTime: {
    fontSize: 10,
    fontFamily: 'Inter_500Medium',
    color: '#6b7280',
  },
  doneButton: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  doneButtonText: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: '#8b5cf6',
  },
  prescriptionCard: {
    flex: 1,
    marginBottom: 4,
    height: 220,
  },
  prescriptionList: {
    gap: 6,
  },
  prescriptionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  prescriptionTime: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: '#6b7280',
    flex: 1,
  },
  prescriptionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  prescriptionMedication: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#1E3A8A',
  },
  reportsCard: {
    flex: 1,
    marginBottom: 4,
    height: 220,
  },
  reportsList: {
    gap: 6,
  },
  reportItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  reportType: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#1E3A8A',
    flex: 1,
  },
  reportDate: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: '#6b7280',
  },
  // Enhanced component styles
  enhancedMedicationCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  criticalCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  medicationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  medicationInfo: {
    flex: 1,
  },
  enhancedMedicationName: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#1f2937',
    marginBottom: 4,
  },
  criticalText: {
    color: '#ef4444',
  },
  enhancedMedicationDosage: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#6b7280',
    marginBottom: 4,
  },
  medicationNextDose: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: '#059669',
  },
  overdueText: {
    color: '#ef4444',
  },
  criticalBadge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  enhancedMedicationActions: {
    flexDirection: 'row',
    gap: 8,
  },
  enhancedActionButton: {
    backgroundColor: '#f3f4f6',
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testResultCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  testResultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  testResultInfo: {
    flex: 1,
  },
  testResultType: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#1f2937',
    marginBottom: 4,
  },
  testResultDate: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#6b7280',
    marginBottom: 4,
  },
  testResultValue: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#374151',
  },
  enhancedStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  normalBadge: {
    backgroundColor: '#d1fae5',
  },
  enhancedStatusText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: '#059669',
  },
  criticalBadgeText: {
    color: '#ffffff',
  },
  testResultActions: {
    flexDirection: 'row',
    gap: 8,
  },
  enhancedReportCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reportInfo: {
    flex: 1,
  },
  enhancedReportType: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#1f2937',
    marginBottom: 4,
  },
  enhancedReportDate: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#6b7280',
    marginBottom: 4,
  },
  reportStatus: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: '#6b7280',
  },
  newStatus: {
    color: '#1E3A8A',
  },
  reportActions: {
    flexDirection: 'row',
    gap: 8,
  },
  noDataText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 20,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: '#1E3A8A',
  },
}); 
