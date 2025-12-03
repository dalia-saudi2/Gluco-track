import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { Eye, EyeOff, Mail, Lock, Heart } from 'lucide-react-native';
import { apiClient } from '../config/api';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async () => {
    setError(null);
    if (!email || !password || (isSignUp && !fullName.trim())) {
      setError(isSignUp ? 'Please enter your full name, email, and password.' : 'Please enter your email and password.');
      return;
    }
    try {
      setIsLoading(true);
      if (isSignUp) {
        await apiClient.register({ email, password, full_name: fullName.trim() || email.split('@')[0] || 'User' });
      }
      await apiClient.login(email, password);
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(e?.message ? String(e.message) : 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogle = async () => {
    try {
      setIsLoading(true);
      setError(null);
      // In React Native, you'd normally use Expo AuthSession or Google Sign-In to get an ID token.
      // For now, attempt to read an ID token from a prompt (dev) or integrate later.
      // TODO: integrate expo-auth-session Google provider to fetch idToken.
      // Placeholder: show an error asking to integrate Google Sign-In if no token.
      // You can replace the next line with the actual obtained idToken.
      const idToken = '';
      if (!idToken) {
        setError('Google Sign-In not configured. Please integrate Google sign-in to obtain an ID token.');
        return;
      }
      await apiClient.loginWithGoogle(idToken);
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(e?.message ? String(e.message) : 'Google authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#dbeafe', '#bfdbfe', '#93c5fd']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoid}
        >
          <View style={styles.content}>
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <Heart size={32} color="#2563eb" strokeWidth={2} />
              </View>
              <Text style={styles.title}>CarePortal</Text>
              <Text style={styles.subtitle}>Your oncology care companion</Text>
            </View>

            <BlurView intensity={20} tint="light" style={styles.formContainer}>
              <Text style={styles.formTitle}>
                {isSignUp ? 'Create Account' : 'Welcome Back'}
              </Text>

              {error ? (
                <Text style={{ color: '#dc2626', textAlign: 'center', marginBottom: 12 }}>
                  {error}
                </Text>
              ) : null}
              
              {isSignUp && (
                <View style={styles.inputContainer}>
                  <Mail size={20} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Full name"
                    placeholderTextColor="#94a3b8"
                    value={fullName}
                    onChangeText={setFullName}
                    autoCapitalize="words"
                  />
                </View>
              )}

              <View style={styles.inputContainer}>
                <Mail size={20} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email address"
                  placeholderTextColor="#94a3b8"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputContainer}>
                <Lock size={20} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="Password"
                  placeholderTextColor="#94a3b8"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity 
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff size={20} color="#64748b" />
                  ) : (
                    <Eye size={20} color="#64748b" />
                  )}
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.authButton} onPress={handleAuth} disabled={isLoading}>
                <LinearGradient
                  colors={['#3b82f6', '#2563eb']}
                  style={styles.authButtonGradient}
                >
                  <Text style={styles.authButtonText}>
                    {isLoading ? 'Please wait…' : isSignUp ? 'Sign Up' : 'Sign In'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.authButton, { marginTop: 0 }]}
                onPress={handleGoogle}
                disabled={isLoading}
                accessibilityLabel="Continue with Google"
              >
                <LinearGradient
                  colors={['#ffffff', '#f3f4f6']}
                  style={[styles.authButtonGradient, { borderWidth: 1, borderColor: '#e5e7eb' }]}
                >
                  <Text style={[styles.authButtonText, { color: '#111827' }]}>Continue with Google</Text>
                </LinearGradient>
              </TouchableOpacity>

              {!isSignUp ? (
                <TouchableOpacity 
                  style={styles.secondaryCta}
                  onPress={() => setIsSignUp(true)}
                >
                  <Text style={styles.secondaryCtaText}>Don’t have an account? Create one</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  style={styles.switchMode}
                  onPress={() => setIsSignUp(false)}
                >
                  <Text style={styles.switchModeText}>Already have an account? Sign in</Text>
                </TouchableOpacity>
              )}
            </BlurView>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#64748b',
    textAlign: 'center',
  },
  formContainer: {
    borderRadius: 20,
    padding: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },
  formTitle: {
    fontSize: 24,
    fontFamily: 'Inter_600SemiBold',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 32,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    height: 56,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#1e293b',
  },
  passwordInput: {
    paddingRight: 0,
  },
  eyeIcon: {
    padding: 8,
    marginLeft: 8,
  },
  authButton: {
    marginTop: 8,
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
  },
  authButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  authButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  switchMode: {
    alignItems: 'center',
  },
  switchModeText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#64748b',
  },
  secondaryCta: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  secondaryCtaText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#2563eb',
  },
});