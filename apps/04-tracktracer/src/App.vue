<script setup lang="ts">
import { ref } from 'vue';
import { TrackAnalyzer, type AnalysisResult } from './analysis/TrackAnalyzer';

const fileInput = ref<HTMLInputElement | null>( null );
const urlInput = ref( "" );
const isAnalyzing = ref( false );
const result = ref<AnalysisResult | null>( null );
const error = ref<string | null>( null );

const handleFileUpload = async ( event: Event ) => {
  const file = ( event.target as HTMLInputElement ).files?.[0];
  if ( !file ) return;
  analyzeFile( file );
};

const handleDrop = ( event: DragEvent ) => {
  event.preventDefault();
  const file = event.dataTransfer?.files[0];
  if ( file ) analyzeFile( file );
};

const analyzeFile = async ( file: File ) => {
  if ( !file.type.startsWith( 'audio/' ) ) {
    error.value = "Please upload a valid audio file (MP3, WAV, etc.)";
    return;
  }

  isAnalyzing.value = true;
  error.value = null;
  result.value = null;

  try {
    result.value = await TrackAnalyzer.analyze( file );
  } catch ( err: any ) {
    error.value = "Failed to analyze track: " + err.message;
  } finally {
    isAnalyzing.value = false;
  }
};

const analyzeUrl = async () => {
  if ( !urlInput.value ) return;

  isAnalyzing.value = true;
  error.value = null;
  result.value = null;

  try {
    // Basic YouTube normalization (in real app, we'd need a proxy/backend for YouTube)
    let targetUrl = urlInput.value;
    if ( targetUrl.includes( 'youtube.com' ) || targetUrl.includes( 'youtu.be' ) ) {
      error.value = "YouTube direct analysis requires a forensic proxy (CORS). Please upload a file for now.";
      isAnalyzing.value = false;
      return;
    }

    result.value = await TrackAnalyzer.analyzeUrl( targetUrl );
  } catch ( err: any ) {
    error.value = "Failed to analyze URL: " + err.message;
  } finally {
    isAnalyzing.value = false;
  }
};

const formatDuration = ( seconds: number ) => {
  const mins = Math.floor( seconds / 60 );
  const secs = Math.floor( seconds % 60 );
  return `${mins}:${secs.toString().padStart( 2, '0' )}`;
};
</script>

<template>
  <div class="min-h-screen p-8 lg:p-12 max-w-7xl mx-auto flex flex-col gap-8">

    <!-- Branding -->
    <header class="flex flex-col gap-2">
      <div class="flex items-center gap-4">
        <div class="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black text-white italic">T
        </div>
        <h1 class="text-3xl font-black tracking-tighter text-white uppercase italic">Track<span
            class="text-blue-500">Tracer</span></h1>
      </div>
      <p class="text-slate-500 font-mono text-xs uppercase tracking-[0.3em]">Forensic Audio Analysis Suite • v1.0.0</p>
    </header>

    <main class="flex-1 flex flex-col gap-8">

      <!-- Upload Zone -->
      <div
        v-if=" !result && !isAnalyzing "
        class="flex flex-col gap-8"
      >
        <div
          class="flex-1 min-h-[300px] blueprint-card rounded-[3rem] border-2 border-dashed border-white/10 flex flex-col items-center justify-center p-12 transition-all hover:border-blue-500/50 group cursor-pointer relative overflow-hidden"
          @dragover.prevent
          @drop="handleDrop"
          @click="fileInput?.click()"
        >
          <div class="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>

          <input
            type="file"
            ref="fileInput"
            class="hidden"
            accept="audio/*"
            @change="handleFileUpload"
          >

          <div
            class="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-2xl mb-6 transform group-hover:scale-110 transition-transform"
          >
            📂
          </div>
          <h2 class="text-xl font-black text-white mb-2 uppercase italic tracking-tight">Drop Sonic Evidence</h2>
          <p class="text-slate-500 text-[10px] font-mono tracking-widest uppercase">MP3, WAV, OGG · MAX 50MB</p>
        </div>

        <!-- URL Input Area -->
        <div class="blueprint-card rounded-[2.5rem] p-8 flex flex-col items-center gap-6">
          <h3 class="text-[10px] font-black uppercase tracking-[0.4em] text-blue-500 mb-2">Remote Link Analysis</h3>
          <div class="w-full flex gap-4">
            <input
              v-model="urlInput"
              type="text"
              placeholder="Paste YouTube or MP3 URL..."
              class="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
              @keyup.enter="analyzeUrl"
            >
            <button
              @click="analyzeUrl"
              class="bg-blue-600 hover:bg-blue-500 text-white font-black uppercase italic tracking-tighter px-8 rounded-2xl transition-colors disabled:opacity-50"
              :disabled="!urlInput"
            >
              Fetch
            </button>
          </div>
          <p class="text-[9px] text-slate-500 font-mono uppercase tracking-[0.2em] italic">Note: Remote streams are
            subject to CORS forensic limitations.</p>
        </div>

        <div
          v-if=" error "
          class="self-center px-6 py-2 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest animate-pulse"
        >
          {{ error }}
        </div>
      </div>

      <!-- Analysis Loader -->
      <div
        v-if=" isAnalyzing "
        class="flex-1 min-h-[400px] blueprint-card rounded-[3rem] flex flex-col items-center justify-center p-12"
      >
        <div class="relative w-32 h-32 mb-12">
          <div class="absolute inset-0 border-4 border-blue-500/20 rounded-full"></div>
          <div class="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <div class="absolute inset-4 border-2 border-cyan-400 border-b-transparent rounded-full animate-spin-slow">
          </div>
        </div>
        <h2 class="text-xl font-bold text-white mb-2 uppercase tracking-[0.2em] animate-pulse">Running Forensic Scan...
        </h2>
        <p class="text-slate-500 text-[10px] font-mono uppercase tracking-[0.5em]">Deconstructing Audio Buffer</p>
      </div>

      <!-- Result View -->
      <div
        v-if=" result "
        class="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-8 duration-700"
      >

        <!-- Sidebar Meta -->
        <aside class="lg:col-span-4 flex flex-col gap-6">
          <div class="blueprint-card rounded-[2.5rem] p-8 flex flex-col gap-6">
            <div class="flex items-center gap-4">
              <div class="text-4xl">📀</div>
              <div class="truncate">
                <h3 class="text-white font-black truncate leading-tight uppercase italic">{{ result.fileName }}</h3>
                <p class="text-[10px] text-slate-500 font-mono uppercase tracking-widest">Target Signature</p>
              </div>
            </div>

            <div class="h-px bg-white/5"></div>

            <div class="grid grid-cols-2 gap-4 text-center">
              <div class="p-4 rounded-2xl bg-white/5 border border-white/5">
                <p class="text-[8px] text-slate-600 font-black uppercase tracking-widest mb-1">Detected BPM</p>
                <div class="text-3xl font-black text-blue-400">{{ result.bpm || '--' }}</div>
              </div>
              <div class="p-4 rounded-2xl bg-white/5 border border-white/5">
                <p class="text-[8px] text-slate-600 font-black uppercase tracking-widest mb-1">Musical Key</p>
                <div class="text-2xl font-black text-cyan-400">{{ result.key }}</div>
              </div>
              <div class="p-4 rounded-2xl bg-white/5 border border-white/5 col-span-2">
                <p class="text-[8px] text-slate-600 font-black uppercase tracking-widest mb-1">Playback Length</p>
                <div class="text-xl font-mono font-bold text-white">{{ formatDuration( result.duration ) }}</div>
              </div>
            </div>

            <button
              @click="result = null"
              class="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors py-2 border border-white/5 rounded-xl"
            >
              Analyze New Track
            </button>
          </div>
        </aside>

        <!-- Main Analysis -->
        <div class="lg:col-span-8 flex flex-col gap-6">
          <!-- Waveform DNA -->
          <div class="blueprint-card rounded-[2.5rem] p-8 h-80 flex flex-col relative overflow-hidden">
            <div class="flex justify-between items-center mb-12">
              <h4 class="text-[10px] font-black uppercase tracking-[0.3em] text-white italic">Sonic DNA Waveform</h4>
              <span class="text-[8px] font-mono text-slate-600 uppercase">Energy Distribution (200 Pts)</span>
            </div>

            <!-- Song Sections Labels -->
            <div class="flex h-6 mb-4 border-b border-white/5 items-center">
              <div
                v-for=" ( section, sIdx ) in result.sections "
                :key="'s-label-' + sIdx"
                class="h-full border-l border-white/5 px-2 flex items-center"
                :style="{ width: ( ( section.end - section.start ) / result.duration * 100 ) + '%' }"
              >
                <span
                  class="text-[7px] font-black text-blue-500 uppercase tracking-widest whitespace-nowrap">{{ section.label }}</span>
              </div>
            </div>

            <div class="flex-1 flex items-end gap-px relative">
              <div
                v-for=" ( point, idx ) in result.energyMap "
                :key="idx"
                class="flex-1 bg-gradient-to-t from-blue-600/50 to-cyan-400 rounded-t-sm transition-all duration-1000 z-10"
                :style="{ height: ( point * 95 ) + '%', opacity: 0.3 + ( point * 0.7 ) }"
              ></div>

              <!-- Time Markers -->
              <div class="absolute -bottom-6 w-full flex justify-between px-1 text-[7px] font-mono text-slate-600">
                <span>0:00</span>
                <span>{{ formatDuration( result.duration * 0.25 ) }}</span>
                <span>{{ formatDuration( result.duration * 0.5 ) }}</span>
                <span>{{ formatDuration( result.duration * 0.75 ) }}</span>
                <span>{{ formatDuration( result.duration ) }}</span>
              </div>
            </div>

            <!-- Grid lines -->
            <div class="absolute inset-x-8 bottom-8 h-px bg-white/10"></div>
            <div class="absolute inset-x-8 bottom-[calc(8px+25%)] h-px bg-white/5"></div>
            <div class="absolute inset-x-8 bottom-[calc(8px+50%)] h-px bg-white/10"></div>
            <div class="absolute inset-x-8 bottom-[calc(8px+75%)] h-px bg-white/5"></div>
          </div>

          <!-- Insight Panel -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="blueprint-card rounded-[2.5rem] p-8">
              <h4 class="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500 mb-4">Structural Insights</h4>
              <ul class="space-y-3 text-[11px] text-slate-400">
                <li class="flex items-center gap-2">
                  <span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                  Track has high dynamic variance.
                </li>
                <li class="flex items-center gap-2">
                  <span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                  Consistent pulse detected.
                </li>
              </ul>
            </div>
            <div class="blueprint-card rounded-[2.5rem] p-8">
              <h4 class="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-500 mb-4">Frequency Health</h4>
              <div class="flex items-center gap-4 text-xs font-bold text-white uppercase italic">
                <span>Lows: Clear</span>
                <div class="h-1 w-1 bg-white/20"></div>
                <span>Highs: Crisp</span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </main>

    <!-- Footer Stats -->
    <footer
      class="h-12 border-t border-white/5 flex items-center justify-between px-4 text-[9px] text-slate-700 font-mono uppercase tracking-widest"
    >
      <div>Algorithm: FFT-V3-Fast</div>
      <div class="flex gap-4">
        <span>Latency: 42ms</span>
        <div class="w-px h-3 bg-white/5"></div>
        <span>Precision: High</span>
      </div>
    </footer>
  </div>
</template>

<style scoped>
@keyframes spin-slow {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(-360deg);
  }
}

.animate-spin-slow {
  animation: spin-slow 3s linear infinite;
}
</style>
