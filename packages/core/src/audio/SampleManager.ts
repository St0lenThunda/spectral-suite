
import { SynthEngine } from './SynthEngine';

// ─── TYPES ──────────────────────────────────────────────────────────

/**
 * Describes a single instrument available from the CDN.
 *
 * Think of this as a "catalog entry" — it tells the app where to find
 * the samples and what notes are available, but doesn't hold any audio data.
 */
export interface InstrumentInfo {
  /** Unique machine-readable identifier, e.g. 'piano', 'guitar-acoustic' */
  id: string;

  /** Human-readable name shown in the UI, e.g. 'Grand Piano' */
  name: string;

  /** Emoji icon for visual identification */
  icon: string;

  /**
   * CDN base URL where the sample files live.
   * Individual note files are appended to this, e.g. `${baseUrl}/C3.mp3`
   */
  baseUrl: string;

  /**
   * File extension of the samples on the CDN (e.g. 'mp3', 'ogg').
   * Different CDN sources use different formats.
   */
  format: string;

  /**
   * The note names available from this instrument's CDN.
   * We don't download every single note — just enough to cover the keyboard
   * with small pitch-shifts between them.
   *
   * e.g. ['C3', 'Eb3', 'Gb3', 'A3', 'C4', 'Eb4', 'Gb4', 'A4']
   */
  availableNotes: string[];

  /** Attribution text required by the sample's license */
  attribution: string;
}

// ─── INSTRUMENT REGISTRY ────────────────────────────────────────────

/**
 * The catalog of instruments we know how to fetch from CDN.
 *
 * Each entry defines the CDN URL pattern and which notes to download.
 * We sample every 3 semitones (minor 3rd intervals) across 2 octaves.
 * This gives us 8 samples per instrument — enough for excellent coverage
 * with pitch-shifting of at most ±1.5 semitones.
 *
 * Why every 3 semitones?
 *   - Less than 3: too many files to download (24+ per instrument)
 *   - More than 3: pitch-shifting artifacts become audible
 *   - 3 is the sweet spot: 8 files × ~40KB = ~320KB per instrument
 */
const INSTRUMENT_REGISTRY: InstrumentInfo[] = [
  {
    id: 'piano',
    name: 'Grand Piano',
    icon: '🎹',
    baseUrl: 'https://tonejs.github.io/audio/salamander',
    format: 'mp3',
    // Salamander piano samples use note names like 'A3.mp3', 'C4.mp3'
    availableNotes: ['C3', 'Eb3', 'Gb3', 'A3', 'C4', 'Eb4', 'Gb4', 'A4'],
    attribution: 'Salamander Grand Piano by Alexander Holm (CC BY 3.0)'
  },
  {
    id: 'guitar-acoustic',
    name: 'Acoustic Guitar',
    icon: '🎸',
    baseUrl: 'https://tonejs.github.io/audio/guitar-acoustic',
    format: 'mp3',
    availableNotes: ['C3', 'Eb3', 'Gb3', 'A3', 'C4', 'Eb4', 'Gb4', 'A4'],
    attribution: 'Acoustic Guitar samples (CC BY 3.0)'
  },
  {
    id: 'harmonium',
    name: 'Harmonium',
    icon: '🎼',
    baseUrl: 'https://tonejs.github.io/audio/harmonium',
    format: 'mp3',
    availableNotes: ['C3', 'Eb3', 'Gb3', 'A3', 'C4', 'Eb4', 'Gb4', 'A4'],
    attribution: 'Harmonium samples (CC BY 3.0)'
  }
];

// ─── INDEXEDDB HELPERS ──────────────────────────────────────────────

/**
 * IndexedDB database name and version.
 *
 * IndexedDB is a browser-native database for storing large binary data.
 * Unlike localStorage (which only holds strings up to ~5MB), IndexedDB
 * can store hundreds of MB of ArrayBuffer data — perfect for audio samples.
 *
 * We use a dedicated database so it doesn't conflict with other app storage.
 */
const DB_NAME = 'spectral-suite-samples';

/**
 * Database version. Increment this if you change the object store schema.
 * IndexedDB uses this to trigger the `onupgradeneeded` callback where
 * you can create/modify object stores.
 */
const DB_VERSION = 1;

/** Name of the object store that holds saved instrument sample data */
const STORE_NAME = 'instruments';

/**
 * Opens (or creates) the IndexedDB database.
 *
 * This is an async operation because IndexedDB is fully asynchronous.
 * We wrap it in a Promise to make it easier to use with async/await.
 *
 * @returns A Promise that resolves to the opened IDBDatabase
 */
function openDatabase (): Promise<IDBDatabase> {
  return new Promise( ( resolve, reject ) => {
    const request = indexedDB.open( DB_NAME, DB_VERSION );

    /**
     * `onupgradeneeded` fires when the database is first created OR when
     * the version number increases. This is where we define our schema.
     */
    request.onupgradeneeded = ( event ) => {
      const db = ( event.target as IDBOpenDBRequest ).result;

      // Create the 'instruments' store if it doesn't already exist
      if ( !db.objectStoreNames.contains( STORE_NAME ) ) {
        db.createObjectStore( STORE_NAME );
      }
    };

    request.onsuccess = () => resolve( request.result );
    request.onerror = () => reject( request.error );
  } );
}

// ─── SAMPLE MANAGER ─────────────────────────────────────────────────

/**
 * SampleManager — CDN Sample Fetching + IndexedDB Persistence
 *
 * This service handles the full lifecycle of instrument samples:
 *   1. FETCH:  Download MP3 samples from CDN and decode into AudioBuffers
 *   2. PREVIEW: Let the user try the sound before committing
 *   3. SAVE:   Store the raw ArrayBuffer data in IndexedDB for offline use
 *   4. LOAD:   On next app start, load saved samples from IndexedDB (no network)
 *   5. DELETE: Remove saved instruments to free up browser storage
 *
 * It follows the Singleton pattern (like AudioEngine and SynthEngine)
 * because we only ever need one instance managing sample data.
 *
 * Storage format in IndexedDB:
 *   Key:   instrument ID (e.g. 'piano')
 *   Value: { notes: { [noteName]: ArrayBuffer }, instrumentId: string }
 *
 * We store raw ArrayBuffers (not decoded AudioBuffers) because:
 *   - AudioBuffers can't be serialized to IndexedDB
 *   - ArrayBuffers are compact and can be decoded on load
 *   - This matches the format we get from fetch()
 */
export class SampleManager {
  private static instance: SampleManager;

  /**
   * In-memory cache of decoded AudioBuffers, keyed by instrument ID.
   * After fetching or loading from IndexedDB, decoded buffers live here
   * so we don't re-decode on every preset switch.
   */
  private cache: Map<string, Map<string, AudioBuffer>> = new Map();

  /** Private constructor — use SampleManager.getInstance() */
  private constructor() { }

  /**
   * Retrieves the singleton instance, creating it if needed.
   *
   * @returns SampleManager — the globally shared instance
   */
  public static getInstance (): SampleManager {
    if ( !SampleManager.instance ) {
      SampleManager.instance = new SampleManager();
    }
    return SampleManager.instance;
  }

  // ─── INSTRUMENT REGISTRY ────────────────────────────────────────

  /**
   * Returns the list of instruments available to fetch from CDN.
   * This is the "catalog" — it doesn't mean they're downloaded yet.
   *
   * @returns Array of InstrumentInfo objects describing each available instrument
   */
  public getAvailableInstruments (): InstrumentInfo[] {
    return INSTRUMENT_REGISTRY;
  }

  // ─── CDN FETCHING ───────────────────────────────────────────────

  /**
   * Fetches an instrument's samples from the CDN, decodes them into
   * AudioBuffers, and returns them (but does NOT save to IndexedDB).
   *
   * This is the "preview" step — the user can try the sound before saving.
   *
   * How it works:
   *   1. Look up the instrument in the registry to get its CDN URL
   *   2. For each note in the instrument's list, fetch the MP3 file
   *   3. Convert the raw `ArrayBuffer` → `AudioBuffer` via `decodeAudioData()`
   *   4. Store in the in-memory cache for immediate playback
   *
   * @param id - The instrument ID (e.g. 'piano')
   * @param onProgress - Optional callback fired as each note loads
   * @returns Map of note name → decoded AudioBuffer
   * @throws Error if the instrument ID is not found in the registry
   */
  public async fetchInstrument (
    id: string,
    onProgress?: ( loaded: number, total: number ) => void
  ): Promise<Map<string, AudioBuffer>> {
    const info = INSTRUMENT_REGISTRY.find( i => i.id === id );
    if ( !info ) {
      throw new Error( `[SampleManager] Unknown instrument: "${id}"` );
    }

    // We need an AudioContext to decode audio data
    const context = await this._getOrCreateContext();
    const buffers = new Map<string, AudioBuffer>();
    let loaded = 0;

    /**
     * Fetch all notes in parallel using Promise.all for speed.
     * Each note is an independent HTTP request that can run concurrently.
     */
    const fetchPromises = info.availableNotes.map( async ( noteName ) => {
      try {
        // Build the full URL: e.g. 'https://tonejs.github.io/audio/salamander/C3.mp3'
        const url = `${info.baseUrl}/${noteName}.${info.format}`;
        console.log( `[SampleManager] Fetching: ${url}` );

        const response = await fetch( url );
        if ( !response.ok ) {
          console.warn( `[SampleManager] Failed to fetch ${url}: ${response.status}` );
          return;
        }

        // Get the raw binary data from the response
        const arrayBuffer = await response.arrayBuffer();

        /**
         * decodeAudioData() converts compressed audio (MP3/OGG) into
         * raw PCM samples that the Web Audio API can play directly.
         * This is a CPU-intensive operation but only happens once per note.
         */
        const audioBuffer = await context.decodeAudioData( arrayBuffer.slice( 0 ) );
        buffers.set( noteName, audioBuffer );
      } catch ( err ) {
        console.warn( `[SampleManager] Error fetching ${noteName}:`, err );
      }

      loaded++;
      onProgress?.( loaded, info.availableNotes.length );
    } );

    await Promise.all( fetchPromises );

    // Cache the decoded buffers in memory
    this.cache.set( id, buffers );
    console.log( `[SampleManager] Fetched ${buffers.size}/${info.availableNotes.length} samples for "${id}"` );

    return buffers;
  }

  // ─── INDEXEDDB PERSISTENCE ──────────────────────────────────────

  /**
   * Saves a fetched instrument's samples to IndexedDB for offline use.
   *
   * We store the raw ArrayBuffers (not decoded AudioBuffers) because
   * AudioBuffers are not serializable. On next load, we'll re-decode them.
   *
   * This also re-fetches the raw data from CDN if we only have decoded
   * buffers in cache (since we can't reverse the decode).
   *
   * @param id - The instrument ID to save
   * @throws Error if the instrument hasn't been fetched yet
   */
  public async saveInstrument ( id: string ): Promise<void> {
    const info = INSTRUMENT_REGISTRY.find( i => i.id === id );
    if ( !info ) {
      throw new Error( `[SampleManager] Unknown instrument: "${id}"` );
    }

    console.log( `[SampleManager] Saving "${id}" to IndexedDB...` );

    /**
     * We need to store the raw ArrayBuffers, not decoded AudioBuffers.
     * Re-fetch from CDN to get the raw data. In the future we could
     * cache the raw data during fetchInstrument() to avoid this.
     */
    const rawBuffers: Record<string, ArrayBuffer> = {};

    const fetchPromises = info.availableNotes.map( async ( noteName ) => {
      try {
        const url = `${info.baseUrl}/${noteName}.${info.format}`;
        const response = await fetch( url );
        if ( response.ok ) {
          rawBuffers[noteName] = await response.arrayBuffer();
        }
      } catch ( err ) {
        console.warn( `[SampleManager] Error re-fetching ${noteName} for save:`, err );
      }
    } );

    await Promise.all( fetchPromises );

    // Store in IndexedDB
    const db = await openDatabase();

    /**
     * IndexedDB operations happen inside "transactions".
     * A transaction groups reads/writes into an atomic unit —
     * either all succeed or all fail (no partial updates).
     *
     * 'readwrite' means we can both read and write to the store.
     */
    const tx = db.transaction( STORE_NAME, 'readwrite' );
    const store = tx.objectStore( STORE_NAME );

    /**
     * We store the raw data as a plain object:
     *   { instrumentId: 'piano', notes: { 'C3': ArrayBuffer, 'Eb3': ArrayBuffer, ... } }
     *
     * The key is the instrument ID, so saving the same instrument
     * again overwrites the old data (idempotent).
     */
    store.put( { instrumentId: id, notes: rawBuffers }, id );

    // Wait for the transaction to complete
    await new Promise<void>( ( resolve, reject ) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject( tx.error );
    } );

    console.log( `[SampleManager] Saved "${id}" (${Object.keys( rawBuffers ).length} notes) to IndexedDB` );
  }

  /**
   * Loads an instrument's samples from IndexedDB (offline storage).
   *
   * Returns null if the instrument hasn't been saved yet.
   * Otherwise, decodes the stored ArrayBuffers into AudioBuffers
   * and caches them in memory.
   *
   * @param id - The instrument ID to load
   * @returns Map of note name → AudioBuffer, or null if not saved
   */
  public async loadSavedInstrument ( id: string ): Promise<Map<string, AudioBuffer> | null> {
    // Check in-memory cache first (avoid redundant IndexedDB reads)
    if ( this.cache.has( id ) ) {
      return this.cache.get( id )!;
    }

    const db = await openDatabase();
    const tx = db.transaction( STORE_NAME, 'readonly' );
    const store = tx.objectStore( STORE_NAME );

    /**
     * IndexedDB.get() returns a request object, not the data directly.
     * We wrap it in a Promise for async/await compatibility.
     */
    const data = await new Promise<any>( ( resolve, reject ) => {
      const request = store.get( id );
      request.onsuccess = () => resolve( request.result );
      request.onerror = () => reject( request.error );
    } );

    if ( !data || !data.notes ) {
      return null;
    }

    // Decode stored ArrayBuffers back into AudioBuffers
    const context = await this._getOrCreateContext();
    const buffers = new Map<string, AudioBuffer>();

    for ( const [noteName, arrayBuffer] of Object.entries( data.notes ) ) {
      try {
        /**
         * decodeAudioData() modifies its input buffer, so we need to
         * clone it with .slice() to avoid corrupting the original data.
         * Without this, decoding a second time would fail.
         */
        const decoded = await context.decodeAudioData( ( arrayBuffer as ArrayBuffer ).slice( 0 ) );
        buffers.set( noteName, decoded );
      } catch ( err ) {
        console.warn( `[SampleManager] Error decoding saved sample ${noteName}:`, err );
      }
    }

    // Cache the decoded buffers
    this.cache.set( id, buffers );
    console.log( `[SampleManager] Loaded "${id}" from IndexedDB (${buffers.size} notes)` );

    return buffers;
  }

  /**
   * Returns a list of instrument IDs that have been saved to IndexedDB.
   *
   * Iterates over all keys in the object store to build the list.
   * This is fast because we're only reading keys, not full data.
   *
   * @returns Array of instrument ID strings (e.g. ['piano', 'guitar-acoustic'])
   */
  public async getSavedInstruments (): Promise<string[]> {
    const db = await openDatabase();
    const tx = db.transaction( STORE_NAME, 'readonly' );
    const store = tx.objectStore( STORE_NAME );

    /**
     * getAllKeys() returns all keys in the store without loading the values.
     * This is much faster than getAll() when we only need to know
     * WHICH instruments are saved, not their actual sample data.
     */
    return new Promise<string[]>( ( resolve, reject ) => {
      const request = store.getAllKeys();
      request.onsuccess = () => resolve( request.result as string[] );
      request.onerror = () => reject( request.error );
    } );
  }

  /**
   * Deletes a saved instrument from IndexedDB and clears its cache.
   *
   * @param id - The instrument ID to delete
   */
  public async deleteSavedInstrument ( id: string ): Promise<void> {
    // Remove from in-memory cache
    this.cache.delete( id );

    const db = await openDatabase();
    const tx = db.transaction( STORE_NAME, 'readwrite' );
    const store = tx.objectStore( STORE_NAME );
    store.delete( id );

    await new Promise<void>( ( resolve, reject ) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject( tx.error );
    } );

    console.log( `[SampleManager] Deleted "${id}" from IndexedDB` );
  }

  // ─── SYNTH ENGINE INTEGRATION ───────────────────────────────────

  /**
   * Activates an instrument by pushing its buffers into the SynthEngine
   * and switching to the SAMPLED preset.
   *
   * This is the glue between SampleManager and SynthEngine:
   *   SampleManager handles fetching/storage
   *   SynthEngine handles playback
   *   This method connects the two
   *
   * @param id - The instrument ID to activate
   * @returns true if activation succeeded, false if no buffers available
   */
  public activateInstrument ( id: string ): boolean {
    const buffers = this.cache.get( id );
    if ( !buffers || buffers.size === 0 ) {
      console.warn( `[SampleManager] No cached buffers for "${id}" — fetch or load first` );
      return false;
    }

    const synth = SynthEngine.getInstance();
    synth.setSampleBuffers( buffers );
    synth.setPreset( 'SAMPLED' );

    console.log( `[SampleManager] Activated instrument "${id}" with ${buffers.size} samples` );
    return true;
  }

  // ─── INTERNAL HELPERS ───────────────────────────────────────────

  /**
   * Gets an AudioContext for decoding audio data.
   *
   * We try to reuse the AudioEngine's context first (it's already running
   * for mic input). If that's not available, we create a lightweight
   * standalone context just for decoding.
   *
   * @returns An AudioContext instance
   */
  private async _getOrCreateContext (): Promise<AudioContext> {
    // Try to get the existing context from AudioEngine (avoid creating extras)
    try {
      const { AudioEngine } = await import( './AudioEngine' );
      const existing = AudioEngine.getInstance().getContext();
      if ( existing && existing.state !== 'closed' ) {
        return existing;
      }
    } catch {
      // AudioEngine not available, create our own
    }

    // Create a standalone context for decoding
    return new ( window.AudioContext || ( window as any ).webkitAudioContext )();
  }
}
