<script setup lang="ts">
import { ref, onUnmounted } from 'vue';
import { TrackAnalyzer, type AnalysisResult } from '../../../../04-tracktracer/src/analysis/TrackAnalyzer';
import { useToolInfo } from '../../composables/useToolInfo';

const { openInfo } = useToolInfo();

const fileInput = ref<HTMLInputElement | null>( null );
const urlInput = ref( "" );
const isAnalyzing = ref( false );
const result = ref<AnalysisResult | null>( null );
const error = ref<string | null>( null );
const showSpecimens = ref( false );

const analyzeFile = async ( event: Event ) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if ( !file ) return;

  if ( !file.type.startsWith( 'audio/' ) ) {
    error.value = "Invalid file type. Please upload audio.";
    return;
  }

  isAnalyzing.value = true;
  error.value = null;
  result.value = null;

  try {
    result.value = await TrackAnalyzer.analyze( file );
  } catch ( err: any ) {
    error.value = "Forensic analysis failed: " + err.message;
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
    let targetUrl = urlInput.value;
    if ( targetUrl.includes( 'youtube.com' ) || targetUrl.includes( 'youtu.be' ) ) {
      error.value = "YouTube direct analysis requires a forensic proxy (CORS). Please upload a file for now.";
      isAnalyzing.value = false;
      return;
    }

    result.value = await TrackAnalyzer.analyzeUrl( targetUrl );
  } catch ( err: any ) {
    error.value = "URL analysis failed: " + err.message;
  } finally {
    isAnalyzing.value = false;
  }
};

const clearUrl = () => {
  urlInput.value = "";
};

const SPECIMENS = [
  { name: "EDM Analysis", type: "Quantized Pulse", url: "https://raw.githubusercontent.com/mdn/webaudio-examples/master/audio-analyser/viper.mp3" },
  { name: "Ambient Track", type: "Wide Dynamics", url: "https://raw.githubusercontent.com/mdn/webaudio-examples/master/spatial-panning-api/outfoxing.mp3" },
  { name: "Viper (Alt)", type: "Dense Mix", url: "https://raw.githubusercontent.com/mdn/webaudio-examples/main/audio-analyser/viper.mp3" },
  { name: "Stereo Test", type: "Spatial Profile", url: "https://raw.githubusercontent.com/mdn/webaudio-examples/main/stereo-panner-node/viper.mp3" },
  { name: "Multi-track", type: "Layered Stems", url: "https://raw.githubusercontent.com/mdn/webaudio-examples/main/audio-basics/outfoxing.mp3" }
];

const loadSpecimen = ( url: string ) => {
  stopPlayback( true );
  result.value = null;
  urlInput.value = url;
  analyzeUrl();
};

const isPlaying = ref( false );
const currentTime = ref( 0 );
let playbackSource: AudioBufferSourceNode | null = null;
let playStartTime = 0;
let offsetTime = 0;
let progressInterval: number | null = null;

const togglePlayback = () => {
  if ( !result.value || !result.value.buffer ) return;

  if ( isPlaying.value ) {
    stopPlayback();
  } else {
    startPlayback();
  }
};

const startPlayback = ( offset = offsetTime ) => {
  if ( !result.value || !result.value.buffer ) return;

  const ctx = TrackAnalyzer.audioCtx;
  if ( ctx.state === 'suspended' ) ctx.resume();

  playbackSource = ctx.createBufferSource();
  playbackSource.buffer = result.value.buffer;
  playbackSource.connect( ctx.destination );

  playStartTime = ctx.currentTime;
  offsetTime = offset;

  playbackSource.start( 0, offset );
  isPlaying.value = true;

  playbackSource.onended = () => {
    if ( isPlaying.value && currentTime.value >= ( result.value?.duration || 0 ) ) {
      stopPlayback( true );
    }
  };

  progressInterval = requestAnimationFrame( updateProgress );
};

const stopPlayback = ( reset = false ) => {
  if ( playbackSource ) {
    try {
      playbackSource.stop();
    } catch ( e ) { }
    playbackSource.disconnect();
    playbackSource = null;
  }

  if ( progressInterval ) {
    cancelAnimationFrame( progressInterval );
    progressInterval = null;
  }

  if ( reset ) {
    offsetTime = 0;
    currentTime.value = 0;
  } else {
    offsetTime = currentTime.value;
  }

  isPlaying.value = false;
};

const updateProgress = () => {
  if ( !isPlaying.value || !result.value ) return;
  const ctx = TrackAnalyzer.audioCtx;
  currentTime.value = offsetTime + ( ctx.currentTime - playStartTime );

  if ( currentTime.value < result.value.duration ) {
    progressInterval = requestAnimationFrame( updateProgress );
  }
};

const seekTo = ( event: MouseEvent ) => {
  if ( !result.value ) return;
  const container = event.currentTarget as HTMLElement;
  const rect = container.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const percent = x / rect.width;
  const seekTime = percent * result.value.duration;

  const wasPlaying = isPlaying.value;
  stopPlayback();
  offsetTime = seekTime;
  currentTime.value = seekTime;

  if ( wasPlaying ) {
    startPlayback( seekTime );
  }
};

const resetFindings = () => {
  stopPlayback( true );
  result.value = null;
};

onUnmounted( () => {
  stopPlayback();
} );

const formatDuration = ( seconds: number ) => {
  const mins = Math.floor( seconds / 60 );
  const secs = Math.floor( seconds % 60 );
  return `${mins}:${secs.toString().padStart( 2, '0' )}`;
};
</script>

<template>
  <div class="space-y-8 max-w-5xl mx-auto">

    <header class="flex justify-between items-end">
      <div>
        <h2 class="text-4xl font-black text-white italic tracking-tighter uppercase">Track<span
            class="text-blue-500">Tracer</span></h2>
        <p class="text-slate-500 text-xs font-mono uppercase tracking-widest mt-1">Song Deconstruction & Forensic Lab
        </p>
      </div>
      <div class="flex items-center gap-4">
        <button
          @click="openInfo( 'tracktracer' )"
          class="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500/20 transition-all active:scale-95"
        >
          Intelligence
        </button>
        <div
          v-if=" result "
          class="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest"
        >
          Scan Complete
        </div>
      </div>
    </header>

    <!-- Lab Interface -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">

      <!-- Primary Action Area -->
      <div
        v-if=" !result && !isAnalyzing "
        class="lg:col-span-12 space-y-8"
      >
        <div
          class="relative group cursor-pointer h-64 rounded-[3rem] bg-white/5 border border-white/5 backdrop-blur-xl border-dashed hover:border-blue-500/50 transition-all flex flex-col items-center justify-center p-12 overflow-hidden"
          @click="fileInput?.click()"
        >
          <input
            type="file"
            ref="fileInput"
            class="hidden"
            accept="audio/*"
            @change="analyzeFile"
          >

          <div class="flex flex-col items-center">
            <div class="text-4xl mb-4 group-hover:scale-110 transition-transform">🧪</div>
            <h3 class="text-xl font-bold text-white mb-1 uppercase tracking-tight">Drop Sonic Evidence</h3>
            <p class="text-slate-500 text-[10px] font-mono uppercase tracking-[0.3em]">Click to Browse Files</p>
          </div>
        </div>

        <!-- URL & Gallery Section -->
        <div class="flex flex-col md:flex-row gap-6 items-stretch">
          <div :class="[
            'glass-container transition-all duration-500 overflow-hidden flex flex-col',
            showSpecimens ? 'flex-[0.4]' : 'w-16'
          ]">
            <button
              @click="showSpecimens = !showSpecimens"
              class="w-full py-6 flex flex-col items-center justify-center hover:bg-white/5 transition-colors gap-3"
              :title="showSpecimens ? 'Hide Specimens' : 'Show Specimens'"
            >
              <span
                class="text-xl transition-transform duration-500"
                :style="{ transform: showSpecimens ? 'rotate(180deg)' : 'rotate(0deg)' }"
              >🧪</span>
              <span
                v-if=" showSpecimens "
                class="text-[9px] font-black uppercase tracking-[0.2em] text-blue-500 animate-in fade-in slide-in-from-top-1"
              >Specimens</span>
              <span
                v-else
                class="text-[8px] font-black uppercase tracking-widest text-slate-600 vertical-text py-4"
              >Gallery</span>
            </button>

            <div
              v-if=" showSpecimens "
              class="pb-8 animate-in fade-in zoom-in-95 duration-500"
            >
              <h3 class="text-[10px] font-black uppercase tracking-[0.4em] text-blue-500 mb-4 text-center">Sonic
                Specimens Gallery</h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3 px-4">
                <button
                  v-for=" specimen in SPECIMENS "
                  :key="specimen.name"
                  @click="loadSpecimen( specimen.url )"
                  class="group p-3 rounded-2xl bg-white/5 border border-white/5 hover:border-blue-500/30 hover:bg-blue-500/5 transition-all text-left"
                >
                  <p
                    class="text-[9px] font-black text-white uppercase tracking-tight group-hover:text-blue-400 transition-colors">
                    {{ specimen.name }}
                  </p>
                  <p class="text-[7px] font-mono text-slate-500 uppercase tracking-widest mt-1">{{ specimen.type }}</p>
                </button>
              </div>
              <p class="text-[7px] text-slate-600 font-mono uppercase tracking-widest mt-4 px-4 text-center italic">
                Testing requires CORS-enabled URLs. Private links may fail scanning.</p>
            </div>
          </div>

          <!-- Remote Link Analysis (Primary) -->
          <div
            :class="['glass-container p-10 flex flex-col items-center justify-center gap-6', showSpecimens ? 'flex-[0.6]' : 'flex-1']"
          >
            <div
              v-if=" error "
              class="text-center text-red-500 text-[10px] font-black uppercase tracking-widest mb-2"
            >{{ error }}</div>
            <h3 class="text-[10px] font-black uppercase tracking-[0.4em] text-blue-500 mb-2">Remote Link Analysis</h3>
            <div class="w-full flex gap-4 max-w-2xl px-12">
              <input
                v-model="urlInput"
                type="text"
                placeholder="Paste YouTube or MP3 URL..."
                class="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                @keyup.enter="analyzeUrl"
              >
              <div class="flex gap-2">
                <button
                  @click="analyzeUrl"
                  class="bg-blue-600 hover:bg-blue-500 text-white font-black uppercase italic tracking-tighter px-8 rounded-2xl transition-colors disabled:opacity-50"
                  :disabled="!urlInput"
                >
                  Analyze
                </button>
                <button
                  v-if=" urlInput "
                  @click="clearUrl"
                  class="bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white px-4 rounded-2xl transition-all border border-white/5"
                  title="Clear Input"
                >
                  ✕
                </button>
              </div>
            </div>
            <p class="text-[9px] text-slate-500 font-mono uppercase tracking-[0.2em] italic">Direct YouTube links may
              require a forensic proxy.</p>
          </div>

          <!-- Remote Link Analysis (Primary) -->
        </div>
      </div>

      <!-- Analysis Loader -->
      <div
        v-else-if=" isAnalyzing "
        class="lg:col-span-12"
      >
        <div
          class="h-64 rounded-[3rem] bg-white/5 border border-white/5 backdrop-blur-xl flex flex-col items-center justify-center p-12"
        >
          <div class="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-6"></div>
          <p class="text-blue-400 font-bold uppercase tracking-widest text-xs animate-pulse">Deconstructing Signal...
          </p>
        </div>
      </div>

      <!-- Findings Dashboard -->
      <template v-else-if=" result ">
        <div class="lg:col-span-4 space-y-6">
          <div class="p-8 rounded-[2.5rem] bg-white/5 border border-white/5 backdrop-blur-xl flex flex-col gap-6">
            <div>
              <p class="text-[8px] font-black text-slate-500 uppercase tracking-[0.4em] mb-2">Subject Metadata</p>
              <h4 class="text-white font-black uppercase italic truncate">{{ result!.fileName }}</h4>
            </div>

            <div class="h-px bg-white/5"></div>

            <div class="space-y-4">
              <div class="flex justify-between items-center">
                <span class="text-[10px] text-slate-500 uppercase tracking-widest">Tempo</span>
                <span class="text-xl font-black text-blue-400 italic">{{ result!.bpm }} BPM</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-[10px] text-slate-500 uppercase tracking-widest">Musical Key</span>
                <span class="text-lg font-black text-cyan-400 italic">{{ result!.key }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-[10px] text-slate-500 uppercase tracking-widest">Runtime</span>
                <span class="text-base font-mono font-bold text-white">{{ formatDuration( result!.duration ) }}</span>
              </div>
            </div>

            <div class="flex flex-col gap-2">
              <button
                @click="togglePlayback"
                class="w-full py-4 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95"
                :class="isPlaying ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-blue-600 text-white'"
              >
                <span class="text-xl">{{ isPlaying ? '⏸' : '▶' }}</span>
                <span
                  class="font-black uppercase tracking-widest text-[10px]">{{ isPlaying ? 'Pause Analysis Stream' : 'Deploy Audio Playback' }}</span>
              </button>

              <button
                @click="resetFindings"
                class="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-[9px] font-black uppercase tracking-widest text-slate-400 transition-all hover:text-white"
              >
                Destroy Findings & Reset
              </button>
            </div>
          </div>
        </div>

        <div class="lg:col-span-8 flex flex-col gap-6">
          <div
            class="p-10 rounded-[2.5rem] bg-white/5 border border-white/5 backdrop-blur-xl h-64 relative overflow-hidden flex flex-col"
          >
            <!-- Song Sections Labels -->
            <div class="flex h-6 mb-2 border-b border-white/5 items-center">
              <div
                v-for=" ( section, sIdx ) in result!.sections "
                :key="'s-label-' + sIdx"
                class="h-full border-l border-white/5 px-2 flex items-center"
                :style="{ width: ( ( section.end - section.start ) / result!.duration * 100 ) + '%' }"
              >
                <span
                  class="text-[7px] font-black text-blue-500 uppercase tracking-widest whitespace-nowrap">{{ section.label }}</span>
              </div>
            </div>

            <p class="text-[8px] font-black text-slate-500 uppercase tracking-[0.4em] mb-4">Waveform Blueprint (Energy
              Map)</p>
            <div
              class="flex-1 flex items-end gap-px relative cursor-crosshair group/blueprint"
              @click="seekTo"
            >
              <div
                v-for=" ( point, idx ) in result!.energyMap "
                :key="idx"
                class="flex-1 bg-gradient-to-t from-blue-600/50 to-cyan-400 rounded-t-sm transition-all duration-1000 z-10"
                :style="{ height: ( point * 95 ) + '%', opacity: 0.3 + ( point * 0.7 ) }"
              ></div>

              <!-- Playback Progress Indicator -->
              <div
                v-if=" result!.duration > 0 "
                class="absolute top-0 bottom-0 w-0.5 bg-white z-20 pointer-events-none shadow-[0_0_15px_rgba(255,255,255,0.8)]"
                :style="{ left: ( currentTime / result!.duration * 100 ) + '%' }"
              >
                <div class="absolute -top-1 -left-1 w-2.5 h-2.5 bg-white rounded-full"></div>
              </div>

              <!-- Time Markers -->
              <div class="absolute -bottom-6 w-full flex justify-between px-1 text-[7px] font-mono text-slate-600">
                <span>0:00</span>
                <span>{{ formatDuration( result!.duration * 0.25 ) }}</span>
                <span>{{ formatDuration( result!.duration * 0.5 ) }}</span>
                <span>{{ formatDuration( result!.duration * 0.75 ) }}</span>
                <span>{{ formatDuration( result!.duration ) }}</span>
              </div>
            </div>
          </div>

          <div class="p-10 rounded-[2.5rem] bg-white/5 border border-white/5 backdrop-blur-xl">
            <h4 class="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500 mb-6">Expert Observations</h4>
            <div class="grid grid-cols-2 gap-8 text-[11px] text-slate-400 leading-relaxed italic">
              <p>• The rhythmic signature is highly consistent, indicating a potential drum machine or quantized
                percussion track.</p>
              <p>• Harmonic distribution suggests a strong tonal center with minimal dissonance in the spectral
                mid-range.</p>
            </div>
          </div>
        </div>
      </template>

    </div>
  </div>
</template>

<style scoped>
@reference "tailwindcss";

.glass-container {
  @apply rounded-[3rem] bg-white/5 border border-white/5 backdrop-blur-xl;
}

.vertical-text {
  writing-mode: vertical-rl;
  text-orientation: mixed;
  transform: rotate(180deg);
}
</style>
