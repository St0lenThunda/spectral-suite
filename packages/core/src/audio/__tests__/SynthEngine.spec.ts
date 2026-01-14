import { describe, it, expect, vi } from 'vitest';
import { SynthEngine } from '../SynthEngine';

// Mock AudioContext because it doesn't exist in the test environment
const mockAudioContext = {
  createGain: vi.fn( () => ( {
    gain: { value: 0, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    connect: vi.fn(),
    disconnect: vi.fn()
  } ) ),
  createOscillator: vi.fn( () => ( {
    type: '',
    frequency: { value: 0, setValueAtTime: vi.fn() },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn()
  } ) ),
  createDelay: vi.fn( () => ( {
    delayTime: { value: 0 },
    connect: vi.fn(),
    disconnect: vi.fn()
  } ) ),
  createBiquadFilter: vi.fn( () => ( {
    type: '',
    frequency: { value: 0 },
    Q: { value: 0 },
    connect: vi.fn(),
    disconnect: vi.fn()
  } ) ),
  createWaveShaper: vi.fn( () => ( {
    curve: null,
    oversample: '',
    connect: vi.fn(),
    disconnect: vi.fn()
  } ) ),
  createBuffer: vi.fn( () => ( {
    getChannelData: vi.fn( () => new Float32Array( 100 ) )
  } ) ),
  createBufferSource: vi.fn( () => ( {
    buffer: null,
    loop: false,
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn()
  } ) ),
  destination: {},
  currentTime: 0,
  sampleRate: 44100,
  resume: vi.fn()
};

global.window = {
  AudioContext: vi.fn().mockImplementation( function () {
    return mockAudioContext;
  } )
} as any;

describe( 'SynthEngine', () => {
  it( 'should be a singleton', () => {
    const instance1 = SynthEngine.getInstance();
    const instance2 = SynthEngine.getInstance();
    expect( instance1 ).toBe( instance2 );
  } );

  it( 'should set and get presets', () => {
    const synth = SynthEngine.getInstance();
    synth.setPreset( 'STEEL_STRING' );
    expect( synth.getPreset() ).toBe( 'STEEL_STRING' );

    synth.setPreset( 'OVERDRIVE' );
    expect( synth.getPreset() ).toBe( 'OVERDRIVE' );

    synth.setPreset( 'DISTORTION' );
    expect( synth.getPreset() ).toBe( 'DISTORTION' );
  } );

  it( 'should play a note without crashing', () => {
    const synth = SynthEngine.getInstance();
    synth.setPreset( 'RETRO' );
    // We don't expect it to actually play sound in the test, 
    // just ensure the logic doesn't throw.
    expect( () => synth.playNote( 440 ) ).not.toThrow();
  } );

  it( 'should play guitar-sounding notes without crashing', () => {
    const synth = SynthEngine.getInstance();

    synth.setPreset( 'STEEL_STRING' );
    expect( () => synth.playNote( 440 ) ).not.toThrow();

    synth.setPreset( 'OVERDRIVE' );
    expect( () => synth.playNote( 440 ) ).not.toThrow();

    synth.setPreset( 'DISTORTION' );
    expect( () => synth.playNote( 440 ) ).not.toThrow();
  } );
} );
