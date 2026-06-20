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

/** Hydration reminder — plays every 2 hours after the last drink. */
export async function playHydrationReminderSound(): Promise<void> {
  try {
    await ensureAudioMode();
    const { sound } = await Audio.Sound.createAsync(
      require('../assets/sounds/hydration-reminder.mp3'),
      { shouldPlay: true, volume: 1 }
    );
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        void sound.unloadAsync();
      }
    });
  } catch (error) {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        const ctx = new (window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = 660;
        gain.gain.value = 0.15;
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
        setTimeout(() => void ctx.close(), 500);
      } catch {
        // optional fallback
      }
      return;
    }
    console.warn('Hydration reminder sound failed:', error);
  }
}
