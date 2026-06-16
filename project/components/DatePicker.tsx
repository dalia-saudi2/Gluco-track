import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Pressable,
  Modal,
  ScrollView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar as CalendarIcon } from 'lucide-react-native';
import { Calendar } from 'react-native-calendars';
import { OnboardingColors as C, OnboardingTypography as T } from '../constants/OnboardingColors';
import {
  clampIsoDateToBounds,
  toIsoDate,
} from '../utils/onboardingValidation';

interface DatePickerProps {
  value?: string | null;
  onChange: (date: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  maximumDate?: Date;
  minimumDate?: Date;
  mode?: 'date' | 'time' | 'datetime';
  variant?: 'default' | 'onboarding';
  desktop?: boolean;
  hint?: string;
}

const ONBOARDING_FONT = {
  bold: 'DMSans_700Bold',
  medium: 'DMSans_500Medium',
};

function formatDisplayDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const dd = date.getDate().toString().padStart(2, '0');
  const mm = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${dd}/${mm}/${year}`;
}

function defaultCalendarMonth(value?: string | null, maximumDate?: Date): string {
  if (value) return value;
  const anchor = maximumDate ? new Date(maximumDate) : new Date();
  anchor.setFullYear(anchor.getFullYear() - 25);
  return toIsoDate(anchor);
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

type DayMonthYearModalProps = {
  visible: boolean;
  value?: string | null;
  maximumDate?: Date;
  minimumDate?: Date;
  onClose: () => void;
  onSelect: (iso: string) => void;
  primaryColor?: string;
};

function DayMonthYearModal({
  visible,
  value,
  maximumDate,
  minimumDate,
  onClose,
  onSelect,
  primaryColor = '#e040a0',
}: DayMonthYearModalProps) {
  const minYear = minimumDate?.getFullYear() ?? 1920;
  const maxYear = maximumDate?.getFullYear() ?? new Date().getFullYear();
  const defaultYear = maxYear - 25;

  const initial = useMemo(() => {
    if (value) {
      const [y, m, d] = value.split('-').map(Number);
      return { year: y, month: m, day: d };
    }
    return { year: defaultYear, month: 6, day: 15 };
  }, [value, defaultYear]);

  const [day, setDay] = useState(initial.day);
  const [month, setMonth] = useState(initial.month);
  const [year, setYear] = useState(initial.year);

  useEffect(() => {
    if (visible) {
      setDay(initial.day);
      setMonth(initial.month);
      setYear(initial.year);
    }
  }, [visible, initial.day, initial.month, initial.year]);

  const years = useMemo(
    () => Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i),
    [minYear, maxYear]
  );
  const maxDay = daysInMonth(year, month);
  const days = useMemo(() => Array.from({ length: maxDay }, (_, i) => i + 1), [maxDay]);

  useEffect(() => {
    if (day > maxDay) setDay(maxDay);
  }, [day, maxDay]);

  const handleConfirm = () => {
    const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const clamped = clampIsoDateToBounds(iso);
    if (clamped) {
      onSelect(clamped);
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={calendarModalStyles.overlay} onPress={onClose}>
        <Pressable style={calendarModalStyles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={calendarModalStyles.title}>Choose day, month & year</Text>
          <View style={dmyStyles.row}>
            <View style={dmyStyles.col}>
              <Text style={dmyStyles.colTitle}>Day</Text>
              <ScrollView style={dmyStyles.colScroll} showsVerticalScrollIndicator={false}>
                {days.map((d) => (
                  <Pressable
                    key={d}
                    onPress={() => setDay(d)}
                    style={[dmyStyles.option, d === day && { backgroundColor: `${primaryColor}18` }]}
                  >
                    <Text style={[dmyStyles.optionText, d === day && dmyStyles.optionSelected]}>
                      {d}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
            <View style={dmyStyles.col}>
              <Text style={dmyStyles.colTitle}>Month</Text>
              <ScrollView style={dmyStyles.colScroll} showsVerticalScrollIndicator={false}>
                {MONTH_NAMES.map((name, idx) => {
                  const m = idx + 1;
                  return (
                    <Pressable
                      key={name}
                      onPress={() => setMonth(m)}
                      style={[dmyStyles.option, m === month && { backgroundColor: `${primaryColor}18` }]}
                    >
                      <Text style={[dmyStyles.optionText, m === month && dmyStyles.optionSelected]}>
                        {name.slice(0, 3)}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
            <View style={dmyStyles.col}>
              <Text style={dmyStyles.colTitle}>Year</Text>
              <ScrollView style={dmyStyles.colScroll} showsVerticalScrollIndicator={false}>
                {years.map((y) => (
                  <Pressable
                    key={y}
                    onPress={() => setYear(y)}
                    style={[dmyStyles.option, y === year && { backgroundColor: `${primaryColor}18` }]}
                  >
                    <Text style={[dmyStyles.optionText, y === year && dmyStyles.optionSelected]}>
                      {y}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </View>
          <Pressable style={[dmyStyles.confirmBtn, { backgroundColor: primaryColor }]} onPress={handleConfirm}>
            <Text style={dmyStyles.confirmText}>Confirm date</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const dmyStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, height: 220 },
  col: { flex: 1 },
  colTitle: {
    fontFamily: ONBOARDING_FONT.bold,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#604868',
    textAlign: 'center',
    marginBottom: 8,
  },
  colScroll: { flex: 1, borderRadius: 12, backgroundColor: '#f8eef8' },
  option: { paddingVertical: 10, paddingHorizontal: 8, alignItems: 'center' },
  optionText: { fontFamily: ONBOARDING_FONT.medium, fontSize: 14, color: '#2e1a28' },
  optionSelected: { color: '#e040a0', fontFamily: ONBOARDING_FONT.bold },
  confirmBtn: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: 'center',
  },
  confirmText: { fontFamily: ONBOARDING_FONT.bold, fontSize: 14, color: '#fff' },
});

type CalendarModalProps = {
  visible: boolean;
  value?: string | null;
  maximumDate?: Date;
  minimumDate?: Date;
  onClose: () => void;
  onSelect: (iso: string) => void;
  primaryColor?: string;
};

function CalendarModal({
  visible,
  value,
  maximumDate,
  minimumDate,
  onClose,
  onSelect,
  primaryColor = '#e040a0',
}: CalendarModalProps) {
  const maxIso = maximumDate ? toIsoDate(maximumDate) : undefined;
  const minIso = minimumDate ? toIsoDate(minimumDate) : undefined;
  const currentMonth = defaultCalendarMonth(value, maximumDate);

  const markedDates = useMemo(() => {
    if (!value) return {};
    return {
      [value]: {
        selected: true,
        selectedColor: primaryColor,
      },
    };
  }, [value, primaryColor]);

  const handleDayPress = (day: { dateString: string }) => {
    const clamped = clampIsoDateToBounds(day.dateString);
    if (clamped) {
      onSelect(clamped);
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={calendarModalStyles.overlay} onPress={onClose}>
        <Pressable style={calendarModalStyles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={calendarModalStyles.title}>Select date of birth</Text>
          <Calendar
            current={currentMonth}
            onDayPress={handleDayPress}
            maxDate={maxIso}
            minDate={minIso}
            markedDates={markedDates}
            enableSwipeMonths
            theme={{
              todayTextColor: primaryColor,
              selectedDayBackgroundColor: primaryColor,
              arrowColor: primaryColor,
              monthTextColor: '#201a1d',
              textDayFontFamily: 'DMSans_500Medium',
              textMonthFontFamily: 'DMSans_700Bold',
              textDayHeaderFontFamily: 'DMSans_700Bold',
            }}
          />
          <Pressable onPress={onClose} style={calendarModalStyles.doneBtn}>
            <Text style={calendarModalStyles.doneText}>Done</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  placeholder = 'Select date',
  label,
  error,
  maximumDate,
  minimumDate,
  mode = 'date',
  variant = 'default',
  desktop = false,
  hint,
}) => {
  const [showNativePicker, setShowNativePicker] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(
    value ? new Date(`${value}T12:00:00`) : new Date()
  );

  const isOnboarding = variant === 'onboarding';
  const showFloatingLabel = isOnboarding && Boolean(value);
  const useCalendarModal = mode === 'date';

  const handleDateChange = (event: { type: string }, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowNativePicker(false);
    }

    if (event.type === 'dismissed') {
      setShowNativePicker(false);
      return;
    }

    if (date) {
      setSelectedDate(date);
      const clamped = clampIsoDateToBounds(toIsoDate(date));
      if (clamped) onChange(clamped);
      if (Platform.OS === 'ios') {
        setShowNativePicker(false);
      }
    }
  };

  const openPicker = () => {
    if (useCalendarModal) {
      setShowCalendarModal(true);
      return;
    }
    setShowNativePicker(true);
  };

  const displayValue = value ? formatDisplayDate(value) : '';

  if (isOnboarding) {
    return (
      <View style={onboardingStyles.wrap}>
        {label ? (
          <Text style={[onboardingStyles.sectionLabel, desktop && onboardingStyles.sectionLabelDesktop]}>
            {label}
          </Text>
        ) : null}
        <Pressable
          onPress={openPicker}
          accessibilityLabel={label || placeholder}
          accessibilityRole="button"
          style={({ pressed }) => [
            onboardingStyles.field,
            desktop && onboardingStyles.fieldDesktop,
            (showFloatingLabel || showCalendarModal) && onboardingStyles.fieldActive,
            error && onboardingStyles.fieldError,
            pressed && onboardingStyles.fieldPressed,
            Platform.OS === 'web' && onboardingStyles.fieldWeb,
          ]}
        >
          {showFloatingLabel ? <Text style={onboardingStyles.floatingLabel}>{label}</Text> : null}
          <View style={onboardingStyles.triggerRow}>
            <CalendarIcon size={desktop ? 18 : 20} color={C.primary} style={onboardingStyles.icon} />
            <Text style={onboardingStyles.nativeText}>{displayValue}</Text>
          </View>
        </Pressable>
        {!value && hint ? <Text style={onboardingStyles.hintText}>{hint}</Text> : null}
        {error ? <Text style={onboardingStyles.errorText}>{error}</Text> : null}
        {useCalendarModal ? (
          <DayMonthYearModal
            visible={showCalendarModal}
            value={value}
            maximumDate={maximumDate}
            minimumDate={minimumDate}
            onClose={() => setShowCalendarModal(false)}
            onSelect={onChange}
            primaryColor={C.primary}
          />
        ) : null}
        {showNativePicker && !useCalendarModal && Platform.OS !== 'web' ? (
          <DateTimePicker
            value={selectedDate}
            mode={mode}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
            maximumDate={maximumDate}
            minimumDate={minimumDate}
          />
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <Pressable
        onPress={openPicker}
        accessibilityLabel={label || placeholder}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.inputContainer,
          error && styles.inputError,
          pressed && styles.inputPressed,
          Platform.OS === 'web' && styles.inputWeb,
        ]}
      >
        <CalendarIcon size={20} color="#64748b" style={styles.icon} />
        <Text style={[styles.inputText, !value && styles.placeholder]}>{displayValue}</Text>
      </Pressable>
      {useCalendarModal ? (
        <CalendarModal
          visible={showCalendarModal}
          value={value}
          maximumDate={maximumDate}
          minimumDate={minimumDate}
          onClose={() => setShowCalendarModal(false)}
          onSelect={onChange}
        />
      ) : null}
      {showNativePicker && !useCalendarModal && Platform.OS !== 'web' ? (
        <DateTimePicker
          value={selectedDate}
          mode={mode}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          maximumDate={maximumDate}
          minimumDate={minimumDate}
        />
      ) : null}
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const calendarModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(32, 26, 29, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f2dde7',
    shadowColor: '#e040a0',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  title: {
    fontSize: 16,
    fontFamily: ONBOARDING_FONT.bold,
    color: '#201a1d',
    textAlign: 'center',
    marginBottom: 8,
  },
  doneBtn: {
    marginTop: 8,
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  doneText: {
    fontSize: 14,
    fontFamily: ONBOARDING_FONT.bold,
    color: '#e040a0',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});

const onboardingStyles = StyleSheet.create({
  wrap: { gap: 12 },
  sectionLabel: {
    ...T.labelSm,
    fontFamily: ONBOARDING_FONT.bold,
    color: C.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 2,
    paddingLeft: 4,
  },
  sectionLabelDesktop: {
    fontSize: 10,
    letterSpacing: 1.4,
    marginBottom: -2,
  },
  field: {
    borderWidth: 2,
    borderColor: C.surfaceContainerHighest,
    borderRadius: 999,
    minHeight: 56,
    justifyContent: 'center',
    paddingHorizontal: 20,
    backgroundColor: C.surfaceContainerLowest,
  },
  fieldDesktop: { minHeight: 44 },
  fieldActive: { borderColor: C.primary, paddingTop: 14 },
  fieldError: { borderColor: '#ef4444' },
  fieldPressed: { opacity: 0.92 },
  fieldWeb: {
    cursor: 'pointer',
  } as object,
  floatingLabel: {
    position: 'absolute',
    top: -10,
    left: 20,
    backgroundColor: C.surfaceContainerLowest,
    paddingHorizontal: 8,
    fontSize: 12,
    fontFamily: ONBOARDING_FONT.bold,
    color: C.primary,
  },
  triggerRow: { flexDirection: 'row', alignItems: 'center' },
  icon: { marginRight: 12 },
  nativeText: {
    flex: 1,
    ...T.bodyLg,
    fontFamily: ONBOARDING_FONT.bold,
    color: C.onSurface,
  },
  placeholder: {
    color: C.onSurfaceVariant,
    fontFamily: ONBOARDING_FONT.medium,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 12,
    fontFamily: ONBOARDING_FONT.medium,
    color: '#ef4444',
    paddingLeft: 4,
  },
  hintText: {
    fontSize: 13,
    fontFamily: ONBOARDING_FONT.medium,
    color: C.onSurfaceVariant,
    paddingLeft: 4,
    marginTop: 6,
  },
});

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#374151',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  inputPressed: {
    opacity: 0.92,
  },
  inputWeb: {
    cursor: 'pointer',
  } as object,
  icon: {
    marginRight: 12,
  },
  inputText: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#1e293b',
  },
  placeholder: {
    color: '#94a3b8',
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#ef4444',
    marginTop: 4,
    marginLeft: 4,
  },
});
