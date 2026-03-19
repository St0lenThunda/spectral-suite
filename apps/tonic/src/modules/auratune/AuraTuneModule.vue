<script setup lang="ts">
import { usePitch, useAudioEngine, Note, useGlobalEngine } from '@spectralsuite/core'
import { onMounted, onUnmounted, ref, computed, watch } from 'vue'
import IntelligenceButton from '../../components/IntelligenceButton.vue';
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
} = usePitch( { averagingWindowMs: 2500 } )

const { init, isInitialized, error: engineError, activate, deactivate } = useAudioEngine()

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

// Needle Physics State
const needlePosition = ref( 0 ); // The visual position (in cents)
let needleVelocity = 0;
// PHYSICS CONSTANTS
// Tension: How hard the spring pulls to the target (Higher = Faster/Snappier)
const SPRING_TENSION = 0.08; 
// Friction: Resistance to movement (Higher = Less overshoot/More heavy feel)
const SPRING_FRICTION = 0.82; 

onMounted( () => {
  const animate = () => {
      // 1. Strobe Logic (Keep existing)
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
    
    // 2. Needle Physics Logic
    // Goal: Move 'needlePosition' towards 'cents.value' with spring physics
    const target = cents.value || 0;
    const displacement = target - needlePosition.value;
    const force = displacement * SPRING_TENSION;
    
    needleVelocity += force;
    needleVelocity *= SPRING_FRICTION; // Apply damping
    needlePosition.value += needleVelocity;

    requestAnimationFrame( animate )
  }
  animate()
} )

// Drone Logic (Simple Oscillator)
let droneOsc: OscillatorNode | null = null
let droneGain: GainNode | null = null

watch( [isDroneActive, droneVolume, currentNote], () => {
  const context = useAudioEngine().getContext()
  if ( !context ) {
    console.warn( 'Drone Logic: No AudioContext' );
    return
  }

  console.log( 'Drone Watcher:', { active: isDroneActive.value, vol: droneVolume.value, note: currentNote.value, init: isInitialized.value } );

  if ( !isDroneActive.value || !currentNote.value || !isInitialized.value ) {
    if ( droneGain ) droneGain.gain.setTargetAtTime( 0, context.currentTime, 0.1 )
    return
  }

  if ( !droneOsc ) {
    console.log( 'Drone: Creating Oscillator' );
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
      const targetVol = droneVolume.value * 0.2;
      console.log( 'Drone: Setting Gain', targetVol );
      droneGain.gain.setTargetAtTime( targetVol, context.currentTime, 0.1 )
    }
  }
}, { immediate: true } )

const toneQuality = computed(() => {
  if (!clarity.value) return 0
  return Math.round(clarity.value * 100)
})

const toneQualityLabel = computed(() => {
  // Bass/Guitar signals are naturally "messy" (inharmonicity).
  // We lower the bar so a good clean guitar tone registers as "Rich" or "Pure".
  if (toneQuality.value > 75) return 'Pure'
  if (toneQuality.value > 60) return 'Rich'
  if (toneQuality.value > 40) return 'Stable'
  return 'Unstable'
})

// --- gStrings UI Logic ---

// Neighbor Notes for Ruler
import { Interval } from '@spectralsuite/core'; // Ensure Interval is imported
const neighborNotes = computed(() => {
    if (!currentNote.value) return { prev: '', next: '' };
    // Simplified transposition or just standard note ordering
    // For now, let's just rely on the fact that we can't easily transpose without importing the full library setup
    // But Note.transpose is available from the top import
    try {
        const prev = Note.transpose(currentNote.value, Interval.fromSemitones(-1));
        const next = Note.transpose(currentNote.value, Interval.fromSemitones(1));
        return { prev: Note.simplify(prev), next: Note.simplify(next) };
    } catch (e) {
        return { prev: '', next: '' };
    }
});

// Map -50..+50 cents to -45..+45 degrees
const gaugeRotation = computed(() => {
    // Clamp needle visual range
    const clamped = Math.max(-50, Math.min(50, needlePosition.value));
    // Linear map: -50 -> -45deg, +50 -> +45deg
    return clamped * (45 / 50);
});
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
        <IntelligenceButton
          toolId="auratune"
          label="Learn & How-To"
          colorClass="text-sky-400"
          bgClass="bg-sky-500/10"
          borderClass="border-sky-500/20"
        />
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
              aria-label="Concert A Frequency"
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
              aria-label="Drone Volume"
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
      <!-- Tuner Card (gStrings Style) -->
      <div
        class="bg-slate-900/50 rounded-3xl p-8 border border-white/5 relative overflow-hidden flex flex-col items-center justify-between min-h-[500px]"
        :class="showDiagnostics ? 'lg:col-span-2' : 'lg:col-span-3'"
      >
        <!-- Top Bar: String Indicators (Visual Decoration for now) -->
        <div class="w-full flex justify-between px-4 mb-8 relative">
            <!-- Initialization Overlay -->
            <div v-if="!isInitialized" class="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-sm -m-4 rounded-xl">
                 <button
                    @click="init"
                    class="px-8 py-3 bg-sky-500 hover:bg-sky-400 text-white font-black text-xs uppercase tracking-[0.2em] rounded-full transition-all shadow-[0_0_30px_rgba(14,165,233,0.3)] hover:shadow-[0_0_50px_rgba(14,165,233,0.5)] active:scale-95 flex items-center gap-3"
                  >
                    <div class="w-2 h-2 rounded-full bg-white animate-pulse"></div>
                    Start Tuner
                  </button>
            </div>

             <!-- Error Display -->
            <div v-if="engineError" class="absolute top-0 left-0 right-0 -mt-12 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-bold text-center uppercase tracking-widest rounded-lg">
                {{ engineError }}
            </div>

            <div v-for="note in ['E','A','D','G','B','E']" :key="note" 
                class="w-12 h-12 rounded-full flex items-center justify-center font-black text-xl bg-[#2a2a2a] text-stone-600 border-2 border-stone-800 transition-all duration-300"
                :class="{ 'text-white border-white bg-sky-500 shadow-[0_0_20px_rgba(255,255,255,0.5)] scale-110': isInitialized && currentNote && currentNote.startsWith(note) }"
            >
                {{ note }}
            </div>
        </div>

        <!-- Note Ruler -->
        <div class="w-full flex items-baseline justify-center gap-12 font-mono mb-8 relative z-10">
            <div class="text-4xl font-bold text-stone-700 opacity-50">{{ neighborNotes.prev || '--'  }}</div>
            <!-- Current Note: Turns Green when in tune -->
            <div class="text-9xl font-black tracking-tighter" 
                 :class="Math.abs(needlePosition) < 5 && currentNote ? 'text-emerald-400 drop-shadow-[0_0_40px_rgba(52,211,153,0.6)]' : 'text-sky-500'"
            >
                {{ currentNote || '--' }}
            </div>
            <div class="text-4xl font-bold text-stone-700 opacity-50">{{ neighborNotes.next || '--'  }}</div>
        </div>
        
        <!-- Frequency Readout: Turns Green when in tune -->
         <div class="text-4xl font-mono mb-4 z-10 relative"
              :class="Math.abs(needlePosition) < 5 && currentNote ? 'text-emerald-400' : 'text-sky-500'"
         >
            {{ pitch ? pitch.toFixed( 1 ) : '---.-' }}<span class="text-lg text-stone-500 ml-1">Hz</span>
        </div>

        <!-- Analog Gauge (SVG) -->
        <div class="w-full max-w-[500px] aspect-[2/1] relative">
            <svg viewBox="0 0 300 150" class="w-full h-full overflow-visible">
                <!-- Arc Ticks -->
                <path id="gauge-arc" d="M 30,140 A 120,120 0 0 1 270,140" fill="none" class="stroke-stone-700" stroke-width="2" />
                
                <!-- Major Ticks (-50, -40 ... 0 ... +50) -->
                <g v-for="tick in [-50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50]" :key="tick">
                    <!-- Map tick value to angle (-45 to 45 deg) -->
                    <rect x="149" y="20" width="2" height="15" 
                        :fill="tick === 0 ? ( Math.abs(needlePosition) < 5 && currentNote ? '#34d399' : '#0ea5e9') : '#444'" 
                        :transform="`rotate(${tick * (45/50)}, 150, 140)`" 
                    />
                    <!-- Tick Labels -->
                    <text v-if="tick % 50 === 0" 
                        x="150" y="10" 
                        text-anchor="middle" 
                        :fill="tick === 0 ? ( Math.abs(needlePosition) < 5 && currentNote ? '#34d399' : '#0ea5e9') : '#666'"
                        class="text-[8px] font-mono font-bold"
                        :transform="`rotate(${tick * (45/50)}, 150, 140)`"
                    >
                        {{ tick > 0 ? '+' : ''}}{{ tick }}c
                    </text>
                </g>

                <!-- Connection Line (Decor) -->
                 <line x1="150" y1="140" x2="150" y2="100" stroke="#333" stroke-width="1" />

                <!-- THE NEEDLE: Turns Green when in tune -->
                <g :transform="`rotate(${gaugeRotation}, 150, 140)`" class="transition-transform duration-75 ease-linear will-change-transform">
                    <!-- Needle Shaft -->
                    <line x1="150" y1="140" x2="150" y2="35" 
                          :stroke="Math.abs(needlePosition) < 5 && currentNote ? '#34d399' : '#0ea5e9'" 
                          stroke-width="4" stroke-linecap="round" />
                    <!-- Needle Tip Glow -->
                     <circle cx="150" cy="35" r="3" 
                             :fill="Math.abs(needlePosition) < 5 && currentNote ? '#34d399' : '#0ea5e9'" 
                             :class="Math.abs(needlePosition) < 5 && currentNote ? 'filter drop-shadow-[0_0_15px_rgba(52,211,153,0.9)]' : 'filter drop-shadow-[0_0_8px_rgba(14,165,233,0.8)]'" />
                     <!-- Counterweight -->
                    <circle cx="150" cy="140" r="12" fill="#1a1a1a" :stroke="Math.abs(needlePosition) < 5 && currentNote ? '#34d399' : '#0ea5e9'" stroke-width="3" />
                    <circle cx="150" cy="140" r="4" :fill="Math.abs(needlePosition) < 5 && currentNote ? '#34d399' : '#0ea5e9'" />
                </g>
            </svg>
            
            <!-- REMOVED OLD INDICATOR AS REQUESTED -->
        </div>

      </div>

      <!-- Stats Card -->
      <Transition name="fade-scale">
        <div
          v-if=" showDiagnostics "
          class="bg-slate-800/50 rounded-3xl p-6 border border-slate-700 backdrop-blur-xl"
        >
          <h3 class="text-sm font-black uppercase tracking-widest text-slate-500 mb-6 italic">Diagnostic Data
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

    <!-- Vibrato Diagnostic Graph (Full Width Footer) -->
    <Transition name="fade-scale">
      <div
        v-if=" showVibrato "
        class="mt-6 p-6 rounded-3xl bg-slate-900/50 border border-stone-800 w-full backdrop-blur-xl"
      >
        <label class="text-[9px] font-black uppercase tracking-widest text-sky-500 block mb-4 opacity-50">Pitch History (Vibrato)</label>
        <div class="h-32 w-full relative group">
          <svg
            class="w-full h-full overflow-visible"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <!-- Center Line -->
            <line
              x1="0"
              y1="50"
              x2="100"
              y2="50"
              stroke="#333"
              stroke-width="1"
              stroke-dasharray="2 2"
            />
            <!-- Vibrato Line -->
            <polyline
              fill="none"
              stroke="#0ea5e9"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              :points="pitchHistory.length > 1 ? pitchHistory.map( ( h, i ) => `${( i / ( pitchHistory.length - 1 ) ) * 100},${50 - ( h.cents / 2 )}` ).join( ' ' ) : ''"
            />
          </svg>
          <!-- Fade Overlay -->
          <div class="absolute inset-0 bg-gradient-to-r from-slate-900 via-transparent to-transparent pointer-events-none"></div>
        </div>
      </div>
    </Transition>

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
