import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Mail,
  Lock,
  Phone,
  User,
  ArrowLeft,
  Eye,
  EyeOff,
  HelpCircle,
} from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import { showToast } from '../components/ToastProvider';
import { AuthColors as C, AuthFont as F } from '../constants/AuthColors';
import { AuthBrandPanel } from '../components/auth/AuthBrandPanel';
import { AuthTextField } from '../components/auth/AuthTextField';
import { resolveOnboardingRoute } from '../utils/resolveOnboardingRoute';
import { authService } from '../services/authService';
import { validateRegistration } from '../utils/authValidation';

const SPLIT_BREAKPOINT = 900;

export default function RegisterScreen() {
  const { register } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isSplit = width >= SPLIT_BREAKPOINT;

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pwFocused, setPwFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);

  const handleRegister = async () => {
    const validation = validateRegistration({
      name,
      email,
      phone,
      password,
      confirmPassword,
    });

    if (!validation.ok) {
      showToast.error('Validation Error', validation.message);
      return;
    }

    try {
      setIsLoading(true);
      await register({
        email: validation.email,
        password,
        full_name: name.trim(),
        phone: phone.trim(),
      });

      showToast.success('Account Created', 'Welcome! Complete your profile next.');
      const user = await authService.getCurrentUser();
      router.replace(await resolveOnboardingRoute(user));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'An error occurred';
      showToast.error('Registration Failed', msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <View style={[styles.shell, isSplit && styles.shellSplit]}>
          <ScrollView
            style={styles.leftColumn}
            contentContainerStyle={styles.leftScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.topBar}>
              <Pressable style={styles.iconBtn} onPress={() => router.back()}>
                <ArrowLeft size={22} color={C.primary} />
              </Pressable>
              <Text style={styles.topBarTitle}>Sign Up</Text>
              <Pressable style={styles.iconBtn}>
                <HelpCircle size={22} color={C.primary} />
              </Pressable>
            </View>

            {!isSplit && <AuthBrandPanel compact />}

            <View style={styles.hero}>
              <Text style={styles.headline}>Create your account</Text>
              <Text style={styles.subhead}>
                Enter your details to start your personalized health journey.
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.label}>Name</Text>
              <AuthTextField
                icon={<User size={18} color={C.primary} />}
                idlePlaceholder="Full name"
                value={name}
                onChangeText={setName}
              />

              <Text style={styles.label}>Phone Number</Text>
              <AuthTextField
                icon={<Phone size={18} color={C.primary} />}
                idlePlaceholder="Mobile number"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />

              <Text style={styles.label}>Email</Text>
              <AuthTextField
                icon={<Mail size={18} color={C.primary} />}
                idlePlaceholder="Email address"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />

              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrap}>
                <Lock size={18} color={C.primary} />
                <TextInput
                  style={styles.input}
                  placeholder={pwFocused || password ? '' : 'Create password'}
                  placeholderTextColor={C.onSurfaceVariant}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setPwFocused(true)}
                  onBlur={() => setPwFocused(false)}
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                  {showPassword ? (
                    <EyeOff size={18} color={C.onSurfaceVariant} />
                  ) : (
                    <Eye size={18} color={C.onSurfaceVariant} />
                  )}
                </Pressable>
              </View>

              <Text style={styles.label}>Confirm Password</Text>
              <View style={styles.inputWrap}>
                <Lock size={18} color={C.primary} />
                <TextInput
                  style={styles.input}
                  placeholder={confirmFocused || confirmPassword ? '' : 'Confirm password'}
                  placeholderTextColor={C.onSurfaceVariant}
                  secureTextEntry={!showPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  onFocus={() => setConfirmFocused(true)}
                  onBlur={() => setConfirmFocused(false)}
                />
              </View>

              <Pressable
                onPress={handleRegister}
                disabled={isLoading}
                style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}
              >
                {isLoading ? (
                  <ActivityIndicator color={C.onPrimary} />
                ) : (
                  <Text style={styles.primaryBtnText}>Sign Up</Text>
                )}
              </Pressable>
            </View>

            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [styles.footerPill, pressed && styles.footerPillPressed]}
            >
              <Text style={styles.footerText}>
                Already have an account? <Text style={styles.footerBold}>Login</Text>
              </Text>
            </Pressable>
          </ScrollView>

          {isSplit && (
            <View style={styles.rightColumn}>
              <AuthBrandPanel />
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  flex: { flex: 1 },
  shell: { flex: 1 },
  shellSplit: { flexDirection: 'row' },
  leftColumn: {
    flex: 1,
    backgroundColor: C.background,
  },
  leftScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 24,
    gap: 20,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
  },
  rightColumn: {
    flex: 1,
    minWidth: 380,
    maxWidth: 620,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontFamily: F.bold,
    fontSize: 18,
    color: C.primary,
  },
  hero: { gap: 6 },
  headline: {
    fontFamily: F.bold,
    fontSize: 30,
    lineHeight: 36,
    color: C.onBackground,
    letterSpacing: -0.5,
  },
  subhead: {
    fontFamily: F.medium,
    fontSize: 15,
    lineHeight: 22,
    color: C.onSurfaceVariant,
  },
  card: {
    backgroundColor: C.surfaceContainerLowest,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    shadowColor: C.secondary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 4,
  },
  label: {
    fontFamily: F.bold,
    fontSize: 13,
    color: C.secondary,
    marginBottom: 6,
    marginTop: 10,
    marginLeft: 4,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surfaceContainerLow,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    borderRadius: 16,
    height: 52,
    paddingHorizontal: 16,
    gap: 10,
  },
  input: {
    flex: 1,
    fontFamily: F.medium,
    fontSize: 15,
    color: C.onSurface,
  },
  primaryBtn: {
    height: 56,
    borderRadius: 999,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  primaryBtnPressed: { transform: [{ scale: 0.97 }] },
  primaryBtnText: {
    fontFamily: F.bold,
    fontSize: 18,
    color: C.onPrimary,
  },
  footerPill: {
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 999,
    backgroundColor: C.surfaceContainerLow,
    borderWidth: 1,
    borderColor: C.outlineVariant,
  },
  footerPillPressed: { opacity: 0.85 },
  footerText: {
    fontFamily: F.medium,
    fontSize: 14,
    color: C.onSurfaceVariant,
  },
  footerBold: {
    fontFamily: F.bold,
    color: C.primary,
  },
});
