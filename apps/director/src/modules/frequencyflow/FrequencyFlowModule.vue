<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { useAudioEngine } from '@spectralsuite/core';
import { useToolInfo } from '../../composables/useToolInfo';

const { openInfo } = useToolInfo();
// We'll import the same visualizers. In a real monorepo we'd share them more cleanly, 
// but for now I'll implement a slightly more compact version here or import if possible.
// Actually, I'll just implement them here to ensure zero-dependency issues during integration.

class MiniOsc {
  canvas: HTMLCanvasElement;
  analyser: AnalyserNode;

  constructor( canvas: HTMLCanvasElement, analyser: AnalyserNode ) {
    this.canvas = canvas;
    this.analyser = analyser;
  }

  draw () {
    const ctx = this.canvas.getContext( '2d' );
    if ( !ctx ) return;
    const data = new Float32Array( this.analyser.fftSize );
    this.analyser.getFloatTimeDomainData( data );
    ctx.clearRect( 0, 0, this.canvas.width, this.canvas.height );
    ctx.strokeStyle = '#00f3ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const sliceWidth = this.canvas.width / data.length;
    let x = 0;
    for ( let i = 0; i < data.length; i++ ) {
      const v = data[i] ?? 0;
      const y = ( v + 1 ) * this.canvas.height / 2;
      if ( i === 0 ) ctx.moveTo( x, y ); else ctx.lineTo( x, y );
      x += sliceWidth;
    }
    ctx.stroke();
  }
}

class MiniSpec {
  canvas: HTMLCanvasElement;
  analyser: AnalyserNode;
  temp: HTMLCanvasElement;

  constructor( canvas: HTMLCanvasElement, analyser: AnalyserNode ) {
    this.canvas = canvas;
    this.analyser = analyser;
    this.temp = document.createElement( 'canvas' );
    this.temp.width = canvas.width;
    this.temp.height = canvas.height;
  }

  draw () {
    const ctx = this.canvas.getContext( '2d' );
    const tCtx = this.temp.getContext( '2d' );
    if ( !ctx || !tCtx ) return;
    const data = new Uint8Array( this.analyser.frequencyBinCount );
    this.analyser.getByteFrequencyData( data );
    tCtx.drawImage( this.canvas, 0, 0 );
    const imgData = ctx.createImageData( this.canvas.width, 1 );
    for ( let x = 0; x < this.canvas.width; x++ ) {
      const freqIdx = Math.floor( ( x / this.canvas.width ) * data.length * 0.5 );
      const val = data[freqIdx] || 0;
      const i = x * 4;
      imgData.data[i] = val > 128 ? 255 : val * 2;
      imgData.data[i + 1] = val > 128 ? ( val - 128 ) * 2 : 0;
      imgData.data[i + 2] = val * 0.5;
      imgData.data[i + 3] = 255;
    }
    ctx.drawImage( this.temp, 0, 1 );
    ctx.putImageData( imgData, 0, 0 );
  }
}

class MagnitudeSpectrum {
  canvas: HTMLCanvasElement;
  analyser: AnalyserNode;

  constructor( canvas: HTMLCanvasElement, analyser: AnalyserNode ) {
    this.canvas = canvas;
    this.analyser = analyser;
  }

  draw (
    frozenData: Uint8Array | null,
    scaleMode: 'linear' | 'log',
    peakHoldData: Uint8Array | null = null,
    showInstrumentLabels: boolean = false,
    instrumentRanges: Array<{ name: string, start: number, end: number, color: string }> = [],
    showHarmonics: boolean = false,
    fundamentalFreq: number = 0
  ) {
    const ctx = this.canvas.getContext( '2d' );
    if ( !ctx ) return;

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array( bufferLength );
    this.analyser.getByteFrequencyData( dataArray );
    const nyquist = this.analyser.context.sampleRate / 2;

    ctx.clearRect( 0, 0, this.canvas.width, this.canvas.height );

    // Draw Instrument Frequency Regions
    if ( showInstrumentLabels && instrumentRanges.length > 0 ) {
      for ( const range of instrumentRanges ) {
        const x1 = this.freqToX( range.start, scaleMode, nyquist );
        const x2 = this.freqToX( range.end, scaleMode, nyquist );
        ctx.fillStyle = range.color;
        ctx.fillRect( x1, 0, x2 - x1, this.canvas.height );

        // Label
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.font = '9px sans-serif';
        ctx.fillText( range.name, x1 + 4, 14 );
      }
    }

    // Draw Harmonic Series Markers
    if ( showHarmonics && fundamentalFreq > 20 ) {
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)'; // amber
      ctx.setLineDash( [2, 4] );
      for ( let h = 1; h <= 8; h++ ) {
        const harmFreq = fundamentalFreq * h;
        if ( harmFreq > nyquist ) break;
        const x = this.freqToX( harmFreq, scaleMode, nyquist );
        ctx.beginPath();
        ctx.moveTo( x, 0 );
        ctx.lineTo( x, this.canvas.height );
        ctx.stroke();
        ctx.fillStyle = 'rgba(251, 191, 36, 0.6)';
        ctx.fillText( `H${h}`, x + 2, this.canvas.height - 4 );
      }
      ctx.setLineDash( [] );
    }

    // Draw Frozen (Ghost) Curve
    if ( frozenData ) {
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.setLineDash( [5, 5] );
      this.drawPath( ctx, frozenData, scaleMode );
      ctx.stroke();
      ctx.setLineDash( [] );
    }

    // Draw Peak Hold Line
    if ( peakHoldData ) {
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(251, 113, 133, 0.5)'; // rose-400
      ctx.lineWidth = 1;
      this.drawPath( ctx, peakHoldData, scaleMode );
      ctx.stroke();
    }

    // Draw Live Curve
    ctx.beginPath();
    ctx.strokeStyle = '#38bdf8'; // sky-400
    ctx.lineWidth = 2;
    this.drawPath( ctx, dataArray, scaleMode );
    ctx.stroke();

    // Fill area
    ctx.lineTo( this.canvas.width, this.canvas.height );
    ctx.lineTo( 0, this.canvas.height );
    ctx.fillStyle = 'rgba(56, 189, 248, 0.1)';
    ctx.fill();

    // Draw dB Scale Labels
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '8px monospace';
    for ( let db = 0; db >= -60; db -= 12 ) {
      const y = this.canvas.height * ( 1 - ( db + 60 ) / 60 );
      ctx.fillText( `${db}dB`, 4, y + 3 );
    }
  }

  freqToX ( freq: number, scaleMode: 'linear' | 'log', nyquist: number ): number {
    if ( scaleMode === 'linear' ) {
      return ( freq / nyquist ) * this.canvas.width;
    } else {
      const minFreq = 10;
      const maxFreq = nyquist;
      if ( freq < minFreq ) return 0;
      return ( Math.log10( freq / minFreq ) / Math.log10( maxFreq / minFreq ) ) * this.canvas.width;
    }
  }

  drawPath ( ctx: CanvasRenderingContext2D, data: Uint8Array, scaleMode: 'linear' | 'log' ) {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const bufferLength = data.length;

    for ( let i = 0; i < bufferLength; i++ ) {
      let x: number;
      if ( scaleMode === 'linear' ) {
        x = ( i / bufferLength ) * width;
      } else {
        const minFreq = 10;
        const maxFreq = 22050;
        const freq = ( i / bufferLength ) * maxFreq;
        if ( freq < minFreq ) x = 0;
        else x = ( Math.log10( freq / minFreq ) / Math.log10( maxFreq / minFreq ) ) * width;
      }

      const v = ( data[i] ?? 0 ) / 255.0;
      const y = height - ( v * height );

      if ( i === 0 ) ctx.moveTo( x, y );
      else ctx.lineTo( x, y );
    }
  }
}

const { init, isInitialized, getAnalyser } = useAudioEngine();
const oscCanvas = ref<HTMLCanvasElement | null>( null );
const specCanvas = ref<HTMLCanvasElement | null>( null );
const magCanvas = ref<HTMLCanvasElement | null>( null );

let osc: MiniOsc | null = null;
let spec: MiniSpec | null = null;
let mag: MagnitudeSpectrum | null = null;
let animId: number | null = null;

const fftSize = ref( 2048 );
const smoothing = ref( 0.85 );
const isFrozen = ref( false );
const frozenData = ref<Uint8Array | null>( null );
const scaleMode = ref<'linear' | 'log'>( 'log' );
const dominantFreq = ref( 0 );
const dominantNote = ref( "-" );

// Pro Features
const showInstrumentLabels = ref( true );
const showHarmonics = ref( false );
const peakHoldData = ref<Uint8Array | null>( null );
const PEAK_DECAY_RATE = 0.98; // per frame

// Instrument Frequency Ranges
const instrumentRanges = [
  { name: 'Sub Bass', start: 20, end: 60, color: 'rgba(139, 92, 246, 0.3)' },
  { name: 'Bass', start: 60, end: 250, color: 'rgba(99, 102, 241, 0.2)' },
  { name: 'Low Mids', start: 250, end: 500, color: 'rgba(34, 197, 94, 0.15)' },
  { name: 'Mids', start: 500, end: 2000, color: 'rgba(234, 179, 8, 0.15)' },
  { name: 'Presence', start: 2000, end: 4000, color: 'rgba(249, 115, 22, 0.15)' },
  { name: 'Brilliance', start: 4000, end: 8000, color: 'rgba(236, 72, 153, 0.12)' },
  { name: 'Air', start: 8000, end: 20000, color: 'rgba(14, 165, 233, 0.1)' },
];

// EQ Suggestions (computed based on spectrum)
const eqSuggestions = ref<Array<{ freq: string, action: string, reason: string }>>( [] );

const updateEngine = () => {
  const analyser = getAnalyser();
  if ( analyser ) {
    analyser.fftSize = fftSize.value;
    analyser.smoothingTimeConstant = smoothing.value;
  }
};

const toggleFreeze = () => {
  if ( !isFrozen.value ) {
    const analyser = getAnalyser();
    if ( analyser ) {
      const data = new Uint8Array( analyser.frequencyBinCount );
      analyser.getByteFrequencyData( data );
      frozenData.value = data;
    }
  } else {
    frozenData.value = null;
  }
  isFrozen.value = !isFrozen.value;
};

const getNoteFromFreq = ( freq: number ) => {
  if ( freq <= 20 ) return "-";
  const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const h = Math.round( 12 * Math.log2( freq / 440 ) + 69 );
  if ( h < 0 ) return "-";
  const octave = Math.floor( h / 12 ) - 1;
  const n = ( ( h % 12 ) + 12 ) % 12;
  return ( notes[n] ?? "" ) + octave;
};

const render = () => {
  if ( osc ) osc.draw();
  if ( spec ) spec.draw();
  if ( mag ) mag.draw( frozenData.value, scaleMode.value, peakHoldData.value, showInstrumentLabels.value, instrumentRanges, showHarmonics.value, dominantFreq.value );

  // Detect dominant frequency
  const analyser = getAnalyser();
  if ( analyser ) {
    const data = new Uint8Array( analyser.frequencyBinCount );
    analyser.getByteFrequencyData( data );

    // Update Peak Hold
    if ( !peakHoldData.value ) {
      peakHoldData.value = new Uint8Array( data.length );
    }
    for ( let i = 0; i < data.length; i++ ) {
      const currentPeak = peakHoldData.value[i] ?? 0;
      if ( data[i]! > currentPeak ) {
        peakHoldData.value[i] = data[i]!;
      } else {
        peakHoldData.value[i] = Math.floor( currentPeak * PEAK_DECAY_RATE );
      }
    }

    let maxVal = 0;
    let maxIdx = 0;
    for ( let i = 0; i < data.length; i++ ) {
      const val = data[i] ?? 0;
      if ( val > maxVal ) {
        maxVal = val;
        maxIdx = i;
      }
    }
    if ( maxVal > 50 ) {
      const nyquist = analyser.context.sampleRate / 2;
      dominantFreq.value = Math.round( ( maxIdx / data.length ) * nyquist );
      dominantNote.value = getNoteFromFreq( dominantFreq.value );

      // Generate EQ Suggestions
      generateEqSuggestions( data, nyquist );
    } else {
      dominantNote.value = "-";
    }
  }

  animId = requestAnimationFrame( render );
};

const generateEqSuggestions = ( data: Uint8Array, nyquist: number ) => {
  const suggestions: Array<{ freq: string, action: string, reason: string }> = [];
  const binHz = nyquist / data.length;

  // Check for muddy low-mids (200-500Hz)
  const muddyStart = Math.floor( 200 / binHz );
  const muddyEnd = Math.floor( 500 / binHz );
  let muddyAvg = 0;
  for ( let i = muddyStart; i < muddyEnd; i++ ) muddyAvg += data[i] ?? 0;
  muddyAvg /= ( muddyEnd - muddyStart );
  if ( muddyAvg > 180 ) {
    suggestions.push( { freq: '300Hz', action: 'Cut 2-4dB', reason: 'Muddy low-mids detected' } );
  }

  // Check for harsh presence (2-4kHz)
  const harshStart = Math.floor( 2000 / binHz );
  const harshEnd = Math.floor( 4000 / binHz );
  let harshAvg = 0;
  for ( let i = harshStart; i < harshEnd; i++ ) harshAvg += data[i] ?? 0;
  harshAvg /= ( harshEnd - harshStart );
  if ( harshAvg > 200 ) {
    suggestions.push( { freq: '3kHz', action: 'Cut 1-3dB', reason: 'Harsh presence' } );
  }

  // Check for lacking air (10k+)
  const airStart = Math.floor( 10000 / binHz );
  let airAvg = 0;
  for ( let i = airStart; i < data.length; i++ ) airAvg += data[i] ?? 0;
  airAvg /= ( data.length - airStart );
  if ( airAvg < 30 ) {
    suggestions.push( { freq: '12kHz', action: 'Boost 2-3dB', reason: 'Lacking air/sparkle' } );
  }

  eqSuggestions.value = suggestions.slice( 0, 3 );
};

const exportSpectrum = ( format: 'png' | 'json' ) => {
  const analyser = getAnalyser();
  if ( !analyser ) return;

  if ( format === 'png' && magCanvas.value ) {
    const link = document.createElement( 'a' );
    link.download = `spectrum-${Date.now()}.png`;
    link.href = magCanvas.value.toDataURL( 'image/png' );
    link.click();
  } else if ( format === 'json' ) {
    const data = new Uint8Array( analyser.frequencyBinCount );
    analyser.getByteFrequencyData( data );
    const nyquist = analyser.context.sampleRate / 2;
    const json = {
      timestamp: new Date().toISOString(),
      sampleRate: analyser.context.sampleRate,
      fftSize: fftSize.value,
      frequencies: Array.from( data ).map( ( val, i ) => ( {
        hz: Math.round( ( i / data.length ) * nyquist ),
        magnitude: val
      } ) )
    };
    const blob = new Blob( [JSON.stringify( json, null, 2 )], { type: 'application/json' } );
    const link = document.createElement( 'a' );
    link.download = `spectrum-${Date.now()}.json`;
    link.href = URL.createObjectURL( blob );
    link.click();
  }
};

onMounted( async () => {
  if ( !isInitialized.value ) await init();
  const analyser = getAnalyser();
  if ( analyser ) {
    updateEngine();
    await nextTick();
    if ( oscCanvas.value ) osc = new MiniOsc( oscCanvas.value, analyser );
    if ( specCanvas.value ) spec = new MiniSpec( specCanvas.value, analyser );
    if ( magCanvas.value ) mag = new MagnitudeSpectrum( magCanvas.value, analyser );
    render();
  }
} );

onUnmounted( () => {
  if ( animId ) cancelAnimationFrame( animId );
} );
</script>

<template>
  <div class="space-y-6">
    <header class="flex justify-between items-end">
      <div>
        <h2 class="text-3xl font-bold text-white mb-2">Frequency <span class="text-sky-400">Flow</span> <span
            class="text-indigo-400 text-lg"
          >Pro</span></h2>
        <p class="text-slate-400 text-sm">Real-time spectral analysis and waveform diagnostics.</p>
      </div>
      <div class="flex items-center gap-3">
        <!-- Export Buttons -->
        <div class="flex gap-1 bg-white/5 p-1 rounded-lg border border-white/5">
          <button
            @click="exportSpectrum( 'png' )"
            class="px-3 py-1 text-[8px] font-black uppercase tracking-widest rounded-md transition-all text-emerald-400 hover:bg-emerald-500/20"
          >📷 PNG</button>
          <button
            @click="exportSpectrum( 'json' )"
            class="px-3 py-1 text-[8px] font-black uppercase tracking-widest rounded-md transition-all text-amber-400 hover:bg-amber-500/20"
          >📊 JSON</button>
        </div>
        <button
          @click="openInfo( 'frequencyflow' )"
          class="flex items-center gap-2 px-6 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500/20 transition-all active:scale-95 mb-1"
        >
          Intelligence
        </button>
      </div>
    </header>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Interactive Spectrum Analyzer (Magnitude) -->
      <div
        class="lg:col-span-2 bg-slate-800/40 rounded-[2.5rem] p-8 border border-white/5 backdrop-blur-xl relative h-[28rem]"
      >
        <div class="flex justify-between items-center mb-6">
          <div>
            <span class="text-[10px] uppercase font-bold tracking-[0.3em] text-slate-500">Spectral Magnitude</span>
            <p class="text-[8px] text-slate-600 font-mono uppercase mt-1">Magnitude vs Frequency Analysis</p>
          </div>
          <div class="flex gap-1 bg-white/5 p-1 rounded-lg border border-white/5">
            <button
              @click="scaleMode = 'log'"
              :class="scaleMode === 'log' ? 'bg-sky-500/20 text-sky-400' : 'text-slate-500 hover:text-slate-300'"
              class="px-3 py-1 text-[8px] font-black uppercase tracking-widest rounded-md transition-all"
            >Log</button>
            <button
              @click="scaleMode = 'linear'"
              :class="scaleMode === 'linear' ? 'bg-sky-500/20 text-sky-400' : 'text-slate-500 hover:text-slate-300'"
              class="px-3 py-1 text-[8px] font-black uppercase tracking-widest rounded-md transition-all"
            >Lin</button>
          </div>
          <!-- Pro Toggles -->
          <div class="flex gap-1 bg-white/5 p-1 rounded-lg border border-white/5 ml-2">
            <button
              @click="showInstrumentLabels = !showInstrumentLabels"
              :class="showInstrumentLabels ? 'bg-purple-500/20 text-purple-400' : 'text-slate-500 hover:text-slate-300'"
              class="px-3 py-1 text-[8px] font-black uppercase tracking-widest rounded-md transition-all"
              title="Show Instrument Frequency Ranges"
            >🎸 Ranges</button>
            <button
              @click="showHarmonics = !showHarmonics"
              :class="showHarmonics ? 'bg-amber-500/20 text-amber-400' : 'text-slate-500 hover:text-slate-300'"
              class="px-3 py-1 text-[8px] font-black uppercase tracking-widest rounded-md transition-all"
              title="Show Harmonic Series of Detected Note"
            >🎵 Harmonics</button>
          </div>
        </div>

        <div class="relative flex-1 h-80">
          <canvas
            ref="magCanvas"
            width="1000"
            height="320"
            class="w-full h-full"
          ></canvas>

          <!-- Frequency Labels -->
          <div
            class="absolute bottom-[-2rem] left-0 w-full flex justify-between px-2 text-[8px] font-mono text-slate-600 uppercase tracking-widest"
          >
            <span>20Hz</span>
            <span v-if=" scaleMode === 'log' ">100Hz</span>
            <span v-if=" scaleMode === 'log' ">500Hz</span>
            <span>1kHz</span>
            <span v-if=" scaleMode === 'log' ">5kHz</span>
            <span v-if=" scaleMode === 'log' ">10kHz</span>
            <span>20kHz</span>
          </div>
        </div>
      </div>

      <!-- Precision Control Panel -->
      <div
        class="bg-slate-800/40 rounded-[2.5rem] p-8 border border-white/5 backdrop-blur-xl flex flex-col gap-8 h-[28rem]"
      >
        <div>
          <h4 class="text-[11px] font-black uppercase tracking-[0.4em] text-sky-400 mb-2">Forensic Controls</h4>
          <p class="text-[8px] text-slate-500 uppercase tracking-widest">Tune the analysis hardware</p>
        </div>

        <div class="space-y-8 flex-1">
          <div class="space-y-4">
            <label class="flex justify-between text-[9px] text-slate-400 uppercase tracking-[0.2em] font-bold">
              Buffer Resolution
              <span class="text-sky-400 font-mono">{{ fftSize }} pts</span>
            </label>
            <select
              v-model="fftSize"
              @change="updateEngine"
              class="w-full bg-slate-900 border border-white/10 rounded-2xl px-5 py-3 text-[11px] text-white outline-none hover:border-sky-500/30 transition-colors cursor-pointer"
            >
              <option
                :value="256"
                class="bg-slate-900 text-white"
              >256 - Transient Speed</option>
              <option
                :value="1024"
                class="bg-slate-900 text-white"
              >1024 - Standard</option>
              <option
                :value="2048"
                class="bg-slate-900 text-white"
              >2048 - Balanced</option>
              <option
                :value="4096"
                class="bg-slate-900 text-white"
              >4096 - High Detail</option>
              <option
                :value="8192"
                class="bg-slate-900 text-white"
              >8192 - Surgical</option>
            </select>
          </div>

          <div class="space-y-4">
            <label class="flex justify-between text-[9px] text-slate-400 uppercase tracking-[0.2em] font-bold">
              Signal Smoothing
              <span class="text-sky-400 font-mono">{{ Math.round( smoothing * 100 ) }}%</span>
            </label>
            <input
              type="range"
              v-model.number="smoothing"
              min="0"
              max="0.99"
              step="0.01"
              @input="updateEngine"
              class="w-full h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-sky-400"
            >
          </div>

          <div class="pt-4">
            <button
              @click="toggleFreeze"
              :class="isFrozen ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-white/5 text-slate-400 hover:text-white border-white/5 hover:border-white/10'"
              class="w-full py-5 rounded-2.5xl border font-black uppercase tracking-[0.3em] text-[10px] transition-all flex items-center justify-center gap-3 active:scale-95"
            >
              <span class="text-lg">{{ isFrozen ? '❄️' : '📸' }}</span>
              {{ isFrozen ? 'Unfreeze Signal' : 'Freeze Spectrum (Ghost)' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Waveform (Time Domain) -->
      <div class="bg-slate-800/40 rounded-[2rem] p-8 border border-white/5 backdrop-blur-xl h-72">
        <span class="text-[10px] uppercase font-bold tracking-[0.3em] text-slate-500 block mb-6">Time Domain
          (Waveform)</span>
        <canvas
          ref="oscCanvas"
          width="400"
          height="160"
          class="w-full h-40"
        ></canvas>
      </div>

      <!-- Waterfall (Visualizing History) -->
      <div
        class="bg-slate-800/40 rounded-[2rem] p-8 border border-white/5 backdrop-blur-xl h-72 relative overflow-hidden"
      >
        <span class="text-[10px] uppercase font-bold tracking-[0.3em] text-slate-500 block mb-6">Spectral History
          (Waterfall)</span>
        <canvas
          ref="specCanvas"
          width="400"
          height="160"
          class="w-full h-40 opacity-80"
        ></canvas>
      </div>

      <!-- Peak Note Detector HUD -->
      <div
        class="bg-slate-800/40 rounded-[2rem] p-8 border border-white/5 backdrop-blur-xl h-72 flex flex-col items-center justify-center relative group"
      >
        <div class="absolute inset-0 bg-sky-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-[2rem]">
        </div>
        <span class="text-[10px] uppercase font-bold tracking-[0.3em] text-slate-500 block mb-8 z-10">Peak Note
          Detector</span>
        <div class="text-center z-10">
          <div
            class="text-6xl font-black italic text-transparent bg-clip-text bg-gradient-to-br from-white to-sky-400 mb-3 tracking-tighter"
          >{{ dominantNote }}</div>
          <p class="text-[11px] font-mono text-sky-500/80 uppercase tracking-[0.5em] font-black">{{ dominantFreq }} HZ
          </p>
        </div>
      </div>

      <!-- EQ Suggestions (Pro Feature) -->
      <div class="bg-slate-800/40 rounded-[2rem] p-8 border border-white/5 backdrop-blur-xl h-72">
        <span class="text-[10px] uppercase font-bold tracking-[0.3em] text-amber-400 block mb-6">EQ Suggestions</span>
        <div
          v-if=" eqSuggestions.length === 0 "
          class="text-center text-slate-500 text-xs py-8"
        >
          <p class="text-3xl mb-4">✅</p>
          <p>No issues detected. Spectrum looks balanced!</p>
        </div>
        <div
          v-else
          class="space-y-4"
        >
          <div
            v-for=" ( suggestion, i ) in eqSuggestions "
            :key="i"
            class="p-4 rounded-2xl border border-white/5 bg-white/[0.02]"
          >
            <div class="flex justify-between items-center mb-2">
              <span class="text-amber-400 font-black text-sm">{{ suggestion.freq }}</span>
              <span
                :class="suggestion.action.startsWith( 'Cut' ) ? 'text-rose-400' : 'text-emerald-400'"
                class="text-xs font-black uppercase"
              >{{ suggestion.action }}</span>
            </div>
            <p class="text-slate-400 text-[10px]">{{ suggestion.reason }}</p>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>
