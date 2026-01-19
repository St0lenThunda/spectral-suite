import { describe, it, expect, vi } from 'vitest';
import { TrackAnalyzer } from '../TrackAnalyzer';
import { AudioEngine } from '../../audio/AudioEngine';

// Mock AudioEngine
const mockContext = {
  decodeAudioData: vi.fn(),
  sampleRate: 44100,
};
const mockInstance = {
  getContext: vi.fn( () => mockContext ),
};
vi.mock( '../../audio/AudioEngine', () => ( {
  AudioEngine: {
    getInstance: vi.fn( () => mockInstance ),
  },
} ) );

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
    } as unknown as File;

    mockContext.decodeAudioData.mockResolvedValueOnce( {
      duration: 10,
      length: 10 * 44100,
      sampleRate: 44100,
      getChannelData: () => new Float32Array( 10 * 44100 ).fill( 0.1 ),
    } as any );

    const result = await TrackAnalyzer.analyze( mockFile );

    expect( result ).toBeDefined();
    expect( result.fileName ).toBe( 'test.mp3' );
  } );

  it( 'analyzes a URL', async () => {
    const mockArrayBuffer = new ArrayBuffer( 8 );
    global.fetch = vi.fn().mockResolvedValue( {
      ok: true,
      arrayBuffer: () => Promise.resolve( mockArrayBuffer ),
    } );

    mockContext.decodeAudioData.mockResolvedValueOnce( {
      duration: 10,
      length: 10 * 44100,
      sampleRate: 44100,
      getChannelData: () => new Float32Array( 10 * 44100 ).fill( 0.1 ),
    } as any );

    const result = await TrackAnalyzer.analyzeUrl( 'http://example.com/track.mp3' );
    expect( result.fileName ).toBe( 'track.mp3' );
  } );

  it( 'throws error when fetch fails', async () => {
    global.fetch = vi.fn().mockResolvedValue( { ok: false } );
    await expect( TrackAnalyzer.analyzeUrl( 'http://error.com' ) ).rejects.toThrow( 'Could not fetch audio from URL' );
  } );

  it( 'handles empty files gracefully', async () => {
    // Modify mock to return empty buffer
    vi.spyOn( AudioEngine.getInstance().getContext()!, 'decodeAudioData' ).mockResolvedValueOnce( {
      duration: 0,
      length: 0,
      sampleRate: 44100,
      getChannelData: () => new Float32Array( 0 )
    } as any );

    const mockFile = {
      name: 'empty.mp3',
      arrayBuffer: vi.fn().mockResolvedValue( new ArrayBuffer( 0 ) )
    } as any;

    const result = await TrackAnalyzer.analyze( mockFile );
    // Map is fixed at 200 points in generateEnergyMap
    expect( result.energyMap ).toHaveLength( 200 );
    // Just verify we have sections and they have a label
    expect( result.sections.length ).toBeGreaterThan( 0 );
    expect( result.sections[0]?.label ).toBeDefined();
  } );

  it( 'exercises all section labels and merge logic with a complex signal', async () => {
    const sampleRate = 44100;
    const duration = 20;
    const data = new Float32Array( sampleRate * duration );

    // Fill signal to trigger labels
    for ( let i = 0; i < sampleRate * 2; i++ ) data[i] = 0.1; // Intro
    // 2. Build-up (Rapid increase)
    for ( let i = sampleRate * 2; i < sampleRate * 3; i++ ) data[i] = 0.8; // Trigger build-up jump
    // 3. Chorus (High constant)
    for ( let i = sampleRate * 3; i < sampleRate * 6; i++ ) data[i] = 0.95;
    // 4. Verse (Middle energy)
    for ( let i = sampleRate * 6; i < sampleRate * 10; i++ ) data[i] = 0.4;
    // 5. Bridge/Breakdown (Extremely low energy)
    // To hit val < p10 * 1.5, we need val to be tiny if p10 is non-zero
    for ( let i = sampleRate * 10; i < sampleRate * 12; i++ ) data[i] = 0.001;
    // 6. Outro (End)
    for ( let i = sampleRate * 18; i < sampleRate * 20; i++ ) data[i] = 0.005;

    mockContext.decodeAudioData.mockResolvedValueOnce( {
      duration,
      length: data.length,
      sampleRate,
      getChannelData: () => data
    } as any );

    const result = await TrackAnalyzer.analyze( { name: 'stress.mp3', arrayBuffer: vi.fn() } as any );

    expect( result.sections.length ).toBeGreaterThan( 1 );
    expect( Math.max( ...result.energyMap ) ).toBeCloseTo( 1, 1 );
  } );

  it( 'triggers short section merging and label swapping', async () => {
    const data = new Float32Array( 44100 * 10 );
    // Section 1: 1 second of Verse (0.4)
    // Section 2: 2 seconds of Chorus (0.9) - slightly longer but still "short" (<3s)
    for ( let i = 0; i < 44100 * 1; i++ ) data[i] = 0.4;
    for ( let i = 44100 * 1; i < 44100 * 3; i++ ) data[i] = 0.9;
    for ( let i = 44100 * 3; i < 44100 * 10; i++ ) data[i] = 0.4;

    mockContext.decodeAudioData.mockResolvedValueOnce( {
      duration: 10,
      length: data.length,
      sampleRate: 44100,
      getChannelData: () => data
    } as any );

    const result = await TrackAnalyzer.analyze( { name: 'merge-swap.mp3', arrayBuffer: vi.fn() } as any );
    // Should merge and potentially swap labels depending on dominance
    expect( result.sections.length ).toBeGreaterThan( 0 );
  } );

  it( 'triggers Bridge and Breakdown labels via isolation test', () => {
    // We create a map where p10 = 0.1 (so p10 * 1.5 = 0.15)
    // We'll have a mix of values to set the percentiles
    const energyMap = [0.05, 0.1, 0.2, 0.5, 0.9, 0.12, 0.13, 0.1, 0.1, 0.1];
    // vocalMap values to contrast
    const vocalMap = [0.1, 0.1, 0.1, 0.1, 0.1, 0.6, 0.05, 0.1, 0.1, 0.1];
    const duration = 10;

    // Call private static method via any
    const result = ( TrackAnalyzer as any ).detectSections( energyMap, vocalMap, duration );

    // index 5: val=0.12 (< 0.15), vocalVal=0.6 (> 0.4) => Bridge
    // index 6: val=0.13 (< 0.15), vocalVal=0.05 (< 0.4) => Breakdown
    expect( result.some( s => s.label === 'Bridge' ) ).toBe( true );
    expect( result.some( s => s.label === 'Breakdown' ) ).toBe( true );
  } );

  it( 'throws error if AudioEngine not initialized', () => {
    vi.spyOn( AudioEngine, 'getInstance' ).mockReturnValueOnce( { getContext: () => null } as any );
    expect( () => TrackAnalyzer.audioCtx ).toThrow( 'AudioEngine not initialized' );
  } );
} );
