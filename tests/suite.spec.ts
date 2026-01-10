import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';
import { createPinia } from 'pinia';

import AuraTuneApp from '../apps/01-auratune/src/App.vue';
import ChordCaptureApp from '../apps/02-chordcapture/src/App.vue';
import FrequencyFlowApp from '../apps/03-frequencyflow/src/App.vue';
import TrackTracerApp from '../apps/04-tracktracer/src/App.vue';
import PocketEngineApp from '../apps/07-pocket-engine/src/App.vue';
import ScaleSleuthApp from '../apps/09-scalesleuth/src/App.vue';
import TonicApp from '../apps/tonic/src/App.vue';

const mountApp = ( App: any ) => {
  return mount( App, {
    global: {
      plugins: [createPinia()],
      stubs: { 'transition': false, 'Transition': false }
    }
  } );
};

describe( 'Spectral Suite Smoke Tests', () => {

  it( 'mounts AuraTune', () => {
    const wrapper = mountApp( AuraTuneApp );
    expect( wrapper.exists() ).toBe( true );
  } );

  it( 'mounts ChordCapture', () => {
    const wrapper = mountApp( ChordCaptureApp );
    expect( wrapper.exists() ).toBe( true );
  } );

  it( 'mounts FrequencyFlow', () => {
    const wrapper = mountApp( FrequencyFlowApp );
    expect( wrapper.exists() ).toBe( true );
  } );

  it( 'mounts TrackTracer', () => {
    const wrapper = mountApp( TrackTracerApp );
    expect( wrapper.exists() ).toBe( true );
  } );

  it( 'mounts PocketEngine', () => {
    const wrapper = mountApp( PocketEngineApp );
    expect( wrapper.exists() ).toBe( true );
  } );

  it( 'mounts ScaleSleuth', () => {
    const wrapper = mountApp( ScaleSleuthApp );
    expect( wrapper.exists() ).toBe( true );
  } );

  it( 'mounts Tonic (Dashboard)', () => {
    const wrapper = mountApp( TonicApp );
    expect( wrapper.exists() ).toBe( true );
    // Tonic typically has a "SPECTRAL SUITE" header
    expect( wrapper.text().toUpperCase() ).toContain( 'SPECTRAL SUITE' );
  } );

} );
