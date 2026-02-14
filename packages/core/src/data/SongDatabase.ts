import { openDB, type IDBPDatabase } from 'idb';
import type { SongEntry, ChordTransition } from './types';
import { BinaryLoader } from './BinaryLoader';

/**
 * SongDatabase — IndexedDB Persistence Layer
 * 
 * This class manages the local storage of the 666,000+ chord progressions.
 * We use IndexedDB because:
 * 1. It operates asynchronously (won't freeze the UI during massive imports).
 * 2. It supports sophisticated indexing for Genre, Decade, and Search.
 * 3. It allows us to handle datasets larger than the memory limit.
 */
export class SongDatabase {
  private static DB_NAME = 'spectral-suite-songs';
  private static STORE_SONGS = 'songs';
  private static STORE_TRANSITIONS = 'transitions';
  private static db: IDBPDatabase | null = null;

  /**
   * Initializes the database and creates object stores/indexes.
   */
  public static async init (): Promise<void> {
    if ( this.db ) return;

    this.db = await openDB( this.DB_NAME, 1, {
      upgrade ( db ) {
        // Create the primary song store
        if ( !db.objectStoreNames.contains( SongDatabase.STORE_SONGS ) ) {
          const songStore = db.createObjectStore( SongDatabase.STORE_SONGS, { keyPath: 'id' } );
          songStore.createIndex( 'genre', 'genre' );
          songStore.createIndex( 'decade', 'decade' );
        }

        // Create the transition store for statistical suggestions
        if ( !db.objectStoreNames.contains( SongDatabase.STORE_TRANSITIONS ) ) {
          const transStore = db.createObjectStore( SongDatabase.STORE_TRANSITIONS, { autoIncrement: true } );
          transStore.createIndex( 'from', 'from' );
          transStore.createIndex( 'decade', 'decade' );
        }
      },
    } );
  }

  /**
   * Checks if the database has already been populated.
   */
  public static async isImported (): Promise<boolean> {
    if ( !this.db ) await this.init();
    const count = await this.db!.count( this.STORE_SONGS );
    return count > 0;
  }

  /**
   * Clears all data from the database.
   */
  public static async clear (): Promise<void> {
    if ( !this.db ) await this.init();
    const tx = this.db!.transaction( [this.STORE_SONGS, this.STORE_TRANSITIONS], 'readwrite' );
    await tx.objectStore( this.STORE_SONGS ).clear();
    await tx.objectStore( this.STORE_TRANSITIONS ).clear();
    await tx.done;
  }

  /**
   * Imports the binary database from the public assets.
   */
  /**
   * Imports the binary database using a Web Worker to avoid freezing the UI.
   * 
   * @param onProgress - Optional callback to receive progress updates (0-100)
   */
  public static async loadBinaryDatabase ( onProgress?: ( percent: number ) => void ): Promise<void> {
    if ( await this.isImported() ) {
      console.log( 'SongDatabase: Already populated.' );
      if ( onProgress ) onProgress( 100 );
      return;
    }

    return new Promise( ( resolve, reject ) => {
      console.log( 'SongDatabase: Spawning worker...' );

      // Vite handles this syntax to compile the worker into a separate chunk
      const worker = new Worker( new URL( '../workers/database.worker.ts', import.meta.url ), {
        type: 'module'
      } );

      worker.onmessage = ( event ) => {
        const { type, message, progress, error } = event.data;

        switch ( type ) {
          case 'LOG':
            console.log( `[Worker] ${message}` );
            break;
          case 'PROGRESS':
            if ( onProgress ) onProgress( progress );
            break;
          case 'COMPLETE':
            console.log( 'SongDatabase: Worker reported completion.' );
            worker.terminate();
            resolve();
            break;
          case 'ERROR':
            console.error( 'SongDatabase: Worker reported error:', error );
            worker.terminate();
            reject( new Error( error ) );
            break;
        }
      };

      worker.onerror = ( err ) => {
        console.error( 'SongDatabase: Worker error', err );
        worker.terminate();
        reject( err );
      };

      // Start the job
      worker.postMessage( { type: 'INIT_DB' } );
    } );
  }

  /**
   * Imports a bulk array of songs into the database.
   * 
   * @param songs - Array of song entries
   */
  public static async importSongs ( songs: SongEntry[] ): Promise<void> {
    if ( !this.db ) await this.init();

    // We import in chunks to avoid blocking the main thread for too long
    // and to prevent transaction timeouts with massive datasets.
    const CHUNK_SIZE = 2000; // Increased chunk size for faster import
    for ( let i = 0; i < songs.length; i += CHUNK_SIZE ) {
      const chunk = songs.slice( i, i + CHUNK_SIZE );
      const tx = this.db!.transaction( this.STORE_SONGS, 'readwrite' );
      const store = tx.objectStore( this.STORE_SONGS );

      // Use a more efficient bulk put if possible, but standard loop is fine
      await Promise.all( [
        ...chunk.map( song => store.put( song ) ),
        tx.done
      ] );

      // Log progress every 10 chunks to avoid spam
      if ( ( i / CHUNK_SIZE ) % 10 === 0 ) {
        console.log( `Imported ${Math.min( i + CHUNK_SIZE, songs.length )} / ${songs.length} songs...` );
      }
    }
  }

  /**
   * Imports chord transition probabilities.
   * 
   * @param transitions - Array of chord transitions
   */
  public static async importTransitions ( transitions: ChordTransition[] ): Promise<void> {
    if ( !this.db ) await this.init();

    const tx = this.db!.transaction( this.STORE_TRANSITIONS, 'readwrite' );
    const store = tx.objectStore( this.STORE_TRANSITIONS );

    for ( const trans of transitions ) {
      await store.put( trans );
    }

    await tx.done;
  }

  /**
   * Searches for songs based on genre or decade.
   * 
   * @param options - Search filters
   * @returns Promise<SongEntry[]>
   */
  public static async search ( options: { genre?: string; decade?: string; limit?: number } ): Promise<SongEntry[]> {
    if ( !this.db ) await this.init();
    const limit = options.limit || 50;

    // Note: A real implementation would use advanced filtering.
    // For now, we search by index.
    const tx = this.db!.transaction( this.STORE_SONGS, 'readonly' );
    const store = tx.objectStore( this.STORE_SONGS );

    let results: SongEntry[] = [];

    if ( options.genre ) {
      results = await store.index( 'genre' ).getAll( options.genre, limit );
    } else if ( options.decade ) {
      results = await store.index( 'decade' ).getAll( options.decade, limit );
    } else {
      results = await store.getAll( undefined, limit );
    }

    return results;
  }

  /**
   * Gets transition probabilities for a specific starting chord.
   * 
   * @param fromChord - The current chord symbol
   * @param decade - Optional era filter
   * @returns Promise<ChordTransition[]>
   */
  public static async getTransitions ( fromChord: string, decade?: string ): Promise<ChordTransition[]> {
    if ( !this.db ) await this.init();

    const tx = this.db!.transaction( this.STORE_TRANSITIONS, 'readonly' );
    const index = tx.objectStore( this.STORE_TRANSITIONS ).index( 'from' );

    const allMatches: ChordTransition[] = await index.getAll( fromChord );

    // Filter by decade if requested
    if ( decade ) {
      return allMatches.filter( t => t.decade === decade );
    }

    return allMatches;
  }

  /**
   * Gets a single song by its ID.
   */
  public static async getSong ( id: string ): Promise<SongEntry | undefined> {
    if ( !this.db ) await this.init();
    return this.db!.transaction( this.STORE_SONGS ).objectStore( this.STORE_SONGS ).get( id );
  }

  /**
   * Updates the metadata for a specific song.
   */
  public static async updateMetadata ( id: string, metadata: Partial<SongEntry> ): Promise<void> {
    if ( !this.db ) await this.init();

    const tx = this.db!.transaction( this.STORE_SONGS, 'readwrite' );
    const store = tx.objectStore( this.STORE_SONGS );

    const song = await store.get( id );
    if ( !song ) {
      console.warn( `SongDatabase: Cannot update metadata, song ${id} not found.` );
      return;
    }

    // Merge metadata
    const updatedSong = { ...song, ...metadata };
    await store.put( updatedSong );
    await tx.done;
  }
}
