/// <reference lib="webworker" />

import { openDB } from 'idb';
import { BinaryLoader } from '../data/BinaryLoader';
import type { SongEntry } from '../data/types';

const DB_NAME = 'spectral-suite-songs';
const STORE_SONGS = 'songs';
const STORE_METADATA = 'metadata_cache';
const STORE_TRANSITIONS = 'transitions';

// Define the worker's scope
declare const self: DedicatedWorkerGlobalScope;

self.onmessage = async ( event ) => {
  const { type, payload } = event.data;

  if ( type === 'INIT_DB' ) {
    try {
      await loadBinaryDatabase();
      self.postMessage( { type: 'COMPLETE' } );
    } catch ( err: any ) {
      self.postMessage( { type: 'ERROR', error: err.message } );
    }
  }
};

async function loadBinaryDatabase () {
  const db = await openDB( DB_NAME, 1 );

  // Check if already populated
  const count = await db.count( STORE_SONGS );
  if ( count > 0 ) {
    self.postMessage( { type: 'LOG', message: 'Database already populated.' } );
    return;
  }

  // Fetch
  self.postMessage( { type: 'LOG', message: 'Fetching binary database...' } );
  const response = await fetch( '/data/spectral-songs.bin' );
  if ( !response.ok ) throw new Error( `Failed to fetch: ${response.statusText}` );

  const buffer = await response.arrayBuffer();

  // Parse
  self.postMessage( { type: 'LOG', message: `Parsing ${buffer.byteLength} bytes...` } );
  // This is the heavy CPU part that was blocking the UI!
  const parser = new BinaryLoader( buffer );
  const songs = parser.parse();

  // Import
  self.postMessage( { type: 'LOG', message: `Importing ${songs.length} songs...` } );

  const CHUNK_SIZE = 2000;
  for ( let i = 0; i < songs.length; i += CHUNK_SIZE ) {
    const chunk = songs.slice( i, i + CHUNK_SIZE );
    const tx = db.transaction( STORE_SONGS, 'readwrite' );
    const store = tx.objectStore( STORE_SONGS );

    await Promise.all( [
      ...chunk.map( song => store.put( song ) ),
      tx.done
    ] );

    // Report progress
    const progress = Math.round( ( ( i + CHUNK_SIZE ) / songs.length ) * 100 );
    self.postMessage( { type: 'PROGRESS', progress: Math.min( progress, 100 ) } );
  }

  db.close();
}
