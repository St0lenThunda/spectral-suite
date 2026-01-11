import { defineStore } from 'pinia';
import { ref, reactive, readonly } from 'vue';
import { MetronomeEngine } from '../rhythm/MetronomeEngine';
import { TransientDetector } from '../rhythm/TransientDetector';

export const useRhythmStore = defineStore( 'rhythm', () => {

  // State (Engine Instances - scoped to Store Lifecycle)
  const metronome = new MetronomeEngine( 120 );
  const detector = new TransientDetector( 0.3 );

  // Reactive State
  const isInitialized = ref( false );
  const isPlaying = ref( false );
  const tempo = ref( 120 );
  const subdivision = ref( 1 );
  const polySubdivision = ref( 0 );
  const currentPulse = ref( 0 );
  const error = ref<string | null>( null );

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
  const init = async () => {
    if ( isInitialized.value ) return;

    try {
      metronome.init();
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

      isInitialized.value = true;
    } catch ( e: any ) {
      error.value = e.message;
      throw e;
    }
  };

  const start = () => {
    if ( !isInitialized.value ) init();
    metronome.start();
    detector.start();
    isPlaying.value = true;
  };

  const stop = () => {
    metronome.stop();
    detector.stop();
    isPlaying.value = false;
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
    isInitialized: readonly( isInitialized ),
    isPlaying: readonly( isPlaying ),
    tempo: readonly( tempo ),
    currentPulse: readonly( currentPulse ),
    error: readonly( error ),

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
