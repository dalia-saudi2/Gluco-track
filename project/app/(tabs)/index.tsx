import React, { useState, useCallback, useMemo, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { useLogoutAndRedirect } from '../../hooks/useLogoutAndRedirect';
import { dashboardService } from '../../services/dashboardService';
import { glucoseReadingsService } from '../../services/glucoseReadingsService';
import { VitalisDashboard, type VitalisDashboardProps } from '../../components/dashboard/VitalisDashboard';
import { AddGlucoseReadingSheet } from '../../components/glucose/AddGlucoseReadingSheet';
import { GlucoseHistoryModal } from '../../components/glucose/GlucoseHistoryModal';
import { showToast } from '../../components/ToastProvider';
import { useHealthPermissions } from '../../hooks/useHealthPermissions';
import { useHealth } from '../../hooks/useHealth';
import { useNavigateToLabUpload } from '../../hooks/useNavigateToLabUpload';
import type { GlucoseDayPoint } from '../../components/dashboard/GlucoseTrendChart';
import type { GlucoseReadingType } from '../../types/glucoseReading';
import type { RiskSummary } from '../../types/riskSummary';
import type { NutritionToday } from '../../types/nutritionToday';
import { isClinicalProfileComplete } from '../../utils/authRouting';
import { apiClient } from '../../config/api';
import { nutritionService } from '../../services/nutritionService';
import { useMedicationReminderOptional } from '../../contexts/MedicationReminderContext';
import { buildMedicationDashboardRows, type SchedulableMedication } from '../../utils/medicationSchedule';


export default function DashboardScreen() {
  const { isAuthenticated, user, getOnboardingProgressForRouting, refreshOnboardingProgress } = useAuth();
  const handleLogout = useLogoutAndRedirect();
  const [loading, setLoading] = useState(true);
  const [props, setProps] = useState<Partial<VitalisDashboardProps>>({});
  const [glucoseDays, setGlucoseDays] = useState<GlucoseDayPoint[]>([]);
  const [glucoseTodayDay, setGlucoseTodayDay] = useState('—');
  const [glucoseTodayStatus, setGlucoseTodayStatus] = useState<string | null>(null);
  const [glucoseSheetOpen, setGlucoseSheetOpen] = useState(false);
  const [glucoseHistoryOpen, setGlucoseHistoryOpen] = useState(false);
  const [riskSummary, setRiskSummary] = useState<RiskSummary | null>(null);
  const [predictionRunning, setPredictionRunning] = useState(false);
  const [nutritionToday, setNutritionToday] = useState<NutritionToday | null>(null);

  const { status } = useHealthPermissions();
  const { today } = useHealth(status, { patientId: user?.id, isAuthenticated });
  const navigateToLabUpload = useNavigateToLabUpload();
  const medicationReminder = useMedicationReminderOptional();
  const medicationReminderRef = useRef(medicationReminder);
  medicationReminderRef.current = medicationReminder;
  const hasLoadedDashboardRef = useRef(false);
  const [backendMedications, setBackendMedications] = useState<SchedulableMedication[]>([]);

  const loadRiskSummary = useCallback(async () => {
    try {
      const summary = (await apiClient.getRiskSummary()) as RiskSummary;
      setRiskSummary(summary);
    } catch {
      setRiskSummary(null);
    }
  }, []);

  const handleRunPrediction = useCallback(async () => {
    try {
      setPredictionRunning(true);
      const summary = (await apiClient.rerunPrediction()) as RiskSummary;
      setRiskSummary(summary);
      showToast.success('Prediction updated', 'Your diabetes risk model has been refreshed.');
    } catch (e) {
      console.warn('Rerun prediction error:', e);
      showToast.error('Prediction failed', 'Could not run a new prediction. Try again later.');
    } finally {
      setPredictionRunning(false);
    }
  }, []);

  const loadNutritionToday = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await nutritionService.getToday(user.id);
      setNutritionToday(data);
    } catch {
      setNutritionToday(null);
    }
  }, [user?.id]);

  const loadGlucose = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await glucoseReadingsService.getDashboard(user.id);
      setGlucoseDays(
        data.days.map((d) => ({
          day: d.day,
          value: d.value != null ? Math.round(d.value) : null,
        }))
      );
      setGlucoseTodayDay(data.today_day);
      setGlucoseTodayStatus(data.today_status);
    } catch {
      setGlucoseDays([]);
    }
  }, [user?.id]);

  const loadDashboard = useCallback(async () => {
    try {
      if (!hasLoadedDashboardRef.current) setLoading(true);
      const data = await dashboardService.getDashboardData();
      await Promise.all([loadGlucose(), loadRiskSummary(), loadNutritionToday()]);
      const backendMeds = (data.rawData?.current_medications ?? []) as SchedulableMedication[];
      setBackendMedications(backendMeds);
      await medicationReminderRef.current?.syncMedications(backendMeds);

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
        bmi: data.healthMetrics?.bmi || data.user?.bmi || undefined,
        weightKg: data.healthMetrics?.weight_kg ?? data.user?.weight_kg ?? null,
        bmiGroup: data.healthMetrics?.bmi_group ?? null,
        hba1c: data.healthMetrics?.hba1c ?? null,
        hba1cMeasuredAt: data.healthMetrics?.hba1c_measured_at ?? null,
        nextAppointment,
        labResults: labResults.length ? labResults : undefined,
      });
    } catch (e) {
      console.warn('Dashboard load error:', e);
    } finally {
      hasLoadedDashboardRef.current = true;
      setLoading(false);
    }
  }, [loadGlucose, loadRiskSummary, loadNutritionToday, user?.full_name]);

  useFocusEffect(
    useCallback(() => {
      if (!isAuthenticated) {
        hasLoadedDashboardRef.current = false;
        setLoading(false);
        return;
      }
      void refreshOnboardingProgress();
      void medicationReminderRef.current?.refresh();
      void loadDashboard();
    }, [isAuthenticated, refreshOnboardingProgress, loadDashboard])
  );

  const handleSaveGlucose = async (payload: {
    value_mgdl: number;
    reading_type: GlucoseReadingType;
    measured_at: string;
    notes?: string;
  }) => {
    if (!user?.id) return;
    await glucoseReadingsService.create(user.id, { ...payload, source: 'manual' });
    showToast.success('Reading saved', 'Reading saved successfully');
    await loadGlucose();
  };

  const liveMedications = useMemo(() => {
    if (!backendMedications.length) {
      return medicationReminder?.dashboardRows?.length ? medicationReminder.dashboardRows : undefined;
    }
    const rows = buildMedicationDashboardRows(
      backendMedications,
      medicationReminder?.takenDoseIds ?? new Set()
    );
    return rows.length ? rows : undefined;
  }, [backendMedications, medicationReminder?.takenDoseIds, medicationReminder?.dashboardRows]);

  return (
    <>
      <VitalisDashboard
        userName={props.userName ?? user?.full_name ?? 'Patient'}
        loading={loading && isAuthenticated}
        bloodPressure={props.bloodPressure}
        bmi={props.bmi}
        weightKg={props.weightKg}
        bmiGroup={props.bmiGroup}
        hba1c={props.hba1c}
        hba1cMeasuredAt={props.hba1cMeasuredAt}
        medications={liveMedications}
        nextAppointment={props.nextAppointment}
        labResults={props.labResults}
        onLogout={handleLogout}
        todaySteps={status === 'granted' ? today.steps : undefined}
        todaySleep={status === 'granted' ? today.sleepHours : undefined}
        healthPermissionStatus={status}
        glucoseDays={glucoseDays}
        glucoseTodayDay={glucoseTodayDay}
        glucoseTodayStatus={glucoseTodayStatus}
        onViewGlucoseHistory={() => setGlucoseHistoryOpen(true)}
        onAddGlucoseReading={() => setGlucoseSheetOpen(true)}
        patientId={user?.id}
        onUploadLab={navigateToLabUpload}
        quickContacts={user?.quick_contacts ?? null}
        isAuthenticated={isAuthenticated}
        riskSummary={riskSummary}
        onRunPrediction={handleRunPrediction}
        predictionRunning={predictionRunning}
        nutritionToday={nutritionToday}
        clinicalProfileIncomplete={!isClinicalProfileComplete(getOnboardingProgressForRouting())}
        onMarkMedicationTaken={(slotKey) => {
          void medicationReminder?.markTakenBySlotKey(slotKey);
        }}
      />
      <GlucoseHistoryModal
        visible={glucoseHistoryOpen}
        patientId={user?.id}
        onClose={() => setGlucoseHistoryOpen(false)}
      />
      <AddGlucoseReadingSheet
        visible={glucoseSheetOpen}
        onClose={() => setGlucoseSheetOpen(false)}
        onSave={handleSaveGlucose}
      />
    </>
  );
}
