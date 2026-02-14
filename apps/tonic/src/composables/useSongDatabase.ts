import { ref } from 'vue';
import {
  SongDatabase,
  RecommendationEngine,
  HarmonicPathRecorder,
  SpotifyService,
  type ScoredSuggestion,
  type SongEntry
} from '@spectralsuite/core';
import { useToast } from './useToast';

/**
 * useSongDatabase — Frontend Data Integration
 */
// Singleton State
const isImporting = ref( false );
const importProgress = ref( 0 );
const isDatabaseReady = ref( false );
const pathRecorder = new HarmonicPathRecorder();
const metadataCache = new Map<string, any>();
const currentPath = ref( pathRecorder.getPath() );
const chordHistory = ref( pathRecorder.getHistory() );

/**
 * useSongDatabase — Frontend Data Integration
 */
export function useSongDatabase () {
  const { showError } = useToast();

  /**
   * Initializes the database connection and imports seed data if needed.
   */
  async function initDatabase () {
    if ( isDatabaseReady.value ) return; // Already initialized

    try {
      console.log( 'useSongDatabase: Initializing database...' );
      await SongDatabase.init();

      const alreadyImported = await SongDatabase.isImported();
      if ( !alreadyImported ) {
        console.log( 'useSongDatabase: Database empty. Starting import...' );
        isImporting.value = true;

        await SongDatabase.loadBinaryDatabase( ( progress ) => {
          importProgress.value = progress;
        } );

        isDatabaseReady.value = true;
      } else {
        console.log( 'useSongDatabase: Database already populated.' );
        isDatabaseReady.value = true;
      }
    } catch ( err ) {
      console.error( 'Failed to initialize song database:', err );
      showError( 'Could not initialize the song explorer database.' );
    } finally {
      isImporting.value = false;
    }
  }



  /**
   * Gets hybrid chord suggestions for a given chord.
   */
  async function getHybridSuggestions ( chord: string ): Promise<ScoredSuggestion[]> {
    // FALLBACK: If database isn't ready, we still want Geometric/Theoretical suggestions!
    // We just won't have the Statistical data yet.
    try {
      return await RecommendationEngine.getScoredSuggestions( chord, {
        statWeight: isDatabaseReady.value ? 0.5 : 0.0,
        geomWeight: 0.3,
        theoryWeight: 0.2
      } );
    } catch ( err ) {
      console.error( 'Suggestion generation failed:', err );
      return [];
    }
  }

  /**
   * Records a chord and finds geometrically similar songs.
   */
  async function trackMovement ( chord: string ): Promise<{ song: SongEntry, score: number }[]> {
    pathRecorder.recordChord( chord );
    currentPath.value = pathRecorder.getPath(); // Update reactive state
    chordHistory.value = pathRecorder.getHistory();

    if ( !isDatabaseReady.value ) return [];

    try {
      return await pathRecorder.findSimilarSongs();
    } catch ( err ) {
      console.error( 'Similar song search failed:', err );
      return [];
    }
  }

  /**
   * Resolves a Spotify ID into metadata.
   */
  /**
   * Resolves a Spotify ID into metadata, using the local Sidecar Cache first.
   */
  async function resolveSongMetadata ( spotifyId: string, songId: string ) {
    // 1. Check In-Memory Cache (Fastest)
    if ( metadataCache.has( spotifyId ) ) return metadataCache.get( spotifyId );

    // 2. Check Persistent "Sidecar" Cache (Via SongDatabase)
    // We can do this by re-fetching the song, which now auto-merges metadata.
    // Or we can just let the UI handle it if it calls getSong().
    // But for explicit resolution:

    try {
      const metadata = await SpotifyService.getTrackMetadata( spotifyId );

      if ( metadata ) {
        // 3. Persist to Sidecar Cache
        console.log( `useSongDatabase: Caching metadata for ${songId}` );
        await SongDatabase.updateMetadata( songId, metadata );

        // 4. Update Memory Cache
        metadataCache.set( spotifyId, metadata );
      }

      return metadata;
    } catch ( err ) {
      console.warn( `Failed to resolve metadata for ${spotifyId}`, err );
      metadataCache.set( spotifyId, null ); // Prevent retry loop
      return null;
    }
  }

  return {
    isDatabaseReady,
    isImporting,
    importProgress,
    currentPath,
    chordHistory,
    initDatabase,
    getHybridSuggestions,
    trackMovement,
    resolveSongMetadata,
    removeChord: ( index: number ) => {
      pathRecorder.removeChord( index );
      currentPath.value = pathRecorder.getPath();
      chordHistory.value = pathRecorder.getHistory();
    },
    clearHistory: () => {
      pathRecorder.clear();
      currentPath.value = [];
      chordHistory.value = [];
    }
  };
}
