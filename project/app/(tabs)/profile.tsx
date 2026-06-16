import React, { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Edit3, Bell, Shield, HelpCircle, Settings } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useLogoutAndRedirect } from '../../hooks/useLogoutAndRedirect';
import { useTheme } from '../../contexts/ThemeContext';
import { apiClient } from '../../config/api';
import { googleAuthService } from '../../services/googleAuthService';
import { showToast } from '../../components/ToastProvider';
import { VitalisProfileScreen } from '../../components/vitalis/VitalisProfileScreen';
import { D_LIGHT } from '../../constants/DashboardColors';

const menuItems = [
  { id: 'edit', label: 'Edit Profile', icon: Edit3, color: D_LIGHT.primary },
  { id: 'notifications', label: 'Notifications', icon: Bell, color: D_LIGHT.secondary },
  { id: 'privacy', label: 'Privacy & Security', icon: Shield, color: D_LIGHT.green },
  { id: 'help', label: 'Help & Support', icon: HelpCircle, color: D_LIGHT.orange },
  { id: 'settings', label: 'Settings', icon: Settings, color: D_LIGHT.onSurfaceVariant },
];

export default function ProfileScreen() {
  const { user, isAuthenticated, isLoading: authIsLoading, refreshUser, loginWithGoogle } = useAuth();
  const handleLogout = useLogoutAndRedirect();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);

  const [editForm, setEditForm] = useState({
    full_name: '',
    phone: '',
    date_of_birth: '',
    blood_type: '',
    emergency_contact: '',
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [profileCompletenessPct, setProfileCompletenessPct] = useState<number | undefined>();

  useFocusEffect(
    useCallback(() => {
      if (!isAuthenticated) return;
      (async () => {
        try {
          const summary = await apiClient.getRiskSummary();
          setProfileCompletenessPct(summary.profile_completeness_pct);
        } catch {
          setProfileCompletenessPct(undefined);
        }
      })();
    }, [isAuthenticated])
  );

  const mockProfileData = {
    name: 'User',
    email: 'user@email.com',
    phone: 'Not provided',
    dateOfBirth: 'Not provided',
    bloodType: 'Not provided',
    emergencyContact: 'Not provided',
  };

  const formatDate = (dateString?: string | null): string => {
    if (!dateString) return 'Not provided';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const profileData = user
    ? {
        name: user.full_name || mockProfileData.name,
        email: user.email || mockProfileData.email,
        phone: user.phone || mockProfileData.phone,
        dateOfBirth: formatDate(user.date_of_birth),
        bloodType: user.blood_type || mockProfileData.bloodType,
        emergencyContact: user.emergency_contact || mockProfileData.emergencyContact,
      }
    : mockProfileData;

  const initials = (user?.full_name || 'Patient')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    if (user) {
      setEditForm({
        full_name: user.full_name || '',
        phone: user.phone || '',
        date_of_birth: user.date_of_birth || '',
        blood_type: user.blood_type || '',
        emergency_contact: user.emergency_contact || '',
      });
    }
  }, [user]);

  const handleRefresh = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsRefreshing(true);
    try {
      await refreshUser();
    } catch (err) {
      console.error('Error refreshing user data:', err);
      setError('Failed to refresh profile. Please try again.');
    } finally {
      setIsRefreshing(false);
    }
  }, [isAuthenticated, refreshUser]);

  const handleEditProfile = () => {
    if (!isAuthenticated) {
      Alert.alert('Authentication Required', 'Please login to edit your profile.');
      router.push('/login');
      return;
    }
    setEditModalVisible(true);
  };

  const handleSaveProfile = async () => {
    if (!isAuthenticated) return;
    setIsSaving(true);
    try {
      const updateData: Record<string, string> = {};
      if (editForm.full_name) updateData.full_name = editForm.full_name;
      if (editForm.phone) updateData.phone = editForm.phone;
      if (editForm.date_of_birth) updateData.date_of_birth = editForm.date_of_birth;
      if (editForm.blood_type) updateData.blood_type = editForm.blood_type;
      if (editForm.emergency_contact) updateData.emergency_contact = editForm.emergency_contact;

      await apiClient.updateUser(updateData);
      await refreshUser();
      setEditModalVisible(false);
      showToast.success('Profile Updated', 'Your profile has been updated successfully!');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update profile. Please try again.';
      console.error('Error updating profile:', err);
      showToast.error('Update Failed', message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = () => {
    if (!isAuthenticated) {
      Alert.alert('Authentication Required', 'Please login to change your password.');
      router.push('/login');
      return;
    }
    setPasswordModalVisible(true);
  };

  const handleSavePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      Alert.alert('Error', 'Please fill in all password fields.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      Alert.alert('Error', 'New passwords do not match.');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long.');
      return;
    }

    setIsChangingPassword(true);
    try {
      await apiClient.changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordModalVisible(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      showToast.success('Password Changed', 'Your password has been changed successfully!');
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to change password. Please check your current password and try again.';
      console.error('Error changing password:', err);
      showToast.error('Password Change Failed', message);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleConnectGoogle = async () => {
    if (!isAuthenticated) {
      Alert.alert('Authentication Required', 'Please login to connect your Google account.');
      router.push('/login');
      return;
    }

    if (user?.google_id) {
      Alert.alert(
        'Google Account Connected',
        'Your account is already connected to Google. You can sign in using Google on the login screen.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsConnectingGoogle(true);
    try {
      if (!googleAuthService.isConfigured()) {
        const redirectUri = googleAuthService.getRedirectUri();
        Alert.alert(
          'Google Sign-In Not Configured',
          `Please configure your Google Client ID first.\n\nAdd it to .env: EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-client-id\n\nRedirect URI:\n${redirectUri}`,
          [{ text: 'OK' }]
        );
        return;
      }

      const googleResult = await googleAuthService.signIn();
      if (!googleResult.idToken) {
        Alert.alert('Error', 'Failed to get Google authentication token. Please try again.');
        return;
      }

      await loginWithGoogle(googleResult.idToken);
      await refreshUser();
      Alert.alert('Success', 'Google account connected successfully!');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect Google account.';
      console.error('Error connecting Google:', err);
      Alert.alert('Error', errorMessage);
    } finally {
      setIsConnectingGoogle(false);
    }
  };

  const closePasswordModal = () => {
    setPasswordModalVisible(false);
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  return (
    <VitalisProfileScreen
      userName={user?.full_name || 'Patient'}
      profileData={profileData}
      initials={initials}
      authIsLoading={authIsLoading}
      isRefreshing={isRefreshing}
      error={error}
      isAuthenticated={isAuthenticated}
      googleConnected={!!user?.google_id}
      theme={theme}
      onToggleTheme={toggleTheme}
      onRefresh={handleRefresh}
      onRetry={handleRefresh}
      onLogout={handleLogout}
      onEditProfile={handleEditProfile}
      onChangePassword={handleChangePassword}
      onConnectGoogle={handleConnectGoogle}
      isConnectingGoogle={isConnectingGoogle}
      editModalVisible={editModalVisible}
      onCloseEditModal={() => setEditModalVisible(false)}
      editForm={editForm}
      onEditFormChange={(field, value) => setEditForm((prev) => ({ ...prev, [field]: value }))}
      onSaveProfile={handleSaveProfile}
      isSaving={isSaving}
      passwordModalVisible={passwordModalVisible}
      onClosePasswordModal={closePasswordModal}
      passwordForm={passwordForm}
      onPasswordFormChange={(field, value) => setPasswordForm((prev) => ({ ...prev, [field]: value }))}
      showPasswords={showPasswords}
      onToggleShowPassword={(field) => setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }))}
      onSavePassword={handleSavePassword}
      isChangingPassword={isChangingPassword}
      menuItems={menuItems}
      profileCompletenessPct={profileCompletenessPct}
      labUploadPending={user?.lab_upload_pending}
      onUploadLab={() => router.push('/onboarding/lab-upload' as never)}
    />
  );
}
