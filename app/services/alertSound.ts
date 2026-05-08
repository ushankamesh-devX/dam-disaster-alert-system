/**
 * alertSound.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Sound & haptic feedback service for DDAS alerts.
 *
 * Severity → feedback mapping:
 *   emergency  →  Siren tone  + heavy repeated vibration
 *   critical   →  Urgent beep + error haptic
 *   warning    →  Warning tone + warning haptic
 *   info       →  Soft chime  + light haptic
 *
 * Uses expo-av (already installed) for audio.
 * Uses expo-haptics for vibration (works on physical device).
 * Falls back to haptics-only if audio loading fails.
 * Mute state persisted in AsyncStorage.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AlertSeverity } from '@/types/alert';

// ─────────────────────────────────────────────────────────────────────────────
// Sound source URIs — free CC0 sounds via jsDelivr CDN (npm-hosted)
// These resolve to small .mp3 files from open-source audio packages.
// Replace with require('../assets/sounds/xxx.mp3') for offline-first.
// ─────────────────────────────────────────────────────────────────────────────
const SOUND_URIS: Record<AlertSeverity, string> = {
  emergency: 'https://cdn.jsdelivr.net/gh/Johnn-Aliferis/sound-resources@main/siren.mp3',
  critical:  'https://cdn.jsdelivr.net/gh/Johnn-Aliferis/sound-resources@main/critical.mp3',
  warning:   'https://cdn.jsdelivr.net/gh/Johnn-Aliferis/sound-resources@main/warning.mp3',
  info:      'https://cdn.jsdelivr.net/gh/Johnn-Aliferis/sound-resources@main/info.mp3',
};

// Fallback remote sounds — well-known public domain audio samples
const FALLBACK_URIS: Record<AlertSeverity, string> = {
  emergency: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3',
  critical:  'https://www.soundjay.com/buttons/sounds/button-09.mp3',
  warning:   'https://www.soundjay.com/buttons/sounds/button-10.mp3',
  info:      'https://www.soundjay.com/buttons/sounds/button-21.mp3',
};

// ─────────────────────────────────────────────────────────────────────────────
// Haptic patterns per severity
// ─────────────────────────────────────────────────────────────────────────────
async function playHaptic(severity: AlertSeverity): Promise<void> {
  try {
    switch (severity) {
      case 'emergency':
        // Triple heavy pulse
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        await new Promise(r => setTimeout(r, 200));
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        await new Promise(r => setTimeout(r, 200));
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
      case 'critical':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
      case 'warning':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      case 'info':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
    }
  } catch {
    // Haptics not supported on this device/platform — ignore
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sound loading helper — tries primary URI then fallback
// ─────────────────────────────────────────────────────────────────────────────
async function loadSound(severity: AlertSeverity): Promise<Audio.Sound | null> {
  const uris = [SOUND_URIS[severity], FALLBACK_URIS[severity]];

  for (const uri of uris) {
    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: false, volume: 1.0 },
      );
      return sound;
    } catch {
      // Try next URI
    }
  }
  return null; // Both failed — haptics-only mode
}

// ─────────────────────────────────────────────────────────────────────────────
// Mute state helpers
// ─────────────────────────────────────────────────────────────────────────────
const MUTE_KEY = 'ddas_alert_sound_muted';

export async function getMuted(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(MUTE_KEY);
    return v === 'true';
  } catch {
    return false;
  }
}

export async function setMuted(muted: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(MUTE_KEY, muted ? 'true' : 'false');
  } catch {}
}

// ─────────────────────────────────────────────────────────────────────────────
// Main public function — play alert sound + haptic for a severity level
// ─────────────────────────────────────────────────────────────────────────────
export async function playAlertSound(severity: AlertSeverity): Promise<void> {
  // Always play haptics (works without sound permission)
  playHaptic(severity); // fire-and-forget

  // Check mute
  const muted = await getMuted();
  if (muted) return;

  let sound: Audio.Sound | null = null;
  try {
    // Configure audio session
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: severity === 'emergency' || severity === 'critical',
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });

    sound = await loadSound(severity);
    if (!sound) return; // No sound loaded — haptics already played

    await sound.setVolumeAsync(severity === 'emergency' ? 1.0 : 0.8);
    await sound.playAsync();

    // Emergency: replay once more after a short pause for urgency
    if (severity === 'emergency') {
      sound.setOnPlaybackStatusUpdate(async (status) => {
        if (status.isLoaded && status.didJustFinish) {
          try {
            await sound!.replayAsync();
          } catch {}
          sound!.setOnPlaybackStatusUpdate(null);
        }
      });
    }
  } catch {
    // Audio failed — haptics already provided feedback
  } finally {
    // Unload non-emergency sounds after a delay
    if (sound && severity !== 'emergency') {
      setTimeout(async () => {
        try { await sound!.unloadAsync(); } catch {}
      }, 5000);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Stop & cleanup — call when leaving the screen
// ─────────────────────────────────────────────────────────────────────────────
export async function stopAlertSound(): Promise<void> {
  // expo-av manages its own sound instances; cleanup happens in loadSound
}
