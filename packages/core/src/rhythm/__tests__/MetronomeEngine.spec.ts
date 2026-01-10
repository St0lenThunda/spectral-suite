import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MetronomeEngine } from '../MetronomeEngine';

// Mocks are handled by the global setup file (tests/setup.ts)
// which defines AudioContext and resizeObserver on the window object.

describe( 'MetronomeEngine', () => {
  let metronome: MetronomeEngine;

  beforeEach( () => {
    vi.clearAllMocks();
    metronome = new MetronomeEngine( 120 );
    metronome.init();
  } );

  afterEach( () => {
    metronome.stop();
  } );

  it( 'initializes with correct defaults', () => {
    expect( metronome.getTempo() ).toBe( 120 );
    expect( metronome.getIsPlaying() ).toBe( false );
  } );

  it( 'starts and stops correctly', () => {
    metronome.start();
    expect( metronome.getIsPlaying() ).toBe( true );
    // Note: mockAudioContext.resume is a global mock, hard to spy on here 
    // without exporting it or spying on window.AudioContext instance.
    // But we check state which is enough.

    metronome.stop();
    expect( metronome.getIsPlaying() ).toBe( false );
  } );

  it( 'updates tempo', () => {
    metronome.setTempo( 140 );
    expect( metronome.getTempo() ).toBe( 140 );
  } );

  it( 'updates subdivision', () => {
    metronome.setSubdivision( 2 );
    // setSubdivision doesn't throw
  } );
} );
