import { Alert, Linking, Platform } from 'react-native';
import type { NamedPhoneContact } from '../types/quickContacts';

export function normalizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, '');
}

export async function dialPhone(phone: string): Promise<void> {
  const cleaned = normalizePhone(phone);
  if (!cleaned) {
    Alert.alert('No number', 'No phone number is saved for this contact.');
    return;
  }
  try {
    const url = Platform.OS === 'ios' ? `telprompt:${cleaned}` : `tel:${cleaned}`;
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert('Cannot call', `Call ${phone} manually from your phone app.`);
      return;
    }
    await Linking.openURL(url);
  } catch {
    Alert.alert('Call failed', 'Unable to start a phone call on this device.');
  }
}

export function pickAndCall(title: string, contacts: NamedPhoneContact[]): void {
  const valid = contacts.filter((c) => c.phone?.trim());
  if (!valid.length) {
    Alert.alert('Not configured', `Add your ${title.toLowerCase()} during sign up or in your profile.`);
    return;
  }
  if (valid.length === 1) {
    void dialPhone(valid[0].phone);
    return;
  }
  Alert.alert(
    title,
    'Choose who to call:',
    [
      ...valid.map((c) => ({
        text: `${c.name} (${c.phone})`,
        onPress: () => void dialPhone(c.phone),
      })),
      { text: 'Cancel', style: 'cancel' as const },
    ],
  );
}
