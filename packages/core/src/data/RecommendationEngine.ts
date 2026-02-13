import { Chord, Note } from 'tonal';
import { TonnetzMapper } from './TonnetzMapper';
import { SongDatabase } from './SongDatabase';
import { ChordEngine } from '../theory/ChordEngine';
import type { ScoredSuggestion, TonnetzPoint } from './types';

/**
 * RecommendationEngine — The "Brain" of Spectral Suite
 * 
 * This service combines three distinct ways of thinking about music:
 * 1. STATISTICAL: What do real songwriters actually do? (Data-driven)
 * 2. GEOMETRIC: What is mathematically "close" on the Tonnetz lattice? (Geometric)
 * 3. FUNCTIONAL: What does classical music theory say? (Theoretical)
 */
export class RecommendationEngine {
  /**
   * Generates a list of chord suggestions based on a starting chord.
   * 
   * @param currentChord - The chord the user just played/selected (e.g., "Cmaj7")
   * @param options - Weights for different recommendation strategies
   * @returns ScoredSuggestion[] - Sorted suggestions from best to worst
   */
  public static async getScoredSuggestions(
    currentChord: string, 
    options: { 
      statWeight: number; 
      geomWeight: number; 
      theoryWeight: number;
      decade?: string;
    } = { statWeight: 0.5, geomWeight: 0.3, theoryWeight: 0.2 }
  ): Promise<ScoredSuggestion[]> {
    const suggestionsMap = new Map<string, ScoredSuggestion>();
    
    // 1. GATHER RAW MATERIAL
    
    // A. Statistical Material (from the Chordonomicon)
    const transitions = await SongDatabase.getTransitions(currentChord, options.decade);
    
    // B. Geometric Material (Lattice neighbors)
    const currentPC = TonnetzMapper.chordToPC(currentChord);
    const currentPoint = TonnetzMapper.pcToTonnetz(currentPC);
    const neighbors = this.getGeometricNeighbors(currentPoint);
    
    // C. Theoretical Material (Circle of Fifths, etc.)
    const theoretical = ChordEngine.suggestNext(currentChord, 'C'); // Default to C major key for raw theory

    // 2. SCORING PHASE
    
    // Process Statistical
    for (const t of transitions) {
      this.updateScore(suggestionsMap, t.to, t.probability * options.statWeight, 'statistical', currentChord);
    }
    
    // Process Geometric
    for (const n of neighbors) {
      // For each coordinate, we assume a Major chord for now (common default)
      // In a real app, we might suggest Major/Minor pairs.
      const chordName = this.tonnetzToChord(n.point);
      const score = (1 / (n.distance + 1)) * options.geomWeight;
      this.updateScore(suggestionsMap, chordName, score, 'geometric', currentChord);
    }
    
    // Process Theoretical
    for (const t of theoretical) {
      this.updateScore(suggestionsMap, t, 0.8 * options.theoryWeight, 'functional', currentChord);
    }

    // 3. FINAL SORT AND TRUNCATE
    return Array.from(suggestionsMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }

  /**
   * Helper to update or create a scored suggestion in the map.
   */
  private static updateScore(
    map: Map<string, ScoredSuggestion>, 
    chord: string, 
    addedScore: number, 
    reason: ScoredSuggestion['reason'],
    origin: string
  ) {
    if (!chord) return;
    
    const existing = map.get(chord);
    const tonnetzDistance = TonnetzMapper.getDistance(
        TonnetzMapper.pcToTonnetz(TonnetzMapper.chordToPC(origin)),
        TonnetzMapper.pcToTonnetz(TonnetzMapper.chordToPC(chord))
    );
    
    // PHYSICS: Voice leading distance is the semitone movement between roots.
    const voiceLeading = Math.abs(TonnetzMapper.chordToPC(origin) - TonnetzMapper.chordToPC(chord));

    if (existing) {
      existing.score += addedScore;
    } else {
      map.set(chord, {
        chord,
        score: addedScore,
        reason,
        voiceLeadingDistance: voiceLeading,
        tonnetzDistance: tonnetzDistance
      });
    }
  }

  /**
   * Finds coordinates adjacent to the given point on the 4x3 grid.
   */
  private static getGeometricNeighbors(point: TonnetzPoint): { point: TonnetzPoint, distance: number }[] {
    const neighbors: { point: TonnetzPoint, distance: number }[] = [];
    
    // Check Manhattan distance 1 neighbors
    const offsets = [
        {x: 1, y: 0}, {x: -1, y: 0}, 
        {x: 0, y: 1}, {x: 0, y: -1}
    ];
    
    for (const offset of offsets) {
        neighbors.push({
            point: { 
                x: (point.x + offset.x + 4) % 4, // Wrap around the 4x3 grid
                y: (point.y + offset.y + 3) % 3 
            },
            distance: 1
        });
    }
    
    return neighbors;
  }

  /**
   * Converts a Tonnetz coordinate back into a "Best Guess" chord.
   */
  private static tonnetzToChord(point: TonnetzPoint): string {
    // Reverse lookup of the pcMap in TonnetzMapper
    // C=0, G=7, D=2, A=9 (y=0)
    // E=4, B=11, F#=6, C#=1 (y=1)
    // Ab=8, Eb=3, Bb=10, F=5 (y=2)
    const inverseMap: Record<string, string> = {
      '0,0': 'C',  '1,0': 'G',  '2,0': 'D',  '3,0': 'A',
      '0,1': 'E',  '1,1': 'B',  '2,1': 'F#', '3,1': 'Db',
      '0,2': 'Ab', '1,2': 'Eb', '2,2': 'Bb', '3,2': 'F'
    };
    
    return inverseMap[`${point.x},${point.y}`] || 'C';
  }
}
