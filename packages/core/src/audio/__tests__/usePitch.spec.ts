import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usePitch } from '../usePitch';
import { poolPitch, poolClarity, poolVolume } from '../PitchNodePool';
import { ref, nextTick, defineComponent } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';

// 1. Mock Dependencies
// -------------------------------------------------------------------------

// Mock Tonal
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

// Mock Sensitivity Config
vi.mock( '../../config/sensitivity', () => ( {
  clarityThreshold: { value: 0.8 }
} ) );

// Mock Platform Store
vi.mock( '../../stores/platform', () => ( {
  usePlatformStore: vi.fn( () => ( {
    isLowPassEnabled: { value: false },
    downsample: { value: 1 }
  } ) )
} ) );

// Mock PitchNodePool
vi.mock( '../PitchNodePool', async () => {
  const { ref } = await import( 'vue' );
  return {
    PitchNodePool: {
      acquire: vi.fn().mockResolvedValue( undefined ),
      release: vi.fn(),
      configure: vi.fn(),
    },
    poolPitch: ref( null ),
    poolClarity: ref( null ),
    poolVolume: ref( 0 ),
  };
} );

// Mock AudioEngine
vi.mock( '../useAudioEngine', () => ( {
  useAudioEngine: vi.fn( () => ( {
    getAnalyser: vi.fn().mockReturnValue( {} ),
    getContext: vi.fn().mockReturnValue( {
      state: 'running', 
      resume: vi.fn().mockResolvedValue( undefined )
    } ),
    isInitialized: ref( true ), // Start initialized so usePitch calls initFromPool
    init: vi.fn(),
  } ) ),
} ) );

// Mock AudioWorkletNode
vi.stubGlobal( 'AudioWorkletNode', vi.fn() );

// -------------------------------------------------------------------------

describe( 'usePitch', () => {
  beforeEach( () => {
    vi.clearAllMocks();
    poolPitch.value = null;
    poolClarity.value = null;
    poolVolume.value = 0;
  } );

  // Helper to mount composable within a component context
  function mountUsePitch ( config?: any ) {
    let result: any;
    const Comp = defineComponent( {
      setup () {
        result = usePitch( config );
        return () => null;
      }
    } );
    const wrapper = mount( Comp );
    return { wrapper, result };
  }

  it( 'initializes with default values', () => {
    const { result } = mountUsePitch();
    expect( result.pitch.value ).toBeNull();
    expect( result.clarity.value ).toBeNull();
    expect( result.volume.value ).toBe( 0 );
    expect( result.currentNote.value ).toBeNull();
    expect( result.cents.value ).toBe( 0 );
  } );

  it( 'updates state when pool data changes', async () => {
    // Initialize
    const { result } = mountUsePitch();
    await flushPromises(); // Allow async acquire/onMounted

    // Update Pool Data
    poolPitch.value = 440;
    poolClarity.value = 0.95;
    poolVolume.value = 0.5;
    await nextTick(); // reactive update

    // Assertions
    expect( result.pitch.value ).toBe( 440 );
    expect( result.clarity.value ).toBe( 0.95 );
    expect( result.currentNote.value ).toBe( 'A4' );
    expect( result.cents.value ).toBe( 0 );
  } );

  it( 'averages pitch when configured', async () => {
    // 1. Initialize with Averaging Window
    const { result } = mountUsePitch( { averagingWindowMs: 1000, dynamicsResetThreshold: 0.1, smoothing: 1 } );
    await flushPromises(); // init

    // 2. Send Initial Pitch (440Hz, Vol 0.5)
    vi.spyOn( performance, 'now' ).mockReturnValue( 1000 );
    poolPitch.value = 440;
    poolClarity.value = 1.0;
    poolVolume.value = 0.5;
    await nextTick();

    expect( result.pitch.value ).toBe( 440 ); // Initial value

    // 3. Send Second Pitch (450Hz, Vol 0.5) - constant volume
    vi.spyOn( performance, 'now' ).mockReturnValue( 1100 ); // 100ms later
    poolPitch.value = 450;
    poolClarity.value = 1.0;
    poolVolume.value = 0.5; // No volume spike
    await nextTick();

    // Average of 440 and 450 = 445
    expect( result.pitch.value ).toBe( 445 );

    // 4. Send Third Pitch (460Hz, Vol 0.5)
    vi.spyOn( performance, 'now' ).mockReturnValue( 1200 ); // 200ms later
    poolPitch.value = 460;
    await nextTick();

    // (440 + 450 + 460) / 3 = 450
    expect( result.pitch.value ).toBe( 450 );

    // 5. Test Dynamics Reset (Volume Jump)
    // New Note Attack: 440Hz, Vol 0.8 (Jump > 0.1)
    vi.spyOn( performance, 'now' ).mockReturnValue( 1300 );
    poolVolume.value = 0.8;
    poolPitch.value = 440;
    await nextTick();

    // Should have reset the buffer, so pitch is just 440
    expect( result.pitch.value ).toBe( 440 );
  } );
} );
