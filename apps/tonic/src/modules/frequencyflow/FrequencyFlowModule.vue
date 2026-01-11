<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { useAudioEngine, MagnitudeSpectrum, INSTRUMENT_RANGES, generateEqSuggestions, getNoteFromFreq, type EQSuggestion } from '@spectralsuite/core';
import { useToolInfo } from '../../composables/useToolInfo';
import LocalSettingsDrawer from '../../components/settings/LocalSettingsDrawer.vue';
import SettingsToggle from '../../components/settings/SettingsToggle.vue';
import EngineSettings from '../../components/settings/EngineSettings.vue';

const { openInfo } = useToolInfo();
const isSettingsOpen = ref( false );

const drawerCategories = [
  { id: 'Engine', label: 'Engine', description: 'Global Audio Settings', showIndicator: false },
  { id: 'Exports', label: 'Exports', description: 'Save Analysis Data', showIndicator: false }
];
// We'll import the same visualizers. In a real monorepo we'd share them more cleanly, 
// but for now I'll implement a slightly more compact version here or import if possible.
// Actually, I'll just implement them here to ensure zero-dependency issues during integration.

/**
 * Simple Waveform Visualizer (Mini Oscilloscope).
 * Renders the time-domain audio data as a line graph.
 * Kept local to avoid dependency overhead for this specific diagnostic view.
 */
class MiniOsc {
  canvas: HTMLCanvasElement;
  analyser: AnalyserNode;

  constructor( canvas: HTMLCanvasElement, analyser: AnalyserNode ) {
    this.canvas = canvas;
    this.analyser = analyser;
  }

  /**
   * Renders a single frame of the waveform.
   * We use `getFloatTimeDomainData` because it gives us the raw audio signal
   * oscillating between -1.0 and 1.0, which maps directly to speaker cone movement.
   */
  draw () {
    const ctx = this.canvas.getContext( '2d' );
    if ( !ctx ) return;

    // Fix for Netlify/TS: Explicitly use ArrayBuffer and cast to any
    // We multiply FFT size by 4 bytes (Float32 is 4 bytes per sample)
    const data = new Float32Array( new ArrayBuffer( this.analyser.fftSize * 4 ) );
    this.analyser.getFloatTimeDomainData( data as any );

    ctx.clearRect( 0, 0, this.canvas.width, this.canvas.height );
    ctx.strokeStyle = '#00f3ff';
    ctx.lineWidth = 2;
    ctx.beginPath();

    const sliceWidth = this.canvas.width / data.length;
    let x = 0;

    for ( let i = 0; i < data.length; i++ ) {
      const v = data[i] ?? 0;
      // Map [-1, 1] audio data to [0, canvasHeight] pixel coordinates
      // (v + 1) shifts range to [0, 2], then we scale to height/2
      const y = ( v + 1 ) * this.canvas.height / 2;

      if ( i === 0 ) ctx.moveTo( x, y ); else ctx.lineTo( x, y );
      x += sliceWidth;
    }
    ctx.stroke();
  }
}

/**
 * Scrolling Spectrogram (Waterfall) Visualizer.
 * Displays frequency intensity over time (History).
 * Uses a "sliding texture" technique where we draw the previous frame offset by 1 pixel.
 */
class MiniSpec {
  canvas: HTMLCanvasElement;
  analyser: AnalyserNode;
  temp: HTMLCanvasElement;

  constructor( canvas: HTMLCanvasElement, analyser: AnalyserNode ) {
    this.canvas = canvas;
    this.analyser = analyser;
    this.temp = document.createElement( 'canvas' );
    // Temp canvas matches dimensions to act as a buffer
    this.temp.width = canvas.width;
    this.temp.height = canvas.height;
  }

  draw () {
    const ctx = this.canvas.getContext( '2d' );
    const tCtx = this.temp.getContext( '2d' );
    if ( !ctx || !tCtx ) return;

    // ByteFrequencyData gives us values 0-255 (Decibels mapped to integers)
    // 0 = Silence (-Infinity dB), 255 = Max Volume (0 dB)
    const data = new Uint8Array( this.analyser.frequencyBinCount );
    this.analyser.getByteFrequencyData( data );

    // 1. Copy current canvas to temp buffer
    tCtx.drawImage( this.canvas, 0, 0 );

    // 2. Generate a new vertical slice (1px wide) for the current moment
    const imgData = ctx.createImageData( this.canvas.width, 1 );
    for ( let x = 0; x < this.canvas.width; x++ ) {
      // Map x-coordinate (linear) to frequency bin index
      // We only use the lower half of data usually, but here we span the full width
      const freqIdx = Math.floor( ( x / this.canvas.width ) * data.length * 0.5 );
      const val = data[freqIdx] || 0;

      // Calculate pixel index (Red, Green, Blue, Alpha)
      const i = x * 4;

      // Heatmap Color Logic:
      // Low volume = Dark Purple/Blue
      // Med volume = Green/Cyan
      // High volume = Red/White (clipping)
      imgData.data[i] = val > 128 ? 255 : val * 2;     // Red channel boost properties
      imgData.data[i + 1] = val > 128 ? ( val - 128 ) * 2 : 0; // Green kicks in late
      imgData.data[i + 2] = val * 0.5;                 // Always some Blue for "cool" background
      imgData.data[i + 3] = 255;                       // Alpha (Opaque)
    }

    // 3. Draw the OLD history shifted down by 1 pixel
    ctx.drawImage( this.temp, 0, 1 );

    // 4. Draw the NEW slice at the top (y=0)
    ctx.putImageData( imgData, 0, 0 );
  }
}

// MiniOsc and MiniSpec classes kept for now as they are simple and specific to this module's legacy view (if used)
// or just as placeholders.
// ... (MiniOsc and MiniSpec code remains) ...

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
const PEAK_DECAY_RATE = 0.98; // Multiplier to fade peaks (98% retention per frame)

// Instrument Frequency Ranges
// instrumentRanges imported from core

// EQ Suggestions (computed based on spectrum)
const eqSuggestions = ref<EQSuggestion[]>( [] );

/**
 * Updates the AudioAnalyzer node properties.
 * Called when the user adjusts sliders in the UI.
 */
const updateEngine = () => {
  const analyser = getAnalyser();
  if ( analyser ) {
    analyser.fftSize = fftSize.value;
    // Smoothing: 0.0 = React instantly (jittery), 0.99 = Very slow average (ghosting)
    analyser.smoothingTimeConstant = smoothing.value;
  }
};

/**
 * Captures a snapshot of the current spectrum data.
 * Used to compare a specific moment (e.g., a snare hit) against live input.
 */
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

// getNoteFromFreq imported from core

/**
 * Main Animation Loop.
 * Runs at the browser's refresh rate (usually 60Hz).
 */
const render = () => {
  if ( osc ) osc.draw();
  if ( spec ) spec.draw();
  // MagnitudeSpectrum is a more complex visualizer imported from @spectralsuite/core
  if ( mag ) mag.draw( frozenData.value, scaleMode.value, peakHoldData.value, showInstrumentLabels.value, INSTRUMENT_RANGES, showHarmonics.value, dominantFreq.value );

  // Detect dominant frequency for the HUD
  const analyser = getAnalyser();
  if ( analyser ) {
    const data = new Uint8Array( analyser.frequencyBinCount );
    analyser.getByteFrequencyData( data );

    // Update Peak Hold State using "decay" physics
    if ( !peakHoldData.value ) {
      peakHoldData.value = new Uint8Array( data.length );
    }
    for ( let i = 0; i < data.length; i++ ) {
      const currentPeak = peakHoldData.value[i] ?? 0;
      // If current val is higher, push the peak up instantly (Attack time = 0)
      if ( data[i]! > currentPeak ) {
        peakHoldData.value[i] = data[i]!;
      } else {
        // Otherwise, let it fade out slowly (Release time = PEAK_DECAY_RATE)
        peakHoldData.value[i] = Math.floor( currentPeak * PEAK_DECAY_RATE );
      }
    }

    // Mathematical Peak Detection (Naive Approach)
    // We just look for the bin with the highest magnitude.
    // NOTE: For better pitch accuracy, we should use the autocorrelation/HPS engine (usePitch).
    // This is just a visual "Quick Check" for the dominant frequency band.
    let maxVal = 0;
    let maxIdx = 0;
    for ( let i = 0; i < data.length; i++ ) {
      const val = data[i] ?? 0;
      if ( val > maxVal ) {
        maxVal = val;
        maxIdx = i;
      }
    }

    // Only detect if signal is above a noise floor (50/255 ≈ -60dB)
    if ( maxVal > 50 ) {
      const nyquist = analyser.context.sampleRate / 2;
      dominantFreq.value = Math.round( ( maxIdx / data.length ) * nyquist );
      dominantNote.value = getNoteFromFreq( dominantFreq.value );

      // Generate EQ Suggestions based on spectral balance
      eqSuggestions.value = generateEqSuggestions( data, nyquist );
    } else {
      dominantNote.value = "-";
    }
  }

  animId = requestAnimationFrame( render );
};

// generateEqSuggestions imported from core

/**
 * Exports the current spectral frame to a file.
 * 
 * @param format - 'png' for visual snapshot, 'json' for raw data analysis
 */
const exportSpectrum = ( format: 'png' | 'json' ) => {
  const analyser = getAnalyser();
  if ( !analyser ) return;

  if ( format === 'png' && magCanvas.value ) {
    // Canvas API allows direct export to Data URL
    const link = document.createElement( 'a' );
    link.download = `spectrum-${Date.now()}.png`;
    link.href = magCanvas.value.toDataURL( 'image/png' );
    link.click();
  } else if ( format === 'json' ) {
    // Construct a scientific data object
    const data = new Uint8Array( analyser.frequencyBinCount );
    analyser.getByteFrequencyData( data );
    const nyquist = analyser.context.sampleRate / 2;

    const json = {
      timestamp: new Date().toISOString(),
      sampleRate: analyser.context.sampleRate,
      fftSize: fftSize.value,
      // Map raw bins to Hz values for portability
      frequencies: Array.from( data ).map( ( val, i ) => ( {
        hz: Math.round( ( i / data.length ) * nyquist ),
        magnitude: val // 0-255 scale
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

const emit = defineEmits( ['back'] )

onUnmounted( () => {
  if ( animId ) cancelAnimationFrame( animId );
} );
</script>

<template>
  <div class="space-y-6">
    <header class="flex justify-between items-end mb-8">
      <div>
        <button
          @click="emit( 'back' )"
          class="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 hover:text-white transition-colors mb-4 flex items-center gap-2"
        >
          <span>←</span> Back to Tonic
        </button>
        <h2 class="text-3xl font-bold text-white mb-2">Frequency <span class="text-sky-400">Flow</span> <span
            class="text-indigo-400 text-lg"
          >Pro</span></h2>
        <p class="text-slate-400 text-sm">Real-time spectral analysis and waveform diagnostics.</p>
      </div>
      <div class="flex items-center gap-4">
        <SettingsToggle
          :is-open="isSettingsOpen"
          @click="isSettingsOpen = !isSettingsOpen"
        />
        <button
          @click="openInfo( 'frequencyflow' )"
          class="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-black text-lg flex items-center justify-center hover:bg-indigo-500/20 transition-all active:scale-95 mb-1"
        >
          ?
        </button>
      </div>
    </header>

    <LocalSettingsDrawer
      :is-open="isSettingsOpen"
      :categories="drawerCategories"
      @close="isSettingsOpen = false"
    >
      <template #Engine>
        <EngineSettings />
      </template>
      <template #Exports>
        <div class="space-y-4">
          <p class="text-[11px] text-slate-500 leading-relaxed">
            Export the current spectral analysis data for external processing or documentation.
          </p>
          <div class="grid grid-cols-2 gap-3">
            <button
              @click="exportSpectrum( 'png' )"
              class="px-4 py-8 rounded-2xl bg-slate-900 border border-emerald-500/20 hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-all group flex flex-col items-center gap-3"
            >
              <span class="text-2xl opacity-50 group-hover:opacity-100 group-hover:scale-110 transition-all">📷</span>
              <span class="text-[10px] uppercase font-black tracking-widest text-emerald-400">Export PNG</span>
            </button>
            <button
              @click="exportSpectrum( 'json' )"
              class="px-4 py-8 rounded-2xl bg-slate-900 border border-amber-500/20 hover:border-amber-500/50 hover:bg-amber-500/10 transition-all group flex flex-col items-center gap-3"
            >
              <span class="text-2xl opacity-50 group-hover:opacity-100 group-hover:scale-110 transition-all">📊</span>
              <span class="text-[10px] uppercase font-black tracking-widest text-amber-400">Export JSON</span>
            </button>
          </div>
        </div>
      </template>
    </LocalSettingsDrawer>

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
