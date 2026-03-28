<script setup lang="ts">
/**
 * POCKET ENGINE CLASSIC
 * This is the original layout of the Pocket Engine.
 * 
 * EDUCATIONAL PATTERN:
 * We now receive everything as "Props". This makes the layout "Dumb"
 * (it just shows data) and the parent "Smart" (it handles the math).
 * 
 * CLEANUP:
 * Header and LocalSettingsDrawer have been moved to the parent 
 * PocketEngineModule for consistency.
 */
import { PlayButton } from '@spectralsuite/core'

const props = defineProps<{
  // State
  isInitialized: boolean
  isPlaying: boolean
  tempo: number
  error: string | null
  timingOffset: number
  stats: any
  subdivision: number
  polySubdivision: number
  isFlashEnabled: boolean
  isFlashing: boolean
  gapIntensity: number
  isSettingsOpen: boolean
  isLadderEnabled: boolean
  ladderIncrement: number
  ladderInterval: number
  ladderGoal: number
  stealthBarsOn: number
  stealthBarsOff: number
  isStealthEnabled: boolean
  accentPattern: number[]
  currentPulse: number
  grooveHistory: any[]
  pocketPosition: number
  pocketColor: string
  tendency: string
  avgOffset: number

  // Actions
  init: () => void
  togglePlay: () => void
  updateTempo: (v: number) => void
  updateSubdivision: (v: number) => void
  updatePolyrhythm: (v: number) => void
  updateGapIntensity: (v: number) => void
  updateLadder: () => void
  updateStealth: () => void
  cycleAccent: (i: number) => void
  applyPattern: (type: 'downbeat' | 'backbeat' | 'jazz') => void
  reset: () => void
  onSettingsToggle: () => void
}>()

defineEmits(['back'])
</script>

<template>
  <div class="space-y-8 h-full overflow-y-auto no-scrollbar pb-20">
    <!-- 
       Header and Drawer removed. Now handled by PocketEngineModule.vue
    -->

    <!-- Control Panel -->
    <div class="glass-card p-8 rounded-[3rem]">
      <div class="flex flex-col md:flex-row items-center gap-12">
        <div class="flex-1 w-full space-y-8">
          <div>
            <div class="flex items-center justify-between mb-4">
              <label class="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 block text-left">Tempo (BPM)</label>
            </div>
            <div class="flex items-center gap-6">
              <input type="range" min="40" max="300" :value="tempo" @input="updateTempo(parseInt(($event.target as HTMLInputElement).value))" class="flex-1 h-2 bg-slate-800 rounded-full appearance-none cursor-pointer" />
              <span class="text-4xl font-black font-mono text-white w-20 text-right">{{ tempo }}</span>
            </div>
          </div>
        </div>
        <PlayButton :is-playing="isPlaying" @click="togglePlay" />
      </div>
    </div>

    <!-- Pocket Visualizer -->
    <div class="glass-card p-12 rounded-[3rem] transition-colors duration-100" :class="{ 'bg-white/10': isFlashing }">
      <h3 class="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 mb-8 text-center">The Pocket</h3>
      <div class="relative w-full h-32 bg-slate-900/50 rounded-3xl overflow-hidden border border-white/5 transition-all" :class="{ 'ring-4 ring-white/20': isFlashing }">
        <div class="absolute left-1/2 top-0 bottom-0 w-24 -translate-x-1/2 bg-emerald-500/20 border-x-2 border-emerald-500/40"></div>
        <div class="absolute left-1/2 top-0 bottom-0 w-1 -translate-x-1/2 bg-white/20"></div>
        <div class="absolute top-4 bottom-4 w-4 rounded-full transition-all duration-200 shadow-lg" :class="pocketColor" :style="{ left: pocketPosition + '%', transform: 'translateX(-50%)' }"></div>
        <div class="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-mono text-rose-400">RUSH</div>
        <div class="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-mono text-orange-400">DRAG</div>
      </div>
      <div class="mt-6 text-center">
        <div class="text-6xl font-black font-mono">{{ timingOffset > 0 ? '+' : '' }}{{ Math.round(timingOffset) }}<span class="text-2xl text-slate-500">ms</span></div>
        <p class="text-sm text-slate-500 mt-2">Timing Offset</p>
      </div>
    </div>

    <!-- Radial Groove Map -->
    <div class="glass-card p-8 rounded-[3rem]">
      <h3 class="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400 mb-6 text-center">Groove Map</h3>
      <div class="flex justify-center">
        <svg viewBox="0 0 200 200" class="w-64 h-64">
          <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="2" />
          <circle cx="100" cy="100" r="30" fill="rgba(52, 211, 153, 0.1)" stroke="rgba(52, 211, 153, 0.3)" stroke-width="1" />
          <circle cx="100" cy="100" r="4" fill="rgba(255,255,255,0.3)" />
          <circle v-for="(hit, i) in grooveHistory" :key="i"
            :cx="100 + Math.cos((i / grooveHistory.length) * Math.PI * 2 - Math.PI / 2) * (30 + Math.min(60, Math.abs(hit.offset) / 200 * 60))"
            :cy="100 + Math.sin((i / grooveHistory.length) * Math.PI * 2 - Math.PI / 2) * (30 + Math.min(60, Math.abs(hit.offset) / 200 * 60))"
            r="4" :fill="Math.abs(hit.offset) < 30 ? '#34d399' : hit.offset > 0 ? '#fb923c' : '#f43f5e'"
            :opacity="0.5 + (i / grooveHistory.length) * 0.5" />
        </svg>
      </div>
      <p class="text-center text-slate-500 text-[10px] mt-4">Hits closer to the center are more accurate.</p>
    </div>

    <!-- Stats -->
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
      <button @click="reset" class="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold text-sm uppercase tracking-widest transition-all">
        Reset Statistics
      </button>
    </div>
  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>
