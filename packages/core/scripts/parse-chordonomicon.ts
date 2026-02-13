import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import csv from 'csv-parser';
import { TonnetzMapper } from '../src/data/TonnetzMapper';
import type { SongEntry, ChordSection } from '../src/data/types';

/**
 * parse-chordonomicon.ts
 * 
 * This script transforms the 264MB Chordonomicon CSV into a compact,
 * processed JSON file for the Spectral Suite app.
 * 
 * IT PERFORMS THE FOLLOWING:
 * 1. Streams the CSV to keep memory usage low.
 * 2. Parses section tags (e.g., <verse_1>) into structured maps.
 * 3. Pre-calculates Tonnetz coordinates to save runtime CPU.
 * 4. Filters out unnecessary columns to reduce file size.
 */

const __filename = fileURLToPath( import.meta.url );
const __dirname = path.dirname( __filename );

const INPUT_CSV = path.join( __dirname, '../data/chordonomicon_v2.csv' );
const OUTPUT_JSON = path.join( __dirname, '../src/data/spectral-songs.json' );

const songs: SongEntry[] = [];
let processedCount = 0;

console.log( '🚀 Starting Chordonomicon parse...' );

const stream = fs.createReadStream( INPUT_CSV )
  .pipe( csv() );

stream.on( 'data', ( row ) => {
  try {
    // The Chordonomicon CSV has columns: id, chords, main_genre, decade, spotify_song_id, etc.
    // Row format: { id: '...', chords: '<intro_1> G A <verse_1> ...', main_genre: '...', ... }

    const rawChords = row.chords || '';
    const sections: Record<string, ChordSection> = {};

    // Parse sections using a simple regex to find <tags>
    // Example: "<intro_1> G A <verse_1> C D"
    // Split by tags but keep the tags
    const parts = rawChords.split( /(<[^>]+>)/g ).filter( Boolean );

    let currentSectionName = 'default';

    for ( let i = 0; i < parts.length; i++ ) {
      const part = parts[i].trim();
      if ( part.startsWith( '<' ) && part.endsWith( '>' ) ) {
        currentSectionName = part.replace( /[<>]/g, '' );
      } else if ( part ) {
        const chordNames = part.split( /\s+/ ).filter( Boolean );
        const pitchClasses = chordNames.map( c => TonnetzMapper.chordToPC( c ) );
        const tonnetzPath = TonnetzMapper.chordSequenceToPath( chordNames );

        sections[currentSectionName] = {
          chords: chordNames,
          pitchClasses,
          tonnetzPath
        };
      }
    }

    const song: SongEntry = {
      id: row.id,
      genre: row.main_genre || 'Unknown',
      decade: row.decade || 'Unknown',
      spotifyId: row.spotify_song_id,
      sections
    };

    songs.push( song );
    processedCount++;

    if ( processedCount % 10000 === 0 ) {
      console.log( `Processed ${processedCount} songs...` );
    }

    // FOR THE DEMO/MVP: We'll cap at 100,000 songs to keep the JSON manageable.
    // 666K songs might produce a 100MB+ JSON which is hard to bundle.
    // We can increase this later or move to a true server-side DB.
    if ( processedCount >= 100000 ) {
      console.log( 'Reached 100,000 song limit for MVP. Stopping stream.' );
      stream.destroy();
      finishParsing();
    }

  } catch ( err ) {
    // Skip malformed rows
  }
} );

function finishParsing () {
  if ( fs.existsSync( OUTPUT_JSON ) ) return; // Prevent double write if end fires too

  console.log( `✅ Finished processing ${processedCount} songs.` );
  console.log( '💾 Writing to spectral-songs.json...' );

  fs.writeFileSync( OUTPUT_JSON, JSON.stringify( songs ) );

  console.log( `🎉 Done! File size: ${( fs.statSync( OUTPUT_JSON ).size / 1024 / 1024 ).toFixed( 2 )} MB` );
}

stream.on( 'end', () => {
  finishParsing();
} )
  .on( 'error', ( err ) => {
    console.error( '❌ Error parsing CSV:', err );
  } );
