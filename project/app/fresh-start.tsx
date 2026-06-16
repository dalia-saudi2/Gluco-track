import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

/** Clears session and sends user to the login welcome screen. */
export default function FreshStartScreen() {
  const { logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        await logout();
      } finally {
        router.replace('/login');
      }
    })();
  }, [logout, router]);

  return (
    <View style={styles.wrap}>
      <ActivityIndicator size="large" color="#e040a0" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff9fc',
  },
});
