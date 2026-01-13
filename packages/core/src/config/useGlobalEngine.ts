import { computed } from 'vue';
import { usePlatformStore } from '../stores/platform';

/**
 * useGlobalEngine
 * 
 * Provides a unified view of the global audio engine's configuration state.
 * Useful for UI modules to determine if "Custom Settings" are active.
 * 
 * WHY:
 * This leverages the usePlatformStore to check if any engine settings
 * (sensitivity, clarity, LPF, etc.) have been modified from their defaults.
 */
export const useGlobalEngine = () => {
  const platform = usePlatformStore();
  
  // Use the pre-computed getter from the store for a single source of truth
  const isGlobalEngineActive = computed( () => platform.isEngineModified );

  return {
    isGlobalEngineActive
  };
};
