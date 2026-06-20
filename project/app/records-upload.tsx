import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { ArrowLeft, Camera, Upload } from 'lucide-react-native';
import { apiClient } from '../config/api';
import { showToast } from '../components/ToastProvider';
import { DF, DashboardPalette } from '../constants/DashboardColors';
import { useD, useDashboardStyles } from '../hooks/useDashboardTheme';

async function uploadPickedAsset(asset: ImagePicker.ImagePickerAsset) {
  const name = asset.fileName || `record-${Date.now()}.jpg`;
  const type = asset.mimeType || 'image/jpeg';

  if (Platform.OS === 'web' && asset.uri.startsWith('blob:')) {
    const blob = await fetch(asset.uri).then((r) => r.blob());
    return apiClient.uploadLabFile(blob);
  }

  return apiClient.uploadLabFile({ uri: asset.uri, name, type });
}

function createStyles(D: DashboardPalette) {
  return {
    safe: { flex: 1, backgroundColor: D.background },
    header: {
      height: 64,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      borderBottomWidth: 1,
      borderBottomColor: D.borderSubtle,
      backgroundColor: D.surface,
    },
    headerBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: D.surfaceContainer,
    },
    headerTitle: { fontFamily: DF.bold, fontSize: 18, color: D.onSurface },
    scroll: { padding: 24, paddingBottom: 48, maxWidth: 520, width: '100%', alignSelf: 'center', gap: 20 },
    titleSection: { gap: 8 },
    title: { fontFamily: DF.bold, fontSize: 26, lineHeight: 32, color: D.onSurface },
    subtitle: { fontFamily: DF.medium, fontSize: 15, lineHeight: 22, color: D.onSurfaceVariant },
    uploadZone: {
      borderWidth: 2,
      borderColor: D.primary,
      borderStyle: 'dashed',
      borderRadius: 24,
      backgroundColor: D.surfaceContainerLow,
      padding: 32,
      alignItems: 'center',
      gap: 12,
    },
    uploadIcons: { flexDirection: 'row', gap: 16 },
    uploadCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    uploadCirclePrimary: { backgroundColor: D.primaryFixed },
    uploadCircleSecondary: { backgroundColor: D.secondaryContainer },
    uploadTitle: { fontFamily: DF.bold, fontSize: 17, color: D.onSurface, textAlign: 'center' },
    uploadSub: { fontFamily: DF.medium, fontSize: 14, color: D.onSurfaceVariant, textAlign: 'center' },
    webFileBtn: {
      marginTop: 8,
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 999,
      backgroundColor: D.primary,
    },
    webFileBtnText: { fontFamily: DF.bold, fontSize: 14, color: D.onPrimary },
    fileName: { fontFamily: DF.medium, fontSize: 13, color: D.secondary, marginTop: 4 },
  };
}

export default function RecordsUploadScreen() {
  const router = useRouter();
  const D = useD();
  const styles = useDashboardStyles(createStyles);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleUploadSuccess = () => {
    showToast.success('Report uploaded', 'Your record was scanned and saved.');
    router.replace('/(tabs)/records');
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
    setFileName(asset.fileName || 'record-image.jpg');
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
    setFileName('camera-scan.jpg');
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
        <Pressable style={styles.headerBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color={D.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Upload Records</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.titleSection}>
          <Text style={styles.title}>Upload or scan your reports</Text>
          <Text style={styles.subtitle}>
            Add lab results, imaging reports, or other medical documents to your records.
          </Text>
        </View>

        <View style={styles.uploadZone}>
          <View style={styles.uploadIcons}>
            <Pressable
              onPress={takePhoto}
              disabled={uploading}
              style={[styles.uploadCircle, styles.uploadCirclePrimary]}
            >
              <Camera size={28} color={D.primary} />
            </Pressable>
            <Pressable
              onPress={pickFromLibrary}
              disabled={uploading}
              style={[styles.uploadCircle, styles.uploadCircleSecondary]}
            >
              <Upload size={28} color={D.secondary} />
            </Pressable>
          </View>
          <Text style={styles.uploadTitle}>Scan or upload a file</Text>
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
          {uploading ? <ActivityIndicator color={D.primary} style={{ marginTop: 12 }} /> : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
