/**
 * Utility functions for playing sounds in the application
 */

// Preload audio files
const AUDIO_FILES = {
  success: '/sounds/beep-success.mp3',
  error: '/sounds/beep-error.mp3',
  scan: '/sounds/beep-scan.mp3',
} as const;

type SoundName = keyof typeof AUDIO_FILES;

// Cache for audio elements
const audioCache: Record<string, HTMLAudioElement> = {};

/**
 * Preload all sounds to reduce latency on first play
 */
export function preloadSounds(): void {
  Object.entries(AUDIO_FILES).forEach(([key, src]) => {
    if (!audioCache[key]) {
      const audio = new Audio(src);
      audio.load();
      audioCache[key] = audio;
    }
  });
}

/**
 * Play a sound by name
 * @param name - Name of the sound to play
 * @param volume - Volume level (0-1)
 */
export function playSound(name: SoundName, volume = 0.5): void {
  try {
    // If in development, skip playing sounds to avoid console errors
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Sound] Playing: ${name}`);
      return;
    }

    // Get or create audio element
    let audio = audioCache[name];
    if (!audio) {
      const src = AUDIO_FILES[name];
      if (!src) {
        console.warn(`[Sound] Unknown sound: ${name}`);
        return;
      }
      audio = new Audio(src);
      audioCache[name] = audio;
    }

    // Set volume and play
    audio.volume = Math.min(1, Math.max(0, volume));
    
    // Reset audio to start and play
    audio.currentTime = 0;
    audio.play().catch(error => {
      console.error(`[Sound] Failed to play ${name}:`, error);
    });
  } catch (error) {
    console.error(`[Sound] Error playing ${name}:`, error);
  }
}

/**
 * Play a success sound
 */
export function playSuccessSound(): void {
  playSound('success');
}

/**
 * Play an error sound
 */
export function playErrorSound(): void {
  playSound('error');
}

/**
 * Play a scan sound
 */
export function playScanSound(): void {
  playSound('scan');
}
