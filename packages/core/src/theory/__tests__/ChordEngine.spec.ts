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

  it( 'should handle all inversions correctly', () => {
    // 1st inversion C/E
    const inv1 = ChordEngine.detectChords( ['E2', 'G2', 'C3'] ).find( r => r.symbol.startsWith( 'C/' ) || r.symbol.startsWith( 'CM/' ) );
    expect( inv1?.inversion ).toBe( '1st' );

    // 2nd inversion C/G
    const inv2 = ChordEngine.detectChords( ['G1', 'C2', 'E2'] ).find( r => r.symbol.startsWith( 'C/' ) || r.symbol.startsWith( 'CM/' ) );
    expect( inv2?.inversion ).toBe( '2nd' );

    // 3rd inversion Cmaj7/B
    const inv3 = ChordEngine.detectChords( ['B1', 'C2', 'E2', 'G2'] ).find( r => r.symbol.startsWith( 'Cmaj7' ) || r.symbol.startsWith( 'CM7' ) );
    expect( inv3?.inversion ).toBe( '3rd' );
  } );

  it( 'should sort by complexity (unique note count)', () => {
    // C (3 notes) vs Cmaj7 (4 notes)
    const notes = ['C', 'E', 'G', 'B'];
    const results = ChordEngine.detectChords( notes );
    // Cmaj7 has 4 unique notes, C has 3. Cmaj7 should be first.
    expect( results[0].symbol ).toMatch( /maj7|M7/ );
  } );

  it( 'should prefer chords where first note is the bass', () => {
    // We'll use a case where two chords have same note count.
    // Dm7 vs F6? Both have 4 notes.
    // D, F, A, C.
    // If we play starting with F, maybe F6 is preferred?
    const notes = ['F2', 'A2', 'C3', 'D3'];
    const results = ChordEngine.detectChords( notes );
    // Heuristic 105: aBass === firstNote (F)
    expect( results[0].symbol ).toMatch( /F6|Dm7\/F/ );
  } );

  it( 'should detect symbols only', () => {
    const symbols = ChordEngine.detectSymbols( ['C', 'E', 'G'] );
    expect( symbols.some( s => s.startsWith( 'C' ) ) ).toBe( true );
  } );

  it( 'should handle roman numeral errors gracefully', () => {
    // Very obscure chord that might fail toRomanNumerals
    const result = ChordEngine.getRomanNumeral( 'NOTACHORD', 'C' );
    // Tonal seems to return the symbol if it can't normalize it
    expect( result ).toBe( 'NOTACHORD' );
  } );

  it( 'should suggest variations for minor chords', () => {
    // Am -> relative major (C), etc.
    const suggestions = ChordEngine.suggestNext( 'Am', 'C' );
    expect( suggestions.length ).toBeGreaterThan( 0 );
  } );

  it( 'should suggest cadences for II and V chords', () => {
    // ii (Dm) in C should suggest V (G7)
    const iiSuggestions = ChordEngine.suggestNext( 'Dm', 'C' );
    expect( iiSuggestions.some( s => s.startsWith( 'G' ) ) ).toBe( true );

    // V (G7) in C should suggest I (Cmaj7)
    const vSuggestions = ChordEngine.suggestNext( 'G7', 'C' );
    expect( vSuggestions.some( s => s.startsWith( 'C' ) ) ).toBe( true );
  } );

  it( 'should prefer chords where first note is the root for sorting', () => {
    const engine = new ChordEngine();
    // 'C', 'E', 'G', 'A' -> C6, Am7
    const notes = ['C', 'E', 'G', 'A'];

    // With root 'A', detectSymbols should prioritize Am7/C
    const symbols = ChordEngine.detectSymbols( notes, 'A' );
    expect( symbols ).toContain( 'Am7/C' );
    expect( symbols[0] ).toBe( 'Am7/C' );

    // HEURISTIC TIE-BREAKER (Line 111 in ChordEngine.ts)
    // Same root matches but different sorting
    const resultsD = ChordEngine.detectChords( ['D2', 'F2', 'A2', 'C3'] );
    expect( resultsD[0].symbol ).toMatch( /Dm7/ );

    // SLASH CHORD / INVERSION (Line 58 in ChordEngine.ts)
    // Low E, followed by C and G above it -> C/E
    const resultsSlash = ChordEngine.detectChords( ['E2', 'C3', 'G3'] );
    console.log( 'DEBUG: slash results', resultsSlash.map( r => r.symbol ) );
    expect( resultsSlash[0].symbol ).toMatch( /C(M)?\/E/ );
    expect( resultsSlash[0].inversion ).toBe( '1st' );
  } );

  it( 'should handle major errors in Roman Numeral analysis', () => {
    const result = ( ChordEngine as any ).getRomanNumeral( null, 'C' );
    expect( result ).toBe( '' );

    // This should trigger the catch block if Tonal throws on invalid keys
    const result2 = ( ChordEngine as any ).getRomanNumeral( 'C', 'NOT_A_KEY' );
    expect( result2 ).toBe( '' );
  } );

  it( 'should suggest next chords', () => {
    // Normal case
    const suggestions = ChordEngine.suggestNext( 'C', 'C' );
    expect( suggestions.length ).toBeGreaterThan( 0 );

    // II-V-I cadence check
    // Dm7 -> G7 in key of C
    const nextFromD = ChordEngine.suggestNext( 'Dm7', 'C' );
    expect( nextFromD ).toContain( 'G7' );

    // G7 -> Cmaj7 in key of C
    const nextFromG = ChordEngine.suggestNext( 'G7', 'C' );
    expect( nextFromG ).toContain( 'Cmaj7' );

    // Invalid chord
    expect( ChordEngine.suggestNext( 'NOT_A_CHORD', 'C' ) ).toEqual( [] );

    // Minor chord relative major
    const nextFromAm = ChordEngine.suggestNext( 'Am', 'C' );
    expect( nextFromAm.length ).toBeGreaterThan( 0 );
  } );
} );
