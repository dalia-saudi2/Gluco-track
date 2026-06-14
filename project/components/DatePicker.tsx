import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar } from 'lucide-react-native';

interface DatePickerProps {
  value?: string | null;
  onChange: (date: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  maximumDate?: Date;
  minimumDate?: Date;
  mode?: 'date' | 'time' | 'datetime';
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
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(
    value ? new Date(value) : new Date()
  );

  const formatDate = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    
    if (date) {
      setSelectedDate(date);
      // Format as YYYY-MM-DD for backend
      const isoDate = date.toISOString().split('T')[0];
      onChange(isoDate);
    }
  };

  const displayValue = value 
    ? formatDate(new Date(value))
    : placeholder;

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity
        style={[styles.inputContainer, error && styles.inputError]}
        onPress={() => setShowPicker(true)}
        accessibilityLabel={label || placeholder}
        accessibilityRole="button"
      >
        <Calendar size={20} color="#64748b" style={styles.icon} />
        <Text style={[styles.inputText, !value && styles.placeholder]}>
          {displayValue}
        </Text>
      </TouchableOpacity>
      {error && <Text style={styles.errorText}>{error}</Text>}
      
      {showPicker && (
        <DateTimePicker
          value={selectedDate}
          mode={mode}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          maximumDate={maximumDate}
          minimumDate={minimumDate}
          onTouchCancel={() => Platform.OS === 'ios' && setShowPicker(false)}
        />
      )}
      
      {Platform.OS === 'ios' && showPicker && (
        <View style={styles.iosButtonContainer}>
          <TouchableOpacity
            style={styles.iosButton}
            onPress={() => setShowPicker(false)}
          >
            <Text style={styles.iosButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

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
  iosButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 8,
  },
  iosButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  iosButtonText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#2563eb',
  },
});
