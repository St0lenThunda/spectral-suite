import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RecommendationEngine } from '../RecommendationEngine';
import { SongDatabase } from '../SongDatabase';
import { ChordEngine } from '../../theory/ChordEngine';
import { TonnetzMapper } from '../TonnetzMapper';

// Mock the dependencies
vi.mock('../SongDatabase');
vi.mock('../../theory/ChordEngine');

describe('RecommendationEngine', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should combine multiple strategies into suggestions', async () => {
        // Setup Mocks
        (SongDatabase.getTransitions as any).mockResolvedValue([
            { from: 'C', to: 'Am', probability: 0.9 }
        ]);
        
        (ChordEngine.suggestNext as any).mockReturnValue(['G7', 'Fmaj7']);

        const results = await RecommendationEngine.getScoredSuggestions('C', {
            statWeight: 1.0,
            geomWeight: 0.0,
            theoryWeight: 1.0
        });

        expect(results.length).toBeGreaterThan(0);
        
        // Check for Statistical suggestion
        const amMatch = results.find(r => r.chord === 'Am');
        expect(amMatch).toBeDefined();
        expect(amMatch?.reason).toBe('statistical');

        // Check for Theoretical suggestion
        const g7Match = results.find(r => r.chord === 'G7');
        expect(g7Match).toBeDefined();
        expect(g7Match?.reason).toBe('functional');
    });

    it('should provide geometric suggestions based on Tonnetz proximity', async () => {
        (SongDatabase.getTransitions as any).mockResolvedValue([]);
        (ChordEngine.suggestNext as any).mockReturnValue([]);

        const results = await RecommendationEngine.getScoredSuggestions('C', {
            statWeight: 0.0,
            geomWeight: 1.0,
            theoryWeight: 0.0
        });

        // C is at (0,0). Neighbors on 4x3 grid:
        // (1,0) = G
        // (3,0) = A
        // (0,1) = E
        // (0,2) = Ab
        const chords = results.map(r => r.chord);
        expect(chords).toContain('G');
        expect(chords).toContain('A');
        expect(chords).toContain('E');
        expect(chords).toContain('Ab');
        
        expect(results.every(r => r.reason === 'geometric')).toBe(true);
    });

    it('should sort suggestions by total combined score', async () => {
        // High probability stat match
        (SongDatabase.getTransitions as any).mockResolvedValue([
            { from: 'C', to: 'Am', probability: 0.9 }
        ]);
        
        // Low weight theory match
        (ChordEngine.suggestNext as any).mockReturnValue(['G7']);

        const results = await RecommendationEngine.getScoredSuggestions('C', {
            statWeight: 1.0,
            geomWeight: 0.0,
            theoryWeight: 0.1
        });

        // Am (0.9 * 1.0 = 0.9) should be higher than G7 (0.8 * 0.1 = 0.08)
        expect(results[0].chord).toBe('Am');
        expect(results[1].chord).toBe('G7');
    });

    it('should calculate voice leading and Tonnetz distances', async () => {
        (SongDatabase.getTransitions as any).mockResolvedValue([
            { from: 'C', to: 'G', probability: 0.5 }
        ]);

        const results = await RecommendationEngine.getScoredSuggestions('C');
        const gMatch = results.find(r => r.chord === 'G');

        expect(gMatch?.tonnetzDistance).toBe(1); // C(0,0) to G(1,0)
        expect(gMatch?.voiceLeadingDistance).toBe(7); // C(0) to G(7)
    });
});
