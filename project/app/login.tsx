import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import { showToast } from '../components/ToastProvider';
import { needsOnboarding } from '../utils/authRouting';
import { resolveOnboardingRoute } from '../utils/resolveOnboardingRoute';
import { authService } from '../services/authService';
import { AuthColors as C, AuthFont as F } from '../constants/AuthColors';
import { AuthBrandPanel } from '../components/auth/AuthBrandPanel';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID = '784519257059-3pa0ibn4ege37ii6spbo7csdkav7srh0.apps.googleusercontent.com';
const SPLIT_BREAKPOINT = 900;

export default function LoginScreen() {
  const { login, loginWithGoogle } = useAuth();
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const isSplit = width >= SPLIT_BREAKPOINT;
  const isCompact = !isSplit || height < 760;

  const redirectUri = makeRedirectUri({ path: 'auth' });

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: GOOGLE_CLIENT_ID,
    webClientId: GOOGLE_CLIENT_ID,
    redirectUri,
    responseType: 'id_token',
  });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (response?.type === 'success') {
      const id_token = response.authentication?.idToken || response.params?.id_token;
      if (id_token) {
        handleGoogleLogin(id_token);
      } else {
        showToast.error('Google Login', 'No ID Token found');
      }
    } else if (response?.type === 'error') {
      showToast.error('Google Login', 'Authentication failed');
    }
  }, [response]);

  const handleGoogleLogin = async (token: string) => {
    try {
      setIsLoading(true);
      await loginWithGoogle(token);
      const currentUser = await authService.getCurrentUser();
      if (!needsOnboarding(currentUser)) {
        showToast.success('Welcome Back', 'Logged in successfully.');
      }
      router.replace(await resolveOnboardingRoute(currentUser));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Google sign in failed';
      showToast.error('Login Failed', msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      showToast.error('Error', 'Please enter both email and password.');
      return;
    }

    try {
      setIsLoading(true);
      await login(email, password);
      const currentUser = await authService.getCurrentUser();
      if (!needsOnboarding(currentUser)) {
        showToast.success('Welcome Back', 'Logged in successfully.');
      }
      router.replace(await resolveOnboardingRoute(currentUser));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Invalid credentials';
      showToast.error('Login Failed', msg);
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
          <View style={[styles.leftColumn, isCompact && styles.leftColumnCompact]}>
            <View style={[styles.formWrap, isCompact && styles.formWrapCompact]}>
              <View style={[styles.hero, isCompact && styles.heroCompact]}>
                <Text style={[styles.headline, isCompact && styles.headlineCompact]}>Welcome Back!</Text>
                <Text style={[styles.subhead, isCompact && styles.subheadCompact]}>
                  Your health journey continues here.
                </Text>
              </View>

              <View style={[styles.card, isCompact && styles.cardCompact]}>
                <Text style={[styles.label, isCompact && styles.labelCompact]}>Email or Username</Text>
                <View style={[styles.inputWrap, isCompact && styles.inputWrapCompact]}>
                  <Mail size={isCompact ? 16 : 18} color={C.primary} />
                  <TextInput
                    style={[styles.input, isCompact && styles.inputCompact]}
                    placeholder="Enter your email"
                    placeholderTextColor={C.onSurfaceVariant}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <Text style={[styles.label, isCompact && styles.labelCompact]}>Password</Text>
                <View style={[styles.inputWrap, isCompact && styles.inputWrapCompact]}>
                  <Lock size={isCompact ? 16 : 18} color={C.primary} />
                  <TextInput
                    style={[styles.input, isCompact && styles.inputCompact]}
                    placeholder="Enter your password"
                    placeholderTextColor={C.onSurfaceVariant}
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                  />
                  <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                    {showPassword ? (
                      <EyeOff size={isCompact ? 16 : 18} color={C.onSurfaceVariant} />
                    ) : (
                      <Eye size={isCompact ? 16 : 18} color={C.onSurfaceVariant} />
                    )}
                  </Pressable>
                </View>

                <View style={[styles.row, isCompact && styles.rowCompact]}>
                  <Pressable style={styles.rememberRow}>
                    <View style={styles.checkbox} />
                    <Text style={styles.rememberText}>Remember me</Text>
                  </Pressable>
                  <Pressable>
                    <Text style={styles.forgotText}>Forgot Password?</Text>
                  </Pressable>
                </View>

                <Pressable
                  onPress={handleLogin}
                  disabled={isLoading}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    isCompact && styles.primaryBtnCompact,
                    pressed && styles.primaryBtnPressed,
                  ]}
                >
                  {isLoading ? (
                    <ActivityIndicator color={C.onPrimary} />
                  ) : (
                    <Text style={[styles.primaryBtnText, isCompact && styles.primaryBtnTextCompact]}>Login</Text>
                  )}
                </Pressable>

                <View style={[styles.dividerRow, isCompact && styles.dividerRowCompact]}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>OR</Text>
                  <View style={styles.dividerLine} />
                </View>

                <Pressable
                  onPress={() => promptAsync()}
                  disabled={!request || isLoading}
                  style={({ pressed }) => [
                    styles.googleBtn,
                    isCompact && styles.googleBtnCompact,
                    pressed && styles.googleBtnPressed,
                  ]}
                >
                  <View style={styles.googleBadge}>
                    <Text style={styles.googleG}>G</Text>
                  </View>
                  <Text style={styles.googleText}>Sign in with Google</Text>
                </Pressable>
              </View>

              <Pressable
                onPress={() => router.push('/register')}
                style={({ pressed }) => [
                  styles.footerPill,
                  isCompact && styles.footerPillCompact,
                  pressed && styles.footerPillPressed,
                ]}
              >
                <Text style={styles.footerText}>
                  Don't have an account? <Text style={styles.footerBold}>Sign Up</Text>
                </Text>
              </Pressable>
            </View>
          </View>

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
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 16,
    overflow: 'hidden',
  },
  leftColumnCompact: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  formWrap: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    gap: 18,
  },
  formWrapCompact: {
    gap: 12,
  },
  rightColumn: {
    flex: 1,
    minWidth: 380,
    maxWidth: 620,
  },
  hero: { gap: 4 },
  heroCompact: { gap: 2 },
  headline: {
    fontFamily: F.bold,
    fontSize: 30,
    lineHeight: 36,
    color: C.onBackground,
    letterSpacing: -0.5,
  },
  headlineCompact: {
    fontSize: 24,
    lineHeight: 30,
  },
  subhead: {
    fontFamily: F.medium,
    fontSize: 15,
    lineHeight: 22,
    color: C.onSurfaceVariant,
  },
  subheadCompact: {
    fontSize: 13,
    lineHeight: 18,
  },
  card: {
    backgroundColor: C.surfaceContainerLowest,
    borderRadius: 22,
    padding: 22,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    shadowColor: C.secondary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
  cardCompact: {
    borderRadius: 18,
    padding: 16,
  },
  label: {
    fontFamily: F.bold,
    fontSize: 12,
    color: C.secondary,
    marginBottom: 4,
    marginTop: 6,
    marginLeft: 2,
  },
  labelCompact: {
    marginTop: 4,
    marginBottom: 3,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surfaceContainerLow,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    borderRadius: 14,
    height: 48,
    paddingHorizontal: 14,
    gap: 8,
  },
  inputWrapCompact: {
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    fontFamily: F.medium,
    fontSize: 15,
    color: C.onSurface,
  },
  inputCompact: {
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 4,
  },
  rowCompact: {
    marginTop: 4,
    marginBottom: 2,
  },
  rememberRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: C.outline,
  },
  rememberText: {
    fontFamily: F.medium,
    fontSize: 12,
    color: C.onSurfaceVariant,
  },
  forgotText: {
    fontFamily: F.bold,
    fontSize: 12,
    color: C.primary,
  },
  primaryBtn: {
    height: 50,
    borderRadius: 999,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 5,
  },
  primaryBtnCompact: {
    height: 46,
    marginTop: 4,
  },
  primaryBtnPressed: { transform: [{ scale: 0.97 }] },
  primaryBtnText: {
    fontFamily: F.bold,
    fontSize: 17,
    color: C.onPrimary,
  },
  primaryBtnTextCompact: {
    fontSize: 16,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    gap: 10,
  },
  dividerRowCompact: {
    marginVertical: 8,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: C.outlineVariant },
  dividerText: {
    fontFamily: F.bold,
    fontSize: 11,
    color: C.onSurfaceVariant,
    letterSpacing: 1,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    backgroundColor: C.surfaceContainerLowest,
    gap: 8,
  },
  googleBtnCompact: {
    height: 44,
  },
  googleBtnPressed: { backgroundColor: C.surfaceContainerLow },
  googleBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: C.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleG: {
    fontFamily: F.bold,
    fontSize: 15,
    color: '#EA4335',
  },
  googleText: {
    fontFamily: F.bold,
    fontSize: 14,
    color: C.onSurface,
  },
  footerPill: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 999,
    backgroundColor: C.surfaceContainerLow,
    borderWidth: 1,
    borderColor: C.outlineVariant,
  },
  footerPillCompact: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  footerPillPressed: { opacity: 0.85 },
  footerText: {
    fontFamily: F.medium,
    fontSize: 13,
    color: C.onSurfaceVariant,
  },
  footerBold: {
    fontFamily: F.bold,
    color: C.primary,
  },
});
