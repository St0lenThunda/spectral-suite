import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { usePlatformStore } from '../platform';

describe( 'platform store', () => {
  beforeEach( () => {
    setActivePinia( createPinia() );
  } );

  it( 'initializes with default values', () => {
    const store = usePlatformStore();
    expect( store.sensitivity ).toBe( 0.01 );
    expect( store.clarity ).toBe( 0.6 );
    expect( store.isRawAudioMode ).toBe( false );
    expect( store.isEngineModified ).toBe( false );
  } );

  it( 'correctly identifies modified engine settings', () => {
    const store = usePlatformStore();
    store.sensitivity = 0.05;
    expect( store.isEngineModified ).toBe( true );
    
    store.sensitivity = 0.01;
    expect( store.isEngineModified ).toBe( false );
    
    store.clarity = 0.5;
    expect( store.isEngineModified ).toBe( true );
  } );

  it( 'toggles pro mode', () => {
    const store = usePlatformStore();
    expect( store.isRawAudioMode ).toBe( false );
    store.toggleProMode();
    expect( store.isRawAudioMode ).toBe( true );
    store.toggleProMode();
    expect( store.isRawAudioMode ).toBe( false );
  } );

  it( 'resets audio settings', () => {
    const store = usePlatformStore();
    store.sensitivity = 0.5;
    store.clarity = 0.1;
    store.isRawAudioMode = true;
    
    store.resetAudioSettings();
    expect( store.sensitivity ).toBe( 0.01 );
    expect( store.clarity ).toBe( 0.6 );
    expect( store.isRawAudioMode ).toBe( false );
  } );

  it( 'enables/disables tools', () => {
    const store = usePlatformStore();
    store.setToolEnabled( 'tuner', true );
    expect( store.enabledTools['tuner'] ).toBe( true );
    store.setToolEnabled( 'tuner', false );
    expect( store.enabledTools['tuner'] ).toBe( false );
  } );
} );
