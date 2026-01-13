<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { usePitch, useAudioEngine, InfoPanel, Note } from '@spectralsuite/core'

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

const { init, isInitialized, error, activate, deactivate } = useAudioEngine()

// Audio engine lifecycle for pitch detection
onMounted( () => activate() )
onUnmounted( () => deactivate() )

// Watch for initialization to auto-activate
watch( isInitialized, ( newVal ) => {
  if ( newVal ) activate();
} );

const isSettingsOpen = ref( false )
const activeCategory = ref<string | null>( null )
const showDiagnostics = ref( true )
const showVibrato = ref( true )
const droneVolume = ref( 0 )
const isDroneActive = ref( false )

const start = () => {
  init()
}

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

        const rotationSpeed = ( cents.value / 100 ) * 0.1
        strobeAngle.value += rotationSpeed

        ctx.save()
        ctx.translate( width / 2, height / 2 )
        ctx.rotate( strobeAngle.value )

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

// Drone Logic
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
    droneOsc.type = 'triangle'
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
  <div class="min-h-screen bg-slate-950 text-white p-8">
    <div class="max-w-4xl mx-auto">
      <header class="flex justify-between items-center mb-12">
        <div class="flex items-center gap-6">
          <div>
            <h1 class="text-4xl font-black tracking-tighter text-white uppercase italic">Aura<span
                class="text-sky-400">Tune</span> <span class="text-xs not-italic text-slate-500 ml-2">PRO</span></h1>
            <p class="text-slate-500 font-mono text-[10px] uppercase tracking-[0.3em] mt-1">High-Precision Intonation Lab</p>
          </div>
          <InfoPanel title="AuraTune Pro Features">
            <h4 class="text-sky-400">Strobe Visualization</h4>
            <p>The rotating ring tracks sub-cent deviations. If it rotates clockwise, you're sharp. Counter-clockwise means flat.</p>
            <h4 class="text-sky-400">Calibration</h4>
            <p>Use the settings cog to change your reference pitch (e.g., 432Hz for scientific tuning).</p>
            <h4 class="text-sky-400">Transposition</h4>
            <p>Instantly switch between Concert C and common band instrument keys (Bb, Eb, F).</p>
          </InfoPanel>
        </div>

        <div class="flex items-center gap-6">
          <button
            @click="isSettingsOpen = !isSettingsOpen"
            class="p-3 bg-slate-900 border border-white/5 rounded-2xl text-slate-500 hover:text-white transition-all transform"
            :class="{ 'rotate-90 text-sky-400': isSettingsOpen }"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
          <div v-if=" isInitialized " class="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
            <div class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div> Engine Active
          </div>
        </div>
      </header>

      <!-- Advanced Settings -->
      <Transition name="drawer">
        <div v-if="isSettingsOpen" class="bg-slate-900/80 backdrop-blur-xl border border-white/5 p-10 rounded-[2.5rem] mb-12 overflow-hidden shadow-2xl">
          <div class="relative min-h-[320px]">
            <!-- Level 1: Category Pills -->
            <Transition
              name="morph-swell"
              mode="out-in"
            >
              <div
                v-if=" !activeCategory "
                class="flex flex-wrap items-start content-start gap-4 absolute inset-0"
              >
                <button
                  v-for=" cat in ['General', 'Tuning', 'Drone', 'Engine'] "
                  :key="cat"
                  @click="activeCategory = cat"
                  class="group relative px-6 py-4 rounded-2xl bg-slate-800 border border-slate-700 hover:border-slate-500 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                >
                  <div
                    class="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-white mb-1 transition-colors"
                  >
                    {{ cat }}
                  </div>
                  <div class="text-[9px] text-slate-600 group-hover:text-slate-500 italic">
                    {{
                      cat === 'General' ? 'Layout & Visibility' :
                        cat === 'Tuning' ? 'Calibration & Key' :
                          cat === 'Drone' ? 'Reference Tone Guide' :
                            'Processing Engine'
                    }}
                  </div>
                  <!-- Active Indicator Dots -->
                  <div
                    v-if=" ( cat === 'General' && ( !showDiagnostics || !showVibrato ) ) || ( cat === 'Tuning' && ( concertA !== 440 || transposition !== 0 ) ) || ( cat === 'Drone' && isDroneActive ) || ( cat === 'Engine' && ( isLowPassEnabled || downsample > 1 ) ) "
                    class="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-sky-500 shadow-lg shadow-sky-500/50"
                  ></div>
                </button>

                <!-- Close Button -->
                <button
                  @click="isSettingsOpen = false"
                  class="absolute top-0 right-0 p-2 text-slate-500 hover:text-white transition-colors rounded-full hover:bg-white/10"
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
                class="absolute inset-0 bg-slate-800 rounded-2xl border border-slate-700 flex flex-col overflow-hidden shadow-2xl"
              >
                <div class="flex-1 flex flex-col animate-content-swell">
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
                    <!-- General Section -->
                    <div
                      v-if=" activeCategory === 'General' "
                      class="grid grid-cols-1 md:grid-cols-2 gap-4"
                    >
                      <button
                        @click="showDiagnostics = !showDiagnostics"
                        class="px-4 py-3 rounded-xl font-black text-[10px] border transition-all text-left uppercase tracking-widest flex items-center justify-between"
                        :class="showDiagnostics ? 'bg-sky-500/10 border-sky-400/30 text-sky-400' : 'bg-slate-900 border-white/5 text-slate-500'"
                      >
                        <span>Show Diagnostic Data</span>
                        <div
                          class="w-2 h-2 rounded-full"
                          :class="showDiagnostics ? 'bg-sky-400' : 'bg-slate-700'"
                        ></div>
                      </button>
                      <button
                        @click="showVibrato = !showVibrato"
                        class="px-4 py-3 rounded-xl font-black text-[10px] border transition-all text-left uppercase tracking-widest flex items-center justify-between"
                        :class="showVibrato ? 'bg-indigo-500/10 border-indigo-400/30 text-indigo-400' : 'bg-slate-900 border-white/5 text-slate-500'"
                      >
                        <span>Show Vibrato Graph</span>
                        <div
                          class="w-2 h-2 rounded-full"
                          :class="showVibrato ? 'bg-indigo-400' : 'bg-slate-700'"
                        ></div>
                      </button>
                    </div>
                    <!-- Tuning Section -->
                    <div
                      v-if=" activeCategory === 'Tuning' "
                      class="grid grid-cols-1 md:grid-cols-2 gap-8"
                    >
                      <div class="space-y-4">
                        <div class="flex justify-between">
                          <label class="text-[10px] font-black uppercase tracking-widest text-slate-500">Concert
                            A</label>
                          <span class="text-xs font-black text-white">{{ concertA }}Hz</span>
                        </div>
                        <input
                          type="range"
                          min="390"
                          max="490"
                          v-model.number="concertA"
                          class="w-full h-1 bg-slate-700 rounded-full appearance-none cursor-pointer"
                        />
                      </div>
                      <div class="space-y-4">
                        <label
                          class="text-[10px] font-black uppercase tracking-widest text-slate-500 block">Instrument</label>
                        <div class="flex flex-wrap gap-2">
                          <button
                            v-for=" ( label, val ) in { 0: 'C', '-2': 'Bb', '-9': 'Eb', '-7': 'F' } "
                            :key="val"
                            @click="transposition = Number( val )"
 
                            class="px-3 py-1.5 rounded-lg font-black text-[10px] border transition-all"
                            :class="transposition === Number( val ) ? 'bg-sky-500/20 border-sky-500/50 text-sky-400' : 'bg-slate-900 border-white/5 text-slate-500'"
                          >
                            {{ label }}
                          </button>
                        </div>
                      </div>
 
                    </div>



                    <!-- Drone Section -->
                    <div
                      v-if=" activeCategory === 'Drone' "
                      class="max-w-md mx-auto space-y-6"
                    >
                      <div class="flex justify-between items-center">
 
                        <label class="text-[10px] font-black uppercase tracking-widest text-slate-500">Drone
                          Guide</label>
                        <button
                          @click="isDroneActive = !isDroneActive"
                          class="px-4 py-2 rounded-xl text-[10px] font-black transition-all"
                          :class="isDroneActive ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-slate-500'"
                        >
                          {{ isDroneActive ? 'ENABLED' : 'MUTED' }}
                        </button>
                      </div>
                      <div class="space-y-3">
                        <div class="flex justify-between text-[10px] font-black uppercase text-slate-600">
                          <span>Volume</span>
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



                    <!-- Engine Section -->
                    <div
                      v-if=" activeCategory === 'Engine' "
                      class="space-y-6"
                    >
                      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button
                          @click="isLowPassEnabled = !isLowPassEnabled"
 
                          class="py-3 rounded-xl font-black text-[10px] border transition-all uppercase tracking-widest text-center"
                          :class="isLowPassEnabled ? 'bg-sky-500/20 border-sky-500/50 text-sky-400' : 'bg-slate-900 border-white/5 text-slate-500'"
                        >
 
                          Low-Pass: {{ isLowPassEnabled ? 'ON' : 'OFF' }}
                        </button>
                        <button
                          @click="downsample = downsample === 1 ? 4 : 1"
 
                          class="py-3 rounded-xl font-black text-[10px] border transition-all uppercase tracking-widest text-center"
                          :class="downsample > 1 ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400' : 'bg-slate-900 border-white/5 text-slate-500'"
                        >
 
                          Bass Mode: {{ downsample > 1 ? 'ON' : 'OFF' }}
                        </button>
                      </div>
 
                      <p class="text-[9px] text-slate-500 text-center italic">
                        Tune your detection engine for specific performance needs.
                      </p>
                    </div>
 
                 </div>
                </div>
              </div>
          </div>
            </Transition>
          </div>
        </div>
      </Transition>

      <div
        v-if=" isInitialized "
        class="grid grid-cols-1 md:grid-cols-3 gap-8"
      >
        <!-- Tuner Display -->
        <div
          class="md:col-span-2 bg-slate-900 border border-white/5 p-12 rounded-[3rem] flex flex-col items-center justify-center relative overflow-hidden"
        >
          <!-- Strobe Ring -->
          <div class="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none scale-125">
             <canvas ref="strobeCanvas" width="500" height="500" class="w-[500px] h-[500px]"></canvas>
          </div>

          <span class="text-[10px] uppercase font-black tracking-[0.4em] text-slate-600 mb-6 z-10">Detected Note</span>
          <div class="text-8xl font-black text-sky-400 mb-8 font-mono uppercase tracking-tighter z-10">
            {{ currentNote || '--' }}
          </div>
          <div class="text-5xl font-mono font-black text-white tracking-widest z-10">
            {{ pitch ? pitch.toFixed( 2 ) : '000.00' }}<span class="text-xl text-sky-400 ml-2">Hz</span>
          </div>

          <div class="w-full max-w-sm mt-16 z-10">
            <div class="flex justify-between text-[10px] text-slate-500 uppercase tracking-widest mb-4 font-black px-2">
              <span class="text-rose-500/50">Flat</span>
              <span :class="Math.abs( cents || 0 ) < 5 ? 'text-emerald-400' : 'text-slate-500'">{{ Math.abs( cents || 0 ) < 5 ? 'CENTERED' : 'OFFSET' }}</span>
              <span class="text-orange-500/50">Sharp</span>
            </div>
            <div class="h-2 bg-slate-950 rounded-full relative overflow-hidden border border-white/5">
              <!-- Center point -->
              <div class="absolute left-1/2 top-0 bottom-0 w-[2px] bg-slate-800 z-0 -translate-x-1/2"></div>
              <!-- Dynamic Indicator -->
              <div
                class="absolute top-0 bottom-0 w-3 bg-sky-400 transition-all duration-100 ease-out z-10 rounded-full"
                :style="{ left: `calc(50% + ${( (cents || 0) / 2 )}%)`, transform: 'translateX(-50%)' }"
                :class="{ 'bg-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.8)]': Math.abs( cents || 0 ) < 5 }"
              ></div>
            </div>
            <div class="text-center mt-4">
              <span class="text-[11px] font-black font-mono text-slate-500 uppercase tracking-widest">
                {{ cents > 0 ? '+' : '' }}{{ cents.toFixed(1) }} <span class="text-[9px]">cents</span>
              </span>
            </div>
          </div>
        </div>

        <Transition name="fade-scale">
          <div
            v-if=" showVibrato "
            class="flex-1 flex flex-col"
          >
            <label class="text-[10px] font-black uppercase tracking-widest text-slate-600 block mb-4">Vibrato
              Graph</label>
            <div class="flex-1 bg-slate-950 rounded-3xl border border-white/5 relative group p-4">
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
            </div>
          </div>
        </Transition>
      </div>
        <!-- Stats Card -->
      <Transition name="fade-scale">
        <div
          v-if=" showDiagnostics "
          class="bg-slate-900 border border-white/5 p-10 rounded-[3rem] space-y-10 flex flex-col"
        >
          <h3 class="text-[11px] font-black uppercase tracking-widest text-slate-600 italic">Diagnostic Data</h3>

          <div class="space-y-4">
            <div class="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
              <span>Tone Quality</span>
              <span class="text-sky-400">{{ toneQualityLabel }}</span>
            </div>
            <div class="p-8 rounded-3xl bg-slate-950 border border-white/5">
              <div class="text-5xl font-black text-white italic tracking-tighter">{{ toneQuality }}%</div>
              <div class="mt-6 h-1 bg-slate-900 rounded-full overflow-hidden">
                <div
                  class="h-full bg-gradient-to-r from-sky-500 to-emerald-500 transition-all duration-500"
                  :style="{ width: toneQuality + '%' }"
                ></div>
              </div>
            </div>
          </div>
          <div class="flex-1"></div>
        </div>
      </Transition>
      </div>

      <div
        v-else
        class="flex flex-col items-center justify-center py-40 bg-slate-900/50 rounded-3xl border border-slate-800"
      >
        <div
          v-if=" !error "
          class="text-center"
        >
          <div class="w-20 h-20 bg-sky-500/10 rounded-full flex items-center justify-center mb-6 mx-auto">
            <div class="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <button
            @click="start"
            class="bg-sky-500 hover:bg-sky-600 px-10 py-4 rounded-2xl font-bold text-xl transition-all shadow-xl shadow-sky-500/20 transform hover:scale-105"
          >
            Enable AuraTune
          </button>
          <p class="text-slate-500 font-mono text-xs uppercase tracking-widest mt-6">Requires microphone access</p>
        </div>
        <div
          v-else
          class="text-center p-8"
        >
          <div class="text-4xl mb-4">⚠️</div>
          <p class="text-red-500 font-bold text-lg mb-2">Microphone Error</p>
          <p class="text-slate-400 text-sm max-w-md">{{ error }}</p>
          <button
            @click="start"
            class="mt-6 text-sky-400 font-bold hover:underline"
          >Try Again</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Drawer Transition */
.drawer-enter-active,
.drawer-leave-active {
  transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
  max-height: 500px;
}

.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
  max-height: 0;
  transform: translateY(-20px) scale(0.95);
}

/* Range Input Styling */
input[type="range"]::-webkit-slider-thumb {
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 9999px;
  background-color: #0ea5e9;
  cursor: pointer;
  box-shadow: 0 20px 25px -5px rgba(14, 165, 233, 0.5);
  transition: transform 0.2s;
}

input[type="range"]::-webkit-slider-thumb:hover {
  transform: scale(1.1);
}

input[type="range"]::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 9999px;
  background-color: #0ea5e9;
  cursor: pointer;
  box-shadow: 0 20px 25px -5px rgba(14, 165, 233, 0.5);
  transition: transform 0.2s;
}

input[type="range"]::-moz-range-thumb:hover {
  transform: scale(1.1);
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
