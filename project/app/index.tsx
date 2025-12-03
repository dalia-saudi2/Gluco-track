import { useEffect } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';

export default function Index() {
  useEffect(() => {
    router.replace('/login');
  }, []);

  return <View />;
}



