import { describe, it, expect } from 'vitest';
import { TonnetzMapper } from '../TonnetzMapper';

describe('TonnetzMapper', () => {
  describe('pcToTonnetz', () => {
    it('maps C (0) to {x:0, y:0}', () => {
      expect(TonnetzMapper.pcToTonnetz(0)).toEqual({ x: 0, y: 0 });
    });

    it('maps G (7) to {x:1, y:0} (Perfect 5th)', () => {
      expect(TonnetzMapper.pcToTonnetz(7)).toEqual({ x: 1, y: 0 });
    });

    it('maps Eb (3) to {x:0, y:1} (Major 3rd)', () => {
      expect(TonnetzMapper.pcToTonnetz(3)).toEqual({ x: 0, y: 1 });
    });

    it('handles wrapping for large PC values', () => {
      expect(TonnetzMapper.pcToTonnetz(12)).toEqual({ x: 0, y: 0 }); // C again
      expect(TonnetzMapper.pcToTonnetz(19)).toEqual({ x: 1, y: 0 }); // G (12+7)
    });
  });

  describe('chordToPC', () => {
    it('converts Cmaj7 to 0', () => {
      expect(TonnetzMapper.chordToPC('Cmaj7')).toBe(0);
    });

    it('converts Fm to 5', () => {
      expect(TonnetzMapper.chordToPC('Fm')).toBe(5);
    });

    it('converts F# to 6', () => {
      expect(TonnetzMapper.chordToPC('F#')).toBe(6);
    });
  });

  describe('getDistance', () => {
    it('calculates Manhattan distance correctly', () => {
      const p1 = { x: 0, y: 0 };
      const p2 = { x: 3, y: 2 };
      expect(TonnetzMapper.getDistance(p1, p2)).toBe(5);
    });

    it('returns 0 for same point', () => {
      const p1 = { x: 1, y: 1 };
      expect(TonnetzMapper.getDistance(p1, p1)).toBe(0);
    });
  });

  describe('chordSequenceToPath', () => {
    it('converts a sequence of chords to points', () => {
      const chords = ['C', 'G', 'Am'];
      const path = TonnetzMapper.chordSequenceToPath(chords);
      
      expect(path).toHaveLength(3);
      expect(path[0]).toEqual({ x: 0, y: 0 }); // C
      expect(path[1]).toEqual({ x: 1, y: 0 }); // G
      // Am root is A (9) -> {x:3, y:0}
      expect(path[2]).toEqual({ x: 0, y: 3 }); 
    });
  });

  describe('calculatePathSimilarity', () => {
    it('returns 1.0 for identical paths', () => {
      const pathA = [{ x: 0, y: 0 }, { x: 1, y: 1 }];
      expect(TonnetzMapper.calculatePathSimilarity(pathA, pathA)).toBe(1);
    });

    it('returns 0.0 for completely different paths (max distance)', () => {
      // Create two paths that are very far apart
      // Max dist per step is 5.
      // 0,0 vs 3,2 (distance 5)
      const pathA = [{ x: 0, y: 0 }];
      const pathB = [{ x: 3, y: 2 }]; // F (5) or Bb (10) or similar far point
      
      // calculated similarity = 1 - (5 / 5) = 0
      expect(TonnetzMapper.calculatePathSimilarity(pathA, pathB)).toBe(0);
    });
    
    it('handles empty paths', () => {
        expect(TonnetzMapper.calculatePathSimilarity([], [])).toBe(0);
    });
  });
});
