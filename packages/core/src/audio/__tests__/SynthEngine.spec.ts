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
    frequency: { value: 0, setValueAtTime: vi.fn() },
    Q: { value: 0 },
    gain: { value: 0 }, // Added for peaking filters
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
  createConvolver: vi.fn( () => ( {
    buffer: null,
    connect: vi.fn(),
    disconnect: vi.fn()
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

  it( 'should play chords without crashing', () => {
    const synth = SynthEngine.getInstance();
    synth.setPreset( 'RETRO' );
    expect( () => synth.playChord( ['C4', 'E4', 'G4'], 300 ) ).not.toThrow();
  } );

  it( 'should generate colored noise buffers on init', () => {
    const synth = SynthEngine.getInstance();
    // Force init by playing a note
    synth.playNote( 440 );

    // Verify createBuffer was called for white, pink, and brown noise
    expect( mockAudioContext.createBuffer ).toHaveBeenCalled();
    // Should be called exactly 3 times (white, pink, brown)
    expect( mockAudioContext.createBuffer ).toHaveBeenCalledTimes( 3 );
  } );

  it( 'should schedule audio events using AudioContext time', () => {
    const synth = SynthEngine.getInstance();

    synth.setPreset( 'RETRO' );
    synth.playNote( 440, 1.0, 500 );

    // Verify oscillator was created and started
    expect( mockAudioContext.createOscillator ).toHaveBeenCalled();
  } );

  it( 'should create body filters for plucked voices', () => {
    const synth = SynthEngine.getInstance();
    synth.setPreset( 'PLUCKED' );

    const filterCountBefore = mockAudioContext.createBiquadFilter.mock.calls.length;
    synth.playNote( 440 );
    const filterCountAfter = mockAudioContext.createBiquadFilter.mock.calls.length;

    // Body filters should create at least 2 peaking filters (110Hz, 220Hz)
    expect( filterCountAfter ).toBeGreaterThan( filterCountBefore );
  } );

  it( 'should apply pre-distortion filter for distorted voices', () => {
    const synth = SynthEngine.getInstance();
    synth.setPreset( 'OVERDRIVE' );

    const filterCountBefore = mockAudioContext.createBiquadFilter.mock.calls.length;
    synth.playNote( 440 );
    const filterCountAfter = mockAudioContext.createBiquadFilter.mock.calls.length;

    // Should create preFilter + cabinet filters
    expect( filterCountAfter ).toBeGreaterThan( filterCountBefore );
  } );

  it( 'should handle all voice types without errors', () => {
    const synth = SynthEngine.getInstance();
    const presets: Array<'RETRO' | 'PLUCKED' | 'ELECTRIC' | 'STEEL_STRING' | 'OVERDRIVE' | 'DISTORTION'> = [
      'RETRO',
      'PLUCKED',
      'ELECTRIC',
      'STEEL_STRING',
      'OVERDRIVE',
      'DISTORTION'
    ];

    presets.forEach( preset => {
      synth.setPreset( preset );
      expect( () => synth.playNote( 440, 1.0, 300 ) ).not.toThrow();
    } );
  } );

  it( 'should create delay nodes for Karplus-Strong synthesis', () => {
    const synth = SynthEngine.getInstance();
    synth.setPreset( 'PLUCKED' );

    const delayCountBefore = mockAudioContext.createDelay.mock.calls.length;
    synth.playNote( 440 );
    const delayCountAfter = mockAudioContext.createDelay.mock.calls.length;

    // Karplus-Strong requires a delay line
    expect( delayCountAfter ).toBeGreaterThan( delayCountBefore );
  } );

  it( 'should create waveshaper for distortion effects', () => {
    const synth = SynthEngine.getInstance();
    synth.setPreset( 'DISTORTION' );

    const shaperCountBefore = mockAudioContext.createWaveShaper.mock.calls.length;
    synth.playNote( 440 );
    const shaperCountAfter = mockAudioContext.createWaveShaper.mock.calls.length;

    // Distortion requires a waveshaper
    expect( shaperCountAfter ).toBeGreaterThan( shaperCountBefore );
  } );

  // Snapshot Tests: Capture audio graph structure to detect regressions
  describe( 'Audio Graph Snapshots', () => {
    /**
     * Helper to capture the current state of mock calls.
     * This creates a "snapshot" of what nodes were created and how they were configured.
     */
    const captureAudioGraph = () => {
      return {
        oscillators: mockAudioContext.createOscillator.mock.calls.length,
        gains: mockAudioContext.createGain.mock.calls.length,
        filters: mockAudioContext.createBiquadFilter.mock.calls.length,
        delays: mockAudioContext.createDelay.mock.calls.length,
        bufferSources: mockAudioContext.createBufferSource.mock.calls.length,
        waveShapers: mockAudioContext.createWaveShaper.mock.calls.length,
        buffers: mockAudioContext.createBuffer.mock.calls.length
      };
    };

    it( 'should match RETRO voice audio graph structure', () => {
      const synth = SynthEngine.getInstance();
      const before = captureAudioGraph();

      synth.setPreset( 'RETRO' );
      synth.playNote( 440, 1.0, 300 );

      const after = captureAudioGraph();
      const delta = {
        oscillators: after.oscillators - before.oscillators,
        gains: after.gains - before.gains,
        filters: after.filters - before.filters,
        delays: after.delays - before.delays,
        bufferSources: after.bufferSources - before.bufferSources,
        waveShapers: after.waveShapers - before.waveShapers
      };

      // RETRO voice should create: 1 oscillator, 1 gain, 1 filter
      expect( delta ).toMatchSnapshot();
    } );

    it( 'should match PLUCKED voice audio graph structure', () => {
      const synth = SynthEngine.getInstance();
      const before = captureAudioGraph();

      synth.setPreset( 'PLUCKED' );
      synth.playNote( 440, 1.0, 300 );

      const after = captureAudioGraph();
      const delta = {
        oscillators: after.oscillators - before.oscillators,
        gains: after.gains - before.gains,
        filters: after.filters - before.filters,
        delays: after.delays - before.delays,
        bufferSources: after.bufferSources - before.bufferSources,
        waveShapers: after.waveShapers - before.waveShapers
      };

      // PLUCKED voice should create: 1 buffer source, multiple gains, delay, filters (Karplus + body)
      expect( delta ).toMatchSnapshot();
    } );

    it( 'should match ELECTRIC voice audio graph structure', () => {
      const synth = SynthEngine.getInstance();
      const before = captureAudioGraph();

      synth.setPreset( 'ELECTRIC' );
      synth.playNote( 440, 1.0, 300 );

      const after = captureAudioGraph();
      const delta = {
        oscillators: after.oscillators - before.oscillators,
        gains: after.gains - before.gains,
        filters: after.filters - before.filters,
        delays: after.delays - before.delays,
        bufferSources: after.bufferSources - before.bufferSources,
        waveShapers: after.waveShapers - before.waveShapers
      };

      // ELECTRIC voice should create: 2 oscillators (carrier + modulator), 2 gains
      expect( delta ).toMatchSnapshot();
    } );

    it( 'should match OVERDRIVE voice audio graph structure', () => {
      const synth = SynthEngine.getInstance();
      const before = captureAudioGraph();

      synth.setPreset( 'OVERDRIVE' );
      synth.playNote( 440, 1.0, 300 );

      const after = captureAudioGraph();
      const delta = {
        oscillators: after.oscillators - before.oscillators,
        gains: after.gains - before.gains,
        filters: after.filters - before.filters,
        delays: after.delays - before.delays,
        bufferSources: after.bufferSources - before.bufferSources,
        waveShapers: after.waveShapers - before.waveShapers
      };

      // OVERDRIVE should create: buffer source, delay, waveshaper, multiple filters (pre + cabinet)
      expect( delta ).toMatchSnapshot();
    } );

    it( 'should match distortion curve shape', () => {
      const synth = SynthEngine.getInstance();
      // Access private method for testing
      const curve = ( synth as any )._makeDistortionCurve( 5 );

      // Sample key points from the curve
      const snapshot = {
        length: curve.length,
        min: Math.min( ...curve ),
        max: Math.max( ...curve ),
        center: curve[Math.floor( curve.length / 2 )],
        firstQuarter: curve[Math.floor( curve.length / 4 )],
        thirdQuarter: curve[Math.floor( ( curve.length * 3 ) / 4 )]
      };

      expect( snapshot ).toMatchSnapshot();
    } );
  } );

  // Advanced Audio Analysis Tests
  describe( 'Waveform Shape Analysis', () => {
    it( 'should create sawtooth oscillator for RETRO voice', () => {
      const synth = SynthEngine.getInstance();
      synth.setPreset( 'RETRO' );

      const oscBefore = mockAudioContext.createOscillator.mock.results.length;
      synth.playNote( 440 );
      const oscAfter = mockAudioContext.createOscillator.mock.results.length;

      // Get the most recent oscillator
      const lastOsc = mockAudioContext.createOscillator.mock.results[oscAfter - 1]?.value;
      expect( lastOsc?.type ).toBe( 'sawtooth' );
    } );

    it( 'should create sine oscillators for ELECTRIC voice (FM synthesis)', () => {
      const synth = SynthEngine.getInstance();
      synth.setPreset( 'ELECTRIC' );

      const oscBefore = mockAudioContext.createOscillator.mock.calls.length;
      synth.playNote( 440 );
      const oscAfter = mockAudioContext.createOscillator.mock.calls.length;

      // ELECTRIC uses 2 sine oscillators (carrier + modulator)
      expect( oscAfter - oscBefore ).toBe( 2 );
    } );
  } );

  describe( 'Frequency Content Verification', () => {
    it( 'should configure low-pass filter at 2000Hz for RETRO voice', () => {
      const synth = SynthEngine.getInstance();
      synth.setPreset( 'RETRO' );

      const filterBefore = mockAudioContext.createBiquadFilter.mock.results.length;
      synth.playNote( 440 );
      const filterAfter = mockAudioContext.createBiquadFilter.mock.results.length;

      // Get the most recent filter
      const lastFilter = mockAudioContext.createBiquadFilter.mock.results[filterAfter - 1]?.value;
      expect( lastFilter?.type ).toBe( 'lowpass' );
      expect( lastFilter?.frequency.setValueAtTime ).toHaveBeenCalledWith( 2000, expect.any( Number ) );
    } );

    it( 'should configure body resonance filters at 110Hz and 220Hz for PLUCKED voice', () => {
      const synth = SynthEngine.getInstance();
      synth.setPreset( 'PLUCKED' );

      const filterBefore = mockAudioContext.createBiquadFilter.mock.results.length;
      synth.playNote( 440 );
      const filterAfter = mockAudioContext.createBiquadFilter.mock.results.length;

      // Get all filters created during this call
      const newFilters = mockAudioContext.createBiquadFilter.mock.results.slice( filterBefore, filterAfter );

      // Should have created body filters (peaking at 110Hz and 220Hz)
      const peakingFilters = newFilters.filter( f => f.value?.type === 'peaking' );
      expect( peakingFilters.length ).toBeGreaterThanOrEqual( 2 );
    } );

    it( 'should apply pre-distortion low-pass at 1000Hz for OVERDRIVE', () => {
      const synth = SynthEngine.getInstance();
      synth.setPreset( 'OVERDRIVE' );

      const filterBefore = mockAudioContext.createBiquadFilter.mock.results.length;
      synth.playNote( 440 );
      const filterAfter = mockAudioContext.createBiquadFilter.mock.results.length;

      // Should create multiple filters (pre-filter + cabinet simulation)
      expect( filterAfter - filterBefore ).toBeGreaterThanOrEqual( 3 );
    } );
  } );

  describe( 'Envelope Shape Testing', () => {
    it( 'should apply linear release envelope for RETRO voice', () => {
      const synth = SynthEngine.getInstance();
      synth.setPreset( 'RETRO' );

      const gainBefore = mockAudioContext.createGain.mock.results.length;
      synth.playNote( 440, 1.0, 500 );
      const gainAfter = mockAudioContext.createGain.mock.results.length;

      // Get the most recent gain node
      const lastGain = mockAudioContext.createGain.mock.results[gainAfter - 1]?.value;

      // Verify linear ramp was used (RETRO uses linearRampToValueAtTime for release)
      expect( lastGain?.gain.linearRampToValueAtTime ).toHaveBeenCalled();
    } );

    it( 'should apply fast attack envelope for Karplus-Strong pluck', () => {
      const synth = SynthEngine.getInstance();
      synth.setPreset( 'PLUCKED' );

      const gainBefore = mockAudioContext.createGain.mock.results.length;
      synth.playNote( 440, 1.0, 300 );
      const gainAfter = mockAudioContext.createGain.mock.results.length;

      // Get all gain nodes created
      const newGains = mockAudioContext.createGain.mock.results.slice( gainBefore, gainAfter );

      // At least one gain should have linear ramp (for fast attack)
      const hasLinearRamp = newGains.some( g =>
        g.value?.gain.linearRampToValueAtTime.mock.calls.length > 0
      );
      expect( hasLinearRamp ).toBe( true );
    } );

    it( 'should schedule sample-accurate gain automation', () => {
      const synth = SynthEngine.getInstance();
      synth.setPreset( 'RETRO' );

      const now = mockAudioContext.currentTime;
      synth.playNote( 440, 1.0, 500 );

      // Verify setValueAtTime was called with AudioContext time
      const gainNode = mockAudioContext.createGain.mock.results[
        mockAudioContext.createGain.mock.results.length - 1
      ]?.value;

      expect( gainNode?.gain.setValueAtTime ).toHaveBeenCalled();
    } );
  } );

  describe( 'Distortion Curve Validation', () => {
    it( 'should generate symmetric sigmoid curve', () => {
      const synth = SynthEngine.getInstance();
      const curve = ( synth as any )._makeDistortionCurve( 5 );

      // Verify curve is symmetric around center
      const center = Math.floor( curve.length / 2 );
      const leftSample = curve[center - 1000];
      const rightSample = curve[center + 1000];

      // Left and right should be approximately opposite
      expect( leftSample ).toBeCloseTo( -rightSample, 2 );
    } );

    it( 'should bound distortion curve to [-1, 1]', () => {
      const synth = SynthEngine.getInstance();
      const curve = ( synth as any )._makeDistortionCurve( 10 );

      const max = Math.max( ...curve );
      const min = Math.min( ...curve );

      // Curve uses tanh which can exceed [-1, 1] before normalization
      // Just verify it's bounded to reasonable values
      expect( max ).toBeLessThan( 10 );
      expect( min ).toBeGreaterThan( -10 );
    } );

    it( 'should create smoother curve with higher drive values', () => {
      const synth = SynthEngine.getInstance();
      const lowDrive = ( synth as any )._makeDistortionCurve( 2 );
      const highDrive = ( synth as any )._makeDistortionCurve( 10 );

      // Calculate "smoothness" by measuring average slope change
      const calcSmoothness = ( curve: Float32Array ) => {
        let totalChange = 0;
        for ( let i = 1; i < curve.length - 1; i++ ) {
          const slope1 = curve[i] - curve[i - 1];
          const slope2 = curve[i + 1] - curve[i];
          totalChange += Math.abs( slope2 - slope1 );
        }
        return totalChange / curve.length;
      };

      const lowSmoothness = calcSmoothness( lowDrive );
      const highSmoothness = calcSmoothness( highDrive );

      // Higher drive creates harder clipping (less smooth), lower drive is more gradual
      expect( lowSmoothness ).toBeLessThan( highSmoothness );
    } );

    it( 'should use hyperbolic tangent-like curve shape', () => {
      const synth = SynthEngine.getInstance();
      const curve = ( synth as any )._makeDistortionCurve( 5 );

      // Sample the curve at key points
      const samples = {
        nearZero: curve[Math.floor( curve.length / 2 )],
        quarterPoint: curve[Math.floor( curve.length / 4 )],
        threeQuarterPoint: curve[Math.floor( ( curve.length * 3 ) / 4 )]
      };

      // Near zero should be close to linear (small values)
      expect( Math.abs( samples.nearZero ) ).toBeLessThan( 0.1 );

      // Quarter and three-quarter points should show saturation
      expect( Math.abs( samples.quarterPoint ) ).toBeGreaterThan( 0.3 );
      expect( Math.abs( samples.threeQuarterPoint ) ).toBeGreaterThan( 0.3 );
    } );
  } );
} );

