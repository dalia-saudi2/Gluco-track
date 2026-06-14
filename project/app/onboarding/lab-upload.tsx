import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  HelpCircle,
  Camera,
  Upload,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react-native';
import { apiClient } from '../../config/api';
import { useAuth } from '../../contexts/AuthContext';
import { showToast } from '../../components/ToastProvider';
import { LabOnboardingColors as C } from '../../constants/LabOnboardingColors';

const FONT = {
  medium: 'DMSans_500Medium',
  bold: 'DMSans_700Bold',
};

const PREVIEW_IMAGE =
  'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=800&q=80&auto=format&fit=crop';

const EXTRACTED = [
  { label: 'Glucose', value: '95 mg/dL', color: C.primary, align: 'flex-start' as const },
  { label: 'Cholesterol', value: '180 mg/dL', color: C.secondary, align: 'center' as const },
  { label: 'Blood Pressure', value: '120/80 mmHg', color: C.tertiary, align: 'flex-start' as const },
];

export default function LabUploadScreen() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const isWeb = Platform.OS === 'web';

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const pickImage = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        showToast.error('Permission', 'Photo library access is required.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.85,
      });
      if (!result.canceled && result.assets[0]?.uri) {
        setImageUri(result.assets[0].uri);
      }
    } catch {
      showToast.error('Upload', 'Could not open photo library.');
    }
  };

  const finishOnboarding = async (withRecord: boolean) => {
    try {
      setSubmitting(true);
      if (withRecord && imageUri) {
        await apiClient.createMedicalRecord({
          record_type: 'lab',
          title: 'Lab Results (Onboarding)',
          date: new Date().toISOString(),
          provider: 'Patient Upload',
          content: 'Lab report uploaded during onboarding.',
          record_data: { source: 'onboarding_upload', image_uri: imageUri },
        });
      }
      await apiClient.completeOnboarding();
      await refreshUser();
      showToast.success('Welcome', 'Your health portal is ready.');
      router.replace('/(tabs)');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not complete onboarding.';
      showToast.error('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable style={styles.headerBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color={C.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Step 3 of 3</Text>
        <Pressable style={styles.headerBtn}>
          <HelpCircle size={22} color={C.primary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.titleSection}>
          <Text style={styles.title}>Upload your lab results</Text>
          <Text style={styles.subtitle}>
            Let our AI analyze your reports to track your health journey automatically.
          </Text>
        </View>

        <Pressable onPress={pickImage} style={({ pressed }) => [styles.uploadZone, pressed && styles.uploadPressed]}>
          <View style={styles.uploadIcons}>
            <View style={[styles.uploadCircle, styles.uploadCirclePrimary]}>
              <Camera size={28} color={C.primary} />
            </View>
            <View style={[styles.uploadCircle, styles.uploadCircleSecondary]}>
              <Upload size={28} color={C.secondary} />
            </View>
          </View>
          <Text style={styles.uploadTitle}>Tap to take a photo or upload PDF</Text>
          <Text style={styles.uploadSub}>Supports JPG, PNG, or PDF files</Text>
        </Pressable>

        <View style={styles.previewSection}>
          <View style={styles.previewHeader}>
            <Text style={styles.previewLabel}>Scanned Preview</Text>
            <Pressable>
              <Text style={styles.editLink}>Edit extracted values</Text>
            </Pressable>
          </View>

          <View style={styles.previewCard}>
            <View style={styles.previewImageWrap}>
              <Image
                source={{ uri: imageUri || PREVIEW_IMAGE }}
                style={styles.previewImage}
                blurRadius={imageUri ? 0 : 6}
              />
              <View style={styles.aiBadge}>
                <Text style={styles.aiBadgeText}>AI Verified</Text>
              </View>
              <View style={styles.chipOverlay}>
                {EXTRACTED.map((item) => (
                  <View key={item.label} style={[styles.extractChip, { alignSelf: item.align }]}>
                    {!isWeb ? (
                      <BlurView intensity={60} tint="light" style={StyleSheet.absoluteFill} />
                    ) : (
                      <View style={styles.extractChipBg} />
                    )}
                    <CheckCircle2 size={14} color="#22c55e" />
                    <Text style={styles.extractText}>
                      {item.label}: <Text style={{ color: item.color, fontFamily: FONT.bold }}>{item.value}</Text>
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {!isWeb && <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />}
        <Pressable
          onPress={() => finishOnboarding(true)}
          disabled={submitting}
          style={({ pressed }) => [styles.confirmBtn, pressed && styles.confirmPressed]}
        >
          {submitting ? (
            <ActivityIndicator color={C.onPrimary} />
          ) : (
            <>
              <Text style={styles.confirmText}>Confirm & Continue</Text>
              <ArrowRight size={22} color={C.onPrimary} />
            </>
          )}
        </Pressable>
        <Pressable onPress={() => finishOnboarding(false)} disabled={submitting}>
          <Text style={styles.skipText}>Skip for now</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: C.outlineVariant,
    backgroundColor: C.surface,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: FONT.bold,
    fontSize: 18,
    color: C.primary,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 200,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
    gap: 32,
  },
  titleSection: { gap: 8 },
  title: {
    fontFamily: FONT.bold,
    fontSize: 30,
    lineHeight: 36,
    color: C.onBackground,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: FONT.medium,
    fontSize: 16,
    lineHeight: 24,
    color: C.onSurfaceVariant,
  },
  uploadZone: {
    borderWidth: 3,
    borderColor: C.primary,
    borderStyle: 'dashed',
    borderRadius: 24,
    backgroundColor: C.surfaceContainerLowest,
    padding: 40,
    alignItems: 'center',
    gap: 16,
  },
  uploadPressed: { backgroundColor: 'rgba(255,214,238,0.35)' },
  uploadIcons: { flexDirection: 'row', gap: 16 },
  uploadCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadCirclePrimary: {
    backgroundColor: C.primaryFixed,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 4,
  },
  uploadCircleSecondary: {
    backgroundColor: C.secondaryFixed,
    shadowColor: C.secondary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 4,
  },
  uploadTitle: {
    fontFamily: FONT.bold,
    fontSize: 18,
    color: C.onSurface,
    textAlign: 'center',
  },
  uploadSub: {
    fontFamily: FONT.medium,
    fontSize: 14,
    color: C.onSurfaceVariant,
    textAlign: 'center',
  },
  previewSection: { gap: 16 },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  previewLabel: {
    fontFamily: FONT.bold,
    fontSize: 12,
    color: C.secondary,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  editLink: {
    fontFamily: FONT.bold,
    fontSize: 14,
    color: C.primary,
  },
  previewCard: {
    borderRadius: 16,
    backgroundColor: C.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(238,220,255,0.5)',
    padding: 16,
    shadowColor: C.secondary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 4,
  },
  previewImageWrap: {
    height: 256,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: C.surfaceVariant,
    position: 'relative',
  },
  previewImage: { width: '100%', height: '100%', opacity: 0.85 },
  aiBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: C.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  aiBadgeText: {
    fontFamily: FONT.bold,
    fontSize: 10,
    color: C.onPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipOverlay: {
    ...StyleSheet.absoluteFillObject,
    padding: 24,
    justifyContent: 'space-between',
  },
  extractChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(224,64,160,0.2)',
    overflow: 'hidden',
    maxWidth: '90%',
  },
  extractChipBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  extractText: {
    fontFamily: FONT.bold,
    fontSize: 14,
    color: C.onSurface,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: C.surfaceVariant,
    backgroundColor: Platform.OS === 'web' ? 'rgba(255,255,255,0.88)' : 'transparent',
    overflow: 'hidden',
  },
  confirmBtn: {
    height: 64,
    borderRadius: 999,
    backgroundColor: C.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  confirmPressed: { transform: [{ scale: 0.96 }] },
  confirmText: {
    fontFamily: FONT.bold,
    fontSize: 18,
    color: C.onPrimary,
  },
  skipText: {
    fontFamily: FONT.bold,
    fontSize: 14,
    color: C.onSurfaceVariant,
    textAlign: 'center',
    paddingVertical: 8,
  },
});
