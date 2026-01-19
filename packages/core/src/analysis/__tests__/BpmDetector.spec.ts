import { describe, it, expect } from 'vitest';
import { BpmDetector } from '../BpmDetector';

describe( 'BpmDetector', () => {
  it( 'detects BPM from a simple periodic signal', async () => {
    // 60 BPM = 1 beat per second = peak every 1.0s
    const sampleRate = 44100;
    const duration = 10; // 10 seconds for better resolution
    const data = new Float32Array( sampleRate * duration );

    // Simulate peaks every 1.0s (44100 samples)
    // Pulse width of 1024 samples (half a chunk) ensures 
    // at least one chunk has very high energy and neighbors are lower.
    for ( let i = 0; i < 10; i++ ) {
      const beatStart = i * 44100;
      for ( let j = 0; j < 1024; j++ ) {
        if ( beatStart + j < data.length ) {
          data[beatStart + j] = 1.0;
        }
      }
    }

    const mockBuffer = {
      sampleRate,
      length: data.length,
      duration,
      getChannelData: () => data
    } as any;

    const bpm = await BpmDetector.analyze( mockBuffer );
    // 1.0s interval => 60 BPM. Allow small variance due to sample rounding/chunking.
    expect( bpm ).toBeGreaterThanOrEqual( 55 );
    expect( bpm ).toBeLessThanOrEqual( 65 );
  } );

  it( 'returns 0 for silence', async () => {
    const mockBuffer = {
      sampleRate: 44100,
      length: 44100,
      duration: 1,
      getChannelData: () => new Float32Array( 44100 ).fill( 0 )
    } as any;

    const bpm = await BpmDetector.analyze( mockBuffer );
    expect( bpm ).toBe( 0 );
  } );

  it( 'returns 0 if not enough peaks found', async () => {
    const data = new Float32Array( 44100 );
    // Fill 1024 samples to pass threshold but only once
    for ( let i = 0; i < 1024; i++ ) data[i] = 1.0;

    const mockBuffer = {
      sampleRate: 44100,
      length: 44100,
      duration: 1,
      getChannelData: () => data
    } as any;

    const bpm = await BpmDetector.analyze( mockBuffer );
    expect( bpm ).toBe( 0 );
  } );

  it( 'returns 0 if no intervals fall in 60-180 range', async () => {
    const sampleRate = 44100;
    const data = new Float32Array( sampleRate * 10 );
    // Peaks every 2 seconds = 30 BPM (out of range)
    for ( let i = 0; i < 5; i++ ) {
      const start = i * sampleRate * 2;
      for ( let j = 0; j < 1024; j++ ) data[start + j] = 1.0;
    }

    const mockBuffer = {
      sampleRate,
      length: data.length,
      duration: 10,
      getChannelData: () => data
    } as any;

    const bpm = await BpmDetector.analyze( mockBuffer );
    expect( bpm ).toBe( 0 );
  } );
} );
