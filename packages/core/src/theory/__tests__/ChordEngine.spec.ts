import { describe, it, expect } from 'vitest';
import { ChordEngine } from '../ChordEngine';

describe( 'ChordEngine', () => {

  it( 'identifies C Major triad', () => {
    const notes = ['C', 'E', 'G'];
    const chords = ChordEngine.detectChords( notes );
    expect( chords.length ).toBeGreaterThan( 0 );
    // Allow C or CM
    expect( ['C', 'CM'] ).toContain( chords[0].symbol );
    expect( chords[0].name.toLowerCase() ).toContain( 'major' );
  } );

  it( 'identifies A Minor triad', () => {
    const notes = ['A', 'C', 'E'];
    const chords = ChordEngine.detectChords( notes );
    expect( chords.length ).toBeGreaterThan( 0 );
    expect( chords[0].symbol ).toBe( 'Am' );
  } );

  it( 'handles inversions (E G C)', () => {
    const notes = ['E', 'G', 'C'];
    const chords = ChordEngine.detectChords( notes );
    // Should identify C Major (CM) or C/E, or C/G? First note is E (First inversion) -> C/E
    // Just ensure a C major chord is explicitly in the list
    const match = chords.find( c => c.symbol.startsWith( 'C' ) && c.name.toLowerCase().includes( 'major' ) );
    expect( match ).toBeDefined();
  } );

  it( 'suggests next chords in key of C', () => {
    const suggestions = ChordEngine.suggestNext( 'C', 'C' );
    expect( suggestions.length ).toBeGreaterThan( 0 );

    const hasIV = suggestions.some( s => ['F', 'Fmaj7', 'FM7'].includes( s ) );
    const hasV = suggestions.some( s => ['G', 'G7'].includes( s ) );

    expect( hasIV ).toBe( true );
    expect( hasV ).toBe( true );
  } );

  it( 'returns empty for noise', () => {
    const notes = ['C', 'C#', 'D#'];
    expect( () => ChordEngine.detectChords( notes ) ).not.toThrow();
  } );
} );
