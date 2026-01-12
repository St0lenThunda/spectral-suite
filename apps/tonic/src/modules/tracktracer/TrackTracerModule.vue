<script setup lang="ts">
import { ref, onUnmounted } from 'vue';
import { TrackAnalyzer, type AnalysisResult, useAudioRecorder, useAudioEngine } from '@spectralsuite/core';
import { useToolInfo } from '../../composables/useToolInfo';

const { openInfo } = useToolInfo();

const fileInput = ref<HTMLInputElement | null>( null );
const urlInput = ref( "" );
const isAnalyzing = ref( false );
const result = ref<AnalysisResult | null>( null );
const error = ref<string | null>( null );
const showSpecimens = ref( false );

// Microphone Listening Mode
const {
  isListening,
  listeningDuration,
  startListening: startMic,
  stopListening: stopMic,
  getAnalyser: getMicAnalyser
} = useAudioRecorder();

// Wrap stopListening to handle analysis
const stopListening = async () => {
  stopWaveform(); // Stop visualizer
  try {
    const file = await stopMic();
    isAnalyzing.value = true;
    error.value = null;
    try {
      result.value = await TrackAnalyzer.analyze( file );
    } catch ( err: any ) {
      error.value = "Analysis failed: " + err.message;
    } finally {
      isAnalyzing.value = false;
    }
  } catch ( err: any ) {
    error.value = "Recording failed: " + err.message;
  }
};

const waveformCanvas = ref<HTMLCanvasElement | null>( null );
let waveformAnimId: number | null = null;

const drawWaveform = () => {
  const canvas = waveformCanvas.value;
  const analyser = getMicAnalyser();
  if ( !canvas || !analyser ) return;

  const ctx = canvas.getContext( '2d' );
  if ( !ctx ) return;

  // Handle high-DPI displays
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale( dpr, dpr );

  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array( bufferLength );
  analyser.getByteTimeDomainData( dataArray );

  ctx.clearRect( 0, 0, rect.width, rect.height );
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#fb7185'; // Rose-400
  ctx.beginPath();

  const sliceWidth = rect.width * 1.0 / bufferLength;
  let x = 0;

  for ( let i = 0; i < bufferLength; i++ ) {
    const v = dataArray[i]! / 128.0;
    const y = v * ( rect.height / 2 );

    if ( i === 0 ) ctx.moveTo( x, y );
    else ctx.lineTo( x, y );

    x += sliceWidth;
  }

  ctx.lineTo( rect.width, rect.height / 2 );
  ctx.stroke();

  waveformAnimId = requestAnimationFrame( drawWaveform );
};

const stopWaveform = () => {
  if ( waveformAnimId ) {
    cancelAnimationFrame( waveformAnimId );
    waveformAnimId = null;
  }
};

const startListening = async () => {
  try {
    await startMic();
    // Start visualizer after a brief delay to ensure analyser is ready
    setTimeout( drawWaveform, 100 );
  } catch ( err: any ) {
    error.value = err.message;
  }
}

onUnmounted( () => {
  stopPlayback( true );
  stopWaveform();
  if ( isListening.value ) {
    stopListening();
  }
} );


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
    // Ensure engine is ready (TrackAnalyzer uses it)
    if ( !useAudioEngine().isInitialized.value ) {
      await useAudioEngine().init();
    }
    result.value = await TrackAnalyzer.analyze( file );
  } catch ( err: any ) {
    error.value = "Forensic analysis failed: " + err.message;
  } finally {
    isAnalyzing.value = false;
  }
};

const videoMetadata = ref<{ title: string, thumbnail: string, duration: number, uploader: string } | null>( null );
const downloadProgress = ref( 0 );
const downloadTotal = ref( 0 ); // Bytes, if available

const analyzeUrl = async () => {
  if ( !urlInput.value ) return;

  isAnalyzing.value = true;
  error.value = null;
  result.value = null;
  videoMetadata.value = null;
  downloadProgress.value = 0;
  downloadTotal.value = 0;

  try {
    let targetUrl = urlInput.value;

    // Ensure engine is ready (TrackAnalyzer uses it)
    if ( !useAudioEngine().isInitialized.value ) {
      await useAudioEngine().init();
    }

    // Check for YouTube / Proxy requirement
    if ( targetUrl.includes( 'youtube.com' ) || targetUrl.includes( 'youtu.be' ) ) {
      // PROXY MODE
      let proxyBase = import.meta.env.VITE_FORENSIC_PROXY_URL || "http://127.0.0.1:8081";

      // Ensure protocol
      if ( !proxyBase.startsWith( 'http' ) ) {
        proxyBase = `https://${proxyBase}`;
      }

      // 1. Fetch Metadata First
      try {
        const infoUrl = `${proxyBase}/info?url=${encodeURIComponent( targetUrl )}`;
        const infoResp = await fetch( infoUrl, { mode: 'cors' } );
        if ( infoResp.ok ) {
          videoMetadata.value = await infoResp.json();
        }
      } catch ( e ) {
        console.warn( "Metadata fetch failed, proceeding to download anyway", e );
      }

      const resolveUrl = `${proxyBase}/resolve?url=${encodeURIComponent( targetUrl )}`;
      console.log( 'Forensic Proxy Request:', resolveUrl );

      try {
        const resp = await fetch( resolveUrl, {
          mode: 'cors',
          credentials: 'omit',
          cache: 'no-store'
        } );

        if ( !resp.ok ) {
          const txt = await resp.text();
          throw new Error( `Proxy resolution failed (${resp.status}): ${txt}` );
        }

        // 2. Stream Reading with Progress
        const reader = resp.body?.getReader();
        const contentLength = +( resp.headers.get( 'Content-Length' ) || '0' );
        downloadTotal.value = contentLength;

        if ( !reader ) {
          const blob = await resp.blob(); // Fallback
          downloadProgress.value = blob.size;
          const proxyFile = new File( [blob], "youtube_stream.mp3", { type: "audio/mpeg" } );
          result.value = await TrackAnalyzer.analyze( proxyFile );
          return;
        }

        const chunks: Uint8Array[] = [];
        let receivedLength = 0;

        while ( true ) {
          const { done, value } = await reader.read();
          if ( done ) break;
          chunks.push( value );
          receivedLength += value.length;
          downloadProgress.value = receivedLength;
        }

        const blob = new Blob( chunks as BlobPart[], { type: "audio/mpeg" } );
        const proxyFile = new File( [blob], "youtube_stream.mp3", { type: "audio/mpeg" } );
        result.value = await TrackAnalyzer.analyze( proxyFile );

      } catch ( e: any ) {
        console.error( "Forensic Proxy Fetch Error:", e );
        throw new Error( "Forensic Proxy Error: " + e.message );
      }
    } else {
    // DIRECT MODE
      result.value = await TrackAnalyzer.analyzeUrl( targetUrl );
    }
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
  { name: "Viper (EDM)", type: "Quantized Pulse", url: "https://raw.githubusercontent.com/mdn/webaudio-examples/main/audio-analyser/viper.mp3" },
  { name: "Outfoxing", type: "Orchestral", url: "https://raw.githubusercontent.com/mdn/webaudio-examples/main/audio-basics/outfoxing.mp3" }
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
const { getContext } = useAudioEngine();

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

  const ctx = getContext();
  if ( !ctx ) return;
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
  const ctx = getContext();
  if ( !ctx ) return;
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

const emit = defineEmits( ['back'] )

const formatDuration = ( seconds: number ) => {
  const mins = Math.floor( seconds / 60 );
  const secs = Math.floor( seconds % 60 );
  return `${mins}:${secs.toString().padStart( 2, '0' )}`;
};

// Camelot Wheel Mapping
const CAMELOT_MAP: Record<string, string> = {
  'C major': '8B', 'A minor': '8A',
  'G major': '9B', 'E minor': '9A',
  'D major': '10B', 'B minor': '10A',
  'A major': '11B', 'F# minor': '11A',
  'E major': '12B', 'C# minor': '12A',
  'B major': '1B', 'G# minor': '1A',
  'F# major': '2B', 'D# minor': '2A',
  'Db major': '3B', 'Bb minor': '3A',
  'Ab major': '4B', 'F minor': '4A',
  'Eb major': '5B', 'C minor': '5A',
  'Bb major': '6B', 'G minor': '6A',
  'F major': '7B', 'D minor': '7A',
};

const getCamelotCode = ( key: string ): string => {
  return CAMELOT_MAP[key] || '?';
};

const getCompatibleKeys = ( key: string ): string[] => {
  const camelot = CAMELOT_MAP[key];
  if ( !camelot ) return [];

  const num = parseInt( camelot.slice( 0, -1 ) );
  const letter = camelot.slice( -1 );

  const compatible: string[] = [];
  // Same position (different mode)
  const samePos = `${num}${letter === 'A' ? 'B' : 'A'}`;
  // +1 and -1 on wheel
  const plus1 = `${num === 12 ? 1 : num + 1}${letter}`;
  const minus1 = `${num === 1 ? 12 : num - 1}${letter}`;

  // Find key names for these Camelot codes
  for ( const [keyName, code] of Object.entries( CAMELOT_MAP ) ) {
    if ( code === samePos || code === plus1 || code === minus1 ) {
      compatible.push( `${keyName} (${code})` );
    }
  }
  return compatible.slice( 0, 4 );
};

const getEnergyProfile = ( energyMap: number[] ): { label: string, color: string } => {
  if ( !energyMap || energyMap.length === 0 ) return { label: 'Unknown', color: 'text-slate-400' };

  const avg = energyMap.reduce( ( a, b ) => a + b, 0 ) / energyMap.length;
  const max = Math.max( ...energyMap );
  const start = energyMap.slice( 0, Math.floor( energyMap.length * 0.2 ) );
  const end = energyMap.slice( Math.floor( energyMap.length * 0.8 ) );
  const startAvg = start.reduce( ( a, b ) => a + b, 0 ) / start.length;
  const endAvg = end.reduce( ( a, b ) => a + b, 0 ) / end.length;

  if ( avg > 0.6 && max > 0.9 ) return { label: 'High Energy', color: 'text-rose-400' };
  if ( avg < 0.3 ) return { label: 'Chill / Ambient', color: 'text-cyan-400' };
  if ( endAvg > startAvg * 1.5 ) return { label: 'Building', color: 'text-amber-400' };
  if ( startAvg > endAvg * 1.5 ) return { label: 'Fading', color: 'text-purple-400' };
  return { label: 'Balanced', color: 'text-emerald-400' };
};

const generateObservations = (): string[] => {
  if ( !result.value ) return [];
  const obs: string[] = [];

  // Tempo observation
  if ( result.value.bpm < 90 ) obs.push( '• Slow tempo suggests ballad, ambient, or downtempo genre.' );
  else if ( result.value.bpm > 140 ) obs.push( '• Fast tempo indicates dance, drum & bass, or uptempo pop.' );
  else obs.push( '• Mid-tempo range is common for pop, hip-hop, and R&B.' );

  // Key observation
  if ( result.value.key.includes( 'minor' ) ) obs.push( '• Minor key suggests emotional, melancholic, or introspective mood.' );
  else obs.push( '• Major key indicates uplifting, bright, or celebratory character.' );

  // Section observation
  if ( result.value.sections.length > 4 ) obs.push( '• Complex arrangement with multiple distinct sections detected.' );
  else obs.push( '• Simple structure with minimal section changes.' );

  // Energy observation
  const energy = getEnergyProfile( result.value.energyMap );
  obs.push( `• Energy profile: ${energy.label} — suitable for ${energy.label === 'High Energy' ? 'peak-time DJ sets' : 'warm-up or cool-down'}. ` );

  return obs;
};

const exportAnalysis = () => {
  if ( !result.value ) return;

  const analysis = {
    fileName: result.value.fileName,
    bpm: result.value.bpm,
    key: result.value.key,
    camelot: getCamelotCode( result.value.key ),
    compatibleKeys: getCompatibleKeys( result.value.key ),
    duration: result.value.duration,
    durationFormatted: formatDuration( result.value.duration ),
    energyProfile: getEnergyProfile( result.value.energyMap ).label,
    sections: result.value.sections,
    observations: generateObservations(),
    exportedAt: new Date().toISOString()
  };

  const blob = new Blob( [JSON.stringify( analysis, null, 2 )], { type: 'application/json' } );
  const link = document.createElement( 'a' );
  link.download = `tracktracer-${result.value.fileName.replace( /[^a-z0-9]/gi, '_' )}.json`;
  link.href = URL.createObjectURL( blob );
  link.click();
};
</script>

<template>
  <div class="space-y-8 max-w-5xl mx-auto">

    <header class="flex justify-between items-end">
      <div>
        <button
          @click="emit( 'back' )"
          class="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 hover:text-white transition-colors mb-4 flex items-center gap-2"
        >
          <span>←</span> Back to Tonic
        </button>
        <h2 class="text-4xl font-black text-white italic tracking-tighter uppercase">Track<span
            class="text-blue-500">Tracer</span> <span class="text-indigo-400 text-lg">Pro</span></h2>
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
        <!-- Input Methods Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Listen Mode (Rose Theme) -->
          <div
            v-if=" !isListening "
            class="relative group cursor-pointer h-48 rounded-[2.5rem] bg-rose-500/5 border border-rose-500/20 backdrop-blur-xl hover:border-rose-500/50 transition-all flex flex-col items-center justify-center p-8 overflow-hidden"
            @click="startListening"
          >
            <div class="flex flex-col items-center">
              <div class="text-3xl mb-3 group-hover:scale-110 transition-transform">🎤</div>
              <h3 class="text-lg font-bold text-rose-400 mb-1 uppercase tracking-tight">Listen Mode</h3>
              <p class="text-slate-500 text-[9px] font-mono uppercase tracking-[0.2em]">Record from Microphone</p>
            </div>
          </div>

          <!-- Listening State with Audio Level Visualizer -->
          <div
            v-else
            class="relative h-48 rounded-[2.5rem] bg-rose-500/10 border border-rose-500/50 backdrop-blur-xl flex flex-col items-center justify-center p-6 overflow-hidden"
          >
            <!-- Waveform Visualizer -->
            <div class="relative w-full h-24 mb-4 bg-rose-500/10 rounded-xl overflow-hidden">
              <canvas
                ref="waveformCanvas"
                class="w-full h-full"
              ></canvas>
            </div>

            <div class="flex items-center gap-4 mb-3">
              <div class="w-3 h-3 rounded-full bg-rose-500 animate-pulse"></div>
              <h3 class="text-lg font-bold text-rose-400 uppercase tracking-tight">Listening</h3>
              <span
                class="text-white font-mono text-lg font-black">{{ Math.floor( listeningDuration / 60 ) }}:{{ ( listeningDuration % 60 ).toString().padStart( 2, '0' ) }}</span>
            </div>

            <button
              @click="stopListening"
              class="px-6 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black uppercase tracking-widest text-[10px] transition-all active:scale-95"
            >
              Stop & Analyze
            </button>
          </div>

          <!-- File Upload (Blue Theme) -->
          <div
            class="relative group cursor-pointer h-48 rounded-[2.5rem] bg-blue-500/5 border border-blue-500/20 backdrop-blur-xl border-dashed hover:border-blue-500/50 transition-all flex flex-col items-center justify-center p-8 overflow-hidden"
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
              <div class="text-3xl mb-3 group-hover:scale-110 transition-transform">📁</div>
              <h3 class="text-lg font-bold text-blue-400 mb-1 uppercase tracking-tight">Upload File</h3>
              <p class="text-slate-500 text-[9px] font-mono uppercase tracking-[0.2em]">MP3, WAV, FLAC, etc.</p>
            </div>
          </div>
        </div>

        <!-- URL & Gallery Section (Cyan Theme) -->
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
          class="h-64 rounded-[3rem] bg-white/5 border border-white/5 backdrop-blur-xl flex flex-col items-center justify-center p-12 overflow-hidden relative"
        >
          <!-- Metadata Preview (Absolute Background) -->
          <div
            v-if=" videoMetadata "
            class="absolute inset-0 z-0 opacity-20 bg-cover bg-center blur-md"
            :style="{ backgroundImage: `url(${videoMetadata.thumbnail})` }"
          ></div>

          <div class="z-10 flex flex-col items-center w-full max-w-md">
            <div
              v-if=" videoMetadata "
              class="mb-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-700"
            >
              <h4 class="text-white font-black text-lg uppercase italic tracking-tight mb-1 drop-shadow-lg">
                {{ videoMetadata.title }}</h4>
              <p class="text-blue-300 font-mono text-xs uppercase tracking-widest">{{ videoMetadata.uploader }} •
                {{ Math.floor( videoMetadata.duration / 60 ) }}:{{ ( videoMetadata.duration % 60 ).toString().padStart( 2, '0' ) }}
              </p>
            </div>
            <div
              v-else
              class="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-6"
            ></div>

            <!-- Progress Bar -->
            <div
              v-if=" downloadProgress > 0 "
              class="w-full bg-black/50 h-2 rounded-full overflow-hidden mb-2 backdrop-blur-md border border-white/10"
            >
              <div
                class="h-full bg-blue-500 transition-all duration-200"
                :style="{ width: downloadTotal ? ( downloadProgress / downloadTotal * 100 ) + '%' : '100%', opacity: downloadTotal ? 1 : 0.5 }"
              ></div>
            </div>

            <p class="text-blue-400 font-bold uppercase tracking-widest text-xs animate-pulse drop-shadow-md">
              {{ videoMetadata ? 'Deconstructing Signal...' : 'Establishing Link...' }}
              <span
                v-if=" downloadProgress > 0 "
                class="ml-2 font-mono text-white opacity-70"
              >{{ ( downloadProgress / 1024 / 1024 ).toFixed( 1 ) }} MB</span>
            </p>
          </div>
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
                <div class="text-right">

                  <span class="text-lg font-black text-cyan-400 italic">{{ result!.key }}</span>

                  <span class="ml-2 text-sm font-black text-amber-400">{{ getCamelotCode( result!.key ) }}</span>
                </div>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-[10px] text-slate-500 uppercase tracking-widest">Energy</span>
                <span
                  :class="getEnergyProfile( result!.energyMap ).color"
                  class="text-sm font-black italic"
                >{{ getEnergyProfile( result!.energyMap ).label }}</span>

              </div>
              <div class="flex justify-between items-center">
                <span class="text-[10px] text-slate-500 uppercase tracking-widest">Runtime</span>
                <span class="text-base font-mono font-bold text-white">{{ formatDuration( result!.duration ) }}</span>
              </div>
            </div>

            <!-- Compatible Keys (Pro Feature) -->
            <div class="pt-4 border-t border-white/5">
              <p class="text-[8px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-3">Harmonic Mix Keys</p>
              <div class="flex flex-wrap gap-2">
                <span
                  v-for=" compatKey in getCompatibleKeys( result!.key ) "
                  :key="compatKey"
                  class="text-[9px] px-2 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300"
                >{{ compatKey }}</span>
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

              <button
                @click="exportAnalysis"
                class="w-full py-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-[9px] font-black uppercase tracking-widest text-emerald-400 transition-all flex items-center justify-center gap-2"
              >
                <span>💾</span> Export Analysis (JSON)
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
            <h4 class="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500 mb-6">Expert Observations <span
                class="text-indigo-400"
              >(Pro AI)</span></h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px] text-slate-400 leading-relaxed italic">
              <p
                v-for=" ( obs, i ) in generateObservations() "
                :key="i"
              >{{ obs }}</p>

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
