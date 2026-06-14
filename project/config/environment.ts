import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { storageService } from '../services/storageService';

// Get local IP address for mobile device testing
// On Android emulator: use 10.0.2.2 instead of localhost
// On iOS simulator: use localhost
// On physical device: use your computer's IP address

const getDefaultApiUrl = () => {
  // Check if we're in development
  const isDev = __DEV__;
  
  if (Platform.OS === 'android') {
    // Android emulator uses 10.0.2.2 to access host machine's localhost
    return isDev ? 'http://10.0.2.2:8000' : 'https://api.yourdomain.com';
  } else if (Platform.OS === 'ios') {
    // iOS simulator can use localhost
    return isDev ? 'http://localhost:8000' : 'https://api.yourdomain.com';
  } else {
    // Web or other platforms
    return isDev ? 'http://localhost:8000' : 'https://api.yourdomain.com';
  }
};

// For physical device testing, you can set this manually
// Example: 'http://192.168.1.100:8000' (replace with your computer's IP)
// To find your IP: Windows (ipconfig) or Mac/Linux (ifconfig)
const PHYSICAL_DEVICE_IP = null; // Set this to your computer's IP when testing on physical device
// Example: const PHYSICAL_DEVICE_IP = 'http://192.168.1.100:8000';

class EnvironmentConfig {
  private apiBaseUrl: string | null = null;

  async initialize() {
    // Try to get saved API URL from storage
    const savedUrl = await storageService.getApiBaseUrl();
    if (savedUrl) {
      this.apiBaseUrl = savedUrl;
      return;
    }

    // Use physical device IP if set, otherwise use default
    if (PHYSICAL_DEVICE_IP) {
      this.apiBaseUrl = PHYSICAL_DEVICE_IP;
      await storageService.saveApiBaseUrl(PHYSICAL_DEVICE_IP);
    } else {
      const defaultUrl = getDefaultApiUrl();
      this.apiBaseUrl = defaultUrl;
      await storageService.saveApiBaseUrl(defaultUrl);
    }
  }

  getApiBaseUrl(): string {
    if (!this.apiBaseUrl) {
      // Fallback if not initialized
      return PHYSICAL_DEVICE_IP || getDefaultApiUrl();
    }
    return this.apiBaseUrl;
  }

  async setApiBaseUrl(url: string): Promise<void> {
    this.apiBaseUrl = url;
    await storageService.saveApiBaseUrl(url);
  }

  isDevelopment(): boolean {
    return __DEV__;
  }

  isProduction(): boolean {
    return !__DEV__;
  }
}

export const environmentConfig = new EnvironmentConfig();

// Initialize on import
environmentConfig.initialize();

