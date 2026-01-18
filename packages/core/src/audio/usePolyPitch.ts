import { ref, onMounted, onUnmounted } from 'vue';
import { Note } from 'tonal';
import { useAudioEngine } from './useAudioEngine';
import { sensitivityThreshold } from '../config/sensitivity';

/**
 * usePolyPitch
 * 
 * Analyzes the frequency spectrum to detect multiple simultaneous notes.
 * Useful for chord recognition when fingering multiple strings on a guitar.
 */
export function usePolyPitch ( config: { threshold?: number; maxNotes?: number } = {} ) {
  const { getAnalyser, getContext, isInitialized } = useAudioEngine();

  const detectedNotes = ref<string[]>( [] );
  const isCanceled = ref( false );

  // We convert the sensitivity threshold (0.0 to 1.0) into a decibel value.
  // We use -60dB as the base floor for "total silence".
  // MOVED TO ANALYZE LOOP FOR REACTIVITY
  // const THRESHOLD = config.threshold ?? ( -60 + ( sensitivityThreshold.value * 60 ) );
  const RELATIVE_THRESHOLD = 25; // dB distance from the strongest peak
  const MAX_NOTES = config.maxNotes ?? 6; // Typical guitar limit

  let animationId: number | null = null;

  const analyze = () => {
    if ( isCanceled.value ) return;

    const analyser = getAnalyser();
    const context = getContext();
    if ( !analyser || !context || !isInitialized.value ) {
      animationId = requestAnimationFrame( analyze );
      return;
    }

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Float32Array( bufferLength );
    analyser.getFloatFrequencyData( dataArray );

    const nyquist = context.sampleRate / 2;
    const binSize = nyquist / bufferLength;

    // Dynamic Threshold Calculation
    const currentThreshold = config.threshold ?? ( -60 + ( sensitivityThreshold.value * 60 ) );

    // 1. Peak Detection
    const peaks: Array<{ freq: number; magnitude: number }> = [];

    // We skip the very low end (below 40Hz) to avoid DC offset/rumble
    const startBin = Math.floor( 40 / binSize );

    for ( let i = startBin; i < bufferLength - 1; i++ ) {
      const val = dataArray[i]!;

      // Local maximum check
      if ( val > currentThreshold && val > dataArray[i - 1]! && val > dataArray[i + 1]! ) {
        // Simple parabolic interpolation for better frequency accuracy
        const alpha = dataArray[i - 1]!;
        const beta = dataArray[i]!;
        const gamma = dataArray[i + 1]!;
        const p = 0.5 * ( alpha - gamma ) / ( alpha - 2 * beta + gamma );
        const accurateBin = i + p;

        peaks.push( {
          freq: accurateBin * binSize,
          magnitude: val
        } );
      }
    }

    // 2. Sort by magnitude (strongest first)
    peaks.sort( ( a, b ) => b.magnitude - a.magnitude );

    // 2b. Relative Filtering
    // A strum produces one strong fundamental per string, but also many faint harmonics.
    // We ignore any peaks that are significantly quieter than the strongest peak.
    const maxMag = peaks.length > 0 ? peaks[0]!.magnitude : -100;
    const filteredPeaks = peaks.filter( p => p.magnitude > ( maxMag - RELATIVE_THRESHOLD ) );

    // 3. Harmonic Filtering & Note Mapping
    const foundNotes = new Set<string>();
    const activeFundamentals: number[] = [];

    for ( const peak of filteredPeaks ) {
      if ( foundNotes.size >= MAX_NOTES ) break;

      let isHarmonic = false;
      for ( const fund of activeFundamentals ) {
        const ratio = peak.freq / fund;
        const nearestInt = Math.round( ratio );
        /**
         * We check the "Integer Ratio" between frequencies. 
         * If the ratio is close to a whole number (e.g., 2.0 or 3.0),
         * it's likely a harmonic of a fundamental we already found.
         * Tolerance tightened from 0.05 to 0.03 for guitar precision.
         */
        if ( nearestInt > 1 && Math.abs( ratio - nearestInt ) < 0.03 ) {
          isHarmonic = true;
          break;
        }
      }

      if ( !isHarmonic ) {
        const noteName = Note.fromFreq( peak.freq );
        // We now preserve the full note name (e.g. "C3") for voicing/inversion detection
        if ( noteName ) {
          foundNotes.add( noteName );
          activeFundamentals.push( peak.freq );
        }
      }
    }

    // --- Persistence Check ---
    // Only emit notes that have been seen in at least 3 of the last several frames
    const currentFrameNotes = Array.from( foundNotes );
    updatePersistence( currentFrameNotes );

    detectedNotes.value = getStableNotes();
    animationId = requestAnimationFrame( analyze );
  };

  const noteHistory = new Map<string, number>();
  const HISTORY_WINDOW = 5;
  const STABLE_THRESHOLD = 3;

  const updatePersistence = ( notes: string[] ) => {
    // Increment seen notes, decrement others (down to 0)
    const seenThisFrame = new Set( notes );

    // First, handle all known notes
    noteHistory.forEach( ( count, note ) => {
      if ( seenThisFrame.has( note ) ) {
        noteHistory.set( note, Math.min( HISTORY_WINDOW, count + 1 ) );
      } else {
        const nextCount = Math.max( 0, count - 1 );
        if ( nextCount === 0 ) {
          noteHistory.delete( note );
        } else {
          noteHistory.set( note, nextCount );
        }
      }
    } );

    // Add new notes
    notes.forEach( note => {
      if ( !noteHistory.has( note ) ) {
        noteHistory.set( note, 1 );
      }
    } );
  };

  const getStableNotes = (): string[] => {
    const stable: string[] = [];
    noteHistory.forEach( ( count, note ) => {
      if ( count >= STABLE_THRESHOLD ) stable.push( note );
    } );
    return stable;
  };

  onMounted( () => {
    analyze();
  } );

  onUnmounted( () => {
    isCanceled.value = true;
    if ( animationId ) cancelAnimationFrame( animationId );
  } );

  return {
    detectedNotes
  };
}
