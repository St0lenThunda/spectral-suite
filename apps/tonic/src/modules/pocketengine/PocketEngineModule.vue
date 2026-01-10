<script setup lang="ts">
import { ref, computed, onUnmounted, watch } from 'vue'
import { useRhythmStore, PlayButton } from '@spectralsuite/core'
import { storeToRefs } from 'pinia';
import { useToolInfo } from '../../composables/useToolInfo';

const { openInfo } = useToolInfo();

const store = useRhythmStore();
const {
  isInitialized,
  isPlaying,
  tempo,
  error,
  timingOffset,
  history: timingHistory
} = storeToRefs( store );

// Stats is a reactive object, so we can destructure it directly without storeToRefs 
// (assuming the object reference never changes)
const { stats } = store;

const {
  init,
  toggle: togglePlay,
  setTempo,
  setSubdivision,
  setPolySubdivision,
  setMuteProbability,
  onFlash,
  metronome,
  resetStats
} = store;

const subdivision = ref( 1 )
const polySubdivision = ref( 0 )
const isFlashEnabled = ref( true )
const isFlashing = ref( false )
const gapIntensity = ref( 0 )
const isSettingsOpen = ref( false )

const isLadderEnabled = ref( false )
const activeCategory = ref<string | null>( null ) // null = show pills, string = show expanded
const ladderIncrement = ref( 5 )
const ladderInterval = ref( 4 )
const ladderGoal = ref( 200 )

// Accent Pattern State
// 3 = Strong, 2 = Normal, 1 = Weak, 0 = Mute
const accentPattern = ref<number[]>( [3, 2, 2, 2] )
const currentPulse = computed( () => store.currentPulse ) // Assuming store exposes this, or we need to track it locally

/**
 * Toggles the accent level for a specific pulse slot.
 * Cycles: Strong (3) -> Normal (2) -> Weak (1) -> Mute (0)
 */
const cycleAccent = ( index: number ) => {
  const levels = [3, 2, 1, 0]
  const currentLevel = accentPattern.value[index] ?? 2
  const nextIdx = ( levels.indexOf( currentLevel ) + 1 ) % levels.length
  accentPattern.value[index] = levels[nextIdx]!
  metronome.setAccentPattern( [...accentPattern.value] )
}

/**
 * Presets: Professional Rhythmic Identities
 */
const applyPattern = ( type: 'downbeat' | 'backbeat' | 'jazz' ) => {
  let pattern: number[] = []
  const len = subdivision.value * 4

  switch ( type ) {
    case 'backbeat':
      // Emphasize 2 and 4 (standard in Rock/Pop)
      pattern = Array( len ).fill( 0 ).map( ( _, i ) => {
        const beatNum = Math.floor( i / subdivision.value ) + 1
        return ( beatNum === 2 || beatNum === 4 ) ? 3 : 1
      } )
      break
    case 'jazz':
      // Emphasize the "ands" (off-beats) for swing feel
      pattern = Array( len ).fill( 1 ).map( ( _, i ) => ( i % 2 !== 0 ? 3 : 1 ) )
      break
    case 'downbeat':
    default:
      // Strong on the "One", Normal elsewhere
      pattern = Array( len ).fill( 2 )
      pattern[0] = 3
  }
  accentPattern.value = pattern
  metronome.setAccentPattern( accentPattern.value )
}
// Local visual state
const pocketPosition = computed( () => {
  return Math.max( 0, Math.min( 100, ( ( timingOffset.value + 200 ) / 400 ) * 100 ) )
} )

const pocketColor = computed( () => {
  const abs = Math.abs( timingOffset.value )
  if ( abs < 30 ) return 'bg-emerald-500'
  return timingOffset.value > 0 ? 'bg-orange-500' : 'bg-rose-500'
} )

const tendency = computed( () => {
  if ( stats.rush > stats.drag * 1.5 ) return 'Rushing'
  if ( stats.drag > stats.rush * 1.5 ) return 'Dragging'
  if ( stats.total > 0 ) return 'Balanced'
  return 'No data yet'
} )

const avgOffset = computed( () => {
  if ( timingHistory.value.length === 0 ) return 0
  const sum = timingHistory.value.reduce( ( a: number, b: number ) => a + b, 0 )
  return Math.round( sum / timingHistory.value.length )
} )

// Flash handling
onFlash( () => {
  if ( isFlashEnabled.value ) {
    isFlashing.value = true
    setTimeout( () => isFlashing.value = false, 100 )
  }
} )

// Radial Groove Map (Pro Phase 2)
const grooveHistory = ref<Array<{ offset: number, time: number }>>( [] )
const MAX_GROOVE_DOTS = 32

// Watch for stats updates to populate Groove Map
watch( () => stats.total, () => {
  if ( timingHistory.value.length === 0 ) return;
  const latestOffset = timingHistory.value[timingHistory.value.length - 1] ?? 0;

  grooveHistory.value.push( { offset: latestOffset, time: performance.now() } );
  if ( grooveHistory.value.length > MAX_GROOVE_DOTS ) {
    grooveHistory.value.shift();
  }
} );

// Stealth Training (Pro Phase 3)
const stealthBarsOn = ref( 4 )
const stealthBarsOff = ref( 2 )
const isStealthEnabled = ref( false )

// Init/Toggle replaced by useRhythm


const updateTempo = ( value: number ) => { setTempo( value ) }

const updateSubdivision = ( value: number ) => {
  subdivision.value = value
  setSubdivision( value )
}

const updatePolyrhythm = ( value: number ) => {
  polySubdivision.value = value
  setPolySubdivision( value )
}

const updateGapIntensity = ( value: number ) => {
  gapIntensity.value = value
  setMuteProbability( value / 100 )
}

const updateLadder = () => {
  if ( isLadderEnabled.value ) {
    metronome.setProgression( ladderIncrement.value, ladderInterval.value, ladderGoal.value )
  } else {
    metronome.setProgression( 0, 0 )
  }
}

// Watch for playback start to ensure accent pattern is set
watch( isPlaying, ( newData ) => {
  if ( newData ) {
    metronome.setAccentPattern( accentPattern.value )
  }
} )

const updateStealth = () => {
  metronome.setStealthMode( stealthBarsOn.value, stealthBarsOff.value, isStealthEnabled.value )
}

const reset = () => {
  resetStats()
  grooveHistory.value = []
}

onUnmounted( () => {
  stop()
} )
</script>

<template>
  <div class="p-6">
    <!-- Initialize Screen -->
    <div
      v-if=" !isInitialized "
      class="flex flex-col items-center justify-center py-20"
    >
      <div class="glass-container p-12 text-center rounded-[3rem] max-w-lg relative">
        <button
          @click="openInfo( 'pocketengine' )"
          class="absolute top-8 right-8 w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-rose-400 hover:text-white hover:bg-rose-500/20 transition-all active:scale-95"
          title="Tool Intelligence"
        >
          i
        </button>
        <div v-if=" !error ">
          <div
            class="w-20 h-20 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center mx-auto mb-8"
          >
            <div class="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h2 class="text-3xl font-black mb-4">System Ready</h2>
          <p class="text-slate-400 mb-10 max-w-sm mx-auto text-sm">
            Enable your microphone to start analyzing your rhythmic timing.
          </p>
          <button
            @click="init"
            class="btn-primary"
          >
            Initialize Pocket Engine
          </button>
        </div>
        <div
          v-else
          class="text-center p-4"
        >
          <div class="text-5xl mb-6">🛡️</div>
          <h3 class="text-2xl font-black text-red-400 mb-4">Mic Required</h3>
          <p class="text-slate-500 text-xs mb-8">{{ error }}</p>
          <button
            @click="init"
            class="text-rose-400 font-bold uppercase tracking-widest text-[10px] hover:text-white transition-all underline underline-offset-8"
          >
            Retry
          </button>
        </div>
      </div>
    </div>

    <!-- Main Interface -->
    <div
      v-else
      class="space-y-8"
    >
      <header class="flex justify-between items-end">
        <div>
          <h2 class="text-3xl font-black text-white italic uppercase tracking-tighter">Pocket <span
              class="text-rose-500"
            >Engine</span> <span class="text-indigo-400 text-lg">Pro</span></h2>
          <p class="text-slate-500 text-xs font-mono uppercase tracking-widest mt-1">Rhythm & Timing Diagnostic</p>
        </div>
        <button
          @click="openInfo( 'pocketengine' )"
          class="flex items-center gap-2 px-6 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500/20 transition-all active:scale-95 mb-1"
        >
          Intelligence
        </button>
      </header>

      <!-- Control Panel -->
      <div class="glass-card p-8 rounded-[3rem]">
        <div class="flex flex-col md:flex-row items-center gap-12">
          <!-- Tempo Control -->
          <!-- Tempo Control (Main Panel) -->
          <div class="flex-1 w-full space-y-8">
            <div>
              <div class="flex items-center justify-between mb-4">
                <label class="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 block">
                  Tempo (BPM)
                </label>
                <button
                  @click="isSettingsOpen = !isSettingsOpen"
                  class="p-2 -mr-2 text-slate-500 hover:text-white transition-all transform"
                  :class="{ 'rotate-90 text-indigo-400': isSettingsOpen }"
                  title="Advanced Configuration"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2.5"
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2.5"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </button>
              </div>
              <div class="flex items-center gap-6">
                <input
                  type="range"
                  min="40"
                  max="300"
                  :value="tempo"
                  @input="updateTempo( parseInt( ( $event.target as HTMLInputElement ).value ) )"
                  class="flex-1 h-2 bg-slate-800 rounded-full appearance-none cursor-pointer"
                />
                <span class="text-4xl font-black font-mono text-white w-20 text-right">{{ tempo }}</span>
              </div>
            </div>

            <!-- Accent Pattern Programmer (Main Panel) -->
            <div class="pt-8 border-t border-white/5">
              <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div class="space-y-1">
                  <label class="text-[10px] font-black uppercase tracking-[0.4em] text-rose-400 block">
                    Accent Programmer
                  </label>
                  <p class="text-[9px] text-slate-500 italic">Define your rhythmic DNA. Click slots to toggle dynamics.
                  </p>
                </div>
                <div class="flex gap-2">
                  <button
                    @click="applyPattern( 'downbeat' )"
                    class="px-3 py-1 bg-slate-800 rounded text-[8px] font-black hover:bg-slate-700 transition-colors uppercase"
                  >Standard</button>
                  <button
                    @click="applyPattern( 'backbeat' )"
                    class="px-3 py-1 bg-slate-800 rounded text-[8px] font-black hover:bg-slate-700 transition-colors uppercase"
                  >Rock 2&4</button>
                  <button
                    @click="applyPattern( 'jazz' )"
                    class="px-3 py-1 bg-slate-800 rounded text-[8px] font-black hover:bg-slate-700 transition-colors uppercase"
                  >Swing</button>
                </div>
              </div>

              <div class="flex flex-wrap gap-2 items-center justify-start pb-4">
                <div
                  v-for=" ( level, idx ) in accentPattern "
                  :key="idx"
                  class="relative"
                >
                  <!-- Pulse Indicator (Current) -->
                  <div
                    v-if=" isPlaying && ( currentPulse % accentPattern.length === idx ) "
                    class="absolute -inset-1 rounded-xl bg-rose-500/20 animate-pulse border border-rose-500/30 z-0"
                  ></div>

                  <button
                    @click="cycleAccent( idx )"
                    class="relative z-10 w-9 h-12 rounded-xl flex flex-col items-center justify-between py-2 transition-all border-2"
                    :class="[
                      level === 3 ? 'bg-rose-500 border-rose-300 text-white shadow-lg shadow-rose-500/20' :
                        level === 2 ? 'bg-slate-800 border-slate-600 text-slate-300' :
                          level === 1 ? 'bg-slate-900 border-slate-800 text-slate-500 opacity-60' :
                            'bg-transparent border-slate-800 text-slate-700 opacity-30 shadow-inner'
                    ]"
                  >
                    <span class="text-[7px] font-black opacity-50">{{ idx % subdivision === 0 ? Math.floor( idx /
                      subdivision ) + 1 : '' }}</span>
                    <div
                      class="w-1 rounded-full transition-all"
                      :class="[
                        level === 3 ? 'h-5 bg-white' :
                          level === 2 ? 'h-3 bg-slate-400' :
                            level === 1 ? 'h-1.5 bg-slate-600' :
                              'h-1 bg-slate-800'
                      ]"
                    ></div>
                    <span class="text-[8px] font-black">{{ level === 0 ? '×' : '' }}</span>
                  </button>
                </div>
              </div>
            </div>
            <!-- Advanced Configuration Drawer (Morphing Pills) -->
            <Transition name="drawer">
              <div
                v-if=" isSettingsOpen "
                class="pt-8 border-t border-white/5 overflow-hidden"
              >
                <div class="relative min-h-[300px]">
                  <!-- Level 1: Category Pills -->
                  <Transition
                    name="fade-scale"
                    mode="out-in"
                  >
                    <div
                      v-if=" !activeCategory "
                      class="flex flex-wrap items-start content-start gap-4 absolute inset-0"
                    >
                      <button
                        v-for=" cat in ['General', 'Stability', 'Ladder', 'Stealth'] "
                        :key="cat"
                        @click="activeCategory = cat"
                        class="group relative px-6 py-4 rounded-2xl bg-slate-800 border border-slate-700 hover:border-slate-500 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                      >
                        <div
                          class="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-white mb-1 transition-colors"
                        >{{ cat }}</div>
                        <div class="text-[9px] text-slate-600 group-hover:text-slate-500 italic">
                          {{
                            cat === 'General' ? 'Subdivision, Flash, Poly' :
                              cat === 'Stability' ? 'Gap Click Training' :
                                cat === 'Ladder' ? 'Auto-BPM Increase' : 'Cognitive Silence'
                          }}
                        </div>
                        <!-- Active Indicator Dot -->
                        <div
                          v-if=" ( cat === 'Stability' && gapIntensity > 0 ) || ( cat === 'Ladder' && isLadderEnabled ) || ( cat === 'Stealth' && isStealthEnabled ) "
                          class="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50"
                        ></div>
                      </button>

                      <!-- Close Button -->
                      <button
                        @click="isSettingsOpen = false"
                        class="absolute top-0 right-0 p-2 text-slate-500 hover:text-white transition-colors rounded-full hover:bg-white/10"
                        title="Close Settings"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          class="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>

                    <!-- Level 2: Expanded Content -->
                    <div
                      v-else
                      class="absolute inset-0 bg-slate-800 rounded-3xl border border-slate-700 flex flex-col overflow-hidden shadow-2xl"
                    >
                      <!-- Header -->
                      <div class="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-black/20">
                        <h3 class="text-xs font-black uppercase tracking-[0.2em] text-white">{{ activeCategory }}</h3>
                        <button
                          @click="activeCategory = null"
                          class="text-[10px] font-bold text-slate-500 hover:text-white uppercase tracking-wider px-3 py-1.5 rounded-lg hover:bg-white/5 transition-all"
                        >
                          Done
                        </button>
                      </div>

                      <!-- Scrollable Content -->
                      <div class="p-6 overflow-y-auto custom-scrollbar flex-1">
                        <!-- General Settings -->
                        <div
                          v-if=" activeCategory === 'General' "
                          class="space-y-8"
                        >
                          <!-- Subdivision Control -->
                          <div class="space-y-4">
                            <label class="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 block">
                              Subdivision
                            </label>
                            <div class="flex items-center gap-2">
                              <button
                                v-for=" ( label, s ) in { 1: '1/4', 2: '1/8', 3: '1/12', 4: '1/16' } "
                                :key="s"
                                @click="updateSubdivision( Math.floor( Number( s ) ) )"
                                class="px-3 h-10 rounded-lg font-black transition-all text-[10px]"
                                :class="subdivision === Math.floor( Number( s ) ) ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'bg-slate-800 text-slate-500 hover:text-white'"
                              >
                                {{ label }}
                              </button>
                            </div>
                          </div>

                          <!-- Polyrhythm Control (Pro Feature) -->
                          <div class="space-y-4">
                            <label class="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 block">
                              Polyrhythm (X over 4)
                            </label>
                            <div class="flex items-center gap-2">
                              <button
                                v-for=" val in [0, 3, 5, 7] "
                                :key="val"
                                @click="updatePolyrhythm( val )"
                                class="px-3 h-10 rounded-lg font-black transition-all text-[10px]"
                                :class="polySubdivision === val ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-800 text-slate-500 hover:text-white'"
                              >
                                {{ val === 0 ? 'OFF' : `${val}:4` }}
                              </button>
                            </div>
                          </div>
                          <!-- Visual Flash Toggle -->
                          <div class="space-y-4">
                            <label class="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 block">
                              Visual Flash
                            </label>
                            <button
                              @click="isFlashEnabled = !isFlashEnabled"
                              class="h-10 px-6 rounded-lg font-black transition-all flex items-center gap-3"
                              :class="isFlashEnabled ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-500'"
                            >
                              <div
                                class="w-2 h-2 rounded-full"
                                :class="isFlashEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'"
                              ></div>
                              {{ isFlashEnabled ? 'ENABLED' : 'DISABLED' }}
                            </button>
                          </div>
                        </div>
                       
                        <!-- Stability -->
                        <div
                          v-if=" activeCategory === 'Stability' "
                          class="space-y-8"
                        >
                          <div class="flex items-center justify-between mb-4">
                            <label class="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                              Stability Training (Gap Click)
                            </label>
                            <span
                              class="text-xs font-black px-2 py-0.5 rounded border transition-colors"
                              :class="gapIntensity > 0 ? 'text-rose-500 border-rose-500/20 bg-rose-500/5' : 'text-slate-600 border-white/5'"
                            >
                              {{ gapIntensity > 0 ? `${gapIntensity}% GAP` : 'OFF' }}
                            </span>
                          </div>
                          <div class="flex items-center gap-6">
                            <div class="flex-1 relative flex items-center">
                              <div
                                class="absolute h-1 bg-gradient-to-r from-emerald-500 to-rose-500 rounded-full opacity-20"
                                :style="{ width: '100%' }"
                              ></div>
                              <input
                                type="range"
                                min="0"
                                max="90"
                                step="5"
                                :value="gapIntensity"
                                @input="updateGapIntensity( parseInt( ( $event.target as HTMLInputElement ).value ) )"
                                class="relative w-full h-8 bg-transparent appearance-none cursor-pointer z-10"
                              />
                            </div>
                            <div class="w-12 text-right">
                              <span class="text-[10px] font-black font-mono text-slate-400">INTENSITY</span>
                            </div>
                          </div>
                        </div>

                        <!-- Ladder -->
                        <div
                          v-if=" activeCategory === 'Ladder' "
                          class="space-y-8"
                        >
                          <div class="flex items-center justify-between mb-6">
                            <div class="space-y-1">
                              <label class="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                                Speed Building (The Ladder)
                              </label>
                              <p class="text-[9px] text-slate-500 italic">Automatically increments BPM every few bars.
                              </p>
                            </div>
                            <button
                              @click="isLadderEnabled = !isLadderEnabled; updateLadder()"
                              class="h-8 px-4 rounded-full font-black text-[9px] transition-all border"
                              :class="isLadderEnabled ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' : 'bg-slate-800 text-slate-500 border-transparent'"
                            >
                              {{ isLadderEnabled ? 'ACTIVE' : 'INACTIVE' }}
                            </button>
                          </div>

                          <div
                            class="space-y-6 transition-opacity"
                            :class="{ 'opacity-50 pointer-events-none': !isLadderEnabled }"
                          >
                            <div class="space-y-3">
                              <div class="flex justify-between">
                                <span class="text-[8px] font-bold text-slate-600 uppercase tracking-widest">BPM
                                  Increment</span>
                                <span class="text-[10px] font-black text-white">+{{ ladderIncrement }}</span>
                              </div>
                              <input
                                type="range"
                                min="1"
                                max="20"
                                :value="ladderIncrement"
                                @input="ladderIncrement = parseInt( ( $event.target as HTMLInputElement ).value ); updateLadder()"
                                class="w-full h-1 bg-slate-800 rounded-full appearance-none cursor-pointer"
                              />
                            </div>

                            <div class="space-y-3">
                              <div class="flex justify-between">
                                <span class="text-[8px] font-bold text-slate-600 uppercase tracking-widest">Bar
                                  Interval</span>
                                <span class="text-[10px] font-black text-white">{{ ladderInterval }} BARS</span>
                              </div>
                              <input
                                type="range"
                                min="1"
                                max="16"
                                :value="ladderInterval"
                                @input="ladderInterval = parseInt( ( $event.target as HTMLInputElement ).value ); updateLadder()"
                                class="w-full h-1 bg-slate-800 rounded-full appearance-none cursor-pointer"
                              />
                            </div>

                            <div class="space-y-3">
                              <div class="flex justify-between">
                                <span class="text-[8px] font-bold text-slate-600 uppercase tracking-widest">Goal
                                  Tempo</span>
                                <span class="text-[10px] font-black text-white">{{ ladderGoal }} BPM</span>
                              </div>
                              <input
                                type="range"
                                min="40"
                                max="300"
                                step="5"
                                :value="ladderGoal"
                                @input="ladderGoal = parseInt( ( $event.target as HTMLInputElement ).value ); updateLadder()"
                                class="w-full h-1 bg-slate-800 rounded-full appearance-none cursor-pointer"
                              />
                            </div>
                          </div>
                        </div>

                        <!-- Stealth -->
                        <div
                          v-if=" activeCategory === 'Stealth' "
                          class="space-y-8"
                        >
                          <div class="flex items-center justify-between mb-6">
                            <div class="space-y-1">
                              <label class="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400">
                                Stealth Training
                              </label>
                              <p class="text-[9px] text-slate-500 italic">Metronome disappears for X bars.</p>
                            </div>
                            <button
                              @click="isStealthEnabled = !isStealthEnabled; updateStealth()"
                              class="h-8 px-4 rounded-full font-black text-[9px] transition-all border"
                              :class="isStealthEnabled ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' : 'bg-slate-800 text-slate-500 border-transparent'"
                            >
                              {{ isStealthEnabled ? 'ACTIVE' : 'INACTIVE' }}
                            </button>
                          </div>

                          <div
                            class="space-y-6 transition-opacity"
                            :class="{ 'opacity-50 pointer-events-none': !isStealthEnabled }"
                          >
                            <div class="space-y-3">
                              <div class="flex justify-between">
                                <span class="text-[8px] font-bold text-slate-600 uppercase tracking-widest">Bars
                                  ON</span>
                                <span class="text-[10px] font-black text-white">{{ stealthBarsOn }} BARS</span>
                              </div>
                              <input
                                type="range"
                                min="1"
                                max="8"
                                :value="stealthBarsOn"
                                @input="stealthBarsOn = parseInt( ( $event.target as HTMLInputElement ).value ); updateStealth()"
                                class="w-full h-1 bg-slate-800 rounded-full appearance-none cursor-pointer"
                              />
                            </div>

                            <div class="space-y-3">
                              <div class="flex justify-between">
                                <span class="text-[8px] font-bold text-slate-600 uppercase tracking-widest">Bars OFF
                                  (Silent)</span>
                                <span class="text-[10px] font-black text-cyan-400">{{ stealthBarsOff }} BARS</span>
                              </div>
                              <input
                                type="range"
                                min="1"
                                max="8"
                                :value="stealthBarsOff"
                                @input="stealthBarsOff = parseInt( ( $event.target as HTMLInputElement ).value ); updateStealth()"
                                class="w-full h-1 bg-slate-800 rounded-full appearance-none cursor-pointer"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Transition>
                </div>
              </div>
            </Transition>
          </div>
          <!-- Play/Stop Button -->
          <PlayButton
            :is-playing="isPlaying"
            @click="togglePlay"
          />
        </div>
      </div>

      <!-- Pocket Visualizer -->
      <div
        class="glass-card p-12 rounded-[3rem] transition-colors duration-100"
        :class="{ 'bg-white/10': isFlashing }"
      >
        <h3 class="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 mb-8 text-center">
          The Pocket
        </h3>

        <div
          class="relative w-full h-32 bg-slate-900/50 rounded-3xl overflow-hidden border border-white/5 transition-all"
          :class="{ 'ring-4 ring-white/20': isFlashing }"
        >
          <div
            class="absolute left-1/2 top-0 bottom-0 w-24 -translate-x-1/2 bg-emerald-500/20 border-x-2 border-emerald-500/40"
          ></div>
          <div class="absolute left-1/2 top-0 bottom-0 w-1 -translate-x-1/2 bg-white/20"></div>
          <div
            class="absolute top-4 bottom-4 w-4 rounded-full transition-all duration-200 shadow-lg"
            :class="pocketColor"
            :style="{ left: pocketPosition + '%', transform: 'translateX(-50%)' }"
          ></div>
          <div class="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-mono text-rose-400">RUSH</div>
          <div class="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-mono text-orange-400">DRAG</div>
        </div>

        <div class="mt-6 text-center">
          <div class="text-6xl font-black font-mono">
            {{ timingOffset > 0 ? '+' : '' }}{{ Math.round( timingOffset ) }}
            <span class="text-2xl text-slate-500">ms</span>
          </div>
          <p class="text-sm text-slate-500 mt-2">Timing Offset</p>
        </div>
      </div>

      <!-- Radial Groove Map (Pro Phase 2) -->
      <div class="glass-card p-8 rounded-[3rem]">
        <h3 class="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400 mb-6 text-center">
          Groove Map
        </h3>
        <div class="flex justify-center">
          <svg
            viewBox="0 0 200 200"
            class="w-64 h-64"
          >
            <!-- Background Circle -->
            <circle
              cx="100"
              cy="100"
              r="90"
              fill="none"
              stroke="rgba(255,255,255,0.05)"
              stroke-width="2"
            />
            <!-- Perfect Zone (inner ring) -->
            <circle
              cx="100"
              cy="100"
              r="30"
              fill="rgba(52, 211, 153, 0.1)"
              stroke="rgba(52, 211, 153, 0.3)"
              stroke-width="1"
            />
            <!-- Center Dot -->
            <circle
              cx="100"
              cy="100"
              r="4"
              fill="rgba(255,255,255,0.3)"
            />
            <!-- Hit Dots -->
            <circle
              v-for=" ( hit, i ) in grooveHistory "
              :key="i"
              :cx="100 + Math.cos( ( i / grooveHistory.length ) * Math.PI * 2 - Math.PI / 2 ) * ( 30 + Math.min( 60, Math.abs( hit.offset ) / 200 * 60 ) )"
              :cy="100 + Math.sin( ( i / grooveHistory.length ) * Math.PI * 2 - Math.PI / 2 ) * ( 30 + Math.min( 60, Math.abs( hit.offset ) / 200 * 60 ) )"
              r="4"
              :fill="Math.abs( hit.offset ) < 30 ? '#34d399' : hit.offset > 0 ? '#fb923c' : '#f43f5e'"
              :opacity="0.5 + ( i / grooveHistory.length ) * 0.5"
            />
          </svg>
        </div>
        <p class="text-center text-slate-500 text-[10px] mt-4">Hits closer to the center are more accurate.</p>
      </div>

      <!-- Statistics Dashboard -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div class="glass-card p-6 rounded-3xl">
          <div class="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-2">Perfect</div>
          <div class="text-3xl font-black">{{ stats.perfect }}</div>
        </div>
        <div class="glass-card p-6 rounded-3xl">
          <div class="text-[10px] font-black uppercase tracking-widest text-rose-400 mb-2">Rush</div>
          <div class="text-3xl font-black">{{ stats.rush }}</div>
        </div>
        <div class="glass-card p-6 rounded-3xl">
          <div class="text-[10px] font-black uppercase tracking-widest text-orange-400 mb-2">Drag</div>
          <div class="text-3xl font-black">{{ stats.drag }}</div>
        </div>
        <div class="glass-card p-6 rounded-3xl">
          <div class="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2">Tendency</div>
          <div class="text-lg font-black">{{ tendency }}</div>
          <div class="text-xs text-slate-500 mt-1">Avg: {{ avgOffset }}ms</div>
        </div>
      </div>

      <div class="text-center">
        <button
          @click="reset"
          class="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold text-sm uppercase tracking-widest transition-all"
        >
          Reset Statistics
        </button>
      </div>

    </div>
  </div>
</template>

<style scoped>
.glass-container {
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
}

.glass-card {
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  background: rgba(255, 255, 255, 0.02);
  transition: all 0.3s;
}

.glass-card:hover {
  background: rgba(255, 255, 255, 0.04);
}

.btn-primary {
  padding: 1.25rem 3rem;
  border-radius: 1rem;
  background: white;
  color: #0f172a;
  font-weight: 900;
  font-size: 1.125rem;
  transition: all 0.3s;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.btn-primary:hover {
  transform: scale(1.05);
}

.btn-primary:active {
  transform: scale(0.95);
}

input[type="range"]::-webkit-slider-thumb {
  appearance: none;
  -webkit-appearance: none;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 9999px;
  background: #f43f5e;
  cursor: pointer;
  box-shadow: 0 10px 15px -3px rgba(244, 63, 94, 0.5);
}

input[type="range"]::-moz-range-thumb {
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 9999px;
  background: #f43f5e;
  cursor: pointer;
  box-shadow: 0 10px 15px -3px rgba(244, 63, 94, 0.5);
  border: none;
}

/* Drawer Transition */
.drawer-enter-active,
.drawer-leave-active {
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  max-height: 800px;
}

.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
  max-height: 0;
  transform: translateY(-10px);
}

/* Icon Morph Transition */
.icon-morph-enter-active,
.icon-morph-leave-active {
  transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.icon-morph-enter-from {
  opacity: 0;
  transform: scale(0.3) rotate(-90deg);
}

.icon-morph-leave-to {
  opacity: 0;
  transform: scale(0.3) rotate(90deg);
}
.icon-morph-leave-to {
  opacity: 0;
  transform: scale(0.3) rotate(90deg);
}

.fade-scale-enter-active,
.fade-scale-leave-active {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.fade-scale-enter-from,
.fade-scale-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}
</style>
