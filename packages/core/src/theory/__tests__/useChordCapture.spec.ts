import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useChordCapture } from '../useChordCapture';
import { ref, nextTick } from 'vue';
import { ChordEngine } from '../../theory/ChordEngine';

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
  clarityThreshold: { value: 0.5 },
} ) );

vi.mock( '../../theory/ChordEngine', () => ( {
  ChordEngine: {
    detectChords: vi.fn( ( notes ) => {
      if ( notes && notes.length > 0 ) {
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
    vi.useFakeTimers();
    // Initialize globals with REAL refs
    ( global as any ).mockPitch = ref<number | null>( null );
    ( global as any ).mockClarity = ref( 0 );
    ( global as any ).mockVolume = ref( 0 );
    ( global as any ).mockDetectedNotes = ref<string[]>( [] );

    const { clearHistory, clearNotes, keyCenter } = useChordCapture();
    clearHistory();
    clearNotes();
    keyCenter.value = 'C';

    // Global Storage Mock
    const mockStorage: Record<string, string> = {};
    vi.stubGlobal( 'localStorage', {
      setItem: vi.fn( ( key, val ) => { mockStorage[key] = val; } ),
      getItem: vi.fn( ( key ) => mockStorage[key] || null ),
    } );
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
    await nextTick(); // Allow watcher to trigger
    // Fast-forward time to bypass debounce
    vi.advanceTimersByTime( 100 );
    await nextTick(); // Allow timeout callback to update state

    expect( capturedNotes.value ).toContain( 'C' );
    expect( capturedNotes.value ).toContain( 'E' );

    // Simulate 3 notes (Strum Mode - should clear and sync)
    ( global as any ).mockDetectedNotes.value = ['G', 'B', 'D'];
    await nextTick();
    vi.advanceTimersByTime( 100 );
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

  it( 'removes chords from history', () => {
    const { captureChord, chordHistory, removeChord } = useChordCapture();
    captureChord( { symbol: 'C' } as any );
    expect( chordHistory.value ).toHaveLength( 1 );
    removeChord( 0 );
    expect( chordHistory.value ).toHaveLength( 0 );
  } );

  it( 'clears history', () => {
    const { captureChord, chordHistory, clearHistory } = useChordCapture();
    captureChord( { symbol: 'C' } as any );
    clearHistory();
    expect( chordHistory.value ).toHaveLength( 0 );
  } );

  it( 'refreshes chords when key center changes', async () => {
    const { keyCenter, capturedNotes, detectedChords } = useChordCapture();
    capturedNotes.value = ['C', 'E', 'G'];
    keyCenter.value = 'G';
    await nextTick();
    expect( detectedChords.value ).toBeDefined();
  } );

  it( 'clears tray after idle time', async () => {
    const { capturedNotes } = useChordCapture();

    // Detect something
    ( global as any ).mockClarity.value = 0.9;
    ( global as any ).mockVolume.value = 0.5;
    ( global as any ).mockPitch.value = 261.63;
    await nextTick();
    expect( capturedNotes.value ).toContain( 'C4' );

    // Become silent
    ( global as any ).mockPitch.value = null;
    await nextTick();

    // Fast-forward 3.1 seconds
    vi.advanceTimersByTime( 3100 );
    await nextTick();

    expect( capturedNotes.value ).toHaveLength( 0 );
  } );

  it( 'refreshes detected chords when key center changes and tray is empty', async () => {
    const { keyCenter, detectedChords, capturedNotes } = useChordCapture();

    // 1. Simulate detected notes via polyPitch
    ( global as any ).mockDetectedNotes.value = ['C', 'E', 'G'];
    await nextTick();
    vi.advanceTimersByTime( 100 );
    await nextTick();

    // Verify chord detected
    expect( detectedChords.value.length ).toBeGreaterThan( 0 );

    // 2. Clear tray
    capturedNotes.value = [];
    await nextTick();

    // 3. Change key
    keyCenter.value = 'D';
    await nextTick();

    // Verify ChordEngine.detectChords was called with new key
    expect( ChordEngine.detectChords ).toHaveBeenCalledWith( expect.anything(), 'D' );
  } );

  it( 'persists state to localStorage', async () => {
    const { keyCenter, captureChord } = useChordCapture();

    keyCenter.value = 'F#';
    await nextTick();
    expect( localStorage.setItem ).toHaveBeenCalledWith( 'spectral-suite-chord-key', 'F#' );

    captureChord( { symbol: 'C' } as any );
    await nextTick();
    expect( localStorage.setItem ).toHaveBeenCalledWith( 'spectral-suite-chord-ledger', expect.any( String ) );
  } );
} );
