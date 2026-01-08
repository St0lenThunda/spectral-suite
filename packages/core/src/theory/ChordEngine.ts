import { Chord, Note } from 'tonal';

export interface ChordMatch {
  symbol: string;
  name: string;
  notes: string[];
  tonic: string | null;
  quality: string;
}

export class ChordEngine {
  /**
   * Identifies potential chords from a set of notes.
   * @param playedNotes Array of notes (e.g., ['C', 'E', 'G'])
   * @returns Array of chord symbols
   */
  public static detectChords ( playedNotes: string[] ): ChordMatch[] {
    if ( playedNotes.length === 0 ) return [];

    // Normalize notes to pitch classes
    const normalizedPlayed = [...new Set( playedNotes.map( n => Note.get( n ).pc ) )].filter( Boolean ) as string[];

    const symbols = Chord.detect( normalizedPlayed );

    return symbols.map( symbol => {
      const chord = Chord.get( symbol );
      return {
        symbol: chord.symbol,
        name: chord.name,
        notes: chord.notes,
        tonic: chord.tonic,
        quality: chord.quality,
      };
    } );
  }

  /**
   * Identifies symbols only from a set of notes.
   */
  public static detectSymbols ( playedNotes: string[] ): string[] {
    const normalizedPlayed = [...new Set( playedNotes.map( n => Note.get( n ).pc ) )].filter( Boolean ) as string[];
    return Chord.detect( normalizedPlayed );
  }
}
