import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Alert, Dimensions } from 'react-native';
import { ArrowLeft, Pill, RefreshCw, CheckCircle, Clock, User, Calendar } from 'lucide-react-native';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

const mockMedications = [
  { id: 1, name: 'Paracetamol', dosage: '2 pill(s) Daily', remaining: 15, expiryDate: '2025-06-15' },
  { id: 2, name: 'Metformin', dosage: '2 pill(s) Daily', remaining: 8, expiryDate: '2025-08-20' },
  { id: 3, name: 'Amoxicillin', dosage: '2 pill(s) Daily', remaining: 12, expiryDate: '2025-07-10' },
  { id: 4, name: 'Aspirin', dosage: '1 pill(s) Daily', remaining: 20, expiryDate: '2025-09-05' },
  { id: 5, name: 'Vitamin D', dosage: '1 pill(s) Daily', remaining: 5, expiryDate: '2025-05-30' },
  { id: 6, name: 'Calcium', dosage: '2 pill(s) Daily', remaining: 18, expiryDate: '2025-10-12' },
  { id: 7, name: 'Iron Supplement', dosage: '1 pill(s) Daily', remaining: 10, expiryDate: '2025-07-25' },
  { id: 8, name: 'Omega-3', dosage: '2 pill(s) Daily', remaining: 7, expiryDate: '2025-06-18' },
];

export default function MedicationRefillScreen() {
  const [selectedMedications, setSelectedMedications] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleMedicationSelect = (medicationId: number) => {
    setSelectedMedications(prev => 
      prev.includes(medicationId) 
        ? prev.filter(id => id !== medicationId)
        : [...prev, medicationId]
    );
  };

  const handleSubmitRequest = async () => {
    if (selectedMedications.length === 0) {
      Alert.alert('No Selection', 'Please select at least one medication to refill.');
      return;
    }

    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      Alert.alert(
        'Request Submitted', 
        `Refill request submitted for ${selectedMedications.length} medication(s). You will receive a confirmation within 24 hours.`,
        [
          {
            text: 'OK',
            onPress: () => router.back()
          }
        ]
      );
    }, 2000);
  };

  const getUrgencyColor = (remaining: number) => {
    if (remaining <= 5) return '#ef4444'; // Red - urgent
    if (remaining <= 10) return '#f59e0b'; // Orange - moderate
    return '#10b981'; // Green - good
  };

  const getUrgencyText = (remaining: number) => {
    if (remaining <= 5) return 'Urgent';
    if (remaining <= 10) return 'Moderate';
    return 'Good';
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="#1E3A8A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Request Medication Refill</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Instructions */}
          <View style={styles.instructionsCard}>
            <View style={styles.instructionsHeader}>
              <RefreshCw size={20} color="#3b82f6" />
              <Text style={styles.instructionsTitle}>How it works</Text>
            </View>
            <Text style={styles.instructionsText}>
              Select the medications you need to refill. Your request will be sent to your pharmacy and doctor for approval. You'll receive a notification when your refill is ready for pickup.
            </Text>
          </View>

          {/* Medications List */}
          <View style={styles.medicationsSection}>
            <Text style={styles.sectionTitle}>Select Medications to Refill</Text>
            <Text style={styles.sectionSubtitle}>
              {selectedMedications.length} of {mockMedications.length} selected
            </Text>

            {mockMedications.map((medication) => (
              <TouchableOpacity
                key={medication.id}
                style={[
                  styles.medicationCard,
                  selectedMedications.includes(medication.id) && styles.selectedMedicationCard
                ]}
                onPress={() => handleMedicationSelect(medication.id)}
              >
                <View style={styles.medicationLeft}>
                  <View style={styles.medicationIcon}>
                    <Pill size={20} color="#3b82f6" />
                  </View>
                  <View style={styles.medicationInfo}>
                    <Text style={styles.medicationName}>{medication.name}</Text>
                    <Text style={styles.medicationDosage}>{medication.dosage}</Text>
                    <View style={styles.medicationDetails}>
                      <View style={styles.detailItem}>
                        <Clock size={14} color="#6b7280" />
                        <Text style={styles.detailText}>{medication.remaining} pills remaining</Text>
                      </View>
                      <View style={styles.detailItem}>
                        <Calendar size={14} color="#6b7280" />
                        <Text style={styles.detailText}>Expires: {medication.expiryDate}</Text>
                      </View>
                    </View>
                  </View>
                </View>

                <View style={styles.medicationRight}>
                  <View style={[
                    styles.urgencyBadge,
                    { backgroundColor: getUrgencyColor(medication.remaining) }
                  ]}>
                    <Text style={styles.urgencyText}>{getUrgencyText(medication.remaining)}</Text>
                  </View>
                  {selectedMedications.includes(medication.id) && (
                    <CheckCircle size={24} color="#10b981" />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              selectedMedications.length === 0 && styles.disabledButton
            ]}
            onPress={handleSubmitRequest}
            disabled={selectedMedications.length === 0 || isSubmitting}
          >
            <RefreshCw size={20} color="#ffffff" />
            <Text style={styles.submitButtonText}>
              {isSubmitting ? 'Submitting...' : `Submit Refill Request (${selectedMedications.length})`}
            </Text>
          </TouchableOpacity>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: '#1E3A8A',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  instructionsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  instructionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  instructionsTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#1E3A8A',
  },
  instructionsText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#6b7280',
    lineHeight: 20,
  },
  medicationsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: '#1E3A8A',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#6b7280',
    marginBottom: 16,
  },
  medicationCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  selectedMedicationCard: {
    borderColor: '#3b82f6',
    backgroundColor: '#f0f9ff',
  },
  medicationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  medicationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  medicationInfo: {
    flex: 1,
  },
  medicationName: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#1E3A8A',
    marginBottom: 2,
  },
  medicationDosage: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#6b7280',
    marginBottom: 8,
  },
  medicationDetails: {
    gap: 4,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#6b7280',
  },
  medicationRight: {
    alignItems: 'center',
    gap: 8,
  },
  urgencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  urgencyText: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: '#ffffff',
  },
  submitButton: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 24,
    gap: 8,
  },
  disabledButton: {
    backgroundColor: '#d1d5db',
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#ffffff',
  },
});

