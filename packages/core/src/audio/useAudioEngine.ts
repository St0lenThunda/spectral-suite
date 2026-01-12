import { ref } from 'vue';
import { AudioEngine } from './AudioEngine';

const isInitialized = ref( false );
const error = ref<string | null>( null );
const inputGain = ref( 1.0 );
const activeConsumers = ref( 0 );
let suspendTimer: any = null;

export function useAudioEngine () {
  const engine = AudioEngine.getInstance();

  const init = async () => {
    try {
      await engine.init();
      isInitialized.value = true;
      inputGain.value = engine.getGain();
      error.value = null;
    } catch ( err: any ) {
      error.value = err.message;
    }
  };

  const setGain = ( value: number ) => {
    engine.setGain( value );
    inputGain.value = value;
  };

  /**
   * Registers a consumer that requires the audio engine to be running.
   * Resumes the engine references go from 0 -> 1.
   */
  const activate = async () => {
    // Cancel any pending suspension immediately as we have a new consumer
    if ( suspendTimer ) {
      clearTimeout( suspendTimer );
      suspendTimer = null;
    }

    activeConsumers.value++;

    if ( isInitialized.value ) {
      // Ensure engine is running (safe to call multiple times)
      await engine.resume();
    }
  };

  /**
   * Unregisters a consumer.
   * Suspends the engine if references drop to 0.
   */
  const deactivate = async () => {
    activeConsumers.value = Math.max( 0, activeConsumers.value - 1 );

    if ( activeConsumers.value === 0 ) {
      // Debounce the suspension to allow for navigation (switching tools)
      // without continuously stopping/starting the AudioContext hardware.
      if ( suspendTimer ) clearTimeout( suspendTimer );

      suspendTimer = setTimeout( async () => {
        // Double check count is still 0 after delay
        if ( activeConsumers.value === 0 && isInitialized.value ) {
          await engine.suspend();
        }
        suspendTimer = null;
      }, 500 );
    }
  };

  const getAnalyser = () => engine.getAnalyser();
  const getContext = () => engine.getContext();

  return {
    isInitialized,
    error,
    inputGain,
    init,
    setGain,
    getAnalyser,
    getContext,
    activate,
    deactivate,
    resume: () => engine.resume(),
    suspend: () => engine.suspend(),
    close: () => engine.close(),
  };
}
