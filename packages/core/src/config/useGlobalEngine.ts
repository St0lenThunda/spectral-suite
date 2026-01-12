import { computed } from 'vue';
// Re-exporting from useAudioEngine or usePitch where they live
// Actually, downsample/lowpass live in usePitch currently, but they are global refs.
// Let's import them from where they are truly defined.
import { isLowPassEnabled as lpf, downsample as ds } from '../audio/usePitch';
import { sensitivityThreshold, clarityThreshold } from './sensitivity';

/**
 * useGlobalEngine
 * 
 * Provides a unified view of the global audio engine's configuration state.
 * Useful for UI modules to determine if "Custom Settings" are active.
 */
export const useGlobalEngine = () => {
  
  const isGlobalEngineActive = computed( () => {
    // 1. Low Pass Filter (Default: false)
    if ( lpf.value ) return true;

    // 2. Downsample Mode (Default: 1)
    if ( ds.value > 1 ) return true;

    // 3. Sensitivity (Default: 0.05)
    // using epsilon for float comparison
    if ( Math.abs( sensitivityThreshold.value - 0.05 ) > 0.001 ) return true;

    // 4. Clarity (Default: 0.6)
    if ( Math.abs( clarityThreshold.value - 0.6 ) > 0.001 ) return true;

    return false;
  });

  return {
    isGlobalEngineActive
  };
};
