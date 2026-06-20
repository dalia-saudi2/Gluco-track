import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { ArrowLeft, HelpCircle, Camera, Upload, Info } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../config/api';
import { showToast } from '../../components/ToastProvider';
import { LabOnboardingColors as C } from '../../constants/LabOnboardingColors';
import { resolveOnboardingRoute } from '../../utils/resolveOnboardingRoute';
import { replaceOnboardingStep } from '../../utils/onboardingNavigation';
import { exitLabUploadFlow, peekLabUploadReturnTo } from '../../utils/labUploadReturn';
import { authService } from '../../services/authService';
import { useOnboardingNav } from '../../utils/useOnboardingNav';

const FONT = { medium: 'DMSans_500Medium', bold: 'DMSans_700Bold' };

async function uploadPickedAsset(asset: ImagePicker.ImagePickerAsset) {
  const name = asset.fileName || `lab-${Date.now()}.jpg`;
  const type = asset.mimeType || 'image/jpeg';

  if (Platform.OS === 'web' && asset.uri.startsWith('blob:')) {
    const blob = await fetch(asset.uri).then((r) => r.blob());
    return apiClient.uploadLabFile(blob);
  }

  return apiClient.uploadLabFile({ uri: asset.uri, name, type });
}

export default function LabUploadScreen() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const { goBack, canGoBack, stepInfo } = useOnboardingNav('lab-upload');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleUploadSuccess = async () => {
    showToast.success('Upload complete', 'Review extracted values next.');
    await refreshUser();
    const currentUser = await authService.getCurrentUser();

    if (currentUser?.onboarding_completed || peekLabUploadReturnTo()) {
      replaceOnboardingStep(router, '/onboarding/lab-review');
      return;
    }

    const next = await resolveOnboardingRoute(currentUser);
    replaceOnboardingStep(router, next);
  };

  const hasReturnRoute = Boolean(peekLabUploadReturnTo());

  const handleBack = () => {
    if (exitLabUploadFlow(router)) return;
    goBack();
  };

  const runUpload = async (runner: () => Promise<void>) => {
    try {
      setUploading(true);
      await runner();
      handleUploadSuccess();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Upload failed.';
      showToast.error('Upload', msg);
    } finally {
      setUploading(false);
    }
  };

  const pickFromLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showToast.error('Permission', 'Photo library access is required.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setFileName(asset.fileName || 'lab-image.jpg');
    await runUpload(async () => {
      await uploadPickedAsset(asset);
    });
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      showToast.error('Permission', 'Camera access is required.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.9 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setFileName('camera-capture.jpg');
    await runUpload(async () => {
      await uploadPickedAsset(asset);
    });
  };

  const onWebFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    await runUpload(async () => {
      await apiClient.uploadLabFile(file);
    });
    event.target.value = '';
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        {canGoBack || hasReturnRoute ? (
          <Pressable style={styles.headerBtn} onPress={handleBack}>
            <ArrowLeft size={22} color={C.primary} />
          </Pressable>
        ) : (
          <View style={styles.headerBtn} />
        )}
        <Text style={styles.headerTitle}>{stepInfo.label}</Text>
        <Pressable style={styles.headerBtn}>
          <HelpCircle size={22} color={C.primary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.titleSection}>
          <Text style={styles.title}>Upload your lab results</Text>
          <Text style={styles.subtitle}>
            Photograph or upload your report. We extract lipids and blood pressure only.
          </Text>
        </View>

        <View style={styles.tipCard}>
          <Text style={styles.tipTitle}>Tip</Text>
          <Text style={styles.tipBody}>
            Make sure the report is flat, well-lit, and all values are visible.
          </Text>
        </View>

        <View style={styles.infoBox}>
          <Info size={18} color={C.secondary} />
          <Text style={styles.infoText}>
            We only extract cholesterol, blood pressure, and lipid values. Glucose and HbA1c are not used by our
            model — using them would make diabetes prediction circular.
          </Text>
        </View>

        <View style={styles.uploadZone}>
          <View style={styles.uploadIcons}>
            <Pressable
              onPress={takePhoto}
              disabled={uploading}
              style={[styles.uploadCircle, styles.uploadCirclePrimary]}
            >
              <Camera size={28} color={C.primary} />
            </Pressable>
            <Pressable
              onPress={pickFromLibrary}
              disabled={uploading}
              style={[styles.uploadCircle, styles.uploadCircleSecondary]}
            >
              <Upload size={28} color={C.secondary} />
            </Pressable>
          </View>
          <Text style={styles.uploadTitle}>Take a photo or upload a file</Text>
          <Text style={styles.uploadSub}>Supports JPG, PNG, or PDF</Text>
          {Platform.OS === 'web' ? (
            <>
              {/* @ts-expect-error web input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,application/pdf"
                style={{ display: 'none' }}
                onChange={onWebFileChange}
              />
              <Pressable
                onPress={() => fileInputRef.current?.click()}
                disabled={uploading}
                style={styles.webFileBtn}
              >
                <Text style={styles.webFileBtnText}>Choose PDF or image</Text>
              </Pressable>
            </>
          ) : null}
          {fileName ? <Text style={styles.fileName}>Selected: {fileName}</Text> : null}
          {uploading ? <ActivityIndicator color={C.primary} style={{ marginTop: 12 }} /> : null}
        </View>
      </ScrollView>
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
  headerBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: FONT.bold, fontSize: 18, color: C.primary },
  scroll: { padding: 24, paddingBottom: 48, maxWidth: 520, width: '100%', alignSelf: 'center', gap: 20 },
  titleSection: { gap: 8 },
  title: { fontFamily: FONT.bold, fontSize: 28, lineHeight: 34, color: C.onBackground },
  subtitle: { fontFamily: FONT.medium, fontSize: 16, lineHeight: 24, color: C.onSurfaceVariant },
  tipCard: {
    backgroundColor: C.primaryFixed,
    borderRadius: 16,
    padding: 16,
    gap: 4,
  },
  tipTitle: { fontFamily: FONT.bold, fontSize: 14, color: C.primary },
  tipBody: { fontFamily: FONT.medium, fontSize: 14, lineHeight: 20, color: C.onSurface },
  infoBox: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: C.secondaryFixed,
    borderRadius: 14,
    padding: 14,
    alignItems: 'flex-start',
  },
  infoText: { flex: 1, fontFamily: FONT.medium, fontSize: 13, lineHeight: 19, color: C.onSurfaceVariant },
  uploadZone: {
    borderWidth: 3,
    borderColor: C.primary,
    borderStyle: 'dashed',
    borderRadius: 24,
    backgroundColor: C.surfaceContainerLowest,
    padding: 32,
    alignItems: 'center',
    gap: 12,
  },
  uploadIcons: { flexDirection: 'row', gap: 16 },
  uploadCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadCirclePrimary: { backgroundColor: C.primaryFixed },
  uploadCircleSecondary: { backgroundColor: C.secondaryFixed },
  uploadTitle: { fontFamily: FONT.bold, fontSize: 17, color: C.onSurface, textAlign: 'center' },
  uploadSub: { fontFamily: FONT.medium, fontSize: 14, color: C.onSurfaceVariant, textAlign: 'center' },
  webFileBtn: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: C.primary,
  },
  webFileBtnText: { fontFamily: FONT.bold, fontSize: 14, color: C.onPrimary },
  fileName: { fontFamily: FONT.medium, fontSize: 13, color: C.secondary, marginTop: 4 },
});
