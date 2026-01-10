<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { MetronomeEngine } from './MetronomeEngine'
import { TransientDetector } from './TransientDetector'
import { useToolInfo } from '../../composables/useToolInfo';

const { openInfo } = useToolInfo();

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
const ladderIncrement = ref( 5 )
const ladderInterval = ref( 4 )
const isPlaying = ref( false )
const isInitialized = ref( false )
const error = ref<string | null>( null )

// Timing analysis
const lastBeatTime = ref( 0 )
const timingOffset = ref( 0 )
const timingHistory = ref<number[]>( [] )
const maxHistoryLength = 20

// Visual feedback
const pocketPosition = ref( 50 )
const pocketColor = ref( 'bg-emerald-500' )

// Statistics
const rushCount = ref( 0 )
const dragCount = ref( 0 )
const perfectCount = ref( 0 )

const tendency = ref( 'No data yet' )
const avgOffset = ref( 0 )

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

    metronome.onBeat( ( _pulse, time, isMainBeat ) => {
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

    detector.onTransient( ( time, _energy ) => {
      if ( lastBeatTime.value > 0 ) {
        const offset = ( time - lastBeatTime.value ) * 1000
        const absOffset = Math.abs( offset )

        if ( absOffset < 500 ) {
          timingOffset.value = offset
          timingHistory.value.push( offset )
          if ( timingHistory.value.length > maxHistoryLength ) {
            timingHistory.value.shift()
          }

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

          pocketPosition.value = Math.max( 0, Math.min( 100, ( ( offset + 200 ) / 400 ) * 100 ) )

          // Add to Groove History for Radial Map
          grooveHistory.value.push( { offset, time: performance.now() } )
          if ( grooveHistory.value.length > MAX_GROOVE_DOTS ) {
            grooveHistory.value.shift()
          }

          // Update statistics
          const total = rushCount.value + dragCount.value + perfectCount.value
          if ( rushCount.value > dragCount.value * 1.5 ) {
            tendency.value = 'Rushing'
          } else if ( dragCount.value > rushCount.value * 1.5 ) {
            tendency.value = 'Dragging'
          } else if ( total > 0 ) {
            tendency.value = 'Balanced'
          }

          if ( timingHistory.value.length > 0 ) {
            const sum = timingHistory.value.reduce( ( a, b ) => a + b, 0 )
            avgOffset.value = Math.round( sum / timingHistory.value.length )
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

const togglePlay = () => {
  if ( !isInitialized.value ) {
    init()
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
}

const updatePolyrhythm = ( value: number ) => {
  polySubdivision.value = value
  metronome.setPolySubdivision( value )
}

const updateGapIntensity = ( value: number ) => {
  gapIntensity.value = value
  metronome.setMuteProbability( value / 100 )
}

const updateLadder = () => {
  if ( isLadderEnabled.value ) {
    metronome.setProgression( ladderIncrement.value, ladderInterval.value )
  } else {
    metronome.setProgression( 0, 0 )
  }
}

const updateStealth = () => {
  metronome.setStealthMode( stealthBarsOn.value, stealthBarsOff.value, isStealthEnabled.value )
}

const reset = () => {
  timingHistory.value = []
  timingOffset.value = 0
  rushCount.value = 0
  dragCount.value = 0
  perfectCount.value = 0
  pocketPosition.value = 50
  tendency.value = 'No data yet'
  avgOffset.value = 0
  grooveHistory.value = []
}

onUnmounted( () => {
  metronome.stop()
  detector.cleanup()
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

            <!-- Advanced Configuration Drawer -->
            <Transition name="drawer">
              <div
                v-if=" isSettingsOpen "
                class="space-y-8 pt-8 border-t border-white/5 overflow-hidden"
              >
                <div class="flex flex-wrap items-center gap-10">
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

                  <!-- Polyrhythm Control -->
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
                </div>

                <!-- Stability Training (Gap Click) -->
                <div class="pt-6 border-t border-white/5">
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

                <!-- Speed Building (The Ladder) -->
                <div class="pt-6 border-t border-white/5">
                  <div class="flex items-center justify-between mb-6">
                    <div class="space-y-1">
                      <label class="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                        Speed Building (The Ladder)
                      </label>
                      <p class="text-[9px] text-slate-500 italic">Automatically increments BPM every few bars.</p>
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
                    class="flex items-center gap-8 transition-opacity"
                    :class="{ 'opacity-50 pointer-events-none': !isLadderEnabled }"
                  >
                    <!-- Increment -->
                    <div class="flex-1 space-y-3">
                      <div class="flex justify-between">
                        <span class="text-[8px] font-bold text-slate-600 uppercase tracking-widest">BPM Increment</span>
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

                    <!-- Interval -->
                    <div class="flex-1 space-y-3">
                      <div class="flex justify-between">
                        <span class="text-[8px] font-bold text-slate-600 uppercase tracking-widest">Bar Interval</span>
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
                  </div>
                </div>

                <!-- Stealth Training (Cognitive Mode - Pro Phase 3) -->
                <div class="pt-6 border-t border-white/5">
                  <div class="flex items-center justify-between mb-6">
                    <div class="space-y-1">
                      <label class="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400">
                        Stealth Training (Cognitive Mode)
                      </label>
                      <p class="text-[9px] text-slate-500 italic">Metronome disappears for X bars, forcing you to
                        maintain internal time.</p>
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
                    class="flex items-center gap-8 transition-opacity"
                    :class="{ 'opacity-50 pointer-events-none': !isStealthEnabled }"
                  >
                    <!-- Bars On -->
                    <div class="flex-1 space-y-3">
                      <div class="flex justify-between">
                        <span class="text-[8px] font-bold text-slate-600 uppercase tracking-widest">Bars ON</span>
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

                    <!-- Bars Off (Silent) -->
                    <div class="flex-1 space-y-3">
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
  backdrop-blur: 24px;
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
}

.glass-card {
  backdrop-blur: 24px;
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
</style>
