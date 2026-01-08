<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { MetronomeEngine } from './MetronomeEngine'
import { TransientDetector } from './TransientDetector'
import { useToolInfo } from '../../composables/useToolInfo';

const { openInfo } = useToolInfo();

const metronome = new MetronomeEngine( 120 )
const detector = new TransientDetector( 0.3 )

const tempo = ref( 120 )
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

const init = async () => {
  try {
    metronome.init()
    await detector.init()

    metronome.onBeat( ( _beat, time ) => {
      lastBeatTime.value = time
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
  tendency.value = 'No data yet'
  avgOffset.value = 0
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
            >Engine</span></h2>
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
        <div class="flex flex-col md:flex-row items-center gap-8">
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

          <button
            @click="togglePlay"
            class="w-32 h-32 rounded-full transition-all shadow-2xl flex items-center justify-center"
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
</style>
