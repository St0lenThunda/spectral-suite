<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { MetronomeEngine } from './engine/MetronomeEngine'
import { TransientDetector } from './engine/TransientDetector'

const metronome = new MetronomeEngine( 120 )
const detector = new TransientDetector( 0.3 )

const tempo = ref( 120 )
const isPlaying = ref( false )
const isInitialized = ref( false )
const error = ref<string | null>( null )

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

const init = async () => {
  try {
    metronome.init()
    await detector.init()

    // Track beat times
    metronome.onBeat( ( beat, time ) => {
      lastBeatTime.value = time
    } )

    // Track transient times and calculate offset
    detector.onTransient( ( time, energy ) => {
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
        }
      }
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

const reset = () => {
  timingHistory.value = []
  timingOffset.value = 0
  rushCount.value = 0
  dragCount.value = 0
  perfectCount.value = 0
  pocketPosition.value = 50
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
          <h1 class="text-4xl font-black tracking-tighter uppercase">Pocket Engine</h1>
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
          <div class="flex flex-col md:flex-row items-center gap-8">
            <!-- Tempo Control -->
            <div class="flex-1 w-full">
              <label class="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 block mb-4">
                Tempo (BPM)
              </label>
              <div class="flex items-center gap-4">
                <input
                  type="range"
                  min="40"
                  max="300"
                  :value="tempo"
                  @input="updateTempo( parseInt( ( $event.target as HTMLInputElement ).value ) )"
                  class="flex-1 h-2 bg-slate-800 rounded-full appearance-none cursor-pointer"
                />
                <span class="text-4xl font-black font-mono text-white w-24 text-right">{{ tempo }}</span>
              </div>
            </div>

            <!-- Play/Stop Button -->
            <button
              @click="togglePlay"
              class="w-32 h-32 rounded-full transition-all shadow-2xl"
              :class="isPlaying ? 'bg-rose-500 hover:bg-rose-600' : 'bg-emerald-500 hover:bg-emerald-600'"
            >
              <div class="text-4xl">{{ isPlaying ? '⏸' : '▶' }}</div>
            </button>
          </div>
        </div>

        <!-- Pocket Visualizer -->
        <div class="glass-card p-12 rounded-[3rem]">
          <h3 class="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 mb-8 text-center">
            The Pocket
          </h3>

          <div class="relative w-full h-32 bg-slate-900/50 rounded-3xl overflow-hidden border border-white/5">
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
</style>
