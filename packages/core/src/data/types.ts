/**
 * Shared data types for the Spectral Suite song database and Tonnetz mapping.
 * 
 * These types are used across the core library and the frontend to ensure
 * consistency when handling song data, chord sequences, and geometric lattice points.
 */

/**
 * A single point on the Tonnetz lattice.
 * We use a 2D coordinate system where:
 * x = Position along the Perfect 5th axis
 * y = Position along the Major 3rd axis
 */
export interface TonnetzPoint {
  x: number;
  y: number;
}

/**
 * A specific section within a song (e.g., Intro, Verse, Chorus).
 * Holds the raw chords, their pitch classes, and their geometric path on the lattice.
 */
export interface ChordSection {
  /** The human-readable chord names, e.g., ["C", "G", "Am", "F"] */
  chords: string[];
  /** The chromatic pitch class of the root for each chord (0-11) */
  pitchClasses: number[];
  /** The sequence of coordinates representing the "shape" of these chords on the Tonnetz */
  tonnetzPath: TonnetzPoint[];
}

/**
 * A complete song entry in our database.
 * We store metadata (genre, decade) and the harmonic sections.
 */
export interface SongEntry {
  /** Unique identifier (often from the source dataset or a hash) */
  id: string;
  /** Primary genre of the song */
  genre: string;
  /** The decade the song was released in (e.g., "1970s", "2000s") */
  decade: string;
  /** Optional reference to Spotify for future integration */
  spotifyId?: string;
  /** Map of section names (e.g., "verse_1") to their chord data */
  sections: Record<string, ChordSection>;
}

/**
 * Statistical data representing the probability of moving from one chord to another.
 * This powers our "Data-Driven" chord suggestions.
 */
export interface ChordTransition {
  /** The starting chord symbol (e.g., "C") */
  from: string;
  /** The target chord symbol (e.g., "G") */
  to: string;
  /** The probability (0.0 to 1.0) of this transition occurring in the dataset */
  probability: number;
  /** Optional decade filter for era-specific suggestions */
  decade?: string;
}

/**
 * A chord suggestion produced by our recommendation engine.
 * Combines math (geometry) and data (statistics).
 */
export interface ScoredSuggestion {
  /** The suggested chord symbol */
  chord: string;
  /** A combined score (0.0 to 1.0) indicating how "good" the suggestion is */
  score: number;
  /** Why we recommended this chord */
  reason: 'geometric' | 'statistical' | 'functional';
  /** How many semitones of movement required (lower is "smoother") */
  voiceLeadingDistance: number;
  /** How many steps away on the Tonnetz lattice */
  tonnetzDistance: number;
}
