import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useRhythmStore } from '../rhythm';
import { ref, nextTick } from 'vue';

import { isInitialized as mockIsEngineInitialized } from '../../audio/useAudioEngine';

const mockContext = {
  currentTime: 0,
  state: 'running',
};

// Mock dependencies
vi.mock( '../../audio/useAudioEngine', async ( importOriginal ) => {
  const actual = await importOriginal<typeof import( '../../audio/useAudioEngine' )>();
  return {
    ...actual,
    useAudioEngine: vi.fn( () => ( {
      isInitialized: actual.isInitialized,
      getContext: vi.fn( () => ( {
        currentTime: 0,
        state: 'running',
      } ) ),
      activate: vi.fn(),
      deactivate: vi.fn(),
    } ) ),
  };
} );

let lastBeatCb: any = null;
vi.mock( '../../rhythm/MetronomeEngine', () => {
  return {
    MetronomeEngine: vi.fn().mockImplementation( function () {
      return {
        init: vi.fn(),
        dispose: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        setTempo: vi.fn(),
        setSubdivision: vi.fn(),
        setPolySubdivision: vi.fn(),
        setMuteProbability: vi.fn(),
        onBeat: vi.fn( ( cb ) => ( lastBeatCb = cb ) ),
        onTempoChange: vi.fn(),
        getCurrentTime: vi.fn( () => 0 ),
        isActive: vi.fn( () => true ),
        triggerBeat: ( p: number, t: number, m: boolean ) => ( lastBeatCb && lastBeatCb( p, t, m ) )
      };
    } )
  };
} );

let lastTransCb: any = null;
vi.mock( '../../rhythm/TransientDetector', () => {
  return {
    TransientDetector: vi.fn().mockImplementation( function () {
      return {
        init: vi.fn(),
        cleanup: vi.fn(),
        clearCallbacks: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        onTransient: vi.fn( ( cb ) => ( lastTransCb = cb ) ),
        triggerTransient: ( t: number, e: number ) => ( lastTransCb && lastTransCb( t, e ) )
      };
    } )
  };
} );

describe( 'rhythm store', () => {
  beforeEach( () => {
    setActivePinia( createPinia() );
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockIsEngineInitialized.value = true;
    lastBeatCb = null;
    lastTransCb = null;
  } );

  it( 'initializes with default values', () => {
    const store = useRhythmStore();
    expect( store.isInitialized ).toBe( false );
    expect( store.isPlaying ).toBe( false );
    expect( store.tempo ).toBe( 120 );
  } );

  it( 'initializes the engines', async () => {
    const store = useRhythmStore();
    await store.init();
    expect( store.isInitialized ).toBe( true );
    expect( store.metronome.init ).toHaveBeenCalled();
    expect( store.detector.init ).toHaveBeenCalled();
  } );

  it( 'starts and stops playback', async () => {
    const store = useRhythmStore();
    await store.init();
    await store.start();
    expect( store.isPlaying ).toBe( true );
    expect( store.metronome.start ).toHaveBeenCalled();
    expect( store.detector.start ).toHaveBeenCalled();

    store.stop();
    expect( store.isPlaying ).toBe( false );
    expect( store.metronome.stop ).toHaveBeenCalled();
    expect( store.detector.stop ).toHaveBeenCalled();
  } );

  it( 'toggles playback', async () => {
    const store = useRhythmStore();
    await store.init();
    await store.toggle();
    expect( store.isPlaying ).toBe( true );
    await store.toggle();
    expect( store.isPlaying ).toBe( false );
  } );

  it( 'updates metronome settings', () => {
    const store = useRhythmStore();
    store.setTempo( 140 );
    expect( store.tempo ).toBe( 140 );
    expect( store.metronome.setTempo ).toHaveBeenCalledWith( 140 );

    store.setSubdivision( 2 );
    expect( store.metronome.setSubdivision ).toHaveBeenCalledWith( 2 );

    store.setPolySubdivision( 3 );
    expect( store.metronome.setPolySubdivision ).toHaveBeenCalledWith( 3 );

    store.setMuteProbability( 0.5 );
    expect( store.metronome.setMuteProbability ).toHaveBeenCalledWith( 0.5 );
  } );

  it( 'resets stats', async () => {
    const store = useRhythmStore();
    ( store.stats as any ).perfect = 5;
    store.resetStats();
    expect( store.stats.perfect ).toBe( 0 );
    expect( store.stats.total ).toBe( 0 );
  } );

  it( 'handles beat callbacks and flashes', async () => {
    const store = useRhythmStore();
    await store.init();

    const flashCb = vi.fn();
    store.onFlash( flashCb );

    ( store.metronome as any ).triggerBeat( 1, 1.0, true );
    expect( store.currentPulse ).toBe( 1 );

    vi.advanceTimersByTime( 1000 );
    expect( flashCb ).toHaveBeenCalled();
  } );

  it( 'analyzes transient timing', async () => {
    const store = useRhythmStore();
    await store.init();
    await store.start();

    ( store.metronome as any ).triggerBeat( 0, 1.0, true );

    // User hits at 1.05s (50ms late -> Drag)
    ( store.detector as any ).triggerTransient( 1.05, 0.5 );

    expect( store.stats.total ).toBe( 1 );
    expect( store.stats.drag ).toBe( 1 );
    expect( store.timingOffset ).toBeCloseTo( 50 );

    // User hits at 1.45s (50ms before next beat at 1.5s -> Rush)
    ( store.detector as any ).triggerTransient( 1.45, 0.5 );
    expect( store.stats.total ).toBe( 2 );
    expect( store.stats.rush ).toBe( 1 );
  } );

  it( 'handles engine re-initialization', async () => {
    const store = useRhythmStore();
    await store.init();
    expect( store.isInitialized ).toBe( true );
    expect( store.isEngineInitialized ).toBe( true );

    // Simulate engine un-init
    mockIsEngineInitialized.value = false;
    await nextTick();
    expect( store.isEngineInitialized ).toBe( false );
    expect( store.isInitialized ).toBe( false );
  } );
} );
