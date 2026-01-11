import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useChordCapture } from '../useChordCapture';
import { ref, nextTick } from 'vue';

// Mock using global state to bypass hoisting issues
vi.mock( '../../audio/usePitch', () => ( {
  usePitch: vi.fn( () => ( {
    pitch: ( global as any ).mockPitch,
    clarity: ( global as any ).mockClarity,
    volume: ( global as any ).mockVolume,
  } ) ),
} ) );

vi.mock( '../../audio/usePolyPitch', () => ( {
  usePolyPitch: vi.fn( () => ( {
    detectedNotes: ( global as any ).mockDetectedNotes,
  } ) ),
} ) );

vi.mock( '../../config/sensitivity', () => ( {
  sensitivityThreshold: { value: 0.01 },
} ) );

vi.mock( '../../theory/ChordEngine', () => ( {
  ChordEngine: {
    detectChords: vi.fn( ( notes ) => {
      if ( notes.includes( 'C' ) && notes.includes( 'E' ) && notes.includes( 'G' ) ) {
        return [{
          symbol: 'C Major',
          notes: ['C', 'E', 'G'],
          root: 'C',
          type: 'Major',
          name: 'C Major',
          tonic: 'C',
          quality: 'Major',
          intervals: ['1P', '3M', '5P'],
          aliases: ['C']
        }];
      }
      return [];
    } ),
    getRomanNumeral: vi.fn( () => 'I' ),
  },
} ) );

describe( 'useChordCapture', () => {
  beforeEach( () => {
    vi.clearAllMocks();
    // Initialize globals with REAL refs
    ( global as any ).mockPitch = ref<number | null>( null );
    ( global as any ).mockClarity = ref( 0 );
    ( global as any ).mockVolume = ref( 0 );
    ( global as any ).mockDetectedNotes = ref<string[]>( [] );

    const { clearHistory, clearNotes } = useChordCapture();
    clearHistory();
    clearNotes();
  } );

  it( 'initializes with empty state', () => {
    const { capturedNotes, detectedChords, currentNote } = useChordCapture();
    expect( capturedNotes.value ).toEqual( [] );
    expect( detectedChords.value ).toEqual( [] );
    expect( currentNote.value ).toBeNull();
  } );

  it( 'adds notes to buffer when polyphonic input is detected', async () => {
    const { capturedNotes, detectedChords } = useChordCapture();

    // Simulate 2 notes (Additive Mode)
    ( global as any ).mockDetectedNotes.value = ['C', 'E'];
    await nextTick();

    expect( capturedNotes.value ).toContain( 'C' );
    expect( capturedNotes.value ).toContain( 'E' );

    // Simulate 3 notes (Strum Mode - should clear and sync)
    ( global as any ).mockDetectedNotes.value = ['G', 'B', 'D'];
    await nextTick();

    // Should replace previous C, E with G, B, D
    expect( capturedNotes.value ).toHaveLength( 3 );
    expect( capturedNotes.value ).toContain( 'G' );
    expect( capturedNotes.value ).not.toContain( 'C' );
  } );

  it( 'captures chords and adds to history', () => {
    const { captureChord, chordHistory } = useChordCapture();
    const chord = {
      symbol: 'C Major',
      notes: ['C', 'E', 'G'],
      root: 'C',
      type: 'Major',
      name: 'C Major',
      tonic: 'C',
      quality: 'Major',
      intervals: ['1P', '3M', '5P'],
      aliases: ['C']
    };

    captureChord( chord as any );

    expect( chordHistory.value ).toHaveLength( 1 );
    expect( chordHistory.value[0].symbol ).toBe( 'C Major' );
    expect( chordHistory.value[0].roman ).toBe( 'I' );
  } );

  it( 'formats ledger correctly', () => {
    const { captureChord, getFormattedLedger } = useChordCapture();
    const chord = {
      symbol: 'C Major',
      notes: ['C', 'E', 'G'],
      root: 'C',
      type: 'Major',
      name: 'C Major',
      tonic: 'C',
      quality: 'Major',
      intervals: ['1P', '3M', '5P'],
      aliases: ['C']
    };
    captureChord( chord as any );

    const ledger = getFormattedLedger();
    expect( ledger ).toContain( '1. C Major (I) [C-E-G]' );
  } );
} );
