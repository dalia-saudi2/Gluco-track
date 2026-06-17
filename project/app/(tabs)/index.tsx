import React, { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { useLogoutAndRedirect } from '../../hooks/useLogoutAndRedirect';
import { dashboardService } from '../../services/dashboardService';
import { VitalisDashboard, type VitalisDashboardProps } from '../../components/dashboard/VitalisDashboard';
import { useHealthPermissions } from '../../hooks/useHealthPermissions';
import { useHealth } from '../../hooks/useHealth';

function mapMedStatus(index: number, isOverdue?: boolean): 'taken' | 'missed' | 'upcoming' | 'later' {
  if (index === 0) return 'taken';
  if (isOverdue) return 'missed';
  if (index === 2) return 'upcoming';
  return 'later';
}

export default function DashboardScreen() {
  const { isAuthenticated, user } = useAuth();
  const handleLogout = useLogoutAndRedirect();
  const [loading, setLoading] = useState(true);
  const [props, setProps] = useState<Partial<VitalisDashboardProps>>({});

  const { status } = useHealthPermissions();
  const { today } = useHealth(status);

  useFocusEffect(
    useCallback(() => {
      if (!isAuthenticated) {
        setLoading(false);
        return;
      }
      loadDashboard();
    }, [isAuthenticated])
  );

  const loadDashboard = async () => {
    try {
      if (!props.medications) setLoading(true);
      const data = await dashboardService.getDashboardData();

      const medications = (data.medications ?? []).slice(0, 4).map((med, i) => ({
        name: med.name,
        time: med.nextDose?.includes('Overdue') ? '7:30 AM' : med.nextDose || '8:00 AM',
        note: med.frequency || 'Daily',
        status: mapMedStatus(i, med.isOverdue),
      }));

      const appt = data.appointments?.[0];
      let nextAppointment: VitalisDashboardProps['nextAppointment'] = null;
      if (appt) {
        const parts = appt.date?.split(' ') ?? [];
        const month = parts[1]?.slice(0, 3) ?? '—';
        const day = parts[2] ?? '—';
        nextAppointment = {
          month,
          day,
          title: 'Medical Appointment',
          doctor: appt.doctor,
          time: appt.time?.split(' - ')[0] ?? appt.time,
          location: appt.location,
        };
      }

      const labResults = (data.testResults ?? []).slice(0, 4).map((t, i) => ({
        title: t.type,
        date: t.date,
        status: t.status,
        statusColor: t.critical ? '#e040a0' : t.isAbnormal ? '#ea580c' : '#16a34a',
        statusBg: t.critical ? 'rgba(224,64,160,0.1)' : t.isAbnormal ? '#ffedd5' : '#dcfce7',
        highlight: t.critical || i === 0,
      }));

      setProps({
        userName: user?.full_name || data.user?.full_name || 'Patient',
        bloodPressure: data.healthMetrics?.blood_pressure || '128/82',
        bmi: data.healthMetrics?.bmi || '28.4',
        medications: medications.length ? medications : undefined,
        nextAppointment,
        labResults: labResults.length ? labResults : undefined,
      });
    } catch (e) {
      console.error('Dashboard load error:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <VitalisDashboard
      userName={props.userName ?? user?.full_name ?? 'Patient'}
      loading={loading && isAuthenticated}
      bloodPressure={props.bloodPressure}
      bmi={props.bmi}
      medications={props.medications}
      nextAppointment={props.nextAppointment}
      labResults={props.labResults}
      onLogout={handleLogout}
      todaySteps={status === 'granted' ? today.steps : undefined}
      todaySleep={status === 'granted' ? today.sleepHours : undefined}
      healthPermissionStatus={status}
    />
  );
}
