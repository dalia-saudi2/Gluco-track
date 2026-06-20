import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Plus, X } from 'lucide-react-native';
import { DF, type DashboardPalette } from '../../constants/DashboardColors';
import { activityLogService } from '../../services/activityLogService';
import type { ActivityWeekSummary } from '../../types/activityLog';
import { showToast } from '../ToastProvider';

const INTENSITY_LEGEND = [
  { label: 'None', intensity: 0 },
  { label: 'Light', intensity: 20 },
  { label: 'Fair', intensity: 40 },
  { label: 'Moderate', intensity: 60 },
  { label: 'Active', intensity: 80 },
  { label: 'High', intensity: 100 },
] as const;

type Props = {
  D: DashboardPalette;
  patientId?: number;
};

function cellColor(D: DashboardPalette, intensity: number): string {
  if (intensity <= 0) return D.surfaceContainer;
  return `rgba(224,64,160,${intensity / 100})`;
}

export function ActivityWeekCard({ D, patientId }: Props) {
  const s = useMemo(() => createStyles(D), [D]);
  const [summary, setSummary] = useState<ActivityWeekSummary | null>(null);
  const [loading, setLoading] = useState(Boolean(patientId));
  const [sheetOpen, setSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(activityLogService.todayKey());
  const [minutesText, setMinutesText] = useState('');
  const [caloriesText, setCaloriesText] = useState('');
  const [noteText, setNoteText] = useState('');

  const load = useCallback(async () => {
    if (!patientId) {
      setSummary(null);
      setLoading(false);
      return;
    }
    try {
      const data = await activityLogService.getWeekSummary(patientId);
      setSummary(data);
    } catch {
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    void load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const openForDay = async (dateKey: string) => {
    if (!patientId) return;
    setSelectedDate(dateKey);
    const existing = await activityLogService.getDay(patientId, dateKey);
    setMinutesText(existing?.minutes ? String(existing.minutes) : '');
    setCaloriesText(existing?.calories ? String(existing.calories) : '');
    setNoteText(existing?.note ?? '');
    setSheetOpen(true);
  };

  const openForToday = () => {
    void openForDay(activityLogService.todayKey());
  };

  const closeSheet = () => {
    setSheetOpen(false);
    setMinutesText('');
    setCaloriesText('');
    setNoteText('');
  };

  const handleSave = async () => {
    if (!patientId) return;
    const minutes = Number(minutesText.trim());
    if (!Number.isFinite(minutes) || minutes < 0) {
      showToast.error('Activity', 'Enter valid active minutes for the day.');
      return;
    }
    const calories = caloriesText.trim() ? Number(caloriesText.trim()) : undefined;
    if (calories !== undefined && (!Number.isFinite(calories) || calories < 0)) {
      showToast.error('Activity', 'Enter valid calories or leave blank.');
      return;
    }

    try {
      setSaving(true);
      const updated = await activityLogService.saveDay(patientId, {
        date: selectedDate,
        minutes,
        calories,
        note: noteText,
      });
      setSummary(updated);
      showToast.success('Activity saved', 'Your daily activity was updated.');
      closeSheet();
    } catch {
      showToast.error('Activity', 'Could not save activity. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const selectedDayMeta = summary?.days.find((d) => d.date === selectedDate);

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator color={D.primary} />
      </View>
    );
  }

  const days = summary?.days ?? [];
  const activeDays = summary?.activeDays ?? 0;
  const totalMinutes = summary?.totalMinutes ?? 0;
  const totalCalories = summary?.totalCalories ?? 0;

  return (
    <View style={s.wrap}>
      <View style={s.header}>
        <Text style={s.sectionLabel}>ACTIVITY THIS WEEK</Text>
        <Pressable
          style={({ pressed }) => [s.addBtn, pressed && s.addBtnPressed]}
          onPress={openForToday}
          disabled={!patientId}
          accessibilityLabel="Add activity for today"
        >
          <Plus size={18} color={D.onPrimary} />
        </Pressable>
      </View>

      <View style={s.legendBlock}>
        <Text style={s.legendTitle}>Color intensity</Text>
        <View style={s.intensityLegend}>
          {INTENSITY_LEGEND.map((item) => (
            <View key={item.label} style={s.legendItem}>
              <View style={[s.legendSwatch, { backgroundColor: cellColor(D, item.intensity) }]} />
              <Text style={s.legendText}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={s.heatmapWrap}>
        <View style={s.dayLabelRow}>
          {days.map((day) => (
            <View key={`${day.date}-day`} style={s.dayLabelCell}>
              <Text style={s.dayLabel}>{day.dayLabel}</Text>
            </View>
          ))}
        </View>
        <View style={s.dateLabelRow}>
          {days.map((day) => (
            <View key={`${day.date}-date`} style={s.dayLabelCell}>
              <Text style={s.dateLabel}>{day.dateLabel}</Text>
            </View>
          ))}
        </View>
        <View style={s.heatRow}>
          {days.map((day) => {
            const isToday = day.date === activityLogService.todayKey();
            const isSelected = day.date === selectedDate && sheetOpen;
            return (
              <Pressable
                key={day.date}
                style={[
                  s.heatCell,
                  { backgroundColor: cellColor(D, day.intensity) },
                  isToday && s.heatCellToday,
                  isSelected && s.heatCellSelected,
                ]}
                onPress={() => void openForDay(day.date)}
                disabled={!patientId}
                accessibilityLabel={`Activity on ${day.dateLabel}`}
              />
            );
          })}
        </View>
      </View>

      <View style={s.stat3}>
        {[
          { v: String(activeDays), l: 'Active days' },
          { v: String(totalMinutes), l: 'Min / week' },
          { v: String(totalCalories), l: 'kcal burned' },
        ].map((st) => (
          <View key={st.l} style={s.statBox}>
            <Text style={s.statVal}>{st.v}</Text>
            <Text style={s.statLbl}>{st.l}</Text>
          </View>
        ))}
      </View>

      <Modal visible={sheetOpen} transparent animationType="slide" onRequestClose={closeSheet}>
        <KeyboardAvoidingView
          style={s.modalRoot}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={s.modalBackdrop} onPress={closeSheet} />
          <View style={s.sheet}>
            <View style={s.sheetHead}>
              <View>
                <Text style={s.sheetTitle}>Log activity</Text>
                <Text style={s.sheetSub}>
                  {selectedDayMeta
                    ? `${selectedDayMeta.dayLabel} · ${selectedDayMeta.dateLabel}`
                    : selectedDate}
                </Text>
              </View>
              <Pressable onPress={closeSheet} hitSlop={8}>
                <X size={22} color={D.onSurfaceVariant} />
              </Pressable>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={s.fieldLabel}>Active minutes</Text>
              <TextInput
                style={s.input}
                value={minutesText}
                onChangeText={setMinutesText}
                keyboardType="number-pad"
                placeholder="e.g. 45"
                placeholderTextColor={D.onSurfaceVariant}
              />

              <Text style={s.fieldLabel}>Calories burned (optional)</Text>
              <TextInput
                style={s.input}
                value={caloriesText}
                onChangeText={setCaloriesText}
                keyboardType="number-pad"
                placeholder="Auto-estimated if blank"
                placeholderTextColor={D.onSurfaceVariant}
              />

              <Text style={s.fieldLabel}>Note (optional)</Text>
              <TextInput
                style={[s.input, s.inputMultiline]}
                value={noteText}
                onChangeText={setNoteText}
                placeholder="Walk, gym, cycling…"
                placeholderTextColor={D.onSurfaceVariant}
                multiline
              />

              <Pressable
                style={({ pressed }) => [s.saveBtn, (pressed || saving) && s.saveBtnPressed]}
                onPress={() => void handleSave()}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color={D.onPrimary} />
                ) : (
                  <Text style={s.saveBtnText}>Save activity</Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function createStyles(D: DashboardPalette) {
  return StyleSheet.create({
    wrap: { gap: 12 },
    centered: { paddingVertical: 32, alignItems: 'center' },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    sectionLabel: {
      fontFamily: DF.bold,
      fontSize: 10,
      color: D.onSurfaceVariant,
      letterSpacing: 2,
      textTransform: 'uppercase',
    },
    addBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: D.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addBtnPressed: { opacity: 0.85 },
    legendBlock: { gap: 6 },
    legendTitle: {
      fontFamily: DF.bold,
      fontSize: 9,
      color: D.onSurfaceVariant,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    intensityLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    legendSwatch: {
      width: 12,
      height: 12,
      borderRadius: 3,
      borderWidth: 1,
      borderColor: D.outlineVariant,
    },
    legendText: { fontFamily: DF.medium, fontSize: 9, color: D.onSurfaceVariant },
    heatmapWrap: { gap: 4 },
    dayLabelRow: { flexDirection: 'row', gap: 4 },
    dateLabelRow: { flexDirection: 'row', gap: 4, marginBottom: 2 },
    dayLabelCell: { flex: 1, alignItems: 'center' },
    dayLabel: {
      fontFamily: DF.bold,
      fontSize: 10,
      color: D.onSurface,
      textTransform: 'uppercase',
    },
    dateLabel: {
      fontFamily: DF.medium,
      fontSize: 9,
      color: D.onSurfaceVariant,
    },
    heatRow: { flexDirection: 'row', gap: 4 },
    heatCell: {
      flex: 1,
      aspectRatio: 1,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: D.outlineVariant,
    },
    heatCellToday: {
      borderColor: D.primary,
      borderWidth: 2,
    },
    heatCellSelected: {
      shadowColor: D.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.35,
      shadowRadius: 4,
      elevation: 3,
    },
    stat3: { flexDirection: 'row', gap: 8, marginTop: 4 },
    statBox: {
      flex: 1,
      backgroundColor: D.surfaceContainer,
      borderRadius: 12,
      padding: 8,
      alignItems: 'center',
    },
    statVal: { fontFamily: DF.bold, fontSize: 16, color: D.primary },
    statLbl: {
      fontFamily: DF.bold,
      fontSize: 8,
      color: D.onSurfaceVariant,
      textTransform: 'uppercase',
      marginTop: 2,
      textAlign: 'center',
    },
    modalRoot: { flex: 1, justifyContent: 'flex-end' },
    modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
    sheet: {
      backgroundColor: D.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      paddingBottom: 28,
      maxHeight: '80%',
      borderWidth: 1,
      borderColor: D.outlineVariant,
    },
    sheetHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 16,
    },
    sheetTitle: { fontFamily: DF.bold, fontSize: 18, color: D.onSurface },
    sheetSub: { fontFamily: DF.medium, fontSize: 12, color: D.onSurfaceVariant, marginTop: 4 },
    fieldLabel: {
      fontFamily: DF.bold,
      fontSize: 11,
      color: D.onSurfaceVariant,
      marginBottom: 6,
      marginTop: 8,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    input: {
      borderWidth: 1,
      borderColor: D.outlineVariant,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontFamily: DF.medium,
      fontSize: 15,
      color: D.onSurface,
      backgroundColor: D.surfaceContainerLow,
    },
    inputMultiline: { minHeight: 72, textAlignVertical: 'top' },
    saveBtn: {
      marginTop: 20,
      backgroundColor: D.primary,
      borderRadius: 999,
      paddingVertical: 14,
      alignItems: 'center',
    },
    saveBtnPressed: { opacity: 0.9 },
    saveBtnText: { fontFamily: DF.bold, fontSize: 14, color: D.onPrimary },
  });
}
