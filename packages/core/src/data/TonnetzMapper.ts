import { Note, Chord } from 'tonal';
import type { TonnetzPoint } from './types';

/**
 * TonnetzMapper — Geometric Music Theory Utility
 * 
 * This class handles the "Physics" of the Tonnetz lattice.
 * It converts abstract pitch classes into physical 2D coordinates.
 * 
 * THE LATTICE MATH:
 * The Tonnetz is traditionally visualized as a hexagonal grid where:
 * - Horizontal movement = Perfect 5ths (+7 semitones)
 * - Up-Right movement = Major 3rds (+4 semitones)
 * - Up-Left movement = minor 3rds (+3 semitones)
 * 
 * We use a "Skewed Grid" coordinate system for simplicity.
 */
export class TonnetzMapper {
  /**
   * Converts a pitch class (0-11) to its coordinate on the Tonnetz.
   * 
   * @param pc - Pitch class index (0 for C, 1 for C#, etc.)
   * @returns [x, y] coordinates
   */
  public static pcToTonnetz ( pc: number ): TonnetzPoint {
    /**
     * The Tonnetz can be represented as a 2D lattice using two "basis vectors".
     * Traditional math uses:
     * v1 = Perfect 5th (7 semitones)
     * v2 = Major 3rd (4 semitones)
     * 
     * To find coordinates for a specific pitch class (P), we need to solve:
     * P = (x * 7) + (y * 4) mod 12
     */

    // This is a mapping lookup for a 3x4 wrapping grid.
    // Why 3x4? 3 (Perfect 5ths) * 4 (minor 3rds) = 12 total pitch classes.
    // This creates a repeating pattern that matches the Tonnetz visual axes:
    // x-axis: Perfect 5ths (+7)
    // y-axis: minor 3rds (+3)
    const pcMap: Record<number, TonnetzPoint> = {
      0: { x: 0, y: 0 }, // C
      7: { x: 1, y: 0 }, // G
      2: { x: 2, y: 0 }, // D

      3: { x: 0, y: 1 }, // Eb
      10: { x: 1, y: 1 }, // Bb
      5: { x: 2, y: 1 }, // F

      6: { x: 0, y: 2 }, // Gb/F#
      1: { x: 1, y: 2 }, // Db/C#
      8: { x: 2, y: 2 }, // Ab

      9: { x: 0, y: 3 }, // A
      4: { x: 1, y: 3 }, // E
      11: { x: 2, y: 3 }  // B
    };

    return pcMap[pc % 12] || { x: 0, y: 0 };
  }

  /**
   * Converts a chord name to its root pitch class.
   * 
   * @param chordName - e.g. "Cmaj7", "Am", "F#"
   * @returns number - Pitch class (0-11)
   */
  public static chordToPC ( chordName: string ): number {
    const tonic = Chord.get( chordName ).tonic;
    if ( tonic ) return Note.chroma( tonic );

    // Fallback: try to parse as a note directly (e.g. just "C")
    return Note.chroma( chordName ) || 0;
  }

  /**
   * Converts a sequence of chords into a path of Tonnetz coordinates.
   * 
   * @param chords - Array of chord symbols
   * @returns TonnetzPoint[] - The geometric "shape" of the progression
   */
  public static chordSequenceToPath ( chords: string[] ): TonnetzPoint[] {
    return chords.map( chord => {
      const pc = this.chordToPC( chord );
      return this.pcToTonnetz( pc );
    } );
  }

  /**
   * Calculates the geometric "distance" between two Tonnetz points.
   * This is useful for finding how harmonically related two chords are.
   * 
   * @param a - First point
   * @param b - Second point
   * @returns number - The Manhattan distance on the lattice
   */
  public static getDistance ( a: TonnetzPoint, b: TonnetzPoint ): number {
    // We use Manhattan distance because movement on the lattice is discrete (step by step)
    return Math.abs( a.x - b.x ) + Math.abs( a.y - b.y );
  }

  /**
   * Calculates the similarity score between two Tonnetz paths.
   * Useful for the "Songs like this" feature.
   * 
   * @param pathA - First progression shape
   * @param pathB - Second progression shape
   * @returns number - Similarity score (0.0 to 1.0)
   */
  public static calculatePathSimilarity ( pathA: TonnetzPoint[], pathB: TonnetzPoint[] ): number {
    if ( pathA.length === 0 || pathB.length === 0 ) return 0;

    // For MVP, we compare paths element by element (truncated to the shorter path)
    const len = Math.min( pathA.length, pathB.length );
    let totalDistance = 0;

    for ( let i = 0; i < len; i++ ) {
      totalDistance += this.getDistance( pathA[i]!, pathB[i]! );
    }

    // Normalize to a 0-1 scale. 
    // Max distance on a 4x3 grid is 3+2=5 per step.
    const maxPossibleDistance = len * 5;
    const similarity = 1 - ( totalDistance / maxPossibleDistance );

    return Math.max( 0, similarity );
  }
}
