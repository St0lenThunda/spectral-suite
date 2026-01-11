<script setup lang="ts">
import { ref, onUnmounted, computed } from 'vue'
import { MetronomeEngine, TransientDetector } from '@spectralsuite/core'

const metronome = new MetronomeEngine( 120 )
const detector = new TransientDetector( 0.3 )

const tempo = ref( 120 )
const subdivision = ref( 1 )
const polySubdivision = ref( 0 ) // 0 = off, 3 = 3 over 4, 5 = 5 over 4, etc.
const isFlashEnabled = ref( true )
const isFlashing = ref( false )
const gapIntensity = ref( 0 )
const isSettingsOpen = ref( false )

const isLadderEnabled = ref( false )
const activeCategory = ref<string | null>( null ) // null = show pills, string = show expanded
const ladderIncrement = ref( 5 )
const ladderInterval = ref( 4 )
const ladderGoal = ref( 200 )
const isPlaying = ref( false )
const isInitialized = ref( false )
const error = ref<string | null>( null )

// Accent Pattern State
// 3 = Strong, 2 = Normal, 1 = Weak, 0 = Mute
const accentPattern = ref<number[]>( [3, 2, 2, 2] )
const currentPulse = ref( 0 )

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

// Timing analysis
const lastBeatTime = ref( 0 )
const lastTransientTime = ref( 0 )
const timingOffset = ref( 0 ) // milliseconds
const timingHistory = ref<number[]>( [] )
const maxHistoryLength = 20

// Visual feedback
const pocketPosition = ref( 50 ) // 0-100, 50 = perfect
const pocketColor = ref( 'bg-emerald-500' )

// Statistics
const rushCount = ref( 0 )
const dragCount = ref( 0 )
const perfectCount = ref( 0 )

const tendency = computed( () => {
  const total = rushCount.value + dragCount.value + perfectCount.value
  if ( total === 0 ) return 'No data yet'
  if ( rushCount.value > dragCount.value * 1.5 ) return 'Rushing'
  if ( dragCount.value > rushCount.value * 1.5 ) return 'Dragging'
  return 'Balanced'
} )

const avgOffset = computed( () => {
  if ( timingHistory.value.length === 0 ) return 0
  const sum = timingHistory.value.reduce( ( a, b ) => a + b, 0 )
  return Math.round( sum / timingHistory.value.length )
} )

// Radial Groove Map (Pro Phase 2)
const grooveHistory = ref<Array<{ offset: number, time: number }>>( [] )
const MAX_GROOVE_DOTS = 32

// Stealth Training (Pro Phase 3)
const stealthBarsOn = ref( 4 )
const stealthBarsOff = ref( 2 )
const isStealthEnabled = ref( false )

const init = async () => {
  try {
    metronome.init()
    await detector.init()

    // Track beat times
    metronome.onBeat( ( pulse, time, isMainBeat ) => {
      // Sync visual sequence to the engine's pulse
      currentPulse.value = pulse

      if ( isMainBeat ) {
        lastBeatTime.value = time

        // Trigger visual flash if enabled
        if ( isFlashEnabled.value ) {
          const delay = ( time - metronome.getCurrentTime() ) * 1000
          setTimeout( () => {
            isFlashing.value = true
            setTimeout( () => {
              isFlashing.value = false
            }, 100 )
          }, delay )
        }
      }
    } )

    // Track transient times and calculate offset
    detector.onTransient( ( time, _energy ) => {
      lastTransientTime.value = time

      if ( lastBeatTime.value > 0 ) {
        // Calculate offset in milliseconds
        const offset = ( time - lastBeatTime.value ) * 1000
        const absOffset = Math.abs( offset )

        // Only count if within reasonable range (±500ms)
        if ( absOffset < 500 ) {
          timingOffset.value = offset

          // Update history
          timingHistory.value.push( offset )
          if ( timingHistory.value.length > maxHistoryLength ) {
            timingHistory.value.shift()
          }

          // Update statistics
          if ( absOffset < 30 ) {
            perfectCount.value++
            pocketColor.value = 'bg-emerald-500'
          } else if ( offset > 0 ) {
            dragCount.value++
            pocketColor.value = 'bg-orange-500'
          } else {
            rushCount.value++
            pocketColor.value = 'bg-rose-500'
          }

          // Update visual position (map -200ms to +200ms => 0 to 100)
          pocketPosition.value = Math.max( 0, Math.min( 100, ( ( offset + 200 ) / 400 ) * 100 ) )

          // Add to Groove History for Radial Map
          grooveHistory.value.push( { offset, time: performance.now() } )
          if ( grooveHistory.value.length > MAX_GROOVE_DOTS ) {
            grooveHistory.value.shift()
          }
        }
      }
    } )

    metronome.onTempoChange( ( newTempo ) => {
      tempo.value = newTempo
    } )

    isInitialized.value = true
    error.value = null
  } catch ( err: any ) {
    error.value = err.message
  }
}

const togglePlay = async () => {
  if ( !isInitialized.value ) {
    await init()
    metronome.setAccentPattern( accentPattern.value )
    return
  }

  if ( isPlaying.value ) {
    metronome.stop()
    detector.stop()
  } else {
    metronome.start()
    detector.start()
  }

  isPlaying.value = !isPlaying.value
}

const updateTempo = ( value: number ) => {
  tempo.value = value
  metronome.setTempo( value )
}

const updateSubdivision = ( value: number ) => {
  subdivision.value = value
  metronome.setSubdivision( value )
  // Re-sync pattern length (e.g. 1/8 subdivision = 8 slots)
  applyPattern( 'downbeat' )
}

const updatePolyrhythm = ( value: number ) => {
  polySubdivision.value = value
  metronome.setPolySubdivision( value )
}

const updateGapIntensity = ( value: number ) => {
  gapIntensity.value = value
  metronome.setMuteProbability( value / 100 )
}

const updateStealth = () => {
  metronome.setStealthMode( stealthBarsOn.value, stealthBarsOff.value, isStealthEnabled.value )
}

const updateLadder = () => {
  if ( isLadderEnabled.value ) {
    metronome.setProgression( ladderIncrement.value, ladderInterval.value, ladderGoal.value )
  } else {
    metronome.setProgression( 0, 0 )
  }
}

const reset = () => {
  timingHistory.value = []
  timingOffset.value = 0
  rushCount.value = 0
  dragCount.value = 0
  perfectCount.value = 0
  pocketPosition.value = 50
  grooveHistory.value = []
}

onUnmounted( () => {
  metronome.stop()
  detector.cleanup()
} )
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-6">
    <!-- Header -->
    <header class="max-w-6xl mx-auto mb-12">
      <div class="flex items-center gap-4 mb-2">
        <div
          class="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-orange-600 flex items-center justify-center text-2xl shadow-lg shadow-rose-500/20"
        >
          ⏱️
        </div>
        <div>
          <h1 class="text-4xl font-black tracking-tighter uppercase">Pocket Engine <span
              class="text-rose-400">Pro</span> <span
              class="text-[10px] bg-rose-500 text-white px-2 py-0.5 rounded-full ml-4 align-middle"
            >v2.0</span></h1>
          <p class="text-slate-400 text-sm">Rhythm & Timing Diagnostic</p>
        </div>
      </div>
    </header>

    <div class="max-w-6xl mx-auto">
      <!-- Initialize Screen -->
      <div
        v-if=" !isInitialized "
        class="flex flex-col items-center justify-center py-20"
      >
        <div class="glass-container p-12 text-center rounded-[3rem]">
          <div v-if=" !error ">
            <div
              class="w-20 h-20 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center mx-auto mb-8"
            >
              <div class="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
            </div>
            <h2 class="text-3xl font-black mb-4">System Ready</h2>
            <p class="text-slate-400 mb-10 max-w-sm mx-auto text-sm">
              Enable your microphone to start analyzing your rhythmic timing and pocket.
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
        <!-- Control Panel -->
        <div class="glass-card p-8 rounded-[3rem]">
          <div class="flex flex-col md:flex-row items-center gap-12">
            <!-- Tempo Control -->
            <!-- Core Controls (Always Visible) -->
            <div class="flex-1 w-full space-y-8">
              <div>
                <div class="flex items-center justify-between mb-4">
                  <label class="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 block">
                    BPM (Tempo)
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
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                      />
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2.5"
                        d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"
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

              <!-- Accent Pattern Programmer (Main Visibility) -->
              <div class="pt-8 border-t border-white/5">
                <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                  <div class="space-y-1">
                    <label class="text-[10px] font-black uppercase tracking-[0.4em] text-rose-400 block">
                      Accent Programmer
                    </label>
                    <p class="text-[9px] text-slate-500 italic">Define your rhythmic DNA. Click slots to toggle
                      dynamics.</p>
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
                            <p class="text-[9px] text-slate-500 italic mt-4">Randomly mutes clicks to test your internal
                              clock.</p>
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
            <button
              @click="togglePlay"
              class="w-32 h-32 transition-all duration-500 shadow-2xl flex items-center justify-center group shrink-0 overflow-hidden relative"
              :class="[
                isPlaying
                  ? 'bg-rose-500 shadow-rose-500/20 rounded-2xl scale-95'
                  : 'bg-emerald-500 shadow-emerald-500/20 rounded-full'
              ]"
            >
              <Transition name="icon-morph">
                <div
                  :key="isPlaying ? 'stop' : 'play'"
                  class="absolute inset-0 flex items-center justify-center text-4xl transform transition-transform group-active:scale-90"
                >
                  {{ isPlaying ? '⏹' : '▶' }}
                </div>
              </Transition>
            </button>
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
            <!-- Target Zone (Center) -->
            <div
              class="absolute left-1/2 top-0 bottom-0 w-24 -translate-x-1/2 bg-emerald-500/20 border-x-2 border-emerald-500/40"
            ></div>

            <!-- Center Line -->
            <div class="absolute left-1/2 top-0 bottom-0 w-1 -translate-x-1/2 bg-white/20"></div>

            <!-- Hit Indicator -->
            <div
              class="absolute top-4 bottom-4 w-4 rounded-full transition-all duration-200 shadow-lg"
              :class="pocketColor"
              :style="{ left: pocketPosition + '%', transform: 'translateX(-50%)' }"
            ></div>

            <!-- Labels -->
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

        <!-- Statistics Dashboard -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div class="glass-card p-6 rounded-3xl">
            <div class="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-2">Perfect</div>
            <div class="text-3xl font-black">{{ perfectCount }}</div>
          </div>
          <div class="glass-card p-6 rounded-3xl">
            <div class="text-[10px] font-black uppercase tracking-widest text-rose-400 mb-2">Rush</div>
            <div class="text-3xl font-black">{{ rushCount }}</div>
          </div>
          <div class="glass-card p-6 rounded-3xl">
            <div class="text-[10px] font-black uppercase tracking-widest text-orange-400 mb-2">Drag</div>
            <div class="text-3xl font-black">{{ dragCount }}</div>
          </div>
          <div class="glass-card p-6 rounded-3xl">
            <div class="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2">Tendency</div>
            <div class="text-xl font-black">{{ tendency }}</div>
            <div class="text-xs text-slate-500 mt-1">Avg: {{ avgOffset }}ms</div>
          </div>
        </div>

        <!-- Reset Button -->
        <div class="text-center">
          <button
            @click="reset"
            class="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold text-sm uppercase tracking-widest transition-all"
          >
            Reset Statistics
          </button>
        </div>

        <!-- Educational Content -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mt-16">
          <div class="glass-card p-8 rounded-[2rem]">
            <h4 class="text-[11px] font-black uppercase tracking-[0.3em] text-rose-400 mb-4">What am I seeing?</h4>
            <p class="text-xs text-slate-400 leading-relaxed mb-4">
              The <span class="text-white font-bold">Pocket Visualizer</span> shows where your hits land relative to the
              metronome beat. The center green zone is "in the pocket"—perfect timing. Moving left means you're rushing
              (playing early), moving right means you're dragging (playing late).
            </p>
            <p class="text-xs text-slate-400 leading-relaxed">
              The timing offset is measured in <span class="text-white font-bold">milliseconds</span>. Professional
              musicians typically stay within ±20ms.
            </p>
          </div>

          <div class="glass-card p-8 rounded-[2rem]">
            <h4 class="text-[11px] font-black uppercase tracking-[0.3em] text-orange-400 mb-4">How it works</h4>
            <ul class="space-y-3">
              <li class="flex items-start gap-3">
                <span class="text-orange-400 font-mono text-[10px] mt-0.5">01</span>
                <p class="text-[11px] text-slate-400 leading-tight">
                  The metronome uses <span class="text-white">Web Audio API</span> for sub-millisecond precision timing.
                </p>
              </li>
              <li class="flex items-start gap-3">
                <span class="text-orange-400 font-mono text-[10px] mt-0.5">02</span>
                <p class="text-[11px] text-slate-400 leading-tight">
                  <span class="text-white">Meyda</span> analyzes your audio for transient peaks (claps, taps, strums).
                </p>
              </li>
              <li class="flex items-start gap-3">
                <span class="text-orange-400 font-mono text-[10px] mt-0.5">03</span>
                <p class="text-[11px] text-slate-400 leading-tight">
                  The engine compares your hit time vs the expected beat time, showing the difference in real-time.
                </p>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.glass-container {
  @apply backdrop-blur-xl border border-white/10 bg-white/5;
}

.glass-card {
  @apply backdrop-blur-xl border border-white/5 bg-white/[0.02] transition-all hover:bg-white/[0.04];
}

.btn-primary {
  @apply px-12 py-5 rounded-2xl bg-white text-slate-900 font-black text-lg transition-all shadow-2xl hover:scale-105 active:scale-95;
}

/* Custom Range Input Styling */
input[type="range"]::-webkit-slider-thumb {
  @apply appearance-none w-6 h-6 rounded-full bg-rose-500 cursor-pointer shadow-lg shadow-rose-500/50;
}

input[type="range"]::-moz-range-thumb {
  @apply w-6 h-6 rounded-full bg-rose-500 cursor-pointer shadow-lg shadow-rose-500/50;
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
