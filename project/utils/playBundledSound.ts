import { Audio } from 'expo-av';
import { Image, Platform } from 'react-native';

let audioModeReady = false;

async function ensureNativeAudioMode(): Promise<void> {
  if (audioModeReady || Platform.OS === 'web') return;
  await Audio.setAudioModeAsync({
    playsInSilentModeIOS: true,
    shouldDuckAndroid: true,
  });
  audioModeReady = true;
}

function assetUri(assetModule: number): string {
  const source = Image.resolveAssetSource(assetModule);
  if (!source?.uri) {
    throw new Error('Could not resolve bundled sound asset');
  }
  return source.uri;
}

async function playOnWeb(uri: string, volume: number): Promise<void> {
  if (typeof window === 'undefined') return;

  const audio = new window.Audio(uri);
  audio.volume = volume;
  audio.preload = 'auto';

  await new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      audio.onended = null;
      audio.onerror = null;
    };
    audio.onended = () => {
      cleanup();
      resolve();
    };
    audio.onerror = () => {
      cleanup();
      reject(new Error('Web audio playback failed'));
    };
    void audio.play().catch(reject);
  });
}

/** Play a Metro-bundled mp3/wav on native (expo-av) and web (HTMLAudioElement). */
export async function playBundledSound(assetModule: number, volume = 0.85): Promise<void> {
  if (Platform.OS === 'web') {
    await playOnWeb(assetUri(assetModule), volume);
    return;
  }

  await ensureNativeAudioMode();
  const { sound } = await Audio.Sound.createAsync(assetModule, {
    shouldPlay: true,
    volume,
  });
  sound.setOnPlaybackStatusUpdate((status) => {
    if (status.isLoaded && status.didJustFinish) {
      void sound.unloadAsync();
    }
  });
}
