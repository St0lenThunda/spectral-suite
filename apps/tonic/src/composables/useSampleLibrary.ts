import { ref, computed } from 'vue';
import {
  SampleManager,
  SynthEngine,
  Note,
  type InstrumentInfo
} from '@spectralsuite/core';

// ─── SHARED REACTIVE STATE ─────────────────────────────────────────

/**
 * These refs live OUTSIDE the composable function so they are shared
 * across all components that call `useSampleLibrary()`.
 *
 * This is the same pattern used in `useAudioEngine.ts` — a module-level
 * singleton of reactive state paired with a composable that exposes it.
 *
 * Why module-level?
 *   Without this, each component calling `useSampleLibrary()` would get
 *   its own separate `isLoading` ref — one component wouldn't know that
 *   another component already loaded the piano samples.
 */

/** The ID of the currently active (loaded into SynthEngine) instrument */
const currentInstrumentId = ref<string | null>( null );

/** Whether a CDN fetch operation is currently in progress */
const isLoading = ref( false );

/** Progress tracking: how many note files have been fetched so far */
const loadedCount = ref( 0 );

/** Progress tracking: total number of note files being fetched */
const totalCount = ref( 0 );

/** Error message from the last operation, or null if no error */
const lastError = ref<string | null>( null );

/** List of instrument IDs that have been saved to IndexedDB */
const savedInstrumentIds = ref<string[]>( [] );

/**
 * Whether real sample buffers are currently loaded in the SynthEngine.
 * When true, the SAMPLED preset will play actual instrument recordings.
 * When false, it falls back to the PURE additive voice.
 */
const hasSamples = ref( false );

// ─── COMPOSABLE ─────────────────────────────────────────────────────

/**
 * useSampleLibrary — Vue composable for managing instrument samples.
 *
 * This is the "plug-and-play" reactive interface between the UI components
 * and the SampleManager service. It wraps all the async operations
 * (fetch, save, load, delete) in reactive state that Vue templates
 * can bind to directly.
 *
 * Usage:
 * ```vue
 * <script setup>
 * const { availableInstruments, previewInstrument, isLoading } = useSampleLibrary();
 * </script>
 * ```
 *
 * @returns Reactive state and action functions for instrument management
 */
export function useSampleLibrary () {
  const manager = SampleManager.getInstance();

  // ─── COMPUTED ─────────────────────────────────────────────────

  /**
   * The full list of instruments available from the CDN.
   * This is static — it comes from the instrument registry.
   *
   * Each instrument is annotated with:
   *   - `isSaved`: whether it's been saved to IndexedDB
   *   - `isActive`: whether it's the currently loaded instrument
   */
  const availableInstruments = computed( () => {
    return manager.getAvailableInstruments().map( ( info: InstrumentInfo ) => ( {
      ...info,
      isSaved: savedInstrumentIds.value.includes( info.id ),
      isActive: currentInstrumentId.value === info.id
    } ) );
  } );

  /**
   * Progress percentage for downloads (0 to 100).
   * Used by progress bars in the UI.
   */
  const loadingProgress = computed( () => {
    if ( totalCount.value === 0 ) return 0;
    return Math.round( ( loadedCount.value / totalCount.value ) * 100 );
  } );

  // ─── ACTIONS ──────────────────────────────────────────────────

  /**
   * Refreshes the list of saved instrument IDs from IndexedDB.
   *
   * Called on mount and after save/delete operations to keep
   * the savedInstrumentIds ref in sync with the actual database state.
   */
  const refreshSavedList = async () => {
    try {
      savedInstrumentIds.value = await manager.getSavedInstruments();
    } catch ( err: unknown ) {
      console.warn( '[useSampleLibrary] Error loading saved list:', err );
    }
  };

  /**
   * Fetches an instrument from CDN and activates it for preview.
   * Does NOT save to IndexedDB — the user must explicitly save.
   *
   * Flow:
   *   1. Set loading state (shows spinner in UI)
   *   2. Fetch all note samples from CDN in parallel
   *   3. Push decoded buffers into SynthEngine
   *   4. Switch SynthEngine to SAMPLED preset
   *   5. Clear loading state
   *
   * @param id - The instrument ID to preview (e.g. 'piano')
   */
  const previewInstrument = async ( id: string ) => {
    isLoading.value = true;
    loadedCount.value = 0;
    totalCount.value = 0;
    lastError.value = null;

    try {
      // Find the instrument info to know the total note count
      const info = manager.getAvailableInstruments().find( i => i.id === id );
      totalCount.value = info?.availableNotes.length ?? 0;

      // Fetch with progress tracking
      await manager.fetchInstrument( id, ( loaded, total ) => {
        loadedCount.value = loaded;
        totalCount.value = total;
      } );

      // Activate: push buffers to SynthEngine and switch preset
      const activated = manager.activateInstrument( id );
      if ( activated ) {
        currentInstrumentId.value = id;
        hasSamples.value = true;
      }
    } catch ( err: unknown ) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      lastError.value = message;
      console.error( '[useSampleLibrary] Preview failed:', err );
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Saves the currently previewed instrument to IndexedDB.
   *
   * After saving, the instrument loads instantly from local storage
   * on future app visits — no more CDN downloads needed.
   *
   * @throws Error if no instrument is currently loaded
   */
  const saveCurrentInstrument = async () => {
    if ( !currentInstrumentId.value ) {
      lastError.value = 'No instrument loaded to save';
      return;
    }

    isLoading.value = true;
    lastError.value = null;

    try {
      await manager.saveInstrument( currentInstrumentId.value );
      await refreshSavedList(); // Update the UI's saved list
    } catch ( err: unknown ) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      lastError.value = message;
      console.error( '[useSampleLibrary] Save failed:', err );
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Loads a previously saved instrument from IndexedDB and activates it.
   *
   * This is the "offline" path — no network needed. Called on app start
   * or when the user selects a saved instrument.
   *
   * @param id - The instrument ID to load
   */
  const loadSavedInstrument = async ( id: string ) => {
    isLoading.value = true;
    lastError.value = null;

    try {
      const buffers = await manager.loadSavedInstrument( id );
      if ( buffers ) {
        const activated = manager.activateInstrument( id );
        if ( activated ) {
          currentInstrumentId.value = id;
          hasSamples.value = true;
        }
      } else {
        lastError.value = `Instrument "${id}" not found in local storage`;
      }
    } catch ( err: unknown ) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      lastError.value = message;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Deletes a saved instrument from IndexedDB.
   * If the deleted instrument was the active one, switches back to PURE preset.
   *
   * @param id - The instrument ID to delete
   */
  const deleteSavedInstrument = async ( id: string ) => {
    try {
      await manager.deleteSavedInstrument( id );
      await refreshSavedList();

      // If we deleted the active instrument, revert to PURE
      if ( currentInstrumentId.value === id ) {
        currentInstrumentId.value = null;
        hasSamples.value = false;
        SynthEngine.getInstance().setPreset( 'PURE' );
      }
    } catch ( err: unknown ) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      lastError.value = message;
    }
  };

  /**
   * Switches to the PURE additive synthesis preset (no samples needed).
   * Clears the current instrument selection.
   */
  const switchToPure = () => {
    SynthEngine.getInstance().setPreset( 'PURE' );
    currentInstrumentId.value = null;
    hasSamples.value = false;
  };

  /**
   * Plays a single test note using the currently active instrument.
   * Used by the "preview" button in the UI to demonstrate the sound.
   *
   * @param note - Note name with octave (e.g. 'C4', 'A3')
   */
  const playPreviewNote = ( note: string = 'C4' ) => {
    const synth = SynthEngine.getInstance();
    const freq = Note.freq( note );
    if ( freq ) {
      synth.playNote( freq, 500, 0.3 );
    }
  };

  // Load saved instruments list on initialization
  refreshSavedList();

  return {
    // State
    currentInstrumentId,
    isLoading,
    loadedCount,
    totalCount,
    loadingProgress,
    lastError,
    hasSamples,
    savedInstrumentIds,

    // Computed
    availableInstruments,

    // Actions
    previewInstrument,
    saveCurrentInstrument,
    loadSavedInstrument,
    deleteSavedInstrument,
    switchToPure,
    playPreviewNote,
    refreshSavedList
  };
}
