<script setup lang="ts">
import { usePitch, useAudioEngine, Note, useGlobalEngine } from '@spectralsuite/core'
import { onMounted, onUnmounted, ref, computed, watch } from 'vue'
import { useToolInfo } from '../../composables/useToolInfo';
import EngineSettings from '../../components/settings/EngineSettings.vue';
import LocalSettingsDrawer from '../../components/settings/LocalSettingsDrawer.vue';
import SettingsToggle from '../../components/settings/SettingsToggle.vue';

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

const { init, isInitialized, error: engineError, activate, deactivate } = useAudioEngine()
const { openInfo } = useToolInfo();

// Ensure engine is active when we mount this tool
onMounted( () => {
 activate();
});

onUnmounted( () => {
 deactivate();
});

// Watch for initialization to auto-activate if user initializes FROM this screen
watch( isInitialized, ( newVal ) => {
 if ( newVal ) activate();
});

const isSettingsOpen = ref( false )

const drawerCategories = computed( () => [
  {
    id: 'General',
    label: 'General',
    description: 'Layout & Visibility',
    showIndicator: !showDiagnostics.value || !showVibrato.value
  },
  {
    id: 'Tuning',
    label: 'Tuning',
    description: 'Concert A, Transposition',
    showIndicator: concertA.value !== 440 || transposition.value !== 0
  },
  {
    id: 'Drone',
    label: 'Drone',
    description: 'Background Guide Pitch',
    showIndicator: isDroneActive.value
  },
  {
    id: 'Engine',
    label: 'Engine',
    description: 'Global Audio Processing',
    showIndicator: useGlobalEngine().isGlobalEngineActive.value
  }
] );

const showDiagnostics = ref( true )
const showVibrato = ref( true )
const droneVolume = ref( 0 )
const isDroneActive = ref( false )

const emit = defineEmits<{
  ( e: 'back' ): void
}>()

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
        <button
          @click="emit( 'back' )"
          class="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 hover:text-white transition-colors mb-4 flex items-center gap-2"
        >
          <span>←</span> Back to Tonic
        </button>
        <h2 class="text-3xl font-black text-white italic uppercase tracking-tighter">AuraTune <span
            class="text-sky-500"
          >Pro</span></h2>
        <p class="text-slate-500 text-[10px] font-mono uppercase tracking-[0.2em] mt-1">Intonation & Stability Suite</p>
      </div>
      <div class="flex items-center gap-4">
        <SettingsToggle
          :is-open="isSettingsOpen"
          @click="isSettingsOpen = !isSettingsOpen"
        />
        <button
          @click="openInfo( 'auratune' )"
          class="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-black text-lg flex items-center justify-center hover:bg-indigo-500/20 transition-all active:scale-95 mb-1"
        >
          ?
        </button>
      </div>
    </header>

    <LocalSettingsDrawer
      :is-open="isSettingsOpen"
      :categories="drawerCategories"
      @close="isSettingsOpen = false"
    >
      <template #General>
        <div class="space-y-4">
          <div>
            <button
              @click="showDiagnostics = !showDiagnostics"
              class="w-full px-4 py-3 rounded-xl font-black text-xs border transition-all text-left uppercase tracking-widest flex items-center justify-between"
              :class="showDiagnostics ? 'bg-sky-500/10 border-sky-400/30 text-sky-400' : 'bg-slate-900 border-white/5 text-slate-500'"
            >
              <span>Show Diagnostic Data</span>
              <div
                class="w-2 h-2 rounded-full"
                :class="showDiagnostics ? 'bg-sky-400' : 'bg-slate-700'"
              ></div>
            </button>
            <p class="text-[11px] text-slate-500 mt-2 leading-relaxed px-1">
              Display panels for Tone Quality and Calibration data. Useful for analyzing signal health.
            </p>
          </div>

          <div>
            <button
              @click="showVibrato = !showVibrato"
              class="w-full px-4 py-3 rounded-xl font-black text-xs border transition-all text-left uppercase tracking-widest flex items-center justify-between"
              :class="showVibrato ? 'bg-indigo-500/10 border-indigo-400/30 text-indigo-400' : 'bg-slate-900 border-white/5 text-slate-500'"
            >
              <span>Show Vibrato Graph</span>
              <div
                class="w-2 h-2 rounded-full"
                :class="showVibrato ? 'bg-indigo-400' : 'bg-slate-700'"
              ></div>
            </button>
            <p class="text-[11px] text-slate-500 mt-2 leading-relaxed px-1">
              Real-time plot of pitch fluctuation over time. Helps visualize stability and modulation width.
            </p>
          </div>
        </div>
      </template>

      <template #Tuning>
        <div class="space-y-8">
          <div class="space-y-4">
            <div class="flex justify-between">
              <label class="text-xs font-black uppercase tracking-widest text-slate-500">Concert A (Reference)</label>
              <span class="text-xs font-black text-white">{{ concertA }}Hz</span>
            </div>
            <input
              type="range"
              min="390"
              max="490"
              v-model.number="concertA"
              class="w-full h-1 bg-slate-700 rounded-full appearance-none cursor-pointer"
            />
            <p class="text-[11px] text-slate-500 leading-relaxed">
              Sets the frequency of A4. Standard is 440Hz. 432Hz or other scientific tunings can be set here.
            </p>
          </div>

          <div class="space-y-4">
            <label class="text-xs font-black uppercase tracking-widest text-slate-500 block">Transposition</label>
            <div class="flex gap-2">
              <button
                v-for=" ( label, val ) in { 0: 'C', '-2': 'Bb', '-9': 'Eb', '-7': 'F' } "
                :key="val"
                @click="transposition = Number( val )"
                class="flex-1 py-1.5 rounded-lg font-black text-xs border transition-all"
                :class="transposition === Number( val ) ? 'bg-sky-500/20 border-sky-500/50 text-sky-400' : 'bg-slate-900 border-white/5 text-slate-500'"
              >
                {{ label }}
              </button>
            </div>
            <p class="text-[11px] text-slate-500 leading-relaxed">
              Shift the detected note display for transposing instruments (e.g., Bb Trumpet, Eb Sax).
            </p>
          </div>
        </div>
      </template>

      <template #Drone>
        <div class="max-w-md mx-auto space-y-6">
          <div>
            <div class="flex justify-between items-center mb-4">
              <label class="text-xs font-black uppercase tracking-widest text-slate-500">Drone Guide</label>
              <button
                @click="isDroneActive = !isDroneActive"
                class="px-4 py-2 rounded-xl text-xs font-black transition-all"
                :class="isDroneActive ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-slate-500'"
              >
                {{ isDroneActive ? 'ENABLED' : 'MUTED' }}
              </button>
            </div>
            <p class="text-[11px] text-slate-500 leading-relaxed">
              Plays a continuous reference tone matching the currently detected note. Excellent for intonation training.
            </p>
          </div>

          <div class="space-y-3">
            <div class="flex justify-between text-xs font-black uppercase text-slate-600">
              <span>Playback Volume</span>
              <span>{{ Math.round( droneVolume * 100 ) }}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              v-model.number="droneVolume"
              class="w-full h-1 bg-slate-700 rounded-full appearance-none cursor-pointer"
            />
          </div>
        </div>
      </template>

      <template #Engine>
        <div class="space-y-6">
          <EngineSettings />
        </div>
      </template>
    </LocalSettingsDrawer>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Tuner Card -->
      <div
        class="bg-slate-800/50 rounded-3xl p-8 border border-slate-700 backdrop-blur-xl transition-all duration-500 ease-spring"
        :class="showDiagnostics ? 'lg:col-span-2' : 'lg:col-span-3'"
      >
        <div class="flex items-center justify-between mb-8">
          <div
            v-if=" isInitialized "
            class="h-3 w-3 rounded-full animate-pulse bg-green-500"
          ></div>
          <span
            v-if=" isInitialized "
            class="text-xs font-mono text-slate-500 uppercase"
          >Live Frequency Stream</span>

          <button
            v-if=" !isInitialized "
            @click="init"
            class="w-full py-4 bg-sky-500 hover:bg-sky-400 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-sky-500/10 active:scale-95 flex items-center justify-center gap-3"
          >
            <div class="w-2 h-2 rounded-full bg-white animate-pulse"></div>
            Initialize Engine
          </button>
        </div>

        <div v-if="engineError" class="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-bold text-center">
           {{ engineError }}
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
        <Transition name="fade-scale">
          <div
            v-if=" showVibrato "
            class="mt-8 pt-8 border-t border-white/5"
          >
            <label class="text-[9px] font-black uppercase tracking-widest text-slate-600 block mb-4">Stability
              Diagnostic (Vibrato)</label>
            <div class="h-24 w-full relative group">
              <svg
                class="w-full h-full overflow-visible"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
              >
                <line
                  x1="0"
                  y1="50"
                  x2="100"
                  y2="50"
                  stroke="#1e293b"
                  stroke-width="1"
                />
                <polyline
                  fill="none"
                  stroke="#38bdf8"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  :points="pitchHistory.length > 1 ? pitchHistory.map( ( h, i ) => `${( i / ( pitchHistory.length - 1 ) ) * 100},${50 - ( h.cents / 2 )}` ).join( ' ' ) : ''"
                />
              </svg>
              <div class="absolute inset-0 bg-gradient-to-t from-slate-900/50 to-transparent pointer-events-none"></div>
            </div>
          </div>
        </Transition>
      </div>

      <!-- Stats Card -->
      <Transition name="fade-scale">
        <div
          v-if=" showDiagnostics "
          class="bg-slate-800/50 rounded-3xl p-6 border border-slate-700 backdrop-blur-xl"
        >
          <h3 class="text-sm font-bold uppercase tracking-widest text-slate-500 mb-6 font-black italic">Diagnostic Data
          </h3>
          <div class="space-y-4">
            <div
              class="bg-slate-900/50 p-6 rounded-2xl border border-white/5 group hover:bg-slate-900/80 transition-all"
            >
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
          </div>
        </div>
      </Transition>
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
.fade-scale-enter-active,
.fade-scale-leave-active {
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.fade-scale-enter-from,
.fade-scale-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

.morph-swell-enter-active,
.morph-swell-leave-active {
  transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.morph-swell-enter-from,
.morph-swell-leave-to {
  opacity: 0;
  transform: scale(0.85);
}

.animate-content-swell {
  animation: content-fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards 0.2s;
  opacity: 0;
  transform: translateY(10px);
}

@keyframes content-fade-in {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
