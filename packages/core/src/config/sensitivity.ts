import { ref } from 'vue';

/**
 * Global sensitivity threshold used by detection utilities.
 * Default 0.05 matches the updated noise floor for chord capture.
 * Users can modify this at runtime (e.g., via a settings UI).
 */
export const sensitivityThreshold = ref<number>( 0.01 );

/**
 * Global clarity threshold (0.0 - 1.0).
 * Determines how clear/periodic the signal must be to be considered a note.
 * Lower = More sensitive to messy audio (but more false positives).
 * Higher = Requires pure tone (less false positives, but might miss real notes).
 * Default 0.6 is a good balance for guitar/voice.
 */
export const clarityThreshold = ref<number>( 0.6 );

/**
 * Pro Mode / Raw Audio Mode.
 * When true, disables browser audio processing (AGC, noise suppression, echo cancellation).
 * Pro Mode = Purer signal, better for spectral analysis, but requires louder input.
 * Auto Mode = Browser-normalized signal, easier to use, but less accurate waveforms.
 * Default: false (Auto Mode / AGC enabled).
 */
export const isRawAudioMode = ref<boolean>( false );

