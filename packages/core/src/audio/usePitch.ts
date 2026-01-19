import { ref, watch, onMounted, onUnmounted, computed } from 'vue';
import { Note, Interval } from 'tonal';
import { NativePitch } from './NativePitch';
import { useAudioEngine } from './useAudioEngine';
import { PitchNodePool, poolPitch, poolClarity, poolVolume } from './PitchNodePool';
import { clarityThreshold } from '../config/sensitivity';
import { usePlatformStore } from '../stores/platform';

/**
 * BACKWARD COMPATIBILITY: 
 * These settings are now managed by usePlatformStore. 
 * We mirror them here as computed properties so existing tools don't break.
 */
export const isLowPassEnabled = computed( {
  get: () => usePlatformStore().isLowPassEnabled,
  set: ( val ) => { usePlatformStore().isLowPassEnabled = val; }
} );

export const downsample = computed( {
  get: () => usePlatformStore().downsample,
  set: ( val ) => { usePlatformStore().downsample = val; }
} );


export interface PitchConfig {
  smoothing?: number;
  averagingWindowMs?: number;
  dynamicsResetThreshold?: number;
}

/**
 * usePitch - Reactive Pitch Detection.
 * 
 * WHY THIS EXISTS:
 * This composable bridges the gap between raw audio analysis (via AudioWorklet or fallback)
 * and the Vue application. It handles:
 * 1. Signal Stability (Smoothing out jitter).
 * 2. Note Locking (Preventing rapid flickering between semitones).
 * 3. Reactivity (Exposing pitch/volume/clarity as refs).
 * 
 * @param config - Optional configuration for smoothing and dynamics.
 */
export function usePitch ( config: PitchConfig = {} ) {

  const { getAnalyser, getContext, isInitialized } = useAudioEngine();
  const pitch = ref<number | null>( null );
  const clarity = ref<number | null>( null );
  const volume = ref<number>( 0 );
  const currentNote = ref<string | null>( null );
  const cents = ref<number>( 0 );
  const concertA = ref<number>( 440 );
  const transposition = ref<number>( 0 ); // semitones
  const pitchHistory = ref<Array<{ time: number, cents: number }>>( [] );
  const isCanceled = ref( false );

  // Median Filter State
  const medianBuffer: ( number | null )[] = [];
  const MEDIAN_SIZE = config.smoothing ?? 7; // Default to stable (7), allow agile (1-3)
  let nullFrameCount = 0;
  const NULL_GRACE_PERIOD = 10; // Frames to wait before giving up on a note

  // Averaging Buffer for long-term stability
  // default to 0 (disabled) unless configured
  const AVERAGING_WINDOW = config.averagingWindowMs ?? 0;
  const DYNAMICS_THRESHOLD = config.dynamicsResetThreshold ?? 0.05; // Significant volume jump
  const averagingBuffer: { pitch: number, time: number }[] = [];
  let lastVolume = 0;

  // Watch for LPF toggle and config changes (from global platform store)
  watch( [() => usePlatformStore().isLowPassEnabled, () => usePlatformStore().downsample], () => {
    // Update pool's worklet node
    PitchNodePool.configure( {
      lowPass: usePlatformStore().isLowPassEnabled,
      downsample: usePlatformStore().downsample
    } );

    // Update Legacy detector if in fallback mode
    if ( legacyDetector ) {
      legacyDetector.useLowPass = usePlatformStore().isLowPassEnabled;
      legacyDetector.downsample = usePlatformStore().downsample;
    }
  } );

  // AudioWorklet state (now managed by PitchNodePool)
  let isPoolAcquired = false;
  const HISTORY_MS = 5000;

  // Legacy main-thread detector for fallback
  let legacyDetector: NativePitch | null = null;
  let legacyBuffer: Float32Array | null = null;

  // Watch pool data and route through our updateState function
  watch( [poolPitch, poolClarity, poolVolume], ( [p, c, v] ) => {
    console.log( 'DEBUG: usePitch watch', { isPoolAcquired, p, c, v } );
    if ( isPoolAcquired ) {
      updateState( p, c ?? 0, v );
    }
  } );

  const initFromPool = async () => {
    const context = getContext();
    const analyser = getAnalyser();
    if ( !context || !analyser ) return;

    // Resume if suspended
    if ( context.state === 'suspended' ) {
      await context.resume();
    }

    try {
      await PitchNodePool.acquire( context, analyser );
      isPoolAcquired = true;

      // Send initial config to the pool
      PitchNodePool.configure( {
        lowPass: isLowPassEnabled.value,
        downsample: downsample.value
      } );
    } catch ( e ) {
      startLegacyLoop();
    }
  };



  // Watch for initialization
  watch( isInitialized, ( initialized ) => {
    if ( initialized && !isPoolAcquired && !legacyDetector ) {
      initFromPool();
    }
  } );

  const startLegacyLoop = () => {
    const loop = () => {
      if ( isCanceled.value ) return;
      const analyser = getAnalyser();
      const context = getContext();

      if ( !analyser || !context ) {
        requestAnimationFrame( loop );
        return;
      }

      if ( !legacyDetector ) {
        legacyDetector = new NativePitch( analyser.fftSize, context.sampleRate );
        legacyDetector.useLowPass = isLowPassEnabled.value;
        legacyDetector.downsample = downsample.value;
        // Fix for Netlify/TS: Explicitly use ArrayBuffer to satisfy strict Float32Array<ArrayBuffer> requirement
        legacyBuffer = new Float32Array( new ArrayBuffer( analyser.fftSize * 4 ) );
      }

      analyser.getFloatTimeDomainData( legacyBuffer as any );
      // Cast to any to avoid generic mismatch if Float32Array types differ in env
      const [p, c] = legacyDetector.findPitch( legacyBuffer as any, context.sampleRate );

      // Volume calculation
      let sumSquares = 0;
      for ( let i = 0; i < legacyBuffer!.length; i++ ) {
        sumSquares += legacyBuffer![i]! * legacyBuffer![i]!;
      }
      const v = Math.sqrt( sumSquares / legacyBuffer!.length );

      updateState( p, c, v );
      requestAnimationFrame( loop );
    }
    loop();
  };

  const updateState = ( rawPitch: number | null, rawClarity: number, v: number ) => {
    // 3. Jitter Killer (Median Smoothing)
    // We allow a small "grace period" for nulls to prevent flickering.
    if ( rawPitch ) {
      nullFrameCount = 0;
      medianBuffer.push( rawPitch );
    } else {
      nullFrameCount++;
      if ( nullFrameCount > NULL_GRACE_PERIOD ) {
        medianBuffer.length = 0; // Truly lost the signal
      } else {
        // Hold the last known values in the buffer during dropout
        // This effectively "freezes" the median for a few frames
      }
    }

    if ( medianBuffer.length > MEDIAN_SIZE ) medianBuffer.shift();

    // Calculate median excluding nulls
    const validPitches = medianBuffer.filter( ( p ): p is number => p !== null );
    let p = rawPitch;

    if ( validPitches.length > 0 ) {
      const sorted = [...validPitches].sort( ( a, b ) => a - b );
      p = sorted[Math.floor( sorted.length / 2 )]!;
    }

    // 4. Long-term Averaging & Dynamics Reset
    if ( p && AVERAGING_WINDOW > 0 ) {
      const now = performance.now();

      // Dynamics Reset: If volume spikes (new note attack), clear old history to lock quickly
      // We use a simple difference check. 
      if ( v > lastVolume + DYNAMICS_THRESHOLD ) {
        averagingBuffer.length = 0;
      }

      averagingBuffer.push( { pitch: p, time: now } );

      // Prune old values
      while ( averagingBuffer.length > 0 && ( now - averagingBuffer[0]!.time > AVERAGING_WINDOW ) ) {
        averagingBuffer.shift();
      }

      // Calculate Average
      if ( averagingBuffer.length > 0 ) {
        const sum = averagingBuffer.reduce( ( acc, curr ) => acc + curr.pitch, 0 );
        p = sum / averagingBuffer.length;
      }
    }

    lastVolume = v;

    pitch.value = p;
    clarity.value = rawClarity;
    volume.value = v;

    // Use a multi-stage lock:
    // 1. High-Clarity Lock: Note must start with > Global Threshold.
    // 2. Sustain Lock: Once locked, we follow it down slightly lower (decay phase).
    // PHYSICS: Real instruments decay. As volume drops, clarity might drop slightly.
    // Hysteresis (the difference between start/stop thresholds) prevents the note from checking out prematurely.
    const CLARITY_START = clarityThreshold.value;
    const CLARITY_SUSTAIN = Math.max( 0, clarityThreshold.value - 0.1 ); // Sustain 10% lower than start
    const isLocked = currentNote.value !== null;
    const effectiveClarityThreshold = isLocked ? CLARITY_SUSTAIN : CLARITY_START;

    if ( p && rawClarity > effectiveClarityThreshold ) {
      const calibratedFreq = p * ( 440 / concertA.value );
      const rawNoteName = Note.fromFreq( calibratedFreq );
      const displayNote = Note.transpose( rawNoteName, Interval.fromSemitones( transposition.value ) );
      currentNote.value = displayNote;

      const refFreq = Note.get( rawNoteName ).freq;
      if ( refFreq ) {
        // MATH: Calculate Cents difference.
        // Formula: 1200 * log2( f1 / f0 )
        // We round to 1 decimal place for display stability.
        cents.value = Math.round( 1200 * Math.log2( calibratedFreq / refFreq ) * 10 ) / 10;
        const now = performance.now();
        // Remove entries older than or equal to the history window (HISTORY_MS)
        while ( pitchHistory.value.length > 0 && ( now - ( pitchHistory.value[0]?.time ?? 0 ) ) >= HISTORY_MS ) {
          pitchHistory.value.shift();
        }
      } else {
        cents.value = 0;
      }
    } else {
      currentNote.value = null;
      cents.value = 0;
    }
  }

  onMounted( () => {
    initFromPool();
  } );

  onUnmounted( () => {
    isCanceled.value = true;
    if ( isPoolAcquired ) {
      PitchNodePool.release();
      isPoolAcquired = false;
    }
  } );

  return {
    pitch,
    clarity,
    volume,
    currentNote,
    cents,
    concertA,
    transposition,
    pitchHistory,
    isLowPassEnabled,
    downsample,
  };
}
