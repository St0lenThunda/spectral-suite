<script setup lang="ts">
/**
 * PocketEngineModule.vue
 * The main orchestrator for the Pocket Engine rhythm training suite.
 * 
 * ARCHITECTURE:
 * - State Management: Uses `useRhythmStore` (Pinia) for the timing engine.
 * - Modular Layouts: Dynamically switches between different interface "Skins" 
 *   (Classic, Studio, Command, Grid, HUD) using the `activeLayout` component.
 * - Global Settings: Centralizes all training parameters (Subdivision, Tempo, 
 *   Gap Click, Ladder, Stealth) in a single `LocalSettingsDrawer`.
 */
import { ref, computed, onDeactivated, watch, markRaw } from 'vue'
import { useRhythmStore } from '@spectralsuite/core'
import { storeToRefs } from 'pinia';
import IntelligenceButton from '../../components/IntelligenceButton.vue';
import LocalSettingsDrawer from '../../components/settings/LocalSettingsDrawer.vue';
import SettingsToggle from '../../components/settings/SettingsToggle.vue';
import EngineSettings from '../../components/settings/EngineSettings.vue';

// Layout Imports
// We use markRaw to prevent Vue from making these large component objects reactive,
// which improves performance during layout switching.
import PocketEngineClassic from './layouts/PocketEngineClassic.vue';
import ConsoleLayout from './layouts/ConsoleLayout.vue';
import PocketEngineCommand from './layouts/PocketEngineCommand.vue';
import PocketEngineGrid from './layouts/PocketEngineGrid.vue';

/**
 * CORE ENGINE STATE
 * We destructure the store to get reactive references (storeToRefs) and direct methods.
 */
const store = useRhythmStore();
const {
  isInitialized,
  isPlaying,
  tempo,
  error,
  timingOffset,
  history: timingHistory
} = storeToRefs( store );

const { init: initStore, stats, toggle: togglePlay, setTempo, setSubdivision, setPolySubdivision, setMuteProbability, onFlash, metronome, resetStats } = store;

/**
 * TRAINING STATE
 * Local variables that control specific training modes.
 */
const subdivision = ref( 1 )
const polySubdivision = ref( 0 )
const isFlashEnabled = ref( true )
const isFlashing = ref( false )
const gapIntensity = ref( 0 )
const isSettingsOpen = ref( false )

// Ladder: Auto-bpm increase system
const isLadderEnabled = ref( false )
const ladderIncrement = ref( 5 )
const ladderInterval = ref( 4 )
const ladderGoal = ref( 200 )

// Stealth: Silence blocks to test internal clock
const stealthBarsOn = ref( 4 )
const stealthBarsOff = ref( 2 )
const isStealthEnabled = ref( false )

/**
 * LAYOUT CONFIGURATION
 * Defines the available visual modes for the engine.
 */
const layouts = [
  { id: 'studio', name: 'Studio', description: 'Premium 10/80/10 Interactive Console', component: markRaw(ConsoleLayout) },
  { id: 'command', name: 'Command', description: 'Centralized HUD with Instrument Cluster', component: markRaw(PocketEngineCommand) },
  { id: 'classic', name: 'Original', description: 'The baseline Pocket Engine experience', component: markRaw(PocketEngineClassic) },
  { id: 'grid', name: 'Grid', description: 'High-density multi-pulse visualization', component: markRaw(PocketEngineGrid) }
]
const activeLayoutId = ref('studio')
const activeLayout = computed(() => layouts.find(l => l.id === activeLayoutId.value)?.component || ConsoleLayout)

/**
 * SETTINGS DRAWER CATEGORIES
 * We add a 'Layout' category here so the user can switch views within the settings.
 */
const drawerCategories = computed( () => [
  { id: 'Layout', label: 'Console Layout', description: 'Switch between Studio, Command, and Classic views', showIndicator: false },
  { id: 'General', label: 'Rhythm Basics', description: 'Subdivision, Flash, Poly, Accents', showIndicator: false },
  { id: 'Engine', label: 'Audio Engine', description: 'Mic Sensitivity & Gate', showIndicator: isInitialized.value },
  { id: 'Stability', label: 'Stability (Gap)', description: 'Gap Click training intensity', showIndicator: gapIntensity.value > 0 },
  { id: 'Ladder', label: 'Auto-Ladder', description: 'Automatic Tempo progression', showIndicator: isLadderEnabled.value },
  { id: 'Stealth', label: 'Stealth Mode', description: 'Cognitive silence cycles', showIndicator: isStealthEnabled.value }
] );

// Accent Logic
const accentPattern = ref<number[]>( [3, 2, 2, 2] )
const currentPulse = computed( () => store.currentPulse )

const cycleAccent = ( index: number ) => {
  const levels = [3, 2, 1, 0]
  const currentLevel = accentPattern.value[index] ?? 2
  const nextIdx = ( levels.indexOf( currentLevel ) + 1 ) % levels.length
  accentPattern.value[index] = levels[nextIdx]!
  metronome.setAccentPattern( [...accentPattern.value] )
}

const applyPattern = ( type: 'downbeat' | 'backbeat' | 'jazz' ) => {
  let pattern: number[] = []
  const len = subdivision.value * 4
  switch ( type ) {
    case 'backbeat':
      pattern = Array( len ).fill( 0 ).map( ( _, i ) => (Math.floor( i / subdivision.value ) + 1 === 2 || Math.floor( i / subdivision.value ) + 1 === 4) ? 3 : 1 )
      break
    case 'jazz':
      pattern = Array( len ).fill( 1 ).map( ( _, i ) => ( i % 2 !== 0 ? 3 : 1 ) )
      break
    default:
      pattern = Array( len ).fill( 2 ); pattern[0] = 3
  }
  accentPattern.value = pattern
  metronome.setAccentPattern( accentPattern.value )
}

// Precision Math
const pocketPosition = computed( () => Math.max( 0, Math.min( 100, ( ( timingOffset.value + 200 ) / 400 ) * 100 ) ) )
const pocketColor = computed( () => {
  const abs = Math.abs( timingOffset.value )
  if ( abs < 30 ) return 'bg-emerald-500'
  return timingOffset.value > 0 ? 'bg-orange-500' : 'bg-rose-500'
} )

const tendency = computed( () => {
  if ( stats.rush > stats.drag * 1.5 ) return 'Rushing'
  if ( stats.drag > stats.rush * 1.5 ) return 'Dragging'
  return stats.total > 0 ? 'Balanced' : 'No data yet'
} )

const avgOffset = computed( () => {
  if ( timingHistory.value.length === 0 ) return 0
  const sum = timingHistory.value.reduce( ( a: number, b: number ) => a + b, 0 )
  return Math.round( sum / timingHistory.value.length )
} )

// Flash Handler
onFlash( () => {
  if ( isFlashEnabled.value ) {
    isFlashing.value = true
    setTimeout( () => isFlashing.value = false, 100 )
  }
} )

// Radial History for Studio/Command Map
const grooveHistory = ref<Array<{ offset: number, time: number }>>( [] )
watch( () => stats.total, () => {
  if ( timingHistory.value.length === 0 ) return;
  grooveHistory.value.push( { offset: timingHistory.value[timingHistory.value.length - 1] ?? 0, time: performance.now() } );
  if ( grooveHistory.value.length > 32 ) grooveHistory.value.shift();
} );

// Update Methods
const updateTempo = ( value: number ) => { setTempo( value ) }
const updateSubdivision = ( value: number ) => { subdivision.value = value; setSubdivision( value ) }
const updatePolyrhythm = ( value: number ) => { polySubdivision.value = value; setPolySubdivision( value ) }
const updateGapIntensity = ( value: number ) => { gapIntensity.value = value; setMuteProbability( value / 100 ) }
const updateLadder = () => {
  if ( isLadderEnabled.value ) metronome.setProgression( ladderIncrement.value, ladderInterval.value, ladderGoal.value )
  else metronome.setProgression( 0, 0 )
}
const updateStealth = () => metronome.setStealthMode( stealthBarsOn.value, stealthBarsOff.value, isStealthEnabled.value )
const reset = () => { resetStats(); grooveHistory.value = [] }

watch( isPlaying, ( newData ) => newData && metronome.setAccentPattern( accentPattern.value ) )

import { useAudioEngine } from '@spectralsuite/core';
const { init: initAudio, activate, deactivate } = useAudioEngine();

/**
 * INITIALIZATION HANDLER
 * Browser security requires a user gesture (like a click) to start 
 * the audio engine. We wrap the store's init and the audio activate
 * into this single function called by the "Enable Sync" button.
 */
const handleInit = async () => {
  try {
    // 1. Initialize the global hardware engine first
    // This requests mic permissions and sets up the input stream.
    await initAudio();

    // 2. Activate the hardware audio context (resumes AudioContext)
    activate();

    // 3. Initialize the rhythm store (sequencer, workers, detection)
    await initStore();
  } catch (err) {
    console.error("Pocket Engine Init Failed:", err);
  }
}

onDeactivated( () => { deactivate(); } )
const emit = defineEmits( ['back'] )
</script>

<template>
  <div class="h-full flex flex-col bg-slate-950 text-slate-200 overflow-hidden relative">
    
    <!-- STANDARD HEADER: Unifies look across all layouts (Always visible) -->
    <header class="p-6 shrink-0 flex justify-between items-end border-b border-white/5 relative z-OVERLAY">
      <div>
        <button
          @click="emit( 'back' )"
          class="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 hover:text-white transition-colors mb-4 flex items-center gap-2"
        >
          <span>←</span> Back to Tonic
        </button>
        <h2 class="text-3xl font-black text-white italic uppercase tracking-tighter">
          Pocket <span class="text-orange-500">Engine</span>
        </h2>
        <div class="flex items-center gap-3 mt-1">
          <p class="text-slate-500 text-[10px] font-mono uppercase tracking-[0.2em]">
            Rhythm Accuracy Training
          </p>
          <div v-if="isInitialized" class="w-2 h-2 rounded-full" :class="isPlaying ? 'bg-orange-500 animate-pulse' : 'bg-slate-800'"></div>
        </div>
      </div>
      <div class="flex items-center gap-4">
        <SettingsToggle
          v-if="isInitialized"
          :is-open="isSettingsOpen"
          @click="isSettingsOpen = !isSettingsOpen"
        />
        <IntelligenceButton v-if="isInitialized" toolId="pocketengine" />
      </div>
    </header>

    <!-- SETTINGS DRAWER: Centralized configuration HUB -->
    <LocalSettingsDrawer
      :is-open="isSettingsOpen"
      :categories="drawerCategories"
      @close="isSettingsOpen = false"
    >
      <!-- NEW: Layout Selector Category -->
      <template #Layout>
        <div class="p-6 space-y-4">
           <label class="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Choose Console Experience</label>
           <div class="grid grid-cols-1 gap-2">
              <button 
                v-for="layout in layouts" 
                :key="layout.id"
                @click="activeLayoutId = layout.id"
                class="flex flex-col items-start p-4 rounded-2xl transition-all border group"
                :class="activeLayoutId === layout.id ? 'bg-orange-500/20 border-orange-500/50' : 'bg-white/5 border-white/5 hover:bg-white/10'"
              >
                <div class="flex justify-between w-full items-center mb-1">
                   <span class="text-xs font-black uppercase" :class="activeLayoutId === layout.id ? 'text-white' : 'text-slate-400'">{{ layout.name }}</span>
                   <div v-if="activeLayoutId === layout.id" class="w-1.5 h-1.5 rounded-full bg-orange-500"></div>
                </div>
                <span class="text-[9px] text-slate-500 font-mono leading-tight group-hover:text-slate-400 transition-colors">{{ layout.description }}</span>
              </button>
           </div>
        </div>
      </template>

      <template #General>
        <div class="p-4 space-y-6">
          <!-- Subdivision Controls -->
          <div>
            <label class="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 block">Subdivision</label>
            <div class="grid grid-cols-4 gap-2">
              <button v-for="(label, s) in { 1: '1/4', 2: '1/8', 3: '1/12', 4: '1/16' }" :key="s"
                @click="updateSubdivision(Math.floor(Number(s)))"
                class="h-10 rounded-xl font-black text-[10px] transition-all border"
                :class="subdivision === Math.floor(Number(s)) ? 'bg-orange-600 border-orange-400 text-white' : 'bg-slate-950/50 border-white/5 text-slate-600'"
              >
                {{ label }}
              </button>
            </div>
          </div>
          <!-- Flash Toggle -->
          <label class="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10">
            <span class="text-[10px] font-black uppercase tracking-widest text-slate-400">Visual Flash</span>
            <input type="checkbox" v-model="isFlashEnabled" class="sr-only peer" />
            <div class="w-9 h-5 bg-black/40 rounded-full peer peer-checked:bg-orange-500/80 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full peer-checked:after:bg-white border border-white/10 relative"></div>
          </label>
        </div>
      </template>

      <template #Stability>
        <div class="p-6 space-y-4">
           <div class="flex justify-between items-center mb-2">
             <label class="text-[10px] font-black uppercase tracking-widest text-slate-500">Gap Intensity</label>
             <span class="text-[12px] font-black text-emerald-400 font-mono">{{ gapIntensity }}%</span>
           </div>
           <input type="range" min="0" max="90" step="5" :value="gapIntensity" @input="updateGapIntensity(parseInt(($event.target as HTMLInputElement).value))" class="w-full accent-emerald-500" />
           <p class="text-[9px] text-slate-600 font-mono leading-relaxed">Adjusts the probability that the metronome will stay silent for a beat, forcing you to maintain your internal clock.</p>
        </div>
      </template>

      <template #Engine>
        <EngineSettings />
      </template>

      <!-- Placeholder slots for Ladder and Stealth... -->
      <template #Ladder>
        <div class="p-6 text-center text-slate-500 italic text-sm">Tempo auto-progression controls available soon.</div>
      </template>
      <template #Stealth>
        <div class="p-6 text-center text-slate-500 italic text-sm">Cognitive silence sequence controls available soon.</div>
      </template>
    </LocalSettingsDrawer>

    <!-- INITIALIZE SCREEN: The "Awaiting Sync" view -->
    <div v-if=" !isInitialized " class="flex-1 flex flex-col items-center justify-center p-6 text-center">
       <div class="glass-container p-12 rounded-[3rem] max-w-sm relative overflow-hidden">
          <div class="relative z-10">
            <div v-if="!error">
              <div class="w-20 h-20 rounded-2xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center mx-auto mb-8 animate-[pulse_2s_infinite]">
                 <div class="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
              </div>
              <h2 class="text-3xl font-black mb-2 italic">Pocket Engine</h2>
              <p class="text-slate-500 text-xs mb-8 uppercase tracking-widest">Awaiting Audio Engine</p>
              <button @click="handleInit" class="btn-primary w-full shadow-orange-500/20">Enable Sync</button>
            </div>
            <div v-else>
               <h3 class="text-xl font-black text-rose-500 mb-4">Error</h3>
               <p class="text-xs text-slate-500 mb-8">{{ error }}</p>
               <button @click="handleInit" class="btn-primary w-full">Retry Connection</button>
            </div>
          </div>
       </div>
    </div>

    <!-- MAIN CONSOLE: Renders the active layout -->
    <main v-else class="flex-1 overflow-hidden relative">
      <component 
        :is="activeLayout"
        v-bind="{
          isInitialized, isPlaying, tempo, error, timingOffset, stats,
          subdivision, polySubdivision, isFlashEnabled, isFlashing,
          gapIntensity, isSettingsOpen, isLadderEnabled, ladderIncrement,
          ladderInterval, ladderGoal, stealthBarsOn, stealthBarsOff,
          isStealthEnabled, accentPattern, currentPulse, grooveHistory,
          drawerCategories, pocketPosition, pocketColor, tendency, avgOffset
        }"
        :togglePlay="togglePlay"
        :updateTempo="updateTempo"
        :updateSubdivision="updateSubdivision"
        :updatePolyrhythm="updatePolyrhythm"
        :updateGapIntensity="updateGapIntensity"
        :updateLadder="updateLadder"
        :updateStealth="updateStealth"
        :cycleAccent="cycleAccent"
        :applyPattern="applyPattern"
        :reset="reset"
        :onSettingsToggle="() => isSettingsOpen = !isSettingsOpen"
        @back="$emit('back')"
        @update:isFlashEnabled="isFlashEnabled = $event"
        @update:ladderIncrement="ladderIncrement = $event"
        @update:ladderInterval="ladderInterval = $event"
        @update:ladderGoal="ladderGoal = $event"
        @update:stealthBarsOn="stealthBarsOn = $event"
        @update:stealthBarsOff="stealthBarsOff = $event"
      />
    </main>
  </div>
</template>

<style>
/* Global Layout Styles */
.glass-container {
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
}

.glass-card {
  backdrop-filter: blur(48px);
  -webkit-backdrop-filter: blur(48px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  background: rgba(255, 255, 255, 0.02);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.btn-primary {
  padding: 1.25rem 3rem;
  border-radius: 1rem;
  background: white;
  color: #0f172a;
  font-weight: 900;
  font-size: 1.125rem;
  transition: all 0.3s;
  box-shadow: 0 10px 40px -15px rgba(0, 0, 0, 0.3);
}

.btn-primary:active { transform: scale(0.98); }

/* Remove standard scrollbar from interaction zones but keep it functional */
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>
