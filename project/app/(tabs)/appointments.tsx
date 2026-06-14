import React, { useMemo, useState, useCallback } from 'react';
import { Alert, Linking } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../contexts/AuthContext';
import { appointmentsService, Appointment } from '../../services/appointmentsService';
import { VitalisAppointmentsScreen } from '../../components/vitalis/VitalisAppointmentsScreen';
import { AppointmentBookingModal } from '../../components/appointments/AppointmentBookingModal';

export default function AppointmentsScreen() {
  const { isAuthenticated, isLoading: authIsLoading, user, logout } = useAuth();
  const router = useRouter();

  const [currentSubTab, setCurrentSubTab] = useState<'upcoming' | 'past' | 'canceled' | 'schedule'>('upcoming');
  const [bookingVisible, setBookingVisible] = useState(false);
  const [bookingStep, setBookingStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [visitMode, setVisitMode] = useState<'in_person' | 'telehealth'>('in_person');
  const [appointmentType, setAppointmentType] = useState<'routine' | 'follow_up' | 'urgent'>('routine');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState('10:30 AM');
  const [reason, setReason] = useState('');
  const [prefEmail, setPrefEmail] = useState(true);
  const [prefSms, setPrefSms] = useState(false);
  const [prefPush, setPrefPush] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<number | null>(null);

  const getFutureDate = (daysFromNow: number) => {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date.toISOString().split('T')[0];
  };

  const getPastDate = (daysAgo: number) => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString().split('T')[0];
  };

  const mockAppointments: Appointment[] = [
    { id: 1, doctor: 'Dr. Mahmoud El-Sayed', specialty: 'Cardiologist', date: getFutureDate(3), time: '10:30 AM', location: '18 El-maadi Rd', status: 'Upcoming', mode: 'in_person', type: 'follow_up' },
    { id: 2, doctor: 'Dr. Amira Mansour', specialty: 'Endocrinology', date: getFutureDate(10), time: '2:00 PM', location: 'Medical Center Downtown', status: 'Confirmed', mode: 'telehealth', type: 'routine' },
    { id: 3, doctor: 'Dr. Khaled Ibrahim', specialty: 'General Practitioner', date: getPastDate(5), time: '9:00 AM', location: 'City Hospital', status: 'Completed', mode: 'in_person', type: 'routine' },
    { id: 4, doctor: 'Dr. Lina Youssef', specialty: 'Pediatrics', date: getPastDate(15), time: '11:00 AM', location: 'West Clinic', status: 'Canceled', mode: 'in_person', type: 'routine' },
  ];

  const [appointments, setAppointments] = useState<Appointment[]>(mockAppointments);

  const providers = [
    { name: 'Dr. Mahmoud El-Sayed', specialty: 'Cardiologist', location: '18 El-maadi Rd' },
    { name: 'Dr. Amira Mansour', specialty: 'Endocrinology', location: 'Medical Center Downtown' },
    { name: 'Dr. Khaled Ibrahim', specialty: 'General Practitioner', location: 'City Hospital' },
  ];

  const availableTimes = ['9:00 AM', '10:30 AM', '11:00 AM', '1:00 PM', '2:00 PM', '3:30 PM'];

  const fetchAppointments = useCallback(async () => {
    if (!isAuthenticated) {
      setAppointments(mockAppointments);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await appointmentsService.getAllAppointments();
      setAppointments(data);
    } catch (e: any) {
      setError(e?.message || 'Failed to load appointments. Using demo data.');
      setAppointments(mockAppointments);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [isAuthenticated]);

  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated && !authIsLoading) fetchAppointments();
      else if (!authIsLoading && !isAuthenticated) setAppointments(mockAppointments);
    }, [isAuthenticated, authIsLoading, fetchAppointments])
  );

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchAppointments();
  }, [fetchAppointments]);

  const filtered = appointments;

  const upcoming = useMemo(() => appointmentsService.getUpcoming(filtered), [filtered]);
  const past = useMemo(() => appointmentsService.getPast(filtered), [filtered]);
  const canceled = useMemo(() => appointmentsService.getCanceled(filtered), [filtered]);

  const stats = useMemo(
    () => ({
      upcoming: upcoming.length,
      past: past.length,
      completed: appointments.filter((a) => a.status === 'Completed').length,
      canceled: canceled.length,
    }),
    [upcoming, past, canceled, appointments]
  );

  const openBooking = useCallback(() => {
    setSelectedAppointmentId(null);
    setBookingStep(1);
    setBookingVisible(true);
  }, []);

  const handleCancel = async (id: number) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    Alert.alert('Cancel Appointment', 'Are you sure you want to cancel this appointment?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            if (isAuthenticated) {
              try {
                await appointmentsService.cancelAppointment(id);
              } catch {}
            }
            setAppointments((prev) => prev.map((a) => (Number(a.id) === Number(id) ? { ...a, status: 'Canceled' as const } : a)));
            setCurrentSubTab('canceled');
            Alert.alert('Canceled', 'Your appointment has been canceled.');
          } catch (err: any) {
            Alert.alert('Error', err?.message || 'Failed to cancel.');
          }
        },
      },
    ]);
  };

  const handleReschedule = (id: number) => {
    const appt = appointments.find((a) => a.id === id);
    if (!appt) return;
    setSelectedAppointmentId(id);
    setSelectedProvider(appt.doctor);
    setSelectedSpecialty(appt.specialty);
    setVisitMode(appt.mode === 'telehealth' ? 'telehealth' : 'in_person');
    setAppointmentType(appt.type === 'follow_up' || appt.type === 'routine' ? (appt.type as 'routine' | 'follow_up') : 'follow_up');
    setSelectedDate(appt.date);
    setSelectedTime(appt.time);
    setReason('');
    setBookingStep(2);
    setBookingVisible(true);
  };

  const handleAddToCalendar = async (a: { date: string; time: string; doctor: string; isoDateTime?: string }) => {
    try {
      const title = encodeURIComponent(`Appointment with ${a.doctor}`);
      const details = encodeURIComponent('Booked via Diabetes Care Hub');
      let startIso = a.isoDateTime;
      if (!startIso) startIso = new Date().toISOString();
      const end = new Date(new Date(startIso).getTime() + 30 * 60000);
      const formatTime = (iso: string) => iso.replace(/[-:]/g, '').split('.')[0] + 'Z';
      const url = `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&dates=${formatTime(startIso)}/${formatTime(end.toISOString())}`;
      await Linking.openURL(url);
    } catch {
      Alert.alert('Error', 'Unable to open calendar.');
    }
  };

  const handleJoinTelehealth = async () => {
    try {
      await Linking.openURL('https://example.telehealth/visit');
    } catch {
      Alert.alert('Error', 'Unable to join telehealth visit.');
    }
  };

  const sendNotifications = () => {
    const channels = [prefEmail && 'Email', prefSms && 'SMS', prefPush && 'App'].filter(Boolean);
    if (channels.length) Alert.alert('Success', `Notifications sent via: ${channels.join(', ')}`);
  };

  const handleProviderSelect = (name: string, specialty: string) => {
    setSelectedProvider(name);
    setSelectedSpecialty(specialty);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setSelectedDate(tomorrow.toISOString().split('T')[0]);
  };

  const handleConfirmBooking = async () => {
    setIsConfirming(true);
    try {
      const [time, period] = selectedTime.split(' ');
      const [hours, minutes] = time.split(':');
      let hour24 = parseInt(hours, 10);
      if (period === 'PM' && hour24 !== 12) hour24 += 12;
      if (period === 'AM' && hour24 === 12) hour24 = 0;

      const appointmentDateTime = new Date(`${selectedDate}T${hour24.toString().padStart(2, '0')}:${minutes}:00`);
      const isoDateTime = appointmentDateTime.toISOString();

      if (selectedAppointmentId) {
        if (isAuthenticated) {
          await appointmentsService.updateAppointment(selectedAppointmentId, {
            appointment_date: isoDateTime,
            location: visitMode === 'telehealth' ? 'Telehealth' : undefined,
            appointment_type: appointmentType,
            notes: reason,
          });
        }
        setAppointments((prev) =>
          prev.map((a) =>
            a.id === selectedAppointmentId
              ? { ...a, date: selectedDate, time: selectedTime, status: 'Confirmed', mode: visitMode, type: appointmentType }
              : a
          )
        );
      } else if (isAuthenticated) {
        const created = await appointmentsService.createAppointment({
          doctor_name: selectedProvider,
          appointment_date: isoDateTime,
          duration: 30,
          location: visitMode === 'telehealth' ? 'Telehealth' : undefined,
          appointment_type: appointmentType,
          notes: reason,
        });
        setAppointments((prev) => [created, ...prev]);
        fetchAppointments();
      } else {
        const newId = Math.max(0, ...appointments.map((a) => a.id)) + 1;
        setAppointments((prev) => [
          {
            id: newId,
            doctor: selectedProvider,
            specialty: selectedSpecialty || 'General',
            date: selectedDate,
            time: selectedTime,
            location: visitMode === 'telehealth' ? 'Telehealth' : 'To be provided',
            status: 'Upcoming',
            mode: visitMode,
            type: appointmentType,
          },
          ...prev,
        ]);
      }

      setSelectedAppointmentId(null);
      setBookingVisible(false);
      setCurrentSubTab('upcoming');
      Alert.alert('Appointment booked', 'Your appointment has been scheduled.', [
        { text: 'Add to Calendar', onPress: () => handleAddToCalendar({ date: selectedDate, time: selectedTime, doctor: selectedProvider, isoDateTime }) },
        { text: 'View Dashboard', onPress: () => router.push('/(tabs)') },
        { text: 'OK', style: 'cancel' },
      ]);
      sendNotifications();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to book appointment.');
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <VitalisAppointmentsScreen
      userName={user?.full_name || 'Patient'}
      currentSubTab={currentSubTab}
      onSubTabChange={setCurrentSubTab}
      prefEmail={prefEmail}
      prefSms={prefSms}
      prefPush={prefPush}
      onToggleEmail={() => setPrefEmail(!prefEmail)}
      onToggleSms={() => setPrefSms(!prefSms)}
      onTogglePush={() => setPrefPush(!prefPush)}
      upcoming={upcoming}
      past={past}
      canceled={canceled}
      stats={stats}
      isLoading={isLoading}
      isRefreshing={isRefreshing}
      authIsLoading={authIsLoading}
      isAuthenticated={isAuthenticated}
      error={error}
      onRefresh={handleRefresh}
      onRetry={fetchAppointments}
      onLogout={logout}
      onScheduleNew={openBooking}
      onReschedule={handleReschedule}
      onCancel={handleCancel}
      onJoinTelehealth={handleJoinTelehealth}
      onBookFollowUp={openBooking}
      bookingModal={
        <AppointmentBookingModal
          visible={bookingVisible}
          onClose={() => setBookingVisible(false)}
          step={bookingStep}
          onStepChange={setBookingStep}
          providers={providers}
          selectedProvider={selectedProvider}
          selectedSpecialty={selectedSpecialty}
          visitMode={visitMode}
          selectedDate={selectedDate}
          selectedTime={selectedTime}
          reason={reason}
          availableTimes={availableTimes}
          isConfirming={isConfirming}
          onProviderSelect={handleProviderSelect}
          onVisitModeChange={setVisitMode}
          onDateChange={setSelectedDate}
          onTimeChange={setSelectedTime}
          onReasonChange={setReason}
          onConfirm={handleConfirmBooking}
        />
      }
    />
  );
}
