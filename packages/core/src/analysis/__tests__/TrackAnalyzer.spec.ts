import { describe, it, expect, vi } from 'vitest';
import { TrackAnalyzer } from '../TrackAnalyzer';

describe( 'TrackAnalyzer', () => {

  it( 'initializes', () => {
    const analyzer = new TrackAnalyzer();
    expect( analyzer ).toBeDefined();
  } );

  it( 'analyzes a mocked File', async () => {
    // Mock File object
    const mockFile = {
      name: 'test.mp3',
      arrayBuffer: vi.fn().mockResolvedValue( new ArrayBuffer( 8 ) ),
      size: 1000,
      type: 'audio/mpeg'
    } as unknown as File;

    const result = await TrackAnalyzer.analyze( mockFile );

    expect( result ).toBeDefined();
    expect( result.bpm ).toBeDefined();
    expect( result.key ).toBeDefined();
    expect( result.energyMap ).toBeInstanceOf( Array );
  } );
} );
