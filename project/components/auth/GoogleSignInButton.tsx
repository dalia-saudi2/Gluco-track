import React, { useEffect } from 'react';
import { Pressable, Text, View, StyleSheet, ActivityIndicator } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import { AuthColors as C, AuthFont as F } from '../../constants/AuthColors';

const GOOGLE_CLIENT_ID =
  '784519257059-3pa0ibn4ege37ii6spbo7csdkav7srh0.apps.googleusercontent.com';

type Props = {
  isCompact?: boolean;
  isLoading: boolean;
  onIdToken: (idToken: string) => void;
  onError: (message: string) => void;
};

export function GoogleSignInButton({ isCompact, isLoading, onIdToken, onError }: Props) {
  const redirectUri = makeRedirectUri({ path: 'auth' });
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: GOOGLE_CLIENT_ID,
    webClientId: GOOGLE_CLIENT_ID,
    redirectUri,
    responseType: 'id_token',
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const id_token = response.authentication?.idToken || response.params?.id_token;
      if (id_token) {
        onIdToken(id_token);
      } else {
        onError('No ID Token found');
      }
    } else if (response?.type === 'error') {
      onError('Authentication failed');
    }
  }, [response, onIdToken, onError]);

  return (
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
  );
}

export function GoogleSignInLoading({ isCompact }: { isCompact?: boolean }) {
  return (
    <View style={[styles.googleBtn, isCompact && styles.googleBtnCompact, styles.googleLoading]}>
      <ActivityIndicator color={C.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
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
  googleLoading: { opacity: 0.7 },
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
});
