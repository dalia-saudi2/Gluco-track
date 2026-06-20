import { Alert, Platform } from 'react-native';

type AlertButton = {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
};

/** Cross-platform alert — Alert.alert is a no-op on web. */
export function showAlert(title: string, message?: string, buttons?: AlertButton[]): void {
  if (Platform.OS === 'web') {
    const body = message ? `${title}\n\n${message}` : title;
    if (!buttons || buttons.length <= 1) {
      if (typeof window !== 'undefined') {
        window.alert(body);
      }
      buttons?.[0]?.onPress?.();
      return;
    }
    if (typeof window !== 'undefined' && window.confirm(body)) {
      const confirmBtn =
        buttons.find((b) => b.style === 'destructive') ||
        buttons.find((b) => b.style !== 'cancel') ||
        buttons[buttons.length - 1];
      confirmBtn?.onPress?.();
    } else {
      buttons.find((b) => b.style === 'cancel')?.onPress?.();
    }
    return;
  }

  Alert.alert(title, message, buttons);
}

/** Cross-platform confirm dialog. Resolves true if user confirms. */
export function confirmAction(title: string, message: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return Promise.resolve(false);
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }

  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'No', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Yes', style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}
