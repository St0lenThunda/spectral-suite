import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useBendTrainer } from '../useBendTrainer';
import { ref, nextTick } from 'vue';

// ============================================================================
// MOCKS
// ============================================================================

// Mock usePitch to control the input signal
vi.mock( '../../audio/usePitch', () => ( {
  usePitch: vi.fn( () => ( {
    pitch: ( global as any ).mockPitch,
    clarity: ( global as any ).mockClarity,
    volume: ( global as any ).mockVolume,
    currentNote: ( global as any ).mockCurrentNote,
    cents: ( global as any ).mockCents,
  } ) ),
} ) );

// Mock Tonal to avoid heavy dependency in unit tests
vi.mock( 'tonal', () => ( {
  Note: {
    freq: vi.fn( ( note ) => {
      if ( note === 'E4' ) return 329.63;
      if ( note === 'F4' ) return 349.23;
      if ( note === 'F#4' ) return 369.99;
      if ( note === 'G4' ) return 392.00;
      return null;
    } ),
    transpose: vi.fn( ( note, interval ) => {
      // Very simple mock transposition for E4
      if ( note === 'E4' ) {
        if ( interval === '1P' ) return 'E4';
        if ( interval === '2m' ) return 'F4';
        if ( interval === '2M' ) return 'F#4';
        if ( interval === '3m' ) return 'G4';
      }
      return note;
    } ),
    pitchClass: vi.fn( ( note ) => note.replace( /\d+/, '' ) ),
  },
  Interval: {
    fromSemitones: vi.fn( ( s ) => {
      if ( s === 0 ) return '1P';
      if ( s === 1 ) return '2m';
      if ( s === 2 ) return '2M';
      if ( s === 3 ) return '3m';
      return `${s}semitones`;
    } ),
  }
} ) );

describe( 'useBendTrainer', () => {
  beforeEach( () => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Initialize globals for usePitch mock
    ( global as any ).mockPitch = ref<number | null>( null );
    ( global as any ).mockClarity = ref( 0 );
    ( global as any ).mockVolume = ref( 0 );
    ( global as any ).mockCurrentNote = ref<string | null>( null );
    ( global as any ).mockCents = ref( 0 );
  } );

  afterEach( () => {
    vi.useRealTimers();
  } );

  it( 'initializes with default state', () => {
    const { startingNote, bendCents, isOnTarget, stairSteps } = useBendTrainer();
    
    expect( startingNote.value ).toBeNull();
    expect( bendCents.value ).toBe( 0 );
    expect( isOnTarget.value ).toBe( false );
    expect( stairSteps.value ).toEqual( [] );
  } );

  it( 'sets starting note and frequency', async () => {
    const { setStartingNote, startingNote, startingFreq } = useBendTrainer();
    
    setStartingNote( 'E4' );
    await nextTick();
    
    expect( startingNote.value ).toBe( 'E4' );
    expect( startingFreq.value ).toBe( 329.63 );
  } );

  it( 'calculates bendCents correctly', async () => {
    const { setStartingNote, bendCents } = useBendTrainer();
    
    setStartingNote( 'E4' );
    ( global as any ).mockClarity.value = 0.9;
    
    // Exactly E4 (0 cents)
    ( global as any ).mockPitch.value = 329.63;
    await nextTick();
    expect( bendCents.value ).toBe( 0 );

    // Exactly F4 (100 cents up)
    // Formula check: 1200 * log2(349.23 / 329.63) approx 100
    ( global as any ).mockPitch.value = 349.23;
    await nextTick();
    expect( bendCents.value ).toBeCloseTo( 100, 0 );

    // Exactly F#4 (200 cents up)
    ( global as any ).mockPitch.value = 369.99;
    await nextTick();
    expect( bendCents.value ).toBeCloseTo( 200, 0 );
  } );

  it( 'detects isOnTarget within tolerance', async () => {
    const { setStartingNote, targetSemitones, tolerance, isOnTarget } = useBendTrainer();
    
    setStartingNote( 'E4' );
    targetSemitones.value = 1; // 100 cents
    tolerance.value = 10;
    ( global as any ).mockClarity.value = 0.9;

    // 95 cents (Within 100 +/- 10) -> True
    ( global as any ).mockPitch.value = 329.63 * Math.pow( 2, 95 / 1200 );
    await nextTick();
    expect( isOnTarget.value ).toBe( true );

    // 110 cents (Exactly at boundary) -> True
    ( global as any ).mockPitch.value = 329.63 * Math.pow( 2, 110 / 1200 );
    await nextTick();
    expect( isOnTarget.value ).toBe( true );

    // 115 cents (Outside) -> False
    ( global as any ).mockPitch.value = 329.63 * Math.pow( 2, 115 / 1200 );
    await nextTick();
    expect( isOnTarget.value ).toBe( false );
  } );

  it( 'identifies blues zones correctly', async () => {
    const { setStartingNote, isInBluesZone } = useBendTrainer();
    
    setStartingNote( 'E4' );
    ( global as any ).mockClarity.value = 0.9;

    // 50 cents (Classic blues 1/4 bend) -> True
    ( global as any ).mockPitch.value = 329.63 * Math.pow( 2, 50 / 1200 );
    await nextTick();
    expect( isInBluesZone.value ).toBe( true );

    // 60 cents (Still in zone, width is +/- 15) -> True
    ( global as any ).mockPitch.value = 329.63 * Math.pow( 2, 60 / 1200 );
    await nextTick();
    expect( isInBluesZone.value ).toBe( true );

    // 80 cents (Outside zone) -> False
    ( global as any ).mockPitch.value = 329.63 * Math.pow( 2, 80 / 1200 );
    await nextTick();
    expect( isInBluesZone.value ).toBe( false );

    // 150 cents (Blues 1/4 bend in next semitone) -> True
    ( global as any ).mockPitch.value = 329.63 * Math.pow( 2, 150 / 1200 );
    await nextTick();
    expect( isInBluesZone.value ).toBe( true );
  } );

  it( 'tracks hold timer and records attempts', async () => {
    const { setStartingNote, targetSemitones, isOnTarget, holdSeconds, attemptHistory } = useBendTrainer();
    
    setStartingNote( 'E4' );
    targetSemitones.value = 1; // 100 cents
    ( global as any ).mockClarity.value = 0.9;

    // Hit target
    ( global as any ).mockPitch.value = 349.23; // F4 (100c)
    await nextTick();
    expect( isOnTarget.value ).toBe( true );

    // Advance time by 1.5 seconds
    vi.advanceTimersByTime( 1500 );
    expect( holdSeconds.value ).toBeGreaterThanOrEqual( 1.5 );

    // Drop bend (miss target)
    ( global as any ).mockPitch.value = 329.63; // E4 (0c)
    await nextTick();
    expect( isOnTarget.value ).toBe( false );
    expect( holdSeconds.value ).toBe( 0 );

    // History should have recorded a "held" attempt
    expect( attemptHistory.value ).toHaveLength( 1 );
    expect( attemptHistory.value[0].held ).toBe( true );
  } );

  it( 'generates stair steps with correct labels', async () => {
    const { setStartingNote, stairSteps } = useBendTrainer();
    
    setStartingNote( 'E4' );
    await nextTick();

    // 50c step -> F (+1/2) because it transposes up to F (ceil of 0.5 semitones)
    expect( stairSteps.value[0].cents ).toBe( 50 );
    expect( stairSteps.value[0].label ).toBe( 'F (+½)' );
    expect( stairSteps.value[0].isBluesZone ).toBe( true );

    // 100c step -> F (+1)
    expect( stairSteps.value[1].cents ).toBe( 100 );
    expect( stairSteps.value[1].label ).toBe( 'F (+1)' );
    expect( stairSteps.value[1].isBluesZone ).toBe( false );

    // 200c step -> F# (+2.0)
    expect( stairSteps.value[3].cents ).toBe( 200 );
    expect( stairSteps.value[3].label ).toBe( 'F# (+2)' );
  } );
} );
