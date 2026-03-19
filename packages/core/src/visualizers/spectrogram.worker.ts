import { MagnitudeSpectrum } from './MagnitudeSpectrum';
import { Spectrogram3D } from './Spectrogram3D';

// Offscreen implementation of MiniOsc (was local to FrequencyFlow)
class MiniOsc {
  canvas: OffscreenCanvas;
  constructor(canvas: OffscreenCanvas) {
    this.canvas = canvas;
  }
  draw(data: Float32Array) {
    const ctx = this.canvas.getContext('2d') as unknown as CanvasRenderingContext2D;
    if (!ctx) return;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.strokeStyle = '#00f3ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const sliceWidth = this.canvas.width / data.length;
    let x = 0;
    for (let i = 0; i < data.length; i++) {
        const v = data[i] ?? 0;
        const y = (v + 1) * this.canvas.height / 2;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        x += sliceWidth;
    }
    ctx.stroke();
  }
}

// Global scope logic for Offscreen Web Worker
let osc: MiniOsc | null = null;
let spec3d: Spectrogram3D | null = null;
let mag: MagnitudeSpectrum | null = null;

let freqView: Uint8Array | null = null;
let timeView: Float32Array | null = null;

let isFrozen = false;
let verticalScale = 1.5;
let perspective = 0.8;
let hueShift = 200;
let scaleMode: 'linear'|'log' = 'log';
let showInstrumentLabels = false;
let showHarmonics = false;
let fundamentalFreq = 0;
let instrumentRanges: any[] = [];
let nyquist = 22050; // Assume 44.1/2 default, updated sequentially
let frozenData: Uint8Array | null = null;

let animId: number | null = null;

// Lock-free rendering loop perfectly synchronized to the target display rate
const tick = () => {
    if (osc && timeView && !isFrozen) {
        osc.draw(timeView);
    }
    
    if (spec3d && freqView) {
        spec3d.draw(freqView, nyquist, isFrozen, verticalScale, perspective, hueShift);
    }
    
    if (mag && freqView) {
        mag.draw(
            freqView,
            nyquist,
            frozenData,
            scaleMode,
            null, // peakHoldData
            showInstrumentLabels,
            instrumentRanges,
            showHarmonics,
            fundamentalFreq
        );
    }

    // Capture frozenData if triggered
    if (isFrozen && freqView && !frozenData) {
        frozenData = new Uint8Array(freqView);
    } else if (!isFrozen) {
        frozenData = null;
    }

    animId = requestAnimationFrame(tick);
};

self.onmessage = (e) => {
    const msg = e.data;
    if (msg.type === 'INIT') {
        osc = new MiniOsc(msg.oscCanvas);
        spec3d = new Spectrogram3D(msg.specCanvas);
        mag = new MagnitudeSpectrum(msg.magCanvas);
        
        freqView = new Uint8Array(msg.sabFreq);
        timeView = new Float32Array(msg.sabTime);
        nyquist = msg.nyquist || 22050;

        if (!animId) tick();
    } else if (msg.type === 'UPDATE_CONFIG') {
        if (msg.isFrozen !== undefined) isFrozen = msg.isFrozen;
        if (msg.verticalScale !== undefined) verticalScale = msg.verticalScale;
        if (msg.perspective !== undefined) perspective = msg.perspective;
        if (msg.hueShift !== undefined) hueShift = msg.hueShift;
        if (msg.scaleMode !== undefined) scaleMode = msg.scaleMode;
        if (msg.showInstrumentLabels !== undefined) showInstrumentLabels = msg.showInstrumentLabels;
        if (msg.showHarmonics !== undefined) showHarmonics = msg.showHarmonics;
        if (msg.fundamentalFreq !== undefined) fundamentalFreq = msg.fundamentalFreq;
        if (msg.instrumentRanges !== undefined) instrumentRanges = msg.instrumentRanges;
        if (msg.nyquist !== undefined) nyquist = msg.nyquist;
    } else if (msg.type === 'RESIZE') {
        if (msg.target === 'osc' && osc) {
            osc.canvas.width = msg.width; osc.canvas.height = msg.height;
        } else if (msg.target === 'spec' && spec3d) {
            // @ts-ignore Let TS bypass readonly bounds
            spec3d.canvas.width = msg.width; spec3d.canvas.height = msg.height;
        } else if (msg.target === 'mag' && mag) {
            // @ts-ignore
            mag.canvas.width = msg.width; mag.canvas.height = msg.height;
        }
    } else if (msg.type === 'TEARDOWN') {
        if (animId) cancelAnimationFrame(animId);
        animId = null;
    }
};
