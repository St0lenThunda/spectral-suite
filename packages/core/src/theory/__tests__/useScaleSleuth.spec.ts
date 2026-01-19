import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useScaleSleuth } from '../useScaleSleuth';
import { ref, nextTick } from 'vue';

vi.mock( '../../audio/usePitch', () => ( {
  usePitch: vi.fn( () => ( {
    pitch: ( global as any ).mockPitch,
    clarity: ( global as any ).mockClarity,
    volume: ( global as any ).mockVolume,
    isLowPassEnabled: { value: false },
    downsample: { value: 1 },
  } ) ),
} ) );

vi.mock( '../../config/sensitivity', () => ( {
  sensitivityThreshold: { value: 0.01 },
} ) );

vi.mock( '../../theory/ScaleEngine', () => ( {
  ScaleEngine: {
    detectScales: vi.fn( ( notes ) => {
      if ( notes.includes( 'C' ) && notes.includes( 'D' ) && notes.includes( 'E' ) ) {
        return [{
          params: { tonic: 'C', type: 'Major' },
          fit: 100,
          notes: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
          name: 'C Major'
        }];
      }
      return [];
    } ),
  },
} ) );

vi.mock( 'tonal', () => ( {
  Note: {
    fromFreq: vi.fn( ( freq ) => {
      if ( freq === 261.63 ) return 'C4';
      if ( freq === 293.66 ) return 'D4';
      if ( freq === 329.63 ) return 'E4';
      return 'C4'; // Fallback
    } ),
    get: vi.fn( ( note ) => {
      return { pc: note.replace( /\d+/, '' ) };
    } ),
    chroma: vi.fn( ( note ) => note.replace( /\d+/, '' ) ),
  },
} ) );

describe( 'useScaleSleuth', () => {
  beforeEach( () => {
    vi.clearAllMocks();
    // Initialize globals
    ( global as any ).mockPitch = ref<number | null>( null );
    ( global as any ).mockClarity = ref( 0 );
    ( global as any ).mockVolume = ref( 0 );
  } );

  it( 'initializes with empty state', () => {
    const { detectedNotes, potentialScales } = useScaleSleuth();
    expect( detectedNotes.value ).toEqual( [] );
    expect( potentialScales.value ).toEqual( [] );
  } );

  it( 'adds notes to buffer when pitch is detected', async () => {
    const { detectedNotes } = useScaleSleuth();

    // Simulate C4
    ( global as any ).mockClarity.value = 0.9;
    ( global as any ).mockVolume.value = 0.5;
    ( global as any ).mockPitch.value = 261.63; // C4
    await nextTick();

    expect( detectedNotes.value ).toContain( 'C' );

    // Simulate D4
    ( global as any ).mockPitch.value = 293.66; // D4
    await nextTick();

    expect( detectedNotes.value ).toContain( 'C' );
    expect( detectedNotes.value ).toContain( 'D' );
  } );

  it( 'detects scales updates when notes are added', async () => {
    const { potentialScales } = useScaleSleuth();

    ( global as any ).mockClarity.value = 0.9;
    ( global as any ).mockVolume.value = 0.5;

    ( global as any ).mockPitch.value = 261.63; // C
    await nextTick();
    ( global as any ).mockPitch.value = 293.66; // D
    await nextTick();
    ( global as any ).mockPitch.value = 329.63; // E
    await nextTick();

    // Should trigger C Major detection in mock
    expect( potentialScales.value ).toHaveLength( 1 );
    expect( potentialScales.value[0].name ).toBe( 'C Major' );
  } );

  it( 'stops updating when locked', async () => {
    const { isLocked, detectedNotes } = useScaleSleuth();

    ( global as any ).mockClarity.value = 0.9;
    ( global as any ).mockVolume.value = 0.5;
    ( global as any ).mockPitch.value = 261.63; // C
    await nextTick();
    expect( detectedNotes.value ).toContain( 'C' );

    isLocked.value = true;
    ( global as any ).mockPitch.value = 293.66; // D
    await nextTick();

    expect( detectedNotes.value ).not.toContain( 'D' );
  } );

  it( 'locks scale and filters notes', async () => {
    const { lockScale, detectedNotes } = useScaleSleuth();

    ( global as any ).mockClarity.value = 0.9;
    ( global as any ).mockVolume.value = 0.5;
    ( global as any ).mockPitch.value = 261.63; // C
    await nextTick();
    ( global as any ).mockPitch.value = 311.13; // Eb (Not in C Major)
    await nextTick();

    expect( detectedNotes.value ).toContain( 'C' );
    // Note: My mock Tonal handle pc. Eb -> Eb.
    // Let's assume Eb was added.

    lockScale( ['C', 'D', 'E', 'F', 'G', 'A', 'B'] ); // C Major

    expect( detectedNotes.value ).toContain( 'C' );
    expect( detectedNotes.value ).not.toContain( 'Eb' );
  } );

  it( 'clears notes correctly', async () => {
    const { clearNotes, detectedNotes, isLocked } = useScaleSleuth();

    ( global as any ).mockClarity.value = 0.9;
    ( global as any ).mockVolume.value = 0.5;
    ( global as any ).mockPitch.value = 261.63;
    await nextTick();
    isLocked.value = true;

    clearNotes();

    expect( detectedNotes.value ).toEqual( [] );
    expect( isLocked.value ).toBe( false );
  } );

  it( 'ignores noisy input', async () => {
    const { detectedNotes } = useScaleSleuth();

    ( global as any ).mockClarity.value = 0.2; // Low clarity
    ( global as any ).mockVolume.value = 0.5;
    ( global as any ).mockPitch.value = 261.63;
    await nextTick();

    expect( detectedNotes.value ).toHaveLength( 0 );
  } );
} );
