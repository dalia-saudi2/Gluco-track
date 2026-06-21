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
  Ruler,
  Scale,
} from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import { showToast } from '../components/ToastProvider';
import { AuthColors as C, AuthFont as F } from '../constants/AuthColors';
import { AuthBrandPanel } from '../components/auth/AuthBrandPanel';
import { AuthTextField } from '../components/auth/AuthTextField';
import { GENDER_OPTIONS } from '../utils/featureEnums';
import {
  validateRegistration,
  validateRegistrationAccount,
  validateRegistrationDemographics,
} from '../utils/authValidation';

const SPLIT_BREAKPOINT = 900;

export default function RegisterScreen() {
  const { register } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isSplit = width >= SPLIT_BREAKPOINT;

  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<string | null>(null);
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pwFocused, setPwFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
      return;
    }
    router.back();
  };

  const handleContinue = () => {
    const validation = validateRegistrationAccount({
      name,
      email,
      password,
      confirmPassword,
      phone,
    });
    if (!validation.ok) {
      showToast.error('Validation Error', validation.message);
      return;
    }
    setStep(2);
  };

  const handleRegister = async () => {
    const validation = validateRegistration({
      name,
      email,
      password,
      confirmPassword,
      age,
      gender,
      heightCm,
      weightKg,
      phone,
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
        age: Number(age),
        gender: gender!,
        height_cm: Number(heightCm),
        weight_kg: Number(weightKg),
        phone: phone.trim(),
      });

      showToast.success(
        'Account Created',
        'Please complete your clinical information to enable AI predictions.'
      );
      router.replace('/(tabs)');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'An error occurred';
      showToast.error('Registration Failed', msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStepTwoSubmit = () => {
    const validation = validateRegistrationDemographics({ age, gender, heightCm, weightKg });
    if (!validation.ok) {
      showToast.error('Validation Error', validation.message);
      return;
    }
    void handleRegister();
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
              <Pressable style={styles.iconBtn} onPress={handleBack}>
                <ArrowLeft size={22} color={C.primary} />
              </Pressable>
              <Text style={styles.topBarTitle}>Sign Up</Text>
              <Pressable style={styles.iconBtn}>
                <HelpCircle size={22} color={C.primary} />
              </Pressable>
            </View>

            {!isSplit && <AuthBrandPanel compact />}

            <View style={styles.stepRow}>
              <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]} />
              <View style={[styles.stepLine, step >= 2 && styles.stepLineActive]} />
              <View style={[styles.stepDot, step >= 2 && styles.stepDotActive]} />
            </View>

            <View style={styles.hero}>
              <Text style={styles.headline}>
                {step === 1 ? 'Create your account' : 'Your health profile'}
              </Text>
              <Text style={styles.subhead}>
                {step === 1
                  ? 'Enter your account details to get started.'
                  : 'Add a few details so we can personalize your care.'}
              </Text>
            </View>

            <View style={styles.card}>
              {step === 1 ? (
                <>
                  <Text style={styles.label}>Full Name</Text>
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
                    onPress={handleContinue}
                    style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}
                  >
                    <Text style={styles.primaryBtnText}>Continue</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Text style={styles.label}>Age</Text>
                  <AuthTextField
                    icon={<User size={18} color={C.primary} />}
                    idlePlaceholder="Age in years"
                    keyboardType="number-pad"
                    value={age}
                    onChangeText={setAge}
                  />

                  <Text style={styles.label}>Gender</Text>
                  <View style={styles.genderRow}>
                    {GENDER_OPTIONS.map((opt) => (
                      <Pressable
                        key={opt.value}
                        onPress={() => setGender(opt.value)}
                        style={[styles.genderChip, gender === opt.value && styles.genderChipActive]}
                      >
                        <Text
                          style={[
                            styles.genderChipText,
                            gender === opt.value && styles.genderChipTextActive,
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  <Text style={styles.label}>Height (cm)</Text>
                  <AuthTextField
                    icon={<Ruler size={18} color={C.primary} />}
                    idlePlaceholder="e.g. 170"
                    keyboardType="number-pad"
                    value={heightCm}
                    onChangeText={setHeightCm}
                  />

                  <Text style={styles.label}>Weight (kg)</Text>
                  <AuthTextField
                    icon={<Scale size={18} color={C.primary} />}
                    idlePlaceholder="e.g. 70"
                    keyboardType="number-pad"
                    value={weightKg}
                    onChangeText={setWeightKg}
                  />

                  <Pressable
                    onPress={handleStepTwoSubmit}
                    disabled={isLoading}
                    style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}
                  >
                    {isLoading ? (
                      <ActivityIndicator color={C.onPrimary} />
                    ) : (
                      <Text style={styles.primaryBtnText}>Sign Up</Text>
                    )}
                  </Pressable>
                </>
              )}
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
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
    marginTop: 4,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.outlineVariant,
  },
  stepDotActive: {
    backgroundColor: C.primary,
  },
  stepLine: {
    width: 48,
    height: 3,
    borderRadius: 2,
    backgroundColor: C.outlineVariant,
  },
  stepLineActive: {
    backgroundColor: C.primary,
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
  genderRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  genderChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    backgroundColor: C.surfaceContainerLow,
    alignItems: 'center',
  },
  genderChipActive: { backgroundColor: C.primary, borderColor: C.primary },
  genderChipText: { fontFamily: F.medium, fontSize: 14, color: C.onSurface },
  genderChipTextActive: { color: C.onPrimary },
});
