import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Modal, TextInput, Alert, Linking, ActivityIndicator } from 'react-native';
import { Calendar, Clock, MapPin, User, Plus, FileText, Settings, Video, X, Bot } from 'lucide-react-native';
import { useRouter, usePathname } from 'expo-router';

export default function AppointmentsScreen() {
  const [currentTab, setCurrentTab] = useState('appointments');
  const [currentSubTab, setCurrentSubTab] = useState<'upcoming' | 'past' | 'canceled' | 'schedule'>('upcoming');
  const [bookingVisible, setBookingVisible] = useState(false);
  const [bookingStep, setBookingStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('');
  const [visitMode, setVisitMode] = useState<'in_person' | 'telehealth'>('in_person');
  const [appointmentType, setAppointmentType] = useState<'routine' | 'follow_up' | 'urgent'>('routine');
  const [selectedDate, setSelectedDate] = useState<string>('2025-01-25');
  const [selectedTime, setSelectedTime] = useState<string>('10:30 AM');
  const [reason, setReason] = useState<string>('');
  const [prefEmail, setPrefEmail] = useState<boolean>(true);
  const [prefSms, setPrefSms] = useState<boolean>(false);
  const [prefPush, setPrefPush] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const router = useRouter();
  const pathname = usePathname();
  const activeTab = React.useMemo(() => {
    if (!pathname) return 'appointments';
    if (pathname === '/(tabs)') return 'index';
    if (pathname.startsWith('/(tabs)/records')) return 'records';
    if (pathname.startsWith('/(tabs)/appointments')) return 'appointments';
    // messages removed
    if (pathname.startsWith('/(tabs)/profile')) return 'profile';
    if (pathname.startsWith('/(tabs)/chatbot')) return 'chatbot';
    return 'appointments';
  }, [pathname]);

  const handleTabChange = (tab: string) => {
    setCurrentTab(tab);
    if (tab !== 'appointments') {
      switch (tab) {
        case 'index':
          router.push('/(tabs)');
          break;
        case 'records':
          router.push('/(tabs)/records');
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
  };

  const initialAppointments = [
    { 
      id: 1, 
      doctor: 'Dr. Mohamed Ahmed', 
      specialty: 'Cardiologist',
      date: '2025-01-20', 
      time: '10:30 AM',
      location: '18 El-maadi Rd',
      status: 'Upcoming',
      mode: 'in_person',
      type: 'follow_up'
    },
    { 
      id: 2, 
      doctor: 'Dr. Sarah Mohamed', 
      specialty: 'Dermatologist',
      date: '2025-01-25', 
      time: '2:00 PM',
      location: 'Medical Center Downtown',
      status: 'Confirmed',
      mode: 'telehealth',
      type: 'consultation'
    },
    { 
      id: 3, 
      doctor: 'Dr. Ahmed Hassan', 
      specialty: 'General Practitioner',
      date: '2025-01-18', 
      time: '9:00 AM',
      location: 'City Hospital',
      status: 'Completed',
      mode: 'in_person',
      type: 'routine'
    },
    { 
      id: 4, 
      doctor: 'Dr. Lina Youssef', 
      specialty: 'Pediatrics',
      date: '2025-01-10', 
      time: '11:00 AM',
      location: 'West Clinic',
      status: 'Canceled',
      mode: 'in_person',
      type: 'routine'
    },
  ];

  const [appointments, setAppointments] = useState(initialAppointments);

  const [providers, setProviders] = useState([
    { name: 'Dr. Mohamed Ahmed', specialty: 'Cardiologist', location: '18 El-maadi Rd' },
    { name: 'Dr. Sarah Johnson', specialty: 'Dermatologist', location: 'Medical Center Downtown' },
    { name: 'Dr. Ahmed Hassan', specialty: 'General Practitioner', location: 'City Hospital' },
  ]);

  const availableTimes = ['9:00 AM', '10:30 AM', '11:00 AM', '1:00 PM', '2:00 PM', '3:30 PM'];

  // Simulated dynamic data fetching
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        // Example endpoints; replace with real API
        // const apptRes = await fetch('https://api.example.com/appointments');
        // const appts = await apptRes.json();
        // setAppointments(appts);
        // const provRes = await fetch('https://api.example.com/providers');
        // const provs = await provRes.json();
        // setProviders(provs);
      } catch (e: any) {
        setError('Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return appointments;
    return appointments.filter(a =>
      a.doctor.toLowerCase().includes(q) ||
      a.specialty.toLowerCase().includes(q)
    );
  }, [appointments, searchQuery]);
  const upcoming = useMemo(() => filtered.filter(a => a.status === 'Upcoming' || a.status === 'Confirmed'), [filtered]);
  const past = useMemo(() => filtered.filter(a => a.status === 'Completed'), [filtered]);
  const canceled = useMemo(() => filtered.filter(a => a.status === 'Canceled'), [filtered]);

  const handleCancel = (id: number) => {
    Alert.alert('Cancel appointment', 'Are you sure you want to cancel this appointment?', [
      { text: 'No' },
      { text: 'Yes', onPress: () => {
        setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'Canceled' } : a));
        Alert.alert('Canceled', 'Your appointment has been canceled.');
      } }
    ]);
  };

  const [selectedAppointmentId, setSelectedAppointmentId] = useState<number | null>(null);
  const handleReschedule = (id: number) => {
    const appt = appointments.find(a => a.id === id);
    if (appt) {
      setSelectedAppointmentId(id);
      setSelectedProvider(appt.doctor);
      setSelectedSpecialty(appt.specialty);
      setVisitMode(appt.mode === 'telehealth' ? 'telehealth' : 'in_person');
      setAppointmentType(appt.type === 'follow_up' || appt.type === 'routine' ? (appt.type as any) : 'follow_up');
      setSelectedDate(appt.date);
      setSelectedTime(appt.time);
      setReason('');
      setBookingStep(2);
      setBookingVisible(true);
    }
  };

  const handleAddToCalendar = async (a: {date: string, time: string, doctor: string}) => {
    try {
      const title = encodeURIComponent(`Appointment with ${a.doctor}`);
      const details = encodeURIComponent('Booked via Farida App');
      const dates = encodeURIComponent('20250120T103000Z/20250120T110000Z');
      const url = `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&dates=${dates}`;
      await Linking.openURL(url);
    } catch (e) {
      Alert.alert('Error', 'Unable to open calendar. Please try again.');
    }
  };

  const handleJoinTelehealth = async () => {
    try {
      await Linking.openURL('https://example.telehealth/visit');
    } catch (e) {
      Alert.alert('Error', 'Unable to join telehealth visit. Please try again.');
    }
  };


  const sendNotifications = () => {
    const channels: string[] = [];
    if (prefEmail) channels.push('Email');
    if (prefSms) channels.push('SMS');
    if (prefPush) channels.push('App');
    if (channels.length) {
      Alert.alert('Success', `Notifications sent via: ${channels.join(', ')}`);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header with Integrated Navigation */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.profileSection}>
              <View style={styles.profileImage}>
                <User size={24} color="#1E3A8A" />
              </View>
              <Text style={styles.welcomeText}>Hello Farida</Text>
            </View>
          </View>
          
          {/* Navigation Options */}
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
            
             {/* Messages removed */}
            
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
            <TouchableOpacity style={styles.settingsButton}>
              <Settings size={20} color="#1E3A8A" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <Text style={styles.pageTitle}>Appointments</Text>

          <TextInput
            style={styles.searchInput}
            placeholder="Search by doctor or specialty"
            value={searchQuery}
            onChangeText={setSearchQuery}
            accessibilityLabel="Search appointments by doctor or specialty"
          />

          <View style={styles.subTabsRow}>
            <View style={styles.tabsContainer}>
              {['upcoming','past','canceled','schedule'].map(tab => (
                <TouchableOpacity key={tab} onPress={() => {
                  if (tab === 'schedule') {
                    setBookingStep(1);
                    setBookingVisible(true);
                  } else {
                    setCurrentSubTab(tab as any);
                  }
                }} style={[styles.subTab, currentSubTab === tab && styles.activeSubTab]} accessibilityLabel={`Open ${tab} tab`}>
                  <Text style={[styles.subTabText, currentSubTab === tab && styles.activeSubTabText]}>
                    {tab === 'upcoming' ? 'Upcoming' : tab === 'past' ? 'Past' : tab === 'canceled' ? 'Canceled' : 'Schedule'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <View style={styles.communicationPrefs}>
              <Text style={styles.prefsLabel}>Notify via:</Text>
              <View style={styles.prefsRow}>
                <TouchableOpacity onPress={() => setPrefEmail(!prefEmail)} style={[styles.prefChip, prefEmail && styles.prefChipActive]}>
                  <Text style={[styles.prefChipText, prefEmail && styles.prefChipTextActive]}>Email</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setPrefSms(!prefSms)} style={[styles.prefChip, prefSms && styles.prefChipActive]}>
                  <Text style={[styles.prefChipText, prefSms && styles.prefChipTextActive]}>SMS</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setPrefPush(!prefPush)} style={[styles.prefChip, prefPush && styles.prefChipActive]}>
                  <Text style={[styles.prefChipText, prefPush && styles.prefChipTextActive]}>App</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {currentSubTab === 'upcoming' && (
          <View style={styles.appointmentsList}>
              {upcoming.length === 0 && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No upcoming appointments. Book one now!</Text>
                  <TouchableOpacity style={styles.addButton} onPress={() => { setBookingStep(1); setBookingVisible(true); }} accessibilityLabel="New Appointment">
                    <Plus size={24} color="#ffffff" />
                    <Text style={styles.addButtonText}>New Appointment</Text>
                  </TouchableOpacity>
                </View>
              )}
              {upcoming.map((appointment) => (
              <View key={appointment.id} style={styles.appointmentCard}>
                <View style={styles.appointmentHeader}>
                  <View style={styles.doctorInfo}>
                    <User size={24} color="#1E3A8A" />
                    <View style={styles.doctorDetails}>
                      <Text style={styles.doctorName}>{appointment.doctor}</Text>
                        <Text style={styles.specialty}>{appointment.specialty} • {appointment.type}</Text>
                    </View>
                  </View>
                  <View style={[styles.statusBadge, 
                    appointment.status === 'Upcoming' && styles.upcomingBadge,
                      appointment.status === 'Confirmed' && styles.confirmedBadge
                  ]}>
                    <Text style={[styles.statusText,
                      appointment.status === 'Upcoming' && styles.upcomingText,
                        appointment.status === 'Confirmed' && styles.confirmedText
                    ]}>
                      {appointment.status}
                    </Text>
                  </View>
                </View>
                
                  <View style={styles.appointmentDetails}>
                    <View style={styles.detailRow}>
                      <Calendar size={16} color="#6b7280" />
                      <Text style={styles.detailText}>{appointment.date}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Clock size={16} color="#6b7280" />
                      <Text style={styles.detailText}>{appointment.time}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      {appointment.mode === 'telehealth' ? <Video size={16} color="#6b7280" /> : <MapPin size={16} color="#6b7280" />}
                      <Text style={styles.detailText}>{appointment.mode === 'telehealth' ? 'Telehealth' : appointment.location}</Text>
                    </View>
                  </View>

                  <View style={styles.actionRow}>
                    {appointment.mode === 'telehealth' && (
                      <TouchableOpacity style={styles.actionButtonPrimary} onPress={handleJoinTelehealth} accessibilityLabel="Join telehealth appointment">
                        <Video size={16} color="#ffffff" />
                        <Text style={styles.actionButtonPrimaryText}>Join</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.actionButton} onPress={() => handleReschedule(appointment.id)} accessibilityLabel="Reschedule appointment">
                      <Text style={styles.actionButtonText}>Reschedule</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton} onPress={() => handleCancel(appointment.id)} accessibilityLabel="Cancel appointment">
                      <Text style={styles.actionButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton} onPress={() => handleAddToCalendar(appointment)} accessibilityLabel="Add appointment to calendar">
                      <Text style={styles.actionButtonText}>Add to Calendar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          {currentSubTab === 'past' && (
            <View style={styles.appointmentsList}>
              {past.map((appointment) => (
                <View key={appointment.id} style={styles.appointmentCard}>
                  <View style={styles.appointmentHeader}>
                    <View style={styles.doctorInfo}>
                      <User size={24} color="#1E3A8A" />
                      <View style={styles.doctorDetails}>
                        <Text style={styles.doctorName}>{appointment.doctor}</Text>
                        <Text style={styles.specialty}>{appointment.specialty} • {appointment.type}</Text>
                      </View>
                    </View>
                    <View style={[styles.statusBadge, styles.completedBadge]}>
                      <Text style={[styles.statusText, styles.completedText]}>Completed</Text>
                    </View>
                  </View>
                <View style={styles.appointmentDetails}>
                  <View style={styles.detailRow}>
                    <Calendar size={16} color="#6b7280" />
                    <Text style={styles.detailText}>{appointment.date}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Clock size={16} color="#6b7280" />
                    <Text style={styles.detailText}>{appointment.time}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <MapPin size={16} color="#6b7280" />
                    <Text style={styles.detailText}>{appointment.location}</Text>
                    </View>
                  </View>
                  <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.actionButtonPrimary} onPress={() => { setBookingStep(1); setBookingVisible(true); }}>
                      <Plus size={16} color="#ffffff" />
                      <Text style={styles.actionButtonPrimaryText}>Book Follow-up</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton}>
                      <Text style={styles.actionButtonText}>View Summary</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          {currentSubTab === 'canceled' && (
            <View style={styles.appointmentsList}>
              {canceled.map((appointment) => (
                <View key={appointment.id} style={styles.appointmentCard}>
                  <View style={styles.appointmentHeader}>
                    <View style={styles.doctorInfo}>
                      <User size={24} color="#1E3A8A" />
                      <View style={styles.doctorDetails}>
                        <Text style={styles.doctorName}>{appointment.doctor}</Text>
                        <Text style={styles.specialty}>{appointment.specialty} • {appointment.type}</Text>
                      </View>
                    </View>
                    <View style={[styles.statusBadge, styles.canceledBadge]}>
                      <Text style={[styles.statusText, styles.canceledText]}>Canceled</Text>
                    </View>
                  </View>
                  <View style={styles.appointmentDetails}>
                    <View style={styles.detailRow}>
                      <Calendar size={16} color="#6b7280" />
                      <Text style={styles.detailText}>{appointment.date}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Clock size={16} color="#6b7280" />
                      <Text style={styles.detailText}>{appointment.time}</Text>
                    </View>
                  </View>
                  <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.actionButtonPrimary} onPress={() => { setBookingStep(1); setBookingVisible(true); }}>
                      <Plus size={16} color="#ffffff" />
                      <Text style={styles.actionButtonPrimaryText}>Rebook</Text>
                    </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
          )}

          {currentSubTab === 'schedule' && (
            <View style={styles.scheduleSection}>
              <Text style={styles.scheduleHint}>Book a new appointment</Text>
              <TouchableOpacity style={styles.addButton} onPress={() => { setBookingVisible(true); setBookingStep(1); }} accessibilityLabel="New Appointment">
                <Plus size={24} color="#ffffff" />
                <Text style={styles.addButtonText}>New Appointment</Text>
              </TouchableOpacity>
            </View>
          )}

          
          <Modal visible={bookingVisible} animationType="slide" transparent>
            <View style={styles.modalBackdrop}>
              <View style={styles.modalCard}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Schedule Appointment</Text>
                  <TouchableOpacity onPress={() => setBookingVisible(false)}>
                    <X size={20} color="#1E3A8A" />
                  </TouchableOpacity>
                </View>

                {bookingStep === 1 && (
                  <View style={styles.modalBody}>
                    <Text style={styles.stepTitle}>1. Choose provider and filters</Text>
                    <ScrollView style={{ maxHeight: 160 }}>
                      {providers.map(p => (
                        <TouchableOpacity key={p.name} style={[styles.providerItem, selectedProvider === p.name && styles.providerItemActive]} onPress={() => { setSelectedProvider(p.name); setSelectedSpecialty(p.specialty); }}>
                          <Text style={styles.providerName}>{p.name}</Text>
                          <Text style={styles.providerMeta}>{p.specialty} • {p.location}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                    <View style={styles.filterRow}>
                      <TouchableOpacity onPress={() => setVisitMode('in_person')} style={[styles.filterChip, visitMode === 'in_person' && styles.filterChipActive]}>
                        <Text style={[styles.filterChipText, visitMode === 'in_person' && styles.filterChipTextActive]}>In-person</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setVisitMode('telehealth')} style={[styles.filterChip, visitMode === 'telehealth' && styles.filterChipActive]}>
                        <Text style={[styles.filterChipText, visitMode === 'telehealth' && styles.filterChipTextActive]}>Telehealth</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setAppointmentType('follow_up')} style={[styles.filterChip, appointmentType === 'follow_up' && styles.filterChipActive]}>
                        <Text style={[styles.filterChipText, appointmentType === 'follow_up' && styles.filterChipTextActive]}>Follow-up</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setAppointmentType('routine')} style={[styles.filterChip, appointmentType === 'routine' && styles.filterChipActive]}>
                        <Text style={[styles.filterChipText, appointmentType === 'routine' && styles.filterChipTextActive]}>Routine</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setAppointmentType('urgent')} style={[styles.filterChip, appointmentType === 'urgent' && styles.filterChipActive]}>
                        <Text style={[styles.filterChipText, appointmentType === 'urgent' && styles.filterChipTextActive]}>Urgent</Text>
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity disabled={!selectedProvider} style={[styles.primaryCta, !selectedProvider && { opacity: 0.5 }]} onPress={() => setBookingStep(2)}>
                      <Text style={styles.primaryCtaText}>Continue</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {bookingStep === 2 && (
                  <View style={styles.modalBody}>
                    <Text style={styles.stepTitle}>2. Pick date and time</Text>
                    <TextInput value={selectedDate} onChangeText={setSelectedDate} placeholder="YYYY-MM-DD" style={styles.input} keyboardType="numeric" returnKeyType="done" />
                    <View style={styles.timesRow}>
                      {availableTimes.map(t => (
                        <TouchableOpacity key={t} style={[styles.timeChip, selectedTime === t && styles.timeChipActive]} onPress={() => setSelectedTime(t)}>
                          <Text style={[styles.timeChipText, selectedTime === t && styles.timeChipTextActive]}>{t}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <View style={styles.modalNavRow}>
                      <TouchableOpacity style={styles.secondaryCta} onPress={() => setBookingStep(1)}>
                        <Text style={styles.secondaryCtaText}>Back</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.primaryCta} onPress={() => setBookingStep(3)}>
                        <Text style={styles.primaryCtaText}>Continue</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {bookingStep === 3 && (
                  <View style={styles.modalBody}>
                    <Text style={styles.stepTitle}>3. Reason for visit</Text>
                    <TextInput value={reason} onChangeText={setReason} placeholder="e.g., annual check-up" style={[styles.input, { height: 80 }]} multiline />
                    <View style={styles.modalNavRow}>
                      <TouchableOpacity style={styles.secondaryCta} onPress={() => setBookingStep(2)}>
                        <Text style={styles.secondaryCtaText}>Back</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.primaryCta} onPress={() => {
                        if (!reason.trim()) { Alert.alert('Error', 'Please provide a reason for the visit.'); return; }
                        setBookingStep(4);
                      }}>
                        <Text style={styles.primaryCtaText}>Continue</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {bookingStep === 4 && (
                  <View style={styles.modalBody}>
                    <Text style={styles.stepTitle}>4. Confirm details</Text>
                    <View style={styles.confirmBox}>
                      <Text style={styles.confirmLine}>Provider: {selectedProvider} ({selectedSpecialty})</Text>
                      <Text style={styles.confirmLine}>Mode: {visitMode === 'telehealth' ? 'Telehealth' : 'In-person'}</Text>
                      <Text style={styles.confirmLine}>Type: {appointmentType}</Text>
                      <Text style={styles.confirmLine}>Date: {selectedDate}</Text>
                      <Text style={styles.confirmLine}>Time: {selectedTime}</Text>
                      <Text style={styles.confirmLine}>Reason: {reason || '—'}</Text>
                    </View>
                    <View style={styles.modalNavRow}>
                      <TouchableOpacity style={styles.secondaryCta} onPress={() => setBookingStep(3)}>
                        <Text style={styles.secondaryCtaText}>Back</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.primaryCta, isConfirming && { opacity: 0.5 }]} disabled={isConfirming} onPress={async () => {
                        setIsConfirming(true);
                        await new Promise(resolve => setTimeout(resolve, 600));
                        if (selectedAppointmentId) {
                          setAppointments(prev => prev.map(a => a.id === selectedAppointmentId ? {
                            ...a,
                            date: selectedDate,
                            time: selectedTime,
                            status: 'Confirmed',
                            mode: visitMode,
                            type: appointmentType
                          } : a));
                        } else {
                          const newId = Math.max(0, ...appointments.map(a => a.id)) + 1;
                          setAppointments(prev => [{
                            id: newId,
                            doctor: selectedProvider,
                            specialty: selectedSpecialty || 'General',
                            date: selectedDate,
                            time: selectedTime,
                            location: visitMode === 'telehealth' ? 'Telehealth' : 'To be provided',
                            status: 'Upcoming',
                            mode: visitMode,
                            type: appointmentType,
                          }, ...prev]);
                        }
                        setSelectedAppointmentId(null);
                        setBookingVisible(false);
                        setIsConfirming(false);
                        Alert.alert('Appointment booked', 'Your appointment has been scheduled.');
                        sendNotifications();
                      }}>
                        {isConfirming ? (
                          <ActivityIndicator color="#ffffff" />
                        ) : (
                          <Text style={styles.primaryCtaText}>Confirm</Text>
                        )}
          </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            </View>
          </Modal>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  countryCode: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#1E3A8A',
  },
  scrollView: {
    flex: 1,
  },
  pageTitle: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: '#1E3A8A',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  subTabsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: 8,
    flex: 1,
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
  subTab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#eef2ff',
  },
  activeSubTab: {
    backgroundColor: '#1E3A8A',
  },
  subTabText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#1E3A8A',
  },
  activeSubTabText: {
    color: '#ffffff',
  },
  appointmentsList: {
    padding: 16,
    gap: 12,
  },
  appointmentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  doctorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  doctorDetails: {
    flex: 1,
  },
  doctorName: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#1E3A8A',
    marginBottom: 2,
  },
  specialty: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#6b7280',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  upcomingBadge: {
    backgroundColor: '#fef3c7',
  },
  confirmedBadge: {
    backgroundColor: '#d1fae5',
  },
  completedBadge: {
    backgroundColor: '#e5e7eb',
  },
  canceledBadge: {
    backgroundColor: '#fee2e2',
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  upcomingText: {
    color: '#d97706',
  },
  confirmedText: {
    color: '#059669',
  },
  completedText: {
    color: '#6b7280',
  },
  canceledText: {
    color: '#ef4444',
  },
  appointmentDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#6b7280',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#1E3A8A',
  },
  actionButtonPrimary: {
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionButtonPrimaryText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#ffffff',
  },
  actionAddToCalText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#1E3A8A',
  },
  actionAddToCal: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E3A8A',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    margin: 16,
    gap: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#ffffff',
  },
  scheduleSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  scheduleHint: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#6b7280',
    marginBottom: 8,
  },
  infoSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  infoTitle: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    color: '#1E3A8A',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: '#6b7280',
    lineHeight: 18,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    margin: 16,
  },
  emptyState: {
    padding: 16,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#6b7280',
    marginBottom: 12,
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
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#1E3A8A',
  },
  prefChipTextActive: {
    color: '#ffffff',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: '#1E3A8A',
  },
  modalBody: {
    gap: 12,
  },
  stepTitle: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#1E3A8A',
  },
  providerItem: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 8,
  },
  providerItemActive: {
    borderColor: '#1E3A8A',
    backgroundColor: '#f0f4ff',
  },
  providerName: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#1E3A8A',
  },
  providerMeta: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: '#6b7280',
  },
  filterRow: {
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
    fontFamily: 'Inter_600SemiBold',
    color: '#1E3A8A',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  timesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
  },
  timeChipActive: {
    backgroundColor: '#1E3A8A',
  },
  timeChipText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#1E3A8A',
  },
  timeChipTextActive: {
    color: '#ffffff',
  },
  modalNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  primaryCta: {
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  primaryCtaText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#ffffff',
  },
  secondaryCta: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  secondaryCtaText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#1E3A8A',
  },
  confirmBox: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    gap: 4,
  },
  confirmLine: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: '#374151',
  },
});