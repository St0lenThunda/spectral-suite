import { Note, Scale, ScaleType } from 'tonal';

export interface ScaleMatch {
  name: string;
  notes: string[];
  type: string;
  score: number; // Percentage of played notes that fit this scale
  intervals: string[]; // Degrees e.g. ["1P", "2M", "3M"]
  romanIntervals?: string[]; // e.g. ["I", "II", "III"]
  parentScale?: string; // e.g. "C Major" if this is D Dorian
}

const INTERVAL_TO_ROMAN: Record<string, string> = {
  '1P': 'I',
  '2m': 'bII',
  '2M': 'II',
  '2A': '#II',
  '3m': 'bIII',
  '3M': 'III',
  '4P': 'IV',
  '4A': '#IV',
  '5d': 'bV',
  '5P': 'V',
  '5A': '#V',
  '6m': 'bVI',
  '6M': 'VI',
  '6A': '#VI',
  '7m': 'bVII',
  '7M': 'VII',
  '7d': 'bbVII'
};

export class ScaleEngine {
  /**
   * Identifies potential scales from a set of notes.
   * @param playedNotes Array of notes (e.g., ['C', 'E', 'G'])
   * @returns Array of matching scales ranked by score
   */
  public static detectScales ( playedNotes: string[] ): ScaleMatch[] {
    if ( playedNotes.length === 0 ) return [];

    // Normalize notes to pitch classes (no octaves, uniform accidentals)
    const normalizedPlayed = [...new Set( playedNotes.map( n => Note.get( n ).pc ) )].filter( Boolean );

    const allScales = ScaleType.all();
    const results: ScaleMatch[] = [];

    // Check every key for every scale type
    const keys = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

    // Define scale priority (lower number = higher priority)
    const scalePriority: Record<string, number> = {
      'major': 1,
      'minor': 1,
      'aeolian': 1,
      'major pentatonic': 2,
      'minor pentatonic': 2,
      'blues': 2,
      'dorian': 3,
      'mixolydian': 3,
      'lydian': 3,
      'phrygian': 3,
      'locrian': 4,
      'harmonic minor': 4,
      'melodic minor': 4,
      'chromatic': 99 // Lowest priority
    };

    const getPriority = ( type: string ) => scalePriority[type.toLowerCase()] || 10;

    for ( const key of keys ) {
      for ( const st of allScales ) {
        if ( st.name.toLowerCase() === 'chromatic' ) continue; // Skip chromatic entirely as it's trivial

        const scale = Scale.get( `${key} ${st.name}` );
        const scaleNotes = scale.notes;

        // Calculate how many of the played notes are in this scale
        const matches = normalizedPlayed.filter( n => scaleNotes.includes( n ) );
        const score = matches.length / normalizedPlayed.length;

        if ( score > 0.65 ) { // Increased threshold to reduce noise
          results.push( {
            name: scale.name,
            notes: scaleNotes,
            type: st.name,
            score,
            intervals: scale.intervals,
            romanIntervals: scale.intervals.map( i => INTERVAL_TO_ROMAN[i] || i )
          } );
        }
      }
    }

    // Sort by:
    // 1. Score (descending)
    // 2. Priority (ascending - lower is better)
    // 3. Number of notes (ascending - simpler is better)
    return results.sort( ( a, b ) => {
      if ( Math.abs( b.score - a.score ) > 0.01 ) return b.score - a.score;

      const priorityA = getPriority( a.type );
      const priorityB = getPriority( b.type );
      if ( priorityA !== priorityB ) return priorityA - priorityB;

      return a.notes.length - b.notes.length;
    } );
  }

  /**
   * Helper to get all notes in a specific scale.
   */
  public static getScaleNotes ( scaleName: string ): string[] {
    return Scale.get( scaleName ).notes;
  }
}
