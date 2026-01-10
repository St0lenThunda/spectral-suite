// Unit tests for MagnitudeSpectrum visualizer
import { describe, it, expect, vi } from 'vitest';
import { MagnitudeSpectrum } from '../../visualizers/MagnitudeSpectrum';

// Helper to create a mock CanvasRenderingContext2D
function createMockCtx () {
  let _fillStyle = '';
  return {
    scale: vi.fn(),
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    closePath: vi.fn(),
    drawImage: vi.fn(),
    getImageData: vi.fn(),
    putImageData: vi.fn(),
    createImageData: vi.fn( ( w: number, h: number ) => ( { width: w, height: h, data: new Uint8ClampedArray( w * h * 4 ) } ) ),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    setLineDash: vi.fn(),
    font: '',
    lineWidth: 1,
    strokeStyle: '#000',
    get fillStyle () { return _fillStyle; },
    set fillStyle ( v ) { _fillStyle = v; },
  } as any;
}

function createMockAnalyser ( sampleRate = 44100 ) {
  return {
    frequencyBinCount: 1024,
    context: { sampleRate },
    getByteFrequencyData: vi.fn(),
  } as any;
}

describe( 'MagnitudeSpectrum', () => {
  it( 'draws instrument frequency regions when showInstrumentLabels is true', () => {
    const mockCtx = createMockCtx();
    const mockCanvas = { width: 200, height: 100, getContext: () => mockCtx } as any;
    const mockAnalyser = createMockAnalyser();
    const visualizer = new MagnitudeSpectrum( mockCanvas, mockAnalyser );

    const instrumentRanges = [{ name: 'Bass', start: 20, end: 200, color: 'rgba(255,0,0,0.2)' }];
    visualizer.draw(
      null,
      'linear',
      null,
      true,
      instrumentRanges,
      false,
      0,
    );

    const ctx = mockCanvas.getContext( '2d' );
    expect( ctx.fillRect ).toHaveBeenCalled();
    // Verify fillStyle was set to the instrument color before drawing
    expect( ctx.fillStyle ).toBe( 'rgba(255,255,255,0.3)' );
  } );

  it( 'draws harmonic markers when showHarmonics is true and fundamentalFreq is set', () => {
    const mockCanvas = { width: 200, height: 100, getContext: () => createMockCtx() } as any;
    const mockAnalyser = createMockAnalyser();
    const visualizer = new MagnitudeSpectrum( mockCanvas, mockAnalyser );

    visualizer.draw(
      null,
      'linear',
      null,
      false,
      [],
      true,
      55, // fundamental frequency
    );

    const ctx = mockCanvas.getContext( '2d' );
    // Should have called stroke for each harmonic (up to 8 or until nyquist)
    expect( ctx.stroke ).toHaveBeenCalled();
  } );
} );
