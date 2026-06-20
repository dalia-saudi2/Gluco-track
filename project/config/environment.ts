import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { storageService } from '../services/storageService';

// Get local IP address for mobile device testing
// On Android emulator: use 10.0.2.2 instead of localhost
// On iOS simulator: use localhost
// On physical device: use your computer's IP address

const PHYSICAL_DEVICE_IP = 'http://192.168.1.9:8000'; // Your PC's LAN IP — phone must be on same Wi‑Fi

/** When opened on phone browser at http://192.168.x.x:8084, API must use same host, not localhost. */
function getWebLanApiUrl(): string | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return null;
  }
  const host = window.location.hostname;
  if (host && host !== 'localhost' && host !== '127.0.0.1') {
    return `http://${host}:8000`;
  }
  return null;
}

const getDefaultApiUrl = () => {
  const webLan = getWebLanApiUrl();
  if (webLan) {
    return webLan;
  }

  const isDev = __DEV__;
  
  if (Platform.OS === 'android') {
    return isDev ? 'http://10.0.2.2:8000' : 'https://api.yourdomain.com';
  }
  if (Platform.OS === 'ios') {
    return isDev ? 'http://localhost:8000' : 'https://api.yourdomain.com';
  }
  return isDev ? 'http://localhost:8000' : 'https://api.yourdomain.com';
};

class EnvironmentConfig {
  private apiBaseUrl: string | null = null;

  async initialize() {
    const webLan = getWebLanApiUrl();
    if (webLan) {
      this.apiBaseUrl = webLan;
      await storageService.saveApiBaseUrl(webLan);
      return;
    }

    const savedUrl = await storageService.getApiBaseUrl();
    if (savedUrl && !savedUrl.includes('localhost') && !savedUrl.includes('127.0.0.1')) {
      this.apiBaseUrl = savedUrl;
      return;
    }

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
    const webLan = getWebLanApiUrl();
    if (webLan) {
      return webLan;
    }
    if (!this.apiBaseUrl) {
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

