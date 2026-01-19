import { Chord, Note, Progression } from 'tonal';

export interface ChordMatch {
  symbol: string;
  name: string;
  notes: string[];
  tonic: string | null;
  quality: string;
  bassNote?: string;
  inversion?: string;
  roman?: string;
}

export class ChordEngine {
  /**
   * Identifies potential chords from a set of notes.
   * @param playedNotes Array of notes (e.g., ['C', 'E', 'G'])
   * @param key Optional key for Roman Numeral analysis
   * @returns Array of chord matches
   */
  public static detectChords ( playedNotes: string[], key?: string ): ChordMatch[] {
    if ( playedNotes.length === 0 ) return [];

    // Sort notes by pitch to find the true bass
    // PHYSICS: The lowest frequency note is perceived as the "Bass".
    // This is critical for distinguishing C Major (C-E-G) from C/E (E-G-C).
    const sortedNotes = [...playedNotes].sort( ( a, b ) => {
      const midiA = Note.midi( a ) || 0;
      const midiB = Note.midi( b ) || 0;
      return midiA - midiB;
    } );

    const trueBass = Note.get( sortedNotes[0]! ).pc;

    // Normalize notes to pitch classes (remove octaves) for basic chord detection
    const normalizedPlayed = [...new Set( playedNotes.map( n => Note.get( n ).pc ) )].filter( Boolean ) as string[];

    const symbols = Chord.detect( normalizedPlayed, { assumePerfectFifth: true } );

    // First note played is often the root/tonic
    const firstNote = normalizedPlayed[0];

    // Map symbols to match objects
    const matches = symbols.map( symbol => {
      const chord = Chord.get( symbol );
      // Use unique chromas for counting notes to avoid enharmonic duplicates (e.g., C and B#)
      const uniquePC = new Set( chord.notes.map( n => Note.chroma( n ) ) );

      const tonic = chord.tonic;
      let finalSymbol = chord.symbol;
      let inversion = 'Root';

      // Slash Chord Logic
      // THEORY: If the tracked Bass note (trueBass) is NOT the chord's Tonic,
      // we have an inversion or hybrid chord (Slash Chord).
      if ( tonic && trueBass && tonic !== trueBass ) {
        finalSymbol = `${chord.symbol}/${trueBass}`;

        // Determine inversion name roughly (1st/2nd/3rd)
        // 1st Inv: 3rd in Bass
        // 2nd Inv: 5th in Bass
        // 3rd Inv: 7th in Bass
        if ( chord.notes[1] === trueBass ) inversion = '1st';
        else if ( chord.notes[2] === trueBass ) inversion = '2nd';
        else if ( chord.notes[3] === trueBass ) inversion = '3rd';
      }

      return {
        symbol: finalSymbol,
        name: chord.name,
        notes: chord.notes,
        tonic: chord.tonic,
        quality: chord.quality,
        uniqueNoteCount: uniquePC.size,
        bassNote: trueBass,
        inversion: inversion,
        roman: key ? this.getRomanNumeral( finalSymbol, key ) : undefined
      };
    } );

    // Sort symbols to guess the "Best Fit"
    // HEURISTICS:
    // 1. Complexity: More notes usually means a more specific match (Cmaj7 > C).
    // 2. Bass Alignment: If the symbol's bass matches our detected bass, it's likely correct.
    // 3. Simplicity: If all else equal, prefer shorter names (C > Cmaj5add9).
    return matches.sort( ( a, b ) => {
      if ( b.uniqueNoteCount !== a.uniqueNoteCount ) {
        return b.uniqueNoteCount - a.uniqueNoteCount;
      }

      // Check if first note matches tonic OR if it's a slash chord where first note is the bass
      const aSymbol = a.symbol;
      const bSymbol = b.symbol;

      const aHasBass = aSymbol.includes( '/' );
      const bHasBass = bSymbol.includes( '/' );

      const aBass = aHasBass ? aSymbol.split( '/' )[1] : a.tonic;
      const bBass = bHasBass ? bSymbol.split( '/' )[1] : b.tonic;

      const aBassMatch = aBass === firstNote;
      const bBassMatch = bBass === firstNote;

      if ( aBassMatch !== bBassMatch ) {
        return aBassMatch ? -1 : 1;
      }

      return a.symbol.length - b.symbol.length;
    } );
  }

  /**
   * Identifies symbols only from a set of notes.
   */
  public static detectSymbols ( playedNotes: string[] ): string[] {
    const normalizedPlayed = [...new Set( playedNotes.map( n => Note.get( n ).pc ) )].filter( Boolean ) as string[];
    return Chord.detect( normalizedPlayed );
  }

  /**
   * Converts a chord symbol to a Roman Numeral relative to a key.
   */
  public static getRomanNumeral ( symbol: string, key: string ): string {
    try {
      const romans = Progression.toRomanNumerals( key, [symbol] );
      return romans[0] || '';
    } catch {
      return '';
    }
  }

  /**
   * Suggests potential next chords based on functional music theory.
   */
  public static suggestNext ( lastChordSymbol: string, key: string ): string[] {
    const chord = Chord.get( lastChordSymbol );
    const tonic = chord.tonic;
    if ( !tonic ) return [];

    const suggestions = new Set<string>();

    // 1. Circle of Fifths neighbors
    suggestions.add( Chord.get( Note.transpose( tonic, '5P' ) + '7' ).symbol );
    suggestions.add( Chord.get( Note.transpose( tonic, '4P' ) + 'maj7' ).symbol );

    // 2. Relative Major/Minor
    const relative = chord.quality === 'Major'
      ? Note.transpose( tonic, '6M' ) + 'm7'
      : Note.transpose( tonic, '3M' ) + 'maj7';
    suggestions.add( Chord.get( relative ).symbol );

    // 3. Common Cadences (if key is known)
    if ( key ) {
      const roman = this.getRomanNumeral( lastChordSymbol, key );
      if ( roman.startsWith( 'II' ) || roman.startsWith( 'ii' ) ) suggestions.add( Chord.get( Note.transpose( key, '5P' ) + '7' ).symbol );
      if ( roman.startsWith( 'V' ) ) suggestions.add( Chord.get( key + 'maj7' ).symbol );
    }

    return Array.from( suggestions ).filter( s => s && s !== '' && s !== lastChordSymbol ).slice( 0, 4 );
  }
}
