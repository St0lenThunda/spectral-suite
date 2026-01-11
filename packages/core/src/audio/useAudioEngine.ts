import { ref } from 'vue';
import { AudioEngine } from './AudioEngine';

const isInitialized = ref( false );
const error = ref<string | null>( null );
const inputGain = ref( 1.0 );
const activeConsumers = ref( 0 );

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
    if ( activeConsumers.value === 0 ) {
      if ( isInitialized.value ) {
        await engine.resume();
      }
    }
    activeConsumers.value++;
  };

  /**
   * Unregisters a consumer.
   * Suspends the engine if references drop to 0.
   */
  const deactivate = () => {
    activeConsumers.value = Math.max( 0, activeConsumers.value - 1 );
    if ( activeConsumers.value === 0 ) {
      if ( isInitialized.value ) {
        engine.suspend();
      }
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
