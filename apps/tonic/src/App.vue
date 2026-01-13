<script setup lang="ts">
import { ref, onMounted, computed, watch, onUnmounted } from 'vue'
import AuraTuneModule from './modules/auratune/AuraTuneModule.vue';
import ScaleSleuthModule from './modules/scalesleuth/ScaleSleuthModule.vue';
import ChordCaptureModule from './modules/chordcapture/ChordCaptureModule.vue';
import PocketEngineModule from './modules/pocketengine/PocketEngineModule.vue';
import FrequencyFlowModule from './modules/frequencyflow/FrequencyFlowModule.vue';
import TrackTracerModule from './modules/tracktracer/TrackTracerModule.vue';
import HarmonicOrbitModule from './modules/harmonicorbit/HarmonicOrbitModule.vue';
import AcademyModule from './modules/academy/AcademyModule.vue';
import LessonRunner from './modules/academy/LessonRunner.vue';
import { type Lesson } from './modules/academy/lessons';
import ToolInfoModal from './components/ToolInfoModal.vue';
import SettingsModal from './components/settings/SettingsModal.vue';
import ToastContainer from './components/ToastContainer.vue';
import { useAudioEngine, StorageService } from '@spectralsuite/core'
import { useDiagnosticToasts } from './composables/useDiagnosticToasts';

// Enable global diagnostic toast notifications
useDiagnosticToasts();

const currentModule = ref( 'dashboard' )
const activeLesson = ref<Lesson | null>( null )
const { isInitialized, inputGain, setGain, getAnalyser } = useAudioEngine()
const volumeLevel = ref( 0 )
let rafId: number | null = null

// Modal State
const showSettingsModal = ref( false );
const settingsInitialTab = ref( 'platform' );

const openSettings = ( tab: string = 'platform' ) => {
  settingsInitialTab.value = tab;
  showSettingsModal.value = true;
};

const ALL_TOOLS = [
  {
    id: 'auratune',
    name: 'AuraTune',
    description: 'Immersive reactive visualizer for melodic exploration and visual performance.',
    icon: '✨',
    color: 'from-sky-500 to-blue-600'
  },
  {
    id: 'scalesleuth',
    name: 'ScaleSleuth',
    description: 'Deep scale analysis engine. Identify modes and melodic structures.',
    icon: '🔍',
    color: 'from-emerald-500 to-teal-600'
  },
  {
    id: 'chordcapture',
    name: 'ChordCapture',
    description: 'Real-time harmonic recognition and note sequence building.',
    icon: '🎹',
    color: 'from-indigo-500 to-purple-600'
  },
  {
    id: 'pocketengine',
    name: 'Pocket Engine',
    description: 'Rhythm & timing diagnostic. Master your internal clock.',
    icon: '⏱️',
    color: 'from-rose-500 to-orange-600'
  },
  {
    id: 'frequencyflow',
    name: 'Frequency Flow',
    description: 'Engineering-grade spectral analysis. See the physics of your sound.',
    icon: '🌊',
    color: 'from-cyan-500 to-blue-600'
  },
  {
    id: 'tracktracer',
    name: 'TrackTracer',
    description: 'Forensic song deconstruction. Extract BPM, Key, and structural DNA from audio files.',
    icon: '🧪',
    color: 'from-blue-600 to-cyan-500'
  },
  {
    id: 'academy',
    name: 'Spectral Academy',
    description: 'Interactive music theory lessons. Learn via active performance.',
    icon: '🎓',
    color: 'from-emerald-600 to-green-500'
  },
  {
    id: 'harmonicorbit',
    name: 'Harmonic Orbit',
    description: 'Explore the colorful world of Musical Families on the Harmony Wheel.',
    icon: '🎡',
    color: 'from-indigo-600 to-sky-500'
  }
]

const enabledTools = ref<Record<string, boolean>>( {
  auratune: true,
  scalesleuth: true,
  chordcapture: true,
  pocketengine: true,
  frequencyflow: true,
  tracktracer: true,
  harmonicorbit: true,
  academy: false
} )

// Volume Monitoring Logic
const updateVolume = () => {
  const analyser = getAnalyser()
  if ( analyser && isInitialized.value ) {
    const dataArray = new Uint8Array( analyser.frequencyBinCount )
    analyser.getByteFrequencyData( dataArray )

    let sum = 0
    for ( let i = 0; i < dataArray.length; i++ ) {
      sum += dataArray[i]!
    }
    const average = sum / dataArray.length
    volumeLevel.value = Math.min( 100, ( average / 128 ) * 100 )
  }
  rafId = requestAnimationFrame( updateVolume )
}

// Persistence logic
onMounted( () => {
  const saved = StorageService.getJSON<Record<string, boolean>>( 'ENABLED_TOOLS' )
  if ( saved ) {
    enabledTools.value = { ...enabledTools.value, ...saved }
  }
  updateVolume()
} )

onUnmounted( () => {
  if ( rafId ) cancelAnimationFrame( rafId )
} )

watch( enabledTools, ( val ) => {
  StorageService.setJSON( 'ENABLED_TOOLS', val )
}, { deep: true } )

const activeTools = computed( () => ALL_TOOLS.filter( t => enabledTools.value[t.id] ) )

const toggleTool = ( id: string ) => {
  enabledTools.value[id] = !enabledTools.value[id]

  if ( !enabledTools.value[id] && currentModule.value === id ) {
    currentModule.value = 'dashboard'
  }
}

const handleGainChange = ( event: Event ) => {
  const value = parseFloat( ( event.target as HTMLInputElement ).value )
  setGain( value )
}
</script>

<template>
  <div class="min-h-screen bg-spectral-950 text-slate-200 font-inter selection:bg-indigo-500/30 selection:text-white">
    <!-- Immersive Background -->
    <div class="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      <div class="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-indigo-500/10 blur-[120px] rounded-full"></div>
      <div class="absolute bottom-[-5%] right-[-5%] w-[600px] h-[600px] bg-sky-500/10 blur-[100px] rounded-full"></div>
    </div>

    <!-- Main Navigation Ribbon -->
    <nav
      class="fixed top-0 left-0 right-0 h-16 bg-spectral-950/50 border-b border-white/5 backdrop-blur-md flex items-center px-8 z-50"
    >
      <div
        class="flex items-center gap-3 cursor-pointer"
        @click="currentModule = 'dashboard'"
      >
        <img
          src="/favicon.webp"
          alt="Spectral Suite Logo"
          class="w-8 h-8 rounded-lg shadow-lg shadow-indigo-500/20"
        />
        <h1 class="font-bold text-xl tracking-tighter text-white uppercase">SPECTRAL <span
            class="text-indigo-400 font-black"
          >SUITE</span></h1>
      </div>

      <div class="ml-auto flex gap-6">
        <button
          @click="currentModule = 'dashboard'"
          class="text-[10px] font-black uppercase tracking-[0.2em] transition-all"
          :class="currentModule === 'dashboard' ? 'text-white' : 'text-slate-500 hover:text-slate-300'"
        >Tonic</button>
        <button
          v-if=" enabledTools.academy "
          @click="currentModule = 'academy'"
          class="text-[10px] font-black uppercase tracking-[0.2em] transition-all"
          :class="currentModule === 'academy' ? 'text-white' : 'text-slate-500 hover:text-slate-300'"
        >Academy</button>
        <button
          @click="openSettings( 'platform' )"
          class="text-[10px] font-black uppercase tracking-[0.2em] transition-all text-slate-500 hover:text-slate-300"
        >Settings</button>
      </div>
    </nav>

    <!-- App Content Wrapper -->
    <main class="relative z-10 pt-24 pb-32 max-w-7xl mx-auto px-6">

      <!-- DASHBOARD VIEW -->
      <div
        v-if=" currentModule === 'dashboard' "
        class="animate-in fade-in slide-in-from-bottom-4 duration-1000"
      >
        <header class="mb-12">
          <div class="flex items-baseline gap-4 mb-3">
            <h2 class="text-4xl font-black tracking-tighter text-white uppercase italic">Tonic</h2>
            <div class="h-px flex-1 bg-gradient-to-r from-indigo-500/50 to-transparent"></div>
          </div>
          <div class="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <p class="text-slate-400 text-sm max-w-xl leading-relaxed italic">
              In music theory, the <span class="text-indigo-400 font-bold">Tonic</span> is the "home" note—the
              foundation of resolution and stability.
              This dashboard is your harmonic center: the home base from which you explore the spectrum and return to
              find balance.
            </p>
            <p class="text-slate-500 font-mono text-[10px] uppercase tracking-widest whitespace-nowrap">
              Active Modules: {{ activeTools.length }}
            </p>
          </div>
        </header>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            v-for=" tool in activeTools "
            :key="tool.id"
            class="group relative p-8 rounded-[2.5rem] bg-white/5 border border-white/5 backdrop-blur-xl transition-all duration-500 hover:bg-white/[0.08] hover:border-white/10 hover:-translate-y-2 cursor-pointer overflow-hidden"
            @click="currentModule = tool.id"
          >
            <!-- Decorative Glow -->
            <div
              class="absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br opacity-10 blur-3xl group-hover:opacity-30 transition-opacity"
              :class="tool.color"
            ></div>

            <div class="relative z-10">
              <div class="text-4xl mb-6 transform group-hover:scale-110 transition-transform duration-500">
                {{ tool.icon }}
              </div>
              <h3 class="text-2xl font-black text-white mb-3 tracking-tight">{{ tool.name }}</h3>
              <p
                class="text-sm text-slate-400 leading-relaxed mb-8 opacity-80 group-hover:opacity-100 transition-opacity">
                {{ tool.description }}
              </p>
              <div
                class="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-400 group-hover:gap-4 transition-all"
              >
                Launch Module <span>→</span>
              </div>
            </div>
          </div>

          <!-- Empty Slot / Add Tool -->
          <div
            class="flex flex-col items-center justify-center p-8 rounded-[2.5rem] border border-dashed border-white/10 opacity-40 hover:opacity-100 hover:bg-white/5 transition-all cursor-pointer group"
            @click="openSettings( 'platform' )"
          >
            <div
              class="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center text-xl mb-4 group-hover:rotate-90 transition-transform"
            >＋</div>
            <p class="text-[10px] items-center font-black uppercase tracking-widest">Configure Modules</p>
          </div>
        </div>
      </div>

      <!-- MODULE VIEWS -->
      <AuraTuneModule
        v-else-if=" currentModule === 'auratune' && enabledTools.auratune "
        @back="currentModule = 'dashboard'"
        @open-settings="openSettings( 'engine' )"
      />
      <ScaleSleuthModule
        v-else-if=" currentModule === 'scalesleuth' && enabledTools.scalesleuth "
        @back="currentModule = 'dashboard'"
        @open-settings="openSettings( 'engine' )"
      />
      <ChordCaptureModule
        v-else-if=" currentModule === 'chordcapture' && enabledTools.chordcapture "
        @back="currentModule = 'dashboard'"
        @open-settings="openSettings( 'engine' )"
      />
      <PocketEngineModule
        v-else-if=" currentModule === 'pocketengine' && enabledTools.pocketengine "
        @back="currentModule = 'dashboard'"
      />
      <FrequencyFlowModule
        v-else-if=" currentModule === 'frequencyflow' && enabledTools.frequencyflow "
        @back="currentModule = 'dashboard'"
      />
      <TrackTracerModule
        v-else-if=" currentModule === 'tracktracer' && enabledTools.tracktracer "
        @back="currentModule = 'dashboard'"
      />
      <HarmonicOrbitModule
        v-else-if=" currentModule === 'harmonicorbit' && enabledTools.harmonicorbit "
        @back="currentModule = 'dashboard'"
      />
      <AcademyModule
        v-else-if=" currentModule === 'academy' "
        @start-lesson="( l ) => activeLesson = l"
        @back="currentModule = 'dashboard'"
      />

      <div
        v-else
        class="flex flex-col items-center justify-center py-20 animate-pulse"
      >
        <div class="w-20 h-20 border-4 border-dashed border-slate-700 rounded-3xl mb-6"></div>
        <p class="font-mono text-[10px] uppercase tracking-[0.5em] text-slate-600">Module Load Failure or Disabled</p>
        <button
          @click="currentModule = 'dashboard'"
          class="mt-8 text-indigo-400 font-bold uppercase tracking-widest text-[9px] hover:text-white transition-colors"
        >Return to Base</button>
      </div>

      <ToolInfoModal />

      <!-- Global Settings Modal -->
      <SettingsModal
        :show="showSettingsModal"
        :initial-tab="settingsInitialTab"
        :tools="ALL_TOOLS"
        :enabled-state="enabledTools"
        :enabled-callback="toggleTool"
        @close="showSettingsModal = false"
      />

      <!-- Global Toast Notifications -->
      <ToastContainer />

      <!-- ACADEMY OVERLAY MOVED -->
    </main>

    <!-- ACADEMY OVERLAY (Persistent Lesson Runner) -->
    <!-- Moved outside <main> to avoid z-index stacking context issues with Footer -->
    <transition
      enter-active-class="transform transition duration-500 ease-out"
      enter-from-class="-translate-x-full opacity-0"
      enter-to-class="translate-x-0 opacity-100"
      leave-active-class="transform transition duration-300 ease-in"
      leave-from-class="translate-x-0 opacity-100"
      leave-to-class="-translate-x-full opacity-0"
    >
      <div
        v-if=" activeLesson "
        class="fixed inset-0 pointer-events-none z-[60]"
      >
        <LessonRunner
          class="pointer-events-auto"
          :lesson="activeLesson"
          :current-module="currentModule"
          @complete="activeLesson = null; currentModule = 'academy'"
          @quit="activeLesson = null; currentModule = 'academy'"
          @tool-change="( toolId ) => currentModule = toolId"
        />
      </div>
    </transition>

    <!-- Persistent Global Status Bar -->
    <div
      class="fixed bottom-0 left-0 right-0 h-16 bg-spectral-950 border-t border-white/5 backdrop-blur-xl flex items-center px-8 z-50"
    >
      <div class="flex items-center gap-8 overflow-x-auto no-scrollbar scroll-smooth w-full md:w-auto">
        <div class="flex flex-col flex-shrink-0 group relative">
          <div class="flex items-center justify-between mb-1.5">
            <span class="text-[8px] uppercase tracking-[0.3em] text-slate-500 font-black">Input Gain</span>
            <span
              class="text-[8px] font-mono text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">{{ Math.round( inputGain * 100 ) }}%</span>
          </div>

          <div class="relative w-32 h-1.5 bg-slate-900 rounded-full overflow-hidden border border-white/5">
            <!-- Background Meter (Volume) -->
            <div
              class="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500/40 to-cyan-500/40 transition-all duration-75"
              :style="{ width: volumeLevel + '%' }"
            ></div>

            <!-- Interactive Slider Overlay -->
            <input
              type="range"
              min="0"
              max="2"
              step="0.01"
              :value="inputGain"
              @input="handleGainChange"
              class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />

            <!-- Visual Handle/Progress -->
            <div
              class="absolute inset-y-0 left-0 bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)] pointer-events-none transition-all"
              :style="{ width: ( inputGain / 2 ) * 100 + '%' }"
            ></div>
          </div>
        </div>

        <div class="h-6 w-px bg-white/5 hidden md:block"></div>

        <div class="flex flex-col flex-shrink-0 hidden sm:flex">
          <span class="text-[8px] uppercase tracking-[0.3em] text-slate-500 font-black">Global Engine</span>
          <span
            class="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">{{ isInitialized ? 'Synced' : 'Standby' }}</span>
        </div>
      </div>

      <!-- Quick Switcher Dots -->
      <div class="ml-auto flex gap-2">
        <div
          v-for=" tool in activeTools "
          :key="tool.id"
          class="w-2 h-2 rounded-full transition-all cursor-pointer"
          :class="currentModule === tool.id ? 'bg-indigo-400 w-6' : 'bg-white/10 hover:bg-white/30'"
          @click="currentModule = tool.id"
          :title="tool.name"
        ></div>
        <div class="w-px h-3 bg-white/10 mx-1"></div>
        <div
          class="w-2 h-2 rounded-full transition-all cursor-pointer"
          :class="currentModule === 'dashboard' ? 'bg-white w-6' : 'bg-white/10 hover:bg-white/30'"
          @click="currentModule = 'dashboard'"
          title="Tonic"
        ></div>
      </div>
    </div>
  </div>
</template>

<style>
@import "tailwindcss";

:root {
  color-scheme: dark;
}

body {
  margin: 0;
  background-color: var(--color-spectral-950);
  font-family: 'Inter', sans-serif;
}

.font-inter {
  font-family: 'Inter', sans-serif;
}

/* Hide scrollbar for Chrome, Safari and Opera */
.no-scrollbar::-webkit-scrollbar {
  display: none;
}

/* Hide scrollbar for IE, Edge and Firefox */
.no-scrollbar {
  -ms-overflow-style: none;
  /* IE and Edge */
  scrollbar-width: none;
  /* Firefox */
}

/* Base Headings & Animations from ChordCapture to maintain cohesion */
@font-face {
  font-family: 'Outfit';
  src: url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;900&display=swap');
}
</style>
