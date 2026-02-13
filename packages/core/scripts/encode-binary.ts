import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import csv from 'csv-parser';
import { TonnetzMapper } from '../src/data/TonnetzMapper';

/**
 * encode-binary.ts
 * 
 * Compresses the Chordonomicon CSV into a highly optimized binary format.
 * 
 * Binary Schema:
 * [HEADER]
 * - Magic "SPEC" (4 bytes)
 * - Version (uint16)
 * - Total Songs (uint32)
 * 
 * [DICTIONARIES]
 * - Genre Dict (Count: uint16, [Len: uint8, Str: bytes]...)
 * - Decade Dict (Count: uint16, [Len: uint8, Str: bytes]...)
 * - SectionName Dict (Count: uint16, [Len: uint8, Str: bytes]...)
 * - Chord Dict (Count: uint16, [Len: uint8, Str: bytes]...)
 * 
 * [SONGS]
 * - For each song:
 *   - ID Length (uint8) + ID Bytes
 *   - Genre Index (uint16)
 *   - Decade Index (uint16)
 *   - SpotifyID Length (uint8) + SpotifyID Bytes
 *   - Section Count (uint8)
 *   - [SECTIONS...]:
 *     - Name Index (uint16)
 *     - Chord Count (uint16)
 *     - [Chord Indices (uint16)...]
 */

const __filename = fileURLToPath( import.meta.url );
const __dirname = path.dirname( __filename );

const INPUT_CSV = path.join( __dirname, '../data/chordonomicon_v2.csv' );
// We'll output to the public folder of the tonic app so it can be fetched
const OUTPUT_BIN = path.join( __dirname, '../../../apps/tonic/public/data/spectral-songs.bin' );

// Ensure output directory exists
const outputDir = path.dirname( OUTPUT_BIN );
if ( !fs.existsSync( outputDir ) ) {
  fs.mkdirSync( outputDir, { recursive: true } );
}

// Temporary storage before binary writing
interface TempSong {
  id: string;
  genre: string;
  decade: string;
  spotifyId: string;
  sections: {
    name: string;
    chords: string[];
  }[];
}

const songs: TempSong[] = [];

// Dictionaries
const genreSet = new Set<string>();
const decadeSet = new Set<string>();
const sectionNameSet = new Set<string>();
const chordSet = new Set<string>();

console.log( '🚀 Starting Binary Encoding...' );

const stream = fs.createReadStream( INPUT_CSV )
  .pipe( csv() );

let processedCount = 0;

stream.on( 'data', ( row ) => {
  try {
    const rawChords = row.chords || '';
    const parts = rawChords.split( /(<[^>]+>)/g ).filter( Boolean );
    
    const sections: { name: string, chords: string[] }[] = [];
    let currentSectionName = 'default';

    for ( const part of parts ) {
      const p = part.trim();
      if ( p.startsWith( '<' ) && p.endsWith( '>' ) ) {
        currentSectionName = p.replace( /[<>]/g, '' );
      } else if ( p ) {
        const chordNames = p.split( /\s+/ ).filter( Boolean );
        if ( chordNames.length > 0 ) {
          sections.push( { name: currentSectionName, chords: chordNames } );
          
          // Add to dicts
          sectionNameSet.add( currentSectionName );
          chordNames.forEach( c => chordSet.add( c ) );
        }
      }
    }

    if ( sections.length === 0 ) return;

    const genre = row.main_genre || 'Unknown';
    const decade = row.decade || 'Unknown';
    
    genreSet.add( genre );
    decadeSet.add( decade );

    songs.push( {
      id: row.id,
      genre,
      decade,
      spotifyId: row.spotify_song_id || '',
      sections
    } );

    processedCount++;
    if ( processedCount % 10000 === 0 ) process.stdout.write( `.` );

    // MVP Cap
    if ( processedCount >= 100000 ) {
      stream.destroy();
      writeBinary();
    }

  } catch ( err ) {}
} );

stream.on( 'end', () => {
  writeBinary();
} );

function writeString( buffer: Buffer, str: string, offset: number ): number {
    const len = Buffer.byteLength( str );
    buffer.writeUInt8( len, offset );
    offset += 1;
    buffer.write( str, offset );
    offset += len;
    return offset;
}

function writeBinary() {
  console.log( `\n✅ Parsed ${songs.length} songs. Building dictionaries...` );
  
  // Convert Sets to Arrays for indexing
  const genres = Array.from( genreSet );
  const decades = Array.from( decadeSet );
  const sectionNames = Array.from( sectionNameSet );
  const chords = Array.from( chordSet );

  console.log( `Stats:
  - Genres: ${genres.length}
  - Decades: ${decades.length}
  - Section Names: ${sectionNames.length}
  - Unique Chords: ${chords.length}
  `);

  // Calculate Size
  // This is an estimation, or we can just allocate a massive buffer and slice it.
  // 100k songs * ~500 bytes = 50MB max.
  const MAX_SIZE = 100 * 1024 * 1024; 
  const buffer = Buffer.alloc( MAX_SIZE );
  let offset = 0;

  // 1. Header
  buffer.write( 'SPEC', offset ); offset += 4;
  buffer.writeUInt16LE( 1, offset ); offset += 2; // Version
  buffer.writeUInt32LE( songs.length, offset ); offset += 4;

  // Only support < 65535 dictionary items (uint16)
  if ( chords.length > 65535 ) throw new Error( 'Too many unique chords for uint16 index!' );

  // Helper to write a dictionary
  const writeDict = ( items: string[] ) => {
    buffer.writeUInt16LE( items.length, offset ); offset += 2;
    for ( const item of items ) {
      offset = writeString( buffer, item, offset );
    }
  };

  // 2. Dictionaries
  writeDict( genres );
  writeDict( decades );
  writeDict( sectionNames );
  writeDict( chords );

  // Maps for fast lookup
  const genreMap = new Map( genres.map( ( g, i ) => [g, i] ) );
  const decadeMap = new Map( decades.map( ( d, i ) => [d, i] ) );
  const sectionMap = new Map( sectionNames.map( ( s, i ) => [s, i] ) );
  const chordMap = new Map( chords.map( ( c, i ) => [c, i] ) );

  // 3. Songs
  for ( const song of songs ) {
    // ID
    offset = writeString( buffer, song.id, offset );
    
    // Genre/Decade
    buffer.writeUInt16LE( genreMap.get( song.genre )!, offset ); offset += 2;
    buffer.writeUInt16LE( decadeMap.get( song.decade )!, offset ); offset += 2;
    
    // Spotify
    offset = writeString( buffer, song.spotifyId, offset );
    
    // Sections
    buffer.writeUInt8( song.sections.length, offset ); offset += 1;
    
    for ( const section of song.sections ) {
      // Name
      buffer.writeUInt16LE( sectionMap.get( section.name )!, offset ); offset += 2;
      
      // Chords
      buffer.writeUInt16LE( section.chords.length, offset ); offset += 2;
      for ( const chord of section.chords ) {
        buffer.writeUInt16LE( chordMap.get( chord )!, offset ); offset += 2;
      }
    }
  }

  // Write to file
  const finalBuffer = buffer.subarray( 0, offset );
  fs.writeFileSync( OUTPUT_BIN, finalBuffer );
  
  console.log( `💾 Saved binary database to: ${OUTPUT_BIN}` );
  console.log( `📦 Final Size: ${( finalBuffer.length / 1024 / 1024 ).toFixed( 2 )} MB` );
}
