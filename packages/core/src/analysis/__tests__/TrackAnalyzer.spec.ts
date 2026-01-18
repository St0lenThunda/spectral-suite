import { describe, it, expect, vi } from 'vitest';
import { TrackAnalyzer } from '../TrackAnalyzer';
import { AudioEngine } from '../../audio/AudioEngine';

// Mock AudioEngine
vi.mock( '../../audio/AudioEngine', () => ( {
  AudioEngine: {
    getInstance: vi.fn( () => ( {
      getContext: vi.fn( () => ( {
        decodeAudioData: vi.fn().mockResolvedValue( {
          duration: 120,
          length: 120 * 44100,
          sampleRate: 44100,
          numberOfChannels: 1,
          getChannelData: vi.fn().mockReturnValue( new Float32Array( 120 * 44100 ) ),
        } as unknown as AudioBuffer ),
      } ) ),
    } ) ),
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
