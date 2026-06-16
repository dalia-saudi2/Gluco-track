import React, { ReactNode, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Switch,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import {
  User,
  Edit3,
  Bell,
  Shield,
  HelpCircle,
  Settings,
  LogOut,
  Lock,
  Eye,
  EyeOff,
  CheckCircle,
  Moon,
  Sun,
  RefreshCw,
  AlertTriangle,
  Save,
  X,
  Phone,
  Droplets,
  HeartPulse,
  Mail,
} from 'lucide-react-native';
import { CandyCard } from '../dashboard/CandyCard';
import { DF, DashboardPalette } from '../../constants/DashboardColors';
import { useD } from '../../hooks/useDashboardTheme';
import { createDashboardScreenTheme } from '../../hooks/dashboardScreenTheme';
import { VitalisShell } from './VitalisShell';
import { DatePicker } from '../DatePicker';
import { PasswordStrength } from '../PasswordStrength';
import { ProfileCompletenessCard } from '../profile/ProfileCompletenessCard';

export type ProfileData = {
  name: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  bloodType: string;
  emergencyContact: string;
};

export type EditForm = {
  full_name: string;
  phone: string;
  date_of_birth: string;
  blood_type: string;
  emergency_contact: string;
};

export type PasswordForm = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type MenuItem = {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  color: string;
};

type Props = {
  userName?: string;
  profileData: ProfileData;
  initials: string;
  authIsLoading?: boolean;
  isRefreshing?: boolean;
  error?: string | null;
  isAuthenticated?: boolean;
  googleConnected?: boolean;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onRefresh?: () => void;
  onRetry?: () => void;
  onLogout?: () => void;
  onEditProfile: () => void;
  onChangePassword: () => void;
  onConnectGoogle: () => void;
  isConnectingGoogle?: boolean;
  editModalVisible: boolean;
  onCloseEditModal: () => void;
  editForm: EditForm;
  onEditFormChange: (field: keyof EditForm, value: string) => void;
  onSaveProfile: () => void;
  isSaving?: boolean;
  passwordModalVisible: boolean;
  onClosePasswordModal: () => void;
  passwordForm: PasswordForm;
  onPasswordFormChange: (field: keyof PasswordForm, value: string) => void;
  showPasswords: { current: boolean; new: boolean; confirm: boolean };
  onToggleShowPassword: (field: 'current' | 'new' | 'confirm') => void;
  onSavePassword: () => void;
  isChangingPassword?: boolean;
  menuItems: MenuItem[];
  profileCompletenessPct?: number;
  labUploadPending?: boolean;
  onUploadLab?: () => void;
};

const { ScreenThemeProvider, useScreenTheme } = createDashboardScreenTheme<ReturnType<typeof createStyles>>();

function SectionLabel({ children }: { children: string }) {
  const { s } = useScreenTheme();
  return <Text style={s.sectionLabel}>{children}</Text>;
}

function InfoRow({
  label,
  value,
  icon: Icon,
  iconColor,
  iconBg,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  iconColor: string;
  iconBg: string;
}) {
  const { s } = useScreenTheme();
  return (
    <View style={s.infoRow}>
      <View style={s.infoLeft}>
        <View style={[s.infoIcon, { backgroundColor: iconBg }]}>
          <Icon size={16} color={iconColor} />
        </View>
        <Text style={s.infoLabel}>{label}</Text>
      </View>
      <Text style={s.infoValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function MenuRow({
  item,
  onPress,
  right,
  subtext,
}: {
  item: MenuItem;
  onPress?: () => void;
  right?: ReactNode;
  subtext?: string;
}) {
  const { s } = useScreenTheme();
  const Icon = item.icon;
  const content = (
    <View style={s.menuRow}>
      <View style={s.menuLeft}>
        <View style={[s.menuIcon, { backgroundColor: `${item.color}18` }]}>
          <Icon size={18} color={item.color} />
        </View>
        <View style={s.menuTextWrap}>
          <Text style={s.menuLabel}>{item.label}</Text>
          {subtext ? <Text style={s.menuSub}>{subtext}</Text> : null}
        </View>
      </View>
      {right ?? <Text style={s.menuArrow}>›</Text>}
    </View>
  );
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => pressed && s.pressed}>
        {content}
      </Pressable>
    );
  }
  return content;
}

export function VitalisProfileScreen({
  userName = 'Patient',
  profileData,
  initials,
  authIsLoading,
  isRefreshing,
  error,
  isAuthenticated,
  googleConnected,
  theme,
  onToggleTheme,
  onRefresh,
  onRetry,
  onLogout,
  onEditProfile,
  onChangePassword,
  onConnectGoogle,
  isConnectingGoogle,
  editModalVisible,
  onCloseEditModal,
  editForm,
  onEditFormChange,
  onSaveProfile,
  isSaving,
  passwordModalVisible,
  onClosePasswordModal,
  passwordForm,
  onPasswordFormChange,
  showPasswords,
  onToggleShowPassword,
  onSavePassword,
  isChangingPassword,
  menuItems,
  profileCompletenessPct,
  labUploadPending,
  onUploadLab,
}: Props) {
  const D = useD();
  const s = useMemo(() => StyleSheet.create(createStyles(D)), [D]);

  return (
    <ScreenThemeProvider D={D} s={s}>
    <VitalisShell
      activeNavId="profile"
      userName={userName}
      onLogout={onLogout}
      refreshing={isRefreshing}
      onRefresh={onRefresh}
    >
      <View style={s.page}>
        <View style={s.pageHead}>
          <View>
            <Text style={s.pageTitle}>Profile</Text>
            <Text style={s.pageSub}>Manage your account & health preferences</Text>
          </View>
        </View>

        {authIsLoading ? (
          <CandyCard style={s.centerCard}>
            <ActivityIndicator size="large" color={D.primary} />
            <Text style={s.loadingText}>Loading profile...</Text>
          </CandyCard>
        ) : error ? (
          <CandyCard style={s.centerCard}>
            <AlertTriangle size={40} color={D.error} />
            <Text style={s.errorText}>{error}</Text>
            <Pressable style={s.primaryBtn} onPress={onRetry}>
              <RefreshCw size={16} color={D.onPrimary} />
              <Text style={s.primaryBtnText}>Retry</Text>
            </Pressable>
          </CandyCard>
        ) : (
          <>
            <CandyCard style={s.heroCard} accent="primary">
              <View style={s.heroTop}>
                <View style={s.avatar}>
                  <Text style={s.avatarText}>{initials}</Text>
                </View>
                <View style={s.heroInfo}>
                  <Text style={s.heroName}>{profileData.name}</Text>
                  <View style={s.emailRow}>
                    <Mail size={12} color={D.onSurfaceVariant} />
                    <Text style={s.heroEmail}>{profileData.email}</Text>
                  </View>
                </View>
              </View>
              <Pressable style={s.editBtn} onPress={onEditProfile}>
                <Edit3 size={14} color={D.primary} />
                <Text style={s.editBtnText}>Edit Profile</Text>
              </Pressable>
            </CandyCard>

            <View>
              <SectionLabel>Personal Information</SectionLabel>
              <CandyCard style={s.sectionCard}>
                <InfoRow
                  label="Phone"
                  value={profileData.phone}
                  icon={Phone}
                  iconColor={D.secondary}
                  iconBg="rgba(124,82,170,0.12)"
                />
                <View style={s.divider} />
                <InfoRow
                  label="Date of Birth"
                  value={profileData.dateOfBirth}
                  icon={User}
                  iconColor={D.primary}
                  iconBg="rgba(224,64,160,0.12)"
                />
                <View style={s.divider} />
                <InfoRow
                  label="Blood Type"
                  value={profileData.bloodType}
                  icon={Droplets}
                  iconColor={D.error}
                  iconBg="rgba(229,62,62,0.1)"
                />
                <View style={s.divider} />
                <InfoRow
                  label="Emergency Contact"
                  value={profileData.emergencyContact}
                  icon={HeartPulse}
                  iconColor={D.tertiary}
                  iconBg="rgba(0,150,204,0.12)"
                />
              </CandyCard>
            </View>

            {profileCompletenessPct != null ? (
              <ProfileCompletenessCard
                D={D}
                pct={profileCompletenessPct}
                labPending={Boolean(labUploadPending)}
                onUploadLab={onUploadLab}
              />
            ) : null}

            <View>
              <SectionLabel>Appearance</SectionLabel>
              <CandyCard style={s.sectionCard}>
                <MenuRow
                  item={{ id: 'theme', label: 'Dark Mode', icon: theme === 'dark' ? Moon : Sun, color: D.orange }}
                  subtext={theme === 'dark' ? 'Yes' : 'No'}
                  right={
                    <Switch
                      value={theme === 'dark'}
                      onValueChange={onToggleTheme}
                      trackColor={{ false: D.surfaceContainerHigh, true: D.primary }}
                      thumbColor={D.surface}
                    />
                  }
                />
              </CandyCard>
            </View>

            <View>
              <SectionLabel>Security</SectionLabel>
              <CandyCard style={s.sectionCard}>
                <MenuRow
                  item={{ id: 'password', label: 'Change Password', icon: Lock, color: D.primary }}
                  onPress={onChangePassword}
                />
                <View style={s.divider} />
                <MenuRow
                  item={{
                    id: 'google',
                    label: googleConnected ? 'Google Account Connected' : 'Connect Google Account',
                    icon: googleConnected ? CheckCircle : User,
                    color: googleConnected ? D.green : D.orange,
                  }}
                  onPress={onConnectGoogle}
                  subtext={googleConnected ? 'Your account is linked to Google' : undefined}
                  right={isConnectingGoogle ? <ActivityIndicator size="small" color={D.primary} /> : <Text style={s.menuArrow}>›</Text>}
                />
              </CandyCard>
            </View>

            <View>
              <SectionLabel>Account Settings</SectionLabel>
              <CandyCard style={s.sectionCard}>
                {menuItems.map((item, index) => (
                  <React.Fragment key={item.id}>
                    {index > 0 && <View style={s.divider} />}
                    <MenuRow item={item} />
                  </React.Fragment>
                ))}
              </CandyCard>
            </View>

            <Pressable style={s.logoutBtn} onPress={onLogout}>
              <LogOut size={18} color={D.error} />
              <Text style={s.logoutText}>Sign Out</Text>
            </Pressable>

            {!isAuthenticated && (
              <Text style={s.guestNote}>Sign in to sync your profile across devices.</Text>
            )}
          </>
        )}
      </View>

      <Modal visible={editModalVisible} animationType="slide" transparent>
        <View style={s.modalBackdrop}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Edit Profile</Text>
              <Pressable onPress={onCloseEditModal} style={s.modalClose}>
                <X size={20} color={D.onSurfaceVariant} />
              </Pressable>
            </View>
            <ScrollView style={s.modalBody} showsVerticalScrollIndicator={false}>
              <View style={s.formGroup}>
                <Text style={s.formLabel}>Full Name</Text>
                <TextInput
                  style={s.formInput}
                  value={editForm.full_name}
                  onChangeText={(t) => onEditFormChange('full_name', t)}
                  placeholder="Enter your full name"
                  placeholderTextColor={D.onSurfaceVariant}
                />
              </View>
              <View style={s.formGroup}>
                <Text style={s.formLabel}>Phone Number</Text>
                <TextInput
                  style={s.formInput}
                  value={editForm.phone}
                  onChangeText={(t) => onEditFormChange('phone', t)}
                  placeholder="Enter your phone number"
                  placeholderTextColor={D.onSurfaceVariant}
                  keyboardType="phone-pad"
                />
              </View>
              <View style={s.formGroup}>
                <DatePicker
                  label="Date of Birth"
                  value={editForm.date_of_birth}
                  onChange={(date) => onEditFormChange('date_of_birth', date)}
                  placeholder="Select your date of birth"
                  maximumDate={new Date()}
                />
              </View>
              <View style={s.formGroup}>
                <Text style={s.formLabel}>Blood Type</Text>
                <TextInput
                  style={s.formInput}
                  value={editForm.blood_type}
                  onChangeText={(t) => onEditFormChange('blood_type', t)}
                  placeholder="e.g., A+, O-, B+"
                  placeholderTextColor={D.onSurfaceVariant}
                />
              </View>
              <View style={s.formGroup}>
                <Text style={s.formLabel}>Emergency Contact</Text>
                <TextInput
                  style={s.formInput}
                  value={editForm.emergency_contact}
                  onChangeText={(t) => onEditFormChange('emergency_contact', t)}
                  placeholder="Name and phone number"
                  placeholderTextColor={D.onSurfaceVariant}
                />
              </View>
            </ScrollView>
            <View style={s.modalActions}>
              <Pressable style={s.cancelBtn} onPress={onCloseEditModal}>
                <Text style={s.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={[s.primaryBtn, isSaving && s.btnDisabled]} onPress={onSaveProfile} disabled={isSaving}>
                {isSaving ? (
                  <ActivityIndicator size="small" color={D.onPrimary} />
                ) : (
                  <>
                    <Save size={16} color={D.onPrimary} />
                    <Text style={s.primaryBtnText}>Save</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={passwordModalVisible} animationType="slide" transparent>
        <View style={s.modalBackdrop}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Change Password</Text>
              <Pressable onPress={onClosePasswordModal} style={s.modalClose}>
                <X size={20} color={D.onSurfaceVariant} />
              </Pressable>
            </View>
            <ScrollView style={s.modalBody} showsVerticalScrollIndicator={false}>
              {(['current', 'new', 'confirm'] as const).map((field) => {
                const labels = {
                  current: 'Current Password',
                  new: 'New Password',
                  confirm: 'Confirm New Password',
                };
                const keys = {
                  current: 'currentPassword' as const,
                  new: 'newPassword' as const,
                  confirm: 'confirmPassword' as const,
                };
                return (
                  <View key={field} style={s.formGroup}>
                    <Text style={s.formLabel}>{labels[field]}</Text>
                    <View style={s.passwordWrap}>
                      <TextInput
                        style={s.passwordInput}
                        value={passwordForm[keys[field]]}
                        onChangeText={(t) => onPasswordFormChange(keys[field], t)}
                        placeholder={`Enter ${labels[field].toLowerCase()}`}
                        placeholderTextColor={D.onSurfaceVariant}
                        secureTextEntry={!showPasswords[field]}
                      />
                      <TouchableOpacity onPress={() => onToggleShowPassword(field)} style={s.eyeBtn}>
                        {showPasswords[field] ? (
                          <EyeOff size={18} color={D.onSurfaceVariant} />
                        ) : (
                          <Eye size={18} color={D.onSurfaceVariant} />
                        )}
                      </TouchableOpacity>
                    </View>
                    {field === 'new' && passwordForm.newPassword ? (
                      <PasswordStrength password={passwordForm.newPassword} />
                    ) : null}
                  </View>
                );
              })}
            </ScrollView>
            <View style={s.modalActions}>
              <Pressable style={s.cancelBtn} onPress={onClosePasswordModal}>
                <Text style={s.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[s.primaryBtn, isChangingPassword && s.btnDisabled]}
                onPress={onSavePassword}
                disabled={isChangingPassword}
              >
                {isChangingPassword ? (
                  <ActivityIndicator size="small" color={D.onPrimary} />
                ) : (
                  <>
                    <Lock size={16} color={D.onPrimary} />
                    <Text style={s.primaryBtnText}>Change Password</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </VitalisShell>
    </ScreenThemeProvider>
  );
}

function createStyles(D: DashboardPalette) {
  return {
  page: { gap: 16, paddingBottom: 24 },
  pageHead: { marginBottom: 4 },
  pageTitle: { fontFamily: DF.bold, fontSize: 22, color: D.onSurface },
  pageSub: { fontFamily: DF.medium, fontSize: 12, color: D.onSurfaceVariant, marginTop: 2 },
  sectionLabel: {
    fontFamily: DF.bold,
    fontSize: 10,
    color: D.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  centerCard: { padding: 32, alignItems: 'center', gap: 12 },
  loadingText: { fontFamily: DF.medium, fontSize: 13, color: D.onSurfaceVariant },
  errorText: { fontFamily: DF.medium, fontSize: 13, color: D.onSurfaceVariant, textAlign: 'center' },
  heroCard: { padding: 18, gap: 14 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: D.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: DF.bold, fontSize: 22, color: D.onPrimary },
  heroInfo: { flex: 1 },
  heroName: { fontFamily: DF.bold, fontSize: 18, color: D.onSurface },
  emailRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  heroEmail: { fontFamily: DF.medium, fontSize: 12, color: D.onSurfaceVariant },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: D.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(224,64,160,0.15)',
  },
  editBtnText: { fontFamily: DF.bold, fontSize: 12, color: D.primary },
  sectionCard: { padding: 4 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  infoLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLabel: { fontFamily: DF.medium, fontSize: 12, color: D.onSurfaceVariant },
  infoValue: {
    fontFamily: DF.bold,
    fontSize: 13,
    color: D.onSurface,
    textAlign: 'right',
    maxWidth: '50%',
  },
  divider: { height: 1, backgroundColor: 'rgba(220,200,224,0.45)', marginHorizontal: 14 },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTextWrap: { flex: 1 },
  menuLabel: { fontFamily: DF.bold, fontSize: 13, color: D.onSurface },
  menuSub: { fontFamily: DF.medium, fontSize: 10, color: D.onSurfaceVariant, marginTop: 2 },
  menuArrow: { fontSize: 20, color: D.onSurfaceVariant },
  pressed: { opacity: 0.85 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 20,
    backgroundColor: D.surface,
    borderWidth: 1,
    borderColor: 'rgba(229,62,62,0.2)',
  },
  logoutText: { fontFamily: DF.bold, fontSize: 14, color: D.error },
  guestNote: {
    fontFamily: DF.medium,
    fontSize: 11,
    color: D.onSurfaceVariant,
    textAlign: 'center',
    marginTop: -4,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 999,
    backgroundColor: D.primary,
  },
  primaryBtnText: { fontFamily: DF.bold, fontSize: 13, color: D.onPrimary },
  btnDisabled: { opacity: 0.6 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(46,26,40,0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: D.surface,
    borderRadius: 24,
    padding: 20,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: 'rgba(224,64,160,0.08)',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: { fontFamily: DF.bold, fontSize: 18, color: D.onSurface },
  modalClose: {
    padding: 8,
    borderRadius: 999,
    backgroundColor: D.surfaceContainerLow,
  },
  modalBody: { maxHeight: 380 },
  formGroup: { marginBottom: 14 },
  formLabel: {
    fontFamily: DF.bold,
    fontSize: 10,
    color: D.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: D.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(220,200,224,0.45)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: DF.medium,
    fontSize: 14,
    color: D.onSurface,
  },
  passwordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(220,200,224,0.45)',
    borderRadius: 14,
    backgroundColor: D.surfaceContainerLow,
    paddingHorizontal: 12,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 12,
    fontFamily: DF.medium,
    fontSize: 14,
    color: D.onSurface,
  },
  eyeBtn: { padding: 8 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: 'center',
    backgroundColor: D.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(220,200,224,0.45)',
  },
  cancelBtnText: { fontFamily: DF.bold, fontSize: 13, color: D.onSurfaceVariant },
  };
}
