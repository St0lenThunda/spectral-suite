<script setup lang="ts">
/**
 * StudioHUD.vue
 * The central "Instrument Cluster" for the Pocket Engine Studio.
 * This component visualizes the user's timing accuracy in real-time.
 */
import { computed } from 'vue'

/**
 * Props passed from the parent Engine module.
 * We use an interface to define exactly what this component expects.
 */
interface Props {
  timingOffset: number;   // How many milliseconds early (-) or late (+) the hit was
  pocketPosition: number; // The 0-100 percentage for the visual slider
  pocketColor: string;    // The Tailwind class for the color of the hit marker
  tendency: string;       // A text description (e.g., "Consistent", "Leading")
  stats: {
    total: number;        // Total hits logged in this session
    perfect: number;      // Number of hits within the "Perfect" window
  };
  grooveHistory: Array<{ offset: number }>; // History of recent hits for the radial map
  avgOffset: number;      // The average timing offset for the session
  isFlashing: boolean;    // Whether the screen should flash on a beat
}

const props = defineProps<Props>()
const emit = defineEmits(['reset'])

/**
 * Formats the timing offset with a plus sign for late hits.
 * This makes it easier for the user to read at a glance.
 */
const formattedTimingOffset = computed(() => {
  const rounded = Math.round(props.timingOffset || 0)
  // If it's positive, we add a '+' sign. Otherwise, standard string conversion.
  return rounded > 0 ? `+${rounded}` : `${rounded}`
})

/**
 * Calculates the overall precision score as a percentage.
 * Total hits vs Perfect hits.
 */
const precisionScore = computed(() => {
  const total = props.stats?.total || 1 // Avoid division by zero!
  const perfect = props.stats?.perfect || 0
  return Math.round((perfect / total) * 100)
})

/**
 * Helper to determine the color of a hit dot in the radial map.
 * Green for perfect, Orange for late, Rose for early.
 */
function getHitColor(offset: number): string {
  if (Math.abs(offset) < 30) return '#34d399' // Emerald Green
  if (offset > 0) return '#fb923c'           // Orange (Late)
  return '#f43f5e'                          // Rose (Early)
}

/**
 * Calculates X/Y position for a hit in the radial SVG map.
 * This uses trigonometry to convert "Time" (Angle) and "Offset" (Distance) to Coordinates.
 * 
 * @param index - The index in the history array
 * @param total - Total length of history
 * @param offset - Timing offset of this specific hit
 */
function getHitPosition(index: number, total: number, offset: number) {
  // We subtract 90 degrees (Math.PI / 2) so that 0:00 starts at the TOP of the circle.
  const angle = (index / total) * Math.PI * 2 - Math.PI / 2
  
  // The distance from the center is 40px base + a "bloom" based on how far off you were.
  // Math.min(55...) ensures the dots don't fly off the edge of the 100px radius.
  const distance = 40 + Math.min(55, Math.abs(offset) / 200 * 55)
  
  return {
    x: 100 + Math.cos(angle) * distance,
    y: 100 + Math.sin(angle) * distance
  }
}
</script>

<template>
  <div class="w-full flex flex-col gap-8 items-center justify-center p-4 relative z-0">
    
    <!-- UPPER: The Precision Pocket (The "Speedometer") -->
    <div 
      class="w-full max-w-4xl glass-card p-10 rounded-3xl border-b-8 border-emerald-500/20 shadow-2xl flex flex-col items-center gap-6" 
      :class="{ 'ring-8 ring-white/5': isFlashing }"
    >
      <div class="w-full space-y-4">
        <div class="flex justify-between items-baseline px-4">
          <span class="text-[12px] font-black text-emerald-500 uppercase tracking-widest">Precision Pocket</span>
          <span class="text-5xl font-black font-mono text-white" :class="{ 'text-emerald-400': Math.abs(timingOffset) < 15 }">
            {{ formattedTimingOffset }}
            <span class="text-sm text-slate-500 ml-1">ms</span>
          </span>
        </div>
        
        <!-- The Visual Track: 0ms is the Center Line -->
        <div class="relative w-full h-16 bg-slate-950/90 rounded-2xl overflow-hidden border border-white/10 shadow-inner">
          <!-- The Center Target Zone -->
          <div class="absolute left-1/2 top-0 bottom-0 w-px bg-white/10 z-10"></div>
          <div class="absolute left-1/2 top-0 bottom-0 w-32 -translate-x-1/2 bg-emerald-500/10 border-x border-emerald-500/20 backdrop-blur-sm"></div>
          
          <!-- The Dynamic Hit Indicator -->
          <div 
            class="absolute top-2 bottom-2 w-4 rounded-full transition-all duration-200"
            :class="pocketColor"
            :style="{ left: pocketPosition + '%', transform: 'translateX(-50%)' }"
          ></div>
        </div>
        
        <div class="text-center font-black text-slate-500 uppercase tracking-widest text-xs">
          {{ tendency }}
        </div>
      </div>
    </div>

    <!-- LOWER: The Groove Density & Session Stats -->
    <div class="w-full max-w-5xl glass-card p-8 rounded-3xl border-t border-white/5 relative group">
      <div class="flex items-center justify-between gap-12 relative z-10">
        
        <!-- Left Column: Total Hits -->
        <div class="text-left w-48 space-y-1">
          <div class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Hits Logged</div>
          <div class="text-6xl font-black font-mono text-white tracking-widest">{{ stats.total }}</div>
          <div class="text-[8px] font-bold text-slate-600 uppercase">Total Verified Pulse Hits</div>
        </div>

        <!-- Center Column: The Groove Map (Radial Hit History) -->
        <div class="flex-1 max-w-sm h-72 relative flex items-center justify-center">
          <svg viewBox="0 0 200 200" class="w-full h-full filter drop-shadow-lg">
            <!-- Background Rings -->
            <circle cx="100" cy="100" r="95" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="0.5" />
            <circle cx="100" cy="100" r="40" fill="rgba(52, 211, 153, 0.03)" stroke="rgba(52, 211, 153, 0.1)" stroke-width="1" />
            
            <!-- Real-time Hit Points -->
            <circle v-for="(hit, i) in grooveHistory" :key="i"
              :cx="getHitPosition(i, grooveHistory.length, hit.offset).x"
              :cy="getHitPosition(i, grooveHistory.length, hit.offset).y"
              r="4.5" :fill="getHitColor(hit.offset)"
              :opacity="0.2 + (i / grooveHistory.length) * 0.8"
              class="transition-all duration-300" />
          </svg>
          <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div class="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4">Density</div>
          </div>
        </div>

        <!-- Right Column: Precision Percentage -->
        <div class="text-right w-48 space-y-1">
          <div class="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Avg Precision</div>
          <div class="text-6xl font-black font-mono text-emerald-400 tracking-tighter">{{ precisionScore }}%</div>
          <div class="text-[8px] font-bold text-slate-600 uppercase">Avg {{ Math.round(avgOffset) }}ms Off Center</div>
        </div>
      </div>

      <!-- Action Area: Session Reset -->
      <button 
        @click="emit('reset')" 
        class="absolute bottom-6 left-8 px-6 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-[10px] font-black text-slate-400 hover:text-white uppercase tracking-widest transition-all border border-white/5 hover:border-white/10"
      >
        Reset Session Stats
      </button>
    </div>
  </div>
</template>

<style scoped>
.glass-card {
  backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  background: rgba(255, 255, 255, 0.02);
}
</style>
