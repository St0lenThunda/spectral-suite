import { defineStore } from 'pinia';
import { ref, reactive, readonly, watch, computed } from 'vue';
import { MetronomeEngine } from '../rhythm/MetronomeEngine';
import { TransientDetector } from '../rhythm/TransientDetector';
import { useAudioEngine } from '../audio/useAudioEngine';

/**
 * useRhythmStore - Central management for Rhythm Logic.
 * 
 * WHY THIS EXISTS:
 * This store coordinates the `MetronomeEngine` (audio timing) and `TransientDetector` (input analysis).
 * It acts as the "Conductor" of the application, ensuring that:
 * 1. The beat stays steady (Tempo).
 * 2. We trigger visual effects exactly on the beat (Phase).
 * 3. We analyze user accuracy against that beat (Scoring).
 */
export const useRhythmStore = defineStore( 'rhythm', () => {

  // State (Engine Instances - scoped to Store Lifecycle)
  const metronome = new MetronomeEngine( 120 );
  const detector = new TransientDetector( 0.1 ); // 0.1 is the sensitivity threshold for onset detection

  // Reactive State
  const { isInitialized: isEngineInitialized } = useAudioEngine();
  const isRhythmStarted = ref( false );
  const isPlaying = ref( false );
  const tempo = ref( 120 ); // BPM
  const subdivision = ref( 1 ); // 1 = Quarter notes, 2 = Eighths, etc.
  const polySubdivision = ref( 0 ); // Secondary rhythm (polyrhythm) - 0 means disabled.
  const currentPulse = ref( 0 ); // The current beat index (0-based)
  const error = ref<string | null>( null );

  /**
   * Resilience: If the global engine uninitializes (e.g. after a settings reset),
   * we must also reset our local initialization state so we re-bind to the new context.
   */
  watch( () => useAudioEngine().isInitialized.value, ( isReady: boolean ) => {
    if ( !isReady ) {
      isRhythmStarted.value = false;
    }
  } );

  // Analysis State
  const lastBeatTime = ref( 0 );
  const timingOffset = ref( 0 ); // in ms
  const history = ref<number[]>( [] );
  const maxHistory = 20;

  // Stats
  const stats = reactive( {
    perfect: 0,
    rush: 0,
    drag: 0,
    total: 0
  } );

  // Event Bus for Flashing (Scoped to Store)
  const onFlashCallbacks: Array<() => void> = [];

  // Actions

  /**
   * Initializes the Rhythm Engine.
   * Connects the Metronome and Detector to the AudioContext.
   * Sets up event listeners for beat callbacks.
   */
  const init = async () => {
    // THEORY: We hook up the engine instances to our reactive state.

    try {
      const { getContext } = useAudioEngine();
      const ctx = getContext();

      // Resilience: Clear old instances before and after context change
      metronome.dispose();
      detector.cleanup();
      detector.clearCallbacks();

      metronome.init( ctx || undefined );
      await detector.init();

      // Hook up Metronome
      metronome.onBeat( ( pulse, time, isMainBeat ) => {
        currentPulse.value = pulse;
        if ( isMainBeat ) {
          lastBeatTime.value = time;

          // Trigger Flash
          const delay = ( time - metronome.getCurrentTime() ) * 1000;
          setTimeout( () => {
            onFlashCallbacks.forEach( cb => cb() );
          }, delay );
        }
      } );

      // Hook up Detector
      detector.onTransient( ( time, _energy ) => {
        console.log( 'DEBUG: onTransient called', { isPlaying: isPlaying.value, lastBeatTime: lastBeatTime.value } );
        if ( !isPlaying.value || lastBeatTime.value === 0 ) return;

        // --- Nearest Beat Logic ---
        // A user might be EARLY for the next beat (Rushing) or LATE for the current one (Dragging).
        // To be accurate, we compare their hit to whichever beat is closer.

        const secondsPerBeat = 60 / tempo.value;
        const secondsPerPulse = secondsPerBeat / subdivision.value;
        const nextBeatTime = lastBeatTime.value + secondsPerPulse;

        const offsetFromLast = ( time - lastBeatTime.value ) * 1000;
        const offsetFromNext = ( time - nextBeatTime ) * 1000;

        // Choose the smaller absolute offset
        const offset = Math.abs( offsetFromLast ) < Math.abs( offsetFromNext )
          ? offsetFromLast
          : offsetFromNext;

        const absOffset = Math.abs( offset );

        // --- Tempo-Aware Window ---
        // At 60BPM, beats are 1000ms apart. At 240BPM, they are 250ms apart.
        // We only accept hits within 50% of the pulse duration to avoid cross-beat noise.
        const windowMs = ( secondsPerPulse * 1000 ) * 0.5;

        if ( absOffset < windowMs ) {
          timingOffset.value = offset;
          history.value.push( offset );
          if ( history.value.length > maxHistory ) history.value.shift();

          // Update Stats
          stats.total++;
          if ( absOffset < 30 ) {
            stats.perfect++;
          } else if ( offset > 0 ) {
            stats.drag++;
          } else {
            stats.rush++;
          }
        }
      } );

      // Hook up Tempo
      metronome.onTempoChange( ( t ) => tempo.value = t );
      isRhythmStarted.value = true;
    } catch ( e: any ) {
      error.value = e.message;
      throw e;
    }
  };

  const start = async () => {
    if ( !isRhythmStarted.value ) await init();

    // Register as an audio consumer so the engine stays active
    useAudioEngine().activate();

    metronome.start();
    detector.start();
    isPlaying.value = true;
  };

  const stop = () => {
    metronome.stop();
    detector.stop();
    isPlaying.value = false;

    // Unregister as an audio consumer
    useAudioEngine().deactivate();
  };

  const toggle = () => {
    if ( isPlaying.value ) stop();
    else start();
  };

  const setTempo = ( t: number ) => {
    tempo.value = t;
    metronome.setTempo( t );
  };

  const setSubdivision = ( s: number ) => {
    subdivision.value = s;
    metronome.setSubdivision( s );
  };

  const setPolySubdivision = ( s: number ) => {
    polySubdivision.value = s;
    metronome.setPolySubdivision( s );
  };

  const setMuteProbability = ( p: number ) => {
    metronome.setMuteProbability( p );
  };

  const resetStats = () => {
    stats.perfect = 0;
    stats.rush = 0;
    stats.drag = 0;
    stats.total = 0;
    history.value = [];
    timingOffset.value = 0;
  };

  const onFlash = ( cb: () => void ) => {
    onFlashCallbacks.push( cb );
  };

  return {
    // State
    isInitialized: isRhythmStarted,
    isEngineInitialized,
    isPlaying,
    tempo,
    currentPulse,
    error,

    // Analysis
    timingOffset: readonly( timingOffset ),
    stats: readonly( stats ), // Reactive object, readonly wrapper
    history: readonly( history ),

    // Actions
    init,
    start,
    stop,
    toggle,
    setTempo,
    setSubdivision,
    setPolySubdivision,
    setMuteProbability,
    resetStats,
    onFlash,

    // Direct Access (for advanced settings)
    metronome,
    detector
  };
} );
