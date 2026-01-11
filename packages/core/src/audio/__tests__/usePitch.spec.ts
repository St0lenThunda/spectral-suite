import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { usePitch } from '../usePitch';
import { ref, nextTick } from 'vue';

// Mock dependencies
vi.mock( 'tonal', () => ( {
  Note: {
    fromFreq: vi.fn( ( freq ) => {
      if ( Math.abs( freq - 440 ) < 1 ) return 'A4';
      if ( Math.abs( freq - 445 ) < 1 ) return 'A4'; // Slightly sharp
      return null;
    } ),
    transpose: vi.fn( ( note, interval ) => note ),
    get: vi.fn( ( note ) => {
      if ( note === 'A4' ) return { freq: 440, pc: 'A' };
      return { freq: null, pc: null };
    } ),
  },
  Interval: {
    fromSemitones: vi.fn(),
  },
} ) );

// Mock AudioWorkletNode to capture the listener
let mockPortHandlers: Record<string, ( e: any ) => void> = {};

vi.mock( '../worklets/pitch-processor.ts?worker&url', () => ( {
  default: 'mock-worker-url',
} ) );

vi.mock( '../useAudioEngine', () => ( {
  useAudioEngine: vi.fn( () => ( {
    getAnalyser: vi.fn( () => ( {
      connect: vi.fn(),
      getFloatTimeDomainData: vi.fn(), // Fallback if legacy loop triggers
      fftSize: 2048,
    } ) ),
    getContext: vi.fn( () => ( {
      createScriptProcessor: vi.fn( () => ( {
        connect: vi.fn(),
        onaudioprocess: null,
      } ) ),
      createAnalyser: vi.fn(),
      sampleRate: 44100,
      state: 'running',
      audioWorklet: {
        addModule: vi.fn().mockResolvedValue( undefined ),
      },
      destination: {},
      resume: vi.fn().mockResolvedValue( undefined ),
    } ) ),
    isInitialized: ref( true ),
  } ) ),
} ) );

// Mock AudioWorkletNode globally
// Mock AudioWorkletNode globally
const AudioWorkletNodeMock = vi.fn().mockImplementation( () => {
  const port = {
    postMessage: vi.fn(),
    set onmessage ( handler: ( e: any ) => void ) {
      mockPortHandlers['message'] = handler;
    },
  };
  return {
    port,
    connect: vi.fn(),
    disconnect: vi.fn(),
  };
} );

vi.stubGlobal( 'AudioWorkletNode', AudioWorkletNodeMock );

describe( 'usePitch', () => {
  beforeEach( () => {
    mockPortHandlers = {};
    vi.clearAllMocks();
  } );

  it( 'initializes with default values', () => {
    const { pitch, clarity, volume, currentNote, cents } = usePitch();
    expect( pitch.value ).toBeNull();
    expect( clarity.value ).toBeNull();
    expect( volume.value ).toBe( 0 );
    expect( currentNote.value ).toBeNull();
    expect( cents.value ).toBe( 0 );
  } );

  it( 'updates state when worklet sends pitch data', async () => {
    // 1. Setup toggle-able initialization
    const isInitialized = ref( false );
    const { useAudioEngine } = await import( '../useAudioEngine' );
    vi.mocked( useAudioEngine ).mockReturnValue( {
      getAnalyser: vi.fn( () => ( {
        connect: vi.fn(),
        getFloatTimeDomainData: vi.fn(),
        fftSize: 2048
      } ) ) as any,
      getContext: vi.fn( () => ( {
        createScriptProcessor: vi.fn(),
        createAnalyser: vi.fn(),
        sampleRate: 44100,
        state: 'running',
        audioWorklet: { addModule: vi.fn().mockResolvedValue( undefined ) },
        destination: {},
        resume: vi.fn().mockResolvedValue( undefined ),
      } ) ) as any,
      isInitialized: isInitialized,
      init: vi.fn(),
    } as any );

    const { pitch, clarity, currentNote, cents } = usePitch();

    // 2. Trigger Initialization
    isInitialized.value = true;
    await nextTick();
    await nextTick(); // Wait for async initWorklet

    // 3. Trigger Message
    // The mock global AudioWorkletNode should have captured the handler
    expect( mockPortHandlers['message'] ).toBeDefined();

    // Simulate "Perfect A440"
    mockPortHandlers['message']!( {
      data: { pitch: 440, clarity: 0.95, volume: 0.5 }
    } );

    await nextTick();

    // 4. Assertions
    expect( pitch.value ).toBe( 440 );
    expect( clarity.value ).toBe( 0.95 );
    expect( currentNote.value ).toBe( 'A4' );
    expect( cents.value ).toBe( 0 );

    // Simulate "Slightly Sharp A440"
    mockPortHandlers['message']!( {
      data: { pitch: 445, clarity: 0.95, volume: 0.5 }
    } );
    await nextTick();

    // Check if median filter handles it (might need multiple samples if smoothing is on)
    // With default smoothing, it might lag.
    // Let's rely on the first value setting the median buffer if it was empty.
  } );
} );
