<script setup lang="ts">
import { usePitch, useAudioEngine, Note } from '@spectralsuite/core'
import { onMounted, ref, computed, watch } from 'vue'
import { useToolInfo } from '../../composables/useToolInfo';

const {
  pitch,
  clarity,
  currentNote,
  cents,
  concertA,
  transposition,
  pitchHistory,
  isLowPassEnabled,
  downsample
} = usePitch()

const { init, isInitialized } = useAudioEngine()
const { openInfo } = useToolInfo();

const isSettingsOpen = ref( false )
const droneVolume = ref( 0 )
const isDroneActive = ref( false )

// Strobe Rendering
const strobeCanvas = ref<HTMLCanvasElement | null>( null )
const strobeAngle = ref( 0 )

onMounted( () => {
  const animateStrobe = () => {
    if ( strobeCanvas.value && cents.value !== null && ( clarity.value ?? 0 ) > 0.8 ) {
      const ctx = strobeCanvas.value.getContext( '2d' )
      if ( ctx ) {
        const { width, height } = strobeCanvas.value
        ctx.clearRect( 0, 0, width, height )

        // Rotation speed depends on cents deviation
        // 0 cents = still, +100 cents = 1 rotation per delay
        const rotationSpeed = ( cents.value / 100 ) * 0.1
        strobeAngle.value += rotationSpeed

        ctx.save()
        ctx.translate( width / 2, height / 2 )
        ctx.rotate( strobeAngle.value )

        // Draw strobe markers
        for ( let i = 0; i < 60; i++ ) {
          ctx.beginPath()
          ctx.rotate( ( Math.PI * 2 ) / 60 )
          ctx.moveTo( 0, -width / 2 + 10 )
          ctx.lineTo( 0, -width / 2 + 30 )
          ctx.strokeStyle = i % 5 === 0 ? '#38bdf8' : '#1e293b'
          ctx.lineWidth = i % 5 === 0 ? 4 : 2
          ctx.stroke()
        }
        ctx.restore()
      }
    }
    requestAnimationFrame( animateStrobe )
  }
  animateStrobe()
} )

// Drone Logic (Simple Oscillator)
let droneOsc: OscillatorNode | null = null
let droneGain: GainNode | null = null

watch( [isDroneActive, droneVolume, currentNote], () => {
  const context = useAudioEngine().getContext()
  if ( !context ) return

  if ( !isDroneActive.value || !currentNote.value || !isInitialized.value ) {
    if ( droneGain ) droneGain.gain.setTargetAtTime( 0, context.currentTime, 0.1 )
    return
  }

  if ( !droneOsc ) {
    droneOsc = context.createOscillator()
    droneGain = context.createGain()
    droneOsc.type = 'triangle' // Softer than saw, richer than sine
    droneOsc.connect( droneGain )
    droneGain.connect( context.destination )
    droneGain.gain.value = 0
    droneOsc.start()
  }

  const freq = Note.get( currentNote.value ).freq
  if ( freq && droneOsc ) {
    droneOsc.frequency.setTargetAtTime( freq, context.currentTime, 0.1 )
    if ( droneGain ) {
      droneGain.gain.setTargetAtTime( droneVolume.value * 0.2, context.currentTime, 0.1 )
    }
  }
}, { immediate: true } )

const toneQuality = computed(() => {
  if (!clarity.value) return 0
  return Math.round(clarity.value * 100)
})

const toneQualityLabel = computed(() => {
  if (toneQuality.value > 95) return 'Pure'
  if (toneQuality.value > 85) return 'Rich'
  if (toneQuality.value > 70) return 'Stable'
  return 'Unstable'
})
</script>

<template>
  <div class="p-6">
    <header class="mb-4 flex justify-between items-end">
      <div>
        <h2 class="text-3xl font-black text-white italic uppercase tracking-tighter">AuraTune <span
            class="text-sky-500"
          >Pro</span></h2>
        <p class="text-slate-500 text-[10px] font-mono uppercase tracking-[0.2em] mt-1">Intonation & Stability Suite</p>
      </div>
      <div class="flex items-center gap-4">
        <button
          @click="isSettingsOpen = !isSettingsOpen"
          class="p-2 text-slate-500 hover:text-white transition-all transform"
          :class="{ 'rotate-90 text-sky-400': isSettingsOpen }"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2.5"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2.5"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </button>
        <button
          @click="openInfo( 'auratune' )"
          class="flex items-center gap-2 px-6 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500/20 transition-all active:scale-95 mb-1"
        >
          Intelligence
        </button>
      </div>
    </header>

    <!-- Advanced Settings Drawer -->
    <Transition name="drawer">
      <div v-if="isSettingsOpen" class="glass-card mb-8 p-8 rounded-[2rem] overflow-hidden">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-12">
          <!-- Calibration -->
          <div class="space-y-4">
            <div class="flex justify-between">
              <label class="text-[10px] font-black uppercase tracking-widest text-slate-500">Concert A</label>
              <span class="text-xs font-black text-white">{{ concertA }}Hz</span>
            </div>
            <input
              type="range"
              min="390"
              max="490"
              v-model.number="concertA"
              class="w-full h-1 bg-slate-800 rounded-full appearance-none cursor-pointer"
            />
          </div>

          <!-- Transposition -->
          <div class="space-y-4">
            <label class="text-[10px] font-black uppercase tracking-widest text-slate-500 block">Instrument</label>
            <div class="flex gap-2">
              <button
                v-for=" (label, val) in { 0: 'C', '-2': 'Bb', '-9': 'Eb', '-7': 'F' } "
                :key="val"
                @click="transposition = Number( val )"
                class="flex-1 py-2 rounded-lg font-black text-[10px] border transition-all"
                :class="transposition === Number( val ) ? 'bg-sky-500/20 border-sky-500/50 text-sky-400' : 'bg-slate-900 border-white/5 text-slate-500'"
              >
                {{ label }}
              </button>
            </div>
          </div>

          <!-- Drone -->
          <div class="space-y-4">
            <div class="flex justify-between items-center">
              <label class="text-[10px] font-black uppercase tracking-widest text-slate-500">Drone Guide</label>
              <button
                @click="isDroneActive = !isDroneActive"
                class="px-3 py-1 rounded-full text-[9px] font-black"
                :class="isDroneActive ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-500'"
              >
                {{ isDroneActive ? 'ACTIVE' : 'MUTED' }}
              </button>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              v-model.number="droneVolume"
              class="w-full h-1 bg-slate-800 rounded-full appearance-none cursor-pointer"
            />
          </div>

          <!-- Algorithm Tuning (New) -->
          <div class="space-y-4">
            <div class="flex justify-between items-center">
              <label class="text-[10px] font-black uppercase tracking-widest text-slate-500">Algorithm Tuning</label>
              <span
                class="text-[9px] font-mono text-sky-500 uppercase">{{ isLowPassEnabled ? 'Guitar/Bass' : 'Standard' }}</span>
            </div>
            <div class="flex items-center gap-2">
              <button
                @click="isLowPassEnabled = !isLowPassEnabled"
                class="flex-1 py-2 rounded-lg font-black text-[10px] border transition-all uppercase tracking-widest"
                :class="isLowPassEnabled ? 'bg-sky-500/20 border-sky-500/50 text-sky-400' : 'bg-slate-900 border-white/5 text-slate-500'"
              >
                {{ isLowPassEnabled ? 'Low-Pass: On' : 'Low-Pass: Off' }}
              </button>
              <button
                @click="downsample = downsample === 1 ? 4 : 1"
                class="flex-1 py-2 rounded-lg font-black text-[10px] border transition-all uppercase tracking-widest"
                :class="downsample > 1 ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400' : 'bg-slate-900 border-white/5 text-slate-500'"
              >
                {{ downsample > 1 ? 'Bass Mode: On' : 'Bass Mode: Off' }}
              </button>
            </div>
            <p class="text-[9px] text-slate-600">
              <strong>Low-Pass:</strong> Removes high noise.
              <strong>Bass Mode:</strong> 4x Downsample for better low-end detection.
            </p>
          </div>
        </div>
      </div>
    </Transition>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Tuner Card -->
      <div class="lg:col-span-2 bg-slate-800/50 rounded-3xl p-8 border border-slate-700 backdrop-blur-xl">
        <div class="flex items-center justify-between mb-8">
          <div
            class="h-3 w-3 rounded-full animate-pulse"
            :class="isInitialized ? 'bg-green-500' : 'bg-red-500'"
          ></div>
          <span class="text-xs font-mono text-slate-500 uppercase">Live Frequency Stream</span>
        </div>

        <div class="flex flex-col items-center py-8 relative">
          <!-- Strobe Ring -->
          <div class="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
            <canvas ref="strobeCanvas" width="400" height="400" class="w-80 h-80"></canvas>
          </div>

          <div class="text-3xl font-bold text-sky-400 mb-2 font-mono uppercase tracking-[0.3em] h-8 flex items-center z-10">
            {{ currentNote || '--' }}
          </div>
          <div class="text-8xl font-black font-mono tracking-tighter text-white z-10">
            {{ pitch ? pitch.toFixed( 1 ) : '000.0' }}<span class="text-2xl text-sky-400">Hz</span>
          </div>

          <div class="w-full max-w-md mt-16 z-10">
            <div class="flex justify-between text-[10px] text-slate-500 uppercase tracking-widest mb-2 font-black px-2">
              <span class="text-rose-500">Flat</span>
              <span :class="Math.abs( cents || 0 ) < 5 ? 'text-emerald-500' : 'text-slate-500'">In Tune</span>
              <span class="text-orange-500">Sharp</span>
            </div>
            <div class="h-1.5 bg-slate-900 rounded-full relative overflow-hidden border border-white/5">
              <!-- Center point marker -->
              <div class="absolute left-1/2 top-0 bottom-0 w-[2px] bg-slate-700 z-0 -translate-x-1/2"></div>
              <!-- Dynamic Indicator -->
              <div
                class="absolute top-0 bottom-0 w-2 transition-all duration-100 ease-out z-10 rounded-full"
                :style="{ left: `calc(50% + ${( cents || 0 ) / 2}%)`, transform: 'translateX(-50%)' }"
                :class="Math.abs( cents || 0 ) < 5 ? 'bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.8)]' : 'bg-sky-400'"
              ></div>
            </div>
            <div class="text-center mt-3">
              <span class="text-[10px] font-black font-mono text-slate-500 uppercase tracking-widest">
                {{ cents > 0 ? '+' : '' }}{{ cents.toFixed( 1 ) }} cents
              </span>
            </div>
          </div>
        </div>

        <!-- Vibrato Diagnostic Graph -->
        <div class="mt-8 pt-8 border-t border-white/5">
          <label class="text-[9px] font-black uppercase tracking-widest text-slate-600 block mb-4">Stability Diagnostic (Vibrato)</label>
          <div class="h-24 w-full relative group">
            <svg class="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
              <line x1="0" y1="50" x2="100" y2="50" stroke="#1e293b" stroke-width="1" />
              <polyline
                fill="none"
                stroke="#38bdf8"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                :points="pitchHistory.length > 1 ? pitchHistory.map((h, i) => `${(i / (pitchHistory.length - 1)) * 100},${50 - (h.cents / 2)}`).join(' ') : ''"
              />
            </svg>
            <div class="absolute inset-0 bg-gradient-to-t from-slate-900/50 to-transparent pointer-events-none"></div>
          </div>
        </div>
      </div>

      <!-- Stats Card -->
      <div class="bg-slate-800/50 rounded-3xl p-6 border border-slate-700 backdrop-blur-xl">
        <h3 class="text-sm font-bold uppercase tracking-widest text-slate-500 mb-6 font-black italic">Diagnostic Data</h3>
        <div class="space-y-4">
          <div class="bg-slate-900/50 p-6 rounded-2xl border border-white/5 group hover:bg-slate-900/80 transition-all">
            <span class="text-[10px] text-slate-500 uppercase font-black tracking-widest">Tone Quality</span>
            <div class="flex items-end justify-between mt-2">
              <div class="text-3xl font-black text-white italic">{{ toneQuality }}%</div>
              <div class="text-[10px] font-black text-emerald-400 uppercase mb-1">{{ toneQualityLabel }}</div>
            </div>
            <div class="h-1 bg-slate-800 rounded-full mt-4 overflow-hidden">
              <div
                class="h-full bg-indigo-500 transition-all duration-500"
                :style="{ width: `${toneQuality}%` }"
              ></div>
            </div>
          </div>

          <div class="bg-slate-900/50 p-6 rounded-2xl border border-white/5">
            <span class="text-[10px] text-slate-500 uppercase font-black tracking-widest">Calibration</span>
            <div class="text-xl font-black text-white mt-1">A4 = {{ concertA }}Hz</div>
            <p class="text-[9px] text-slate-600 mt-2">Adjust in settings for historical or scientific tuning.</p>
          </div>

          <div class="pt-4">
            <button
              v-if=" !isInitialized "
              @click="init"
              class="w-full py-5 bg-sky-500 hover:bg-sky-400 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-sky-500/10 active:scale-95"
            >
              Initialize Engine
            </button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.glass-card {
  backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  background-color: rgba(255, 255, 255, 0.02);
  transition: all 0.3s ease;
}

/* Drawer Transition */
.drawer-enter-active,
.drawer-leave-active {
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  max-height: 500px;
}

.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
  max-height: 0;
  transform: translateY(-10px);
}

/* Range Input Styling */
input[type="range"]::-webkit-slider-thumb {
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 9999px;
  background-color: #0ea5e9;
  cursor: pointer;
  box-shadow: 0 10px 15px -3px rgba(14, 165, 233, 0.5);
}

input[type="range"]::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 9999px;
  background-color: #0ea5e9;
  cursor: pointer;
  box-shadow: 0 10px 15px -3px rgba(14, 165, 233, 0.5);
}
</style>
