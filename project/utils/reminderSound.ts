import { Audio } from 'expo-av';
import { Platform } from 'react-native';

let soundReady = false;

async function ensureAudioMode() {
  if (soundReady) return;
  await Audio.setAudioModeAsync({
    playsInSilentModeIOS: true,
    shouldDuckAndroid: true,
  });
  soundReady = true;
}

/** Short notification chime for reminder bell taps. */
export async function playReminderSound(): Promise<void> {
  try {
    await ensureAudioMode();
    const { sound } = await Audio.Sound.createAsync(
      require('../assets/sounds/reminder.mp3'),
      { shouldPlay: true, volume: 0.85 }
    );
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        void sound.unloadAsync();
      }
    });
  } catch (error) {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 880;
        gain.gain.value = 0.12;
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.18);
        setTimeout(() => void ctx.close(), 300);
      } catch {
        // ignore — sound is optional
      }
      return;
    }
    console.warn('Reminder sound failed:', error);
  }
}
