import { TonnetzMapper } from './TonnetzMapper';
import type { SongEntry, ChordSection } from './types';

/**
 * BinaryLoader
 * 
 * Parses the highly optimized `spectral-songs.bin` format.
 * Rehydrates SongTokens into full SongEntry objects, including re-calculating
 * Tonnetz paths on demand (or upfront) to save bandwidth.
 */
export class BinaryLoader {
  private buffer: ArrayBuffer;
  private view: DataView;
  private offset = 0;
  private decoder = new TextDecoder( 'utf-8' );

  // Dictionaries
  private genres: string[] = [];
  private decades: string[] = [];
  private sectionNames: string[] = [];
  private chords: string[] = [];

  constructor( buffer: ArrayBuffer ) {
    this.buffer = buffer;
    this.view = new DataView( buffer );
  }

  /**
   * Main entry point to parse the entire binary file.
   */
  public parse (): SongEntry[] {
    this.offset = 0;

    // 1. Header
    const magic = this.readString( 4 );
    if ( magic !== 'SPEC' ) throw new Error( 'Invalid binary header: ' + magic );

    const version = this.view.getUint16( this.offset, true ); this.offset += 2;
    const songCount = this.view.getUint32( this.offset, true ); this.offset += 4;

    console.log( `BinaryLoader: Parsing ${songCount} songs (v${version})...` );

    // 2. Dictionaries
    this.genres = this.readDict();
    this.decades = this.readDict();
    this.sectionNames = this.readDict();
    this.chords = this.readDict();

    // 3. Songs
    const songs: SongEntry[] = [];
    for ( let i = 0; i < songCount; i++ ) {
      songs.push( this.readSong() );
    }

    return songs;
  }

  private readDict (): string[] {
    const count = this.view.getUint16( this.offset, true ); this.offset += 2;
    const items: string[] = [];
    for ( let i = 0; i < count; i++ ) {
      const len = this.view.getUint8( this.offset ); this.offset += 1;
      items.push( this.readString( len ) );
    }
    return items;
  }

  private readSong (): SongEntry {
    // ID
    const idLen = this.view.getUint8( this.offset ); this.offset += 1;
    const id = this.readString( idLen );

    // Metadata Indices
    const genreIdx = this.view.getUint16( this.offset, true ); this.offset += 2;
    const decadeIdx = this.view.getUint16( this.offset, true ); this.offset += 2;

    // Spotify
    const spotifyLen = this.view.getUint8( this.offset ); this.offset += 1;
    const spotifyId = this.readString( spotifyLen );

    // Sections
    const sectionCount = this.view.getUint8( this.offset ); this.offset += 1;
    const sections: Record<string, ChordSection> = {};

    for ( let i = 0; i < sectionCount; i++ ) {
      const nameIdx = this.view.getUint16( this.offset, true ); this.offset += 2;
      const name = this.sectionNames[nameIdx] || 'unknown';

      const chordCount = this.view.getUint16( this.offset, true ); this.offset += 2;
      const chordNames: string[] = [];

      for ( let j = 0; j < chordCount; j++ ) {
        const chordIdx = this.view.getUint16( this.offset, true ); this.offset += 2;
        chordNames.push( this.chords[chordIdx] || '?' );
      }

      // Re-hydrate derived data (CPU cost is negligible compared to network savings)
      sections[name] = {
        chords: chordNames,
        pitchClasses: chordNames.map( c => TonnetzMapper.chordToPC( c ) ),
        tonnetzPath: TonnetzMapper.chordSequenceToPath( chordNames )
      };
    }

    return {
      id,
      genre: this.genres[genreIdx] || 'Unknown',
      decade: this.decades[decadeIdx] || 'Unknown',
      spotifyId: spotifyId || undefined,
      sections
    };
  }

  private readString ( len: number ): string {
    const bytes = new Uint8Array( this.buffer, this.offset, len );
    this.offset += len;
    return this.decoder.decode( bytes );
  }
}
