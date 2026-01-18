import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TrackAnalyzer } from '../TrackAnalyzer';
import { AudioBuilder } from './fixtures/AudioBuilder';
import { AudioEngine } from '../../audio/AudioEngine';

// --- MOCK SETUP ---
// We need to bypass the "real" AudioContext decodeAudioData because we are supplying 
// pre-decoded buffers directly, but TrackAnalyzer internal logic might try to use it 
// if we passed a File.
// However, TrackAnalyzer.analyzeBuffer is private, so we usually call analyze(File).
// For this Golden Master test, we want to test analyzeBuffer logic directly 
// OR we can mock decodeAudioData to return our generated buffer.

vi.mock( '../../audio/AudioEngine', () => ( {
  AudioEngine: {
    getInstance: vi.fn( () => ( {
      getContext: vi.fn( () => ( {
        // When TrackAnalyzer calls decodeAudioData, we return the buffer we prepared.
        // But wait, decodeAudioData takes an ArrayBuffer (from a file), not our AudioBuffer.
        // So we need a way to map the input "File" to our output AudioBuffer.
        decodeAudioData: vi.fn( async () => ( global as any ).TEST_AUDIO_BUFFER ),

        // Mock sample rate for internal calculations
        sampleRate: 44100,

        // For OfflineAudioContext usages inside TrackAnalyzer
        createBufferSource: vi.fn( () => ( {
          buffer: null,
          connect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn()
        } ) )
      } ) ),
    } ) ),
  },
} ) );

// --- HELPERS ---
const createMockFile = ( name: string ) => {
  return {
    name,
    arrayBuffer: vi.fn().mockResolvedValue( new ArrayBuffer( 10 ) ), // Dummy data
  } as unknown as File;
};


describe( 'TrackAnalyzer Golden Master', () => {

  beforeEach( () => {
    vi.clearAllMocks();
  } );

  it( 'accurately detects 120 BPM', async () => {
    // 1. Generate Golden Master Audio (10 seconds of 120bpm)
    const builder = new AudioBuilder( 10 );
    builder.addBeat( 120 );
    const buffer = builder.getBuffer();

    // 2. Inject into Mock
    ( global as any ).TEST_AUDIO_BUFFER = buffer;

    // 3. Analyze
    const result = await TrackAnalyzer.analyze( createMockFile( '120bpm.wav' ) );

    // 4. Assert
    // BpmDetector uses 2048-sample chunks (46ms at 44.1kHz).
    // This coarse resolution leads to quantization errors of +/- 5-10 BPM.
    console.log( `Detected BPM: ${result.bpm}` );
    expect( result.bpm ).toBeGreaterThanOrEqual( 115 );
    expect( result.bpm ).toBeLessThanOrEqual( 125 );
  } );

  it( 'accurately detects 90 BPM', async () => {
    const builder = new AudioBuilder( 10 );
    builder.addBeat( 90 );
    const buffer = builder.getBuffer();

    ( global as any ).TEST_AUDIO_BUFFER = buffer;

    const result = await TrackAnalyzer.analyze( createMockFile( '90bpm.wav' ) );

    console.log( `Detected BPM: ${result.bpm}` );
    expect( result.bpm ).toBeGreaterThanOrEqual( 85 );
    expect( result.bpm ).toBeLessThanOrEqual( 95 );
  } );

  // NOTE: KeyDetector often relies on FFT which is hard to simulate perfectly with 
  // just Sine waves in time-domain analysis unless the KeyDetector implementation 
  // does its own FFT. 
  // Our mocks in setup.ts might interfere if KeyDetector uses OfflineAudioContext to render.
  // The current mock setup in setup.ts for OfflineAudioContext returns an EMPTY buffer 
  // on startRendering (zeros). 
  // THIS IS A GOTCHA: The real KeyDetector likely uses OfflineAudioContext to process the audio.
  // If we don't mock the internal rendering of OfflineAudioContext to actually "process" our input buffer,
  // the result will be silence, and detection will fail.

  // For this reason, we will stick to BPM testing for this Golden Master iteration,
  // as BpmDetector usually runs on raw time-domain data (getChannelData) which WE CONTROL via the buffer.

} );
