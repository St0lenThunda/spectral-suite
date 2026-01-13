import { defineStore } from 'pinia';

/**
 * usePlatformStore - Centralized store for all platform-wide settings.
 * 
 * WHY THIS EXISTS:
 * Previously, settings like sensitivity and clarity were scattered as
 * standalone Vue refs in different files. This store consolidates them,
 * provides DevTools inspection, and enables localStorage persistence.
 * 
 * PERSISTENCE:
 * When used with pinia-plugin-persistedstate, all settings are automatically
 * saved to localStorage and restored on page reload.
 * 
 * @example
 * const platform = usePlatformStore();
 * platform.sensitivity = 0.05;
 * platform.toggleProMode();
 */
export const usePlatformStore = defineStore( 'platform', {
  /**
   * STATE:
   * All reactive settings that affect multiple tools across the platform.
   */
  state: () => ( {
    // --- Audio Engine Settings ---

    /**
     * Microphone gate sensitivity threshold (0.0 - 1.0).
     * Lower = More sensitive to quiet sounds.
     * Default 0.01 is very sensitive, suitable for most use cases.
     */
    sensitivity: 0.01,

    /**
     * Pitch detection clarity threshold (0.0 - 1.0).
     * Determines how "pure" a sound must be to register as a note.
     * Lower = More forgiving (accepts messier audio).
     * Higher = Stricter (requires clean, periodic signal).
     * Default 0.6 balances accuracy and usability for guitar/voice.
     */
    clarity: 0.6,

    /**
     * Pro Mode / Raw Audio Mode toggle.
     * - false (default): Browser applies AGC, noise suppression, echo cancellation.
     * - true: Raw microphone input, no browser processing.
     * 
     * Why use Pro Mode?
     * Pro Mode gives more accurate spectral data but requires louder input.
     * Useful for professional audio analysis where you control the environment.
     */
    isRawAudioMode: false,

    /**
     * Low-pass filter for pitch detection.
     * When true, applies a low-pass filter before pitch analysis.
     * Can help with noisy environments but may reduce accuracy for high notes.
     */
    isLowPassEnabled: false,

    /**
     * Downsampling factor for pitch detection (1 = no downsampling).
     * Higher values reduce CPU usage but may miss high-frequency content.
     * Default: 1 (full resolution).
     */
    downsample: 1,

    // --- UI Settings ---

    /**
     * Map of tool IDs to their enabled state.
     * Allows users to hide tools they don't use.
     */
    enabledTools: {} as Record<string, boolean>,

    /**
     * Show developer/debug options in UI.
     */
    showDeveloperOptions: false,
  } ),

  /**
   * GETTERS:
   * Computed properties derived from state.
   */
  getters: {
    /**
     * Returns true if any audio processing setting differs from default.
     * Useful for showing "modified" indicators in UI.
     */
    isEngineModified: ( state ) => {
      return state.sensitivity !== 0.01 ||
        state.clarity !== 0.6 ||
        state.isRawAudioMode !== false ||
        state.isLowPassEnabled !== false ||
        state.downsample !== 1;
    },
  },

  /**
   * ACTIONS:
   * Methods that modify state, can contain async logic.
   */
  actions: {
    /**
     * Toggle Pro Audio Mode on/off.
     * Note: This does NOT automatically reinitialize the audio engine.
     * The AudioEngine reads this value when initializing the microphone stream.
     */
    toggleProMode () {
      this.isRawAudioMode = !this.isRawAudioMode;
    },

    /**
     * Reset all audio settings to defaults.
     */
    resetAudioSettings () {
      this.sensitivity = 0.01;
      this.clarity = 0.6;
      this.isRawAudioMode = false;
    },

    /**
     * Set the enabled/disabled state of a specific tool.
     */
    setToolEnabled ( toolId: string, enabled: boolean ) {
      this.enabledTools[toolId] = enabled;
    },
  },

  /**
   * PERSISTENCE:
   * Automatically saves to localStorage and restores on page load.
   * Requires pinia-plugin-persistedstate to be installed.
   */
  persist: true,
} );
