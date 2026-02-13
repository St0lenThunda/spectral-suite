import { describe, it, expect, beforeEach } from 'vitest';
import { HarmonicPathRecorder } from '../HarmonicPathRecorder';

describe( 'HarmonicPathRecorder', () => {
  let recorder: HarmonicPathRecorder;

  beforeEach( () => {
    recorder = new HarmonicPathRecorder();
  } );

  it( 'starts empty', () => {
    expect( recorder.getPath() ).toEqual( [] );
  } );

  it( 'records chords and converts to path', () => {
    recorder.recordChord( 'C' );
    recorder.recordChord( 'G' );

    const path = recorder.getPath();
    expect( path ).toHaveLength( 2 );
    expect( path[0] ).toEqual( { x: 0, y: 0 } );
    expect( path[1] ).toEqual( { x: 1, y: 0 } );
  } );

  it( 'limits history to 32 items', () => {
    for ( let i = 0; i < 40; i++ ) {
      recorder.recordChord( 'C' );
    }
    expect( recorder.getPath() ).toHaveLength( 32 );
  } );

  it( 'clears history', () => {
    recorder.recordChord( 'C' );
    recorder.clear();
    expect( recorder.getPath() ).toEqual( [] );
  } );
} );
