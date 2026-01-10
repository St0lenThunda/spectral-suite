import { describe, it, expect } from 'vitest';
import { ScaleEngine } from '../ScaleEngine';

describe( 'ScaleEngine', () => {
  it( 'should detect C Major scale correctly', () => {
    const notes = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    const results = ScaleEngine.detectScales( notes );

    expect( results.length ).toBeGreaterThan( 0 );
    const topMatch = results[0];
    expect( topMatch.name.toLowerCase() ).toBe( 'c major' ); // Tonal returns 'C major'
    expect( topMatch.score ).toBe( 1 );
  } );

  it( 'should detect C Minor scale correctly', () => {
    const notes = ['C', 'D', 'Eb', 'F', 'G', 'Ab', 'Bb'];
    const results = ScaleEngine.detectScales( notes );

    // Filter for C Minor explicitly as relative keys might share score
    const cMinor = results.find( r => r.name.toLowerCase() === 'c minor' );
    expect( cMinor ).toBeDefined();
    expect( cMinor!.score ).toBe( 1 );
  } );

  it( 'should detect Pentatonic scales', () => {
    const notes = ['C', 'D', 'E', 'G', 'A']; // C Major Pentatonic
    const results = ScaleEngine.detectScales( notes );

    // Major scale (Priority 1) might outrank Pentatonic (Priority 2)
    // But Pentatonic should be in the list
    const pentatonic = results.find( r => r.name.toLowerCase().includes( 'pentatonic' ) );
    expect( pentatonic ).toBeDefined();
    expect( pentatonic!.score ).toBe( 1 );
  } );

  it( 'should handle partial inputs gracefully', () => {
    const notes = ['C', 'E', 'G']; // Triad
    const results = ScaleEngine.detectScales( notes );

    const cMajor = results.find( r => r.name.toLowerCase() === 'c major' );
    expect( cMajor ).toBeDefined();
    expect( cMajor!.score ).toBe( 1 );
  } );

  it( 'should return empty array for empty input', () => {
    expect( ScaleEngine.detectScales( [] ) ).toEqual( [] );
  } );
} );
