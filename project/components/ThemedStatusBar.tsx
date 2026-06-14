import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../contexts/ThemeContext';

export function ThemedStatusBar() {
  const { theme } = useTheme();
  return <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />;
}
