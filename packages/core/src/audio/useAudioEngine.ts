import { ref } from 'vue';
import { AudioEngine } from './AudioEngine';

const isInitialized = ref( false );
const error = ref<string | null>( null );
const inputGain = ref( 1.0 );

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
    resume: () => engine.resume(),
    suspend: () => engine.suspend(),
    close: () => engine.close(),
  };
}
