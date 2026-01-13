import { computed } from 'vue';
import { usePlatformStore } from '../stores/platform';

/**
 * BACKWARD COMPATIBILITY LAYER
 * 
 * These exports allow existing code to continue using the same imports:
 *   import { sensitivityThreshold } from '@spectralsuite/core'
 * 
 * Under the hood, they now read/write to the centralized usePlatformStore.
 * This means settings are now persisted to localStorage automatically!
 */

/**
 * Global sensitivity threshold used by detection utilities.
 * Default 0.01 is very sensitive, suitable for most use cases.
 * Users can modify this at runtime via the settings UI.
 */
export const sensitivityThreshold = computed( {
  get: () => usePlatformStore().sensitivity,
  set: ( val ) => { usePlatformStore().sensitivity = val; }
} );

/**
 * Global clarity threshold (0.0 - 1.0).
 * Determines how clear/periodic the signal must be to be considered a note.
 * Default 0.6 balances accuracy and usability for guitar/voice.
 */
export const clarityThreshold = computed( {
  get: () => usePlatformStore().clarity,
  set: ( val ) => { usePlatformStore().clarity = val; }
} );

/**
 * Pro Mode / Raw Audio Mode toggle.
 * When true, disables browser audio processing (AGC, noise suppression).
 * Pro Mode = Purer signal, but requires louder input.
 */
export const isRawAudioMode = computed( {
  get: () => usePlatformStore().isRawAudioMode,
  set: ( val ) => { usePlatformStore().isRawAudioMode = val; }
} );
