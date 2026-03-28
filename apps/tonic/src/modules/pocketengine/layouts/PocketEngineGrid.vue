<script setup lang="ts">
/**
 * POCKET ENGINE GRID
 * Focus: Modular Dashboard Tiles
 * 
 * DESIGN GOAL: 
 * High-density dashboard where every feature is a "Tile".
 * 
 * CLEANUP:
 * Header and LocalSettingsDrawer have been moved to the parent 
 * PocketEngineModule for consistency.
 */
import { PlayButton } from '@spectralsuite/core'

defineProps<{
  // State
  isPlaying: boolean
  tempo: number
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

const emit = defineEmits(['back', 'update:isFlashEnabled', 'update:ladderIncrement', 'update:ladderInterval', 'update:ladderGoal', 'update:stealthBarsOn', 'update:stealthBarsOff'])
</script>

<template>
  <div class="h-full flex flex-col gap-4 overflow-hidden">
    <!-- 
       Header and Drawer removed. Now handled by PocketEngineModule.vue
    -->

    <!-- The Grid -->
    <div class="flex-1 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto custom-scrollbar pr-2 pb-10">
      
      <!-- TILE 1: Transport -->
      <div class="glass-card p-6 rounded-3xl flex flex-col justify-between border-b-4 border-emerald-500/50">
         <div class="text-[8px] font-black text-slate-500 uppercase tracking-widest">Transport</div>
         <div class="flex items-center justify-center p-4">
            <PlayButton :is-playing="isPlaying" @click="togglePlay" size="md" />
         </div>
         <div class="text-center text-[10px] font-black text-emerald-400">{{ isPlaying ? 'SYNCED' : 'READY' }}</div>
      </div>

      <!-- TILE 2: Tempo -->
      <div class="glass-card p-6 rounded-3xl flex flex-col justify-between border-b-4 border-orange-500/50">
         <div class="text-[8px] font-black text-slate-500 uppercase tracking-widest">Timing Engine</div>
         <div class="text-3xl font-black font-mono text-center my-2 text-orange-500">{{ tempo }}</div>
         <input type="range" min="40" max="300" :value="tempo" @input="updateTempo(parseInt(($event.target as HTMLInputElement).value))" class="w-full accent-orange-500" />
      </div>

      <!-- TILE 3: Subdivision -->
      <div class="glass-card p-4 rounded-3xl flex flex-col gap-3">
         <div class="text-[8px] font-black text-slate-500 uppercase tracking-widest">Subdivision</div>
         <div class="grid grid-cols-2 gap-2 flex-1 items-center">
            <button v-for="(label, s) in { 1: '1/4', 2: '1/8', 3: '1/12', 4: '1/16' }" :key="s"
              @click="updateSubdivision(Math.floor(Number(s)))"
              class="h-10 rounded-xl font-black text-[10px]"
              :class="subdivision === Math.floor(Number(s)) ? 'bg-white text-slate-900' : 'bg-slate-900 text-slate-500 hover:text-white'"
            >{{ label }}</button>
         </div>
      </div>

      <!-- TILE 4: Accent Map -->
      <div class="glass-card p-4 rounded-3xl flex flex-col gap-2 border-b-4 border-rose-500/50 min-h-[140px]">
         <div class="flex justify-between items-center mb-1">
            <div class="text-[8px] font-black text-slate-500 uppercase tracking-widest">Accent Map</div>
            <button @click="applyPattern('backbeat')" class="text-[7px] text-rose-400 font-bold uppercase">Preset</button>
         </div>
         <div class="flex-1 flex flex-wrap gap-1 content-start overflow-y-auto custom-scrollbar pr-1">
            <button v-for="(level, idx) in accentPattern" :key="idx" @click="cycleAccent(idx)"
              class="w-6 h-8 rounded-md flex flex-col items-center justify-center transition-all border shrink-0"
              :class="[
                isPlaying && (currentPulse % accentPattern.length === idx) ? 'border-rose-400' : 'border-white/5',
                level === 3 ? 'bg-rose-500' : level === 2 ? 'bg-slate-800' : 'bg-slate-950 opacity-40'
              ]"
            >
               <div class="w-0.5 rounded-full" :class="[level === 3 ? 'h-3 bg-white' : level === 2 ? 'h-1.5 bg-slate-400' : 'h-1 bg-slate-600']"></div>
            </button>
         </div>
      </div>

      <!-- TILE 5: Pocket Diagnostic -->
      <div class="glass-card p-6 rounded-3xl col-span-2 flex flex-col gap-4 border-b-4 border-emerald-500/50" :class="{ 'bg-emerald-500/5': isFlashing }">
         <div class="flex justify-between items-baseline">
            <div class="text-[8px] font-black text-slate-500 uppercase tracking-widest">Precision Pocket</div>
            <div class="text-xs font-black text-emerald-500">{{ tendency }}</div>
         </div>
         <div class="relative w-full h-8 bg-slate-950/50 rounded-xl overflow-hidden border border-white/5 mx-auto">
             <div class="absolute left-1/2 top-0 bottom-0 w-8 -translate-x-1/2 bg-emerald-500/10 border-x border-emerald-500/20"></div>
             <div class="absolute inset-y-0 w-1 rounded-full transition-all duration-100 shadow-[0_0_8px_rgba(52,211,153,0.5)]" :class="pocketColor" :style="{ left: pocketPosition + '%', transform: 'translateX(-50%)' }"></div>
         </div>
         <div class="text-3xl font-black font-mono text-center">{{ timingOffset > 0 ? '+' : '' }}{{ Math.round(timingOffset) }}<span class="text-sm text-slate-500 ml-1">ms</span></div>
      </div>

      <!-- TILE 6: Stability (GAP) -->
      <div class="glass-card p-4 rounded-3xl flex flex-col justify-between border-b-4 border-indigo-500/50">
         <div class="flex justify-between items-center">
            <div class="text-[8px] font-black text-slate-500 uppercase tracking-widest">Stability</div>
            <span class="text-[10px] font-black text-indigo-400">{{ gapIntensity }}%</span>
         </div>
         <div class="p-2"><input type="range" min="0" max="90" step="5" :value="gapIntensity" @input="updateGapIntensity(parseInt(($event.target as HTMLInputElement).value))" class="w-full h-1 bg-slate-800 accent-indigo-500" /></div>
         <div class="text-[8px] text-slate-600 text-center uppercase font-bold">Gap Click Probability</div>
      </div>

      <!-- TILE 7: The Ladder -->
      <div class="glass-card p-4 rounded-3xl flex flex-col gap-4" :class="isLadderEnabled ? 'border-b-4 border-indigo-400/50' : 'opacity-50'">
         <div class="flex justify-between items-center">
            <div class="text-[8px] font-black text-slate-500 uppercase tracking-widest">Ladder</div>
            <button @click="updateLadder" class="w-6 h-6 rounded-lg flex items-center justify-center transition-all bg-slate-900 border border-white/5 text-[10px]">
               {{ isLadderEnabled ? 'ON' : 'OFF' }}
            </button>
         </div>
         <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1">
               <span class="text-[7px] text-slate-600 uppercase font-black block">Incr</span>
               <div class="flex items-center gap-2">
                  <button @click="emit('update:ladderIncrement', Math.max(1, ladderIncrement - 1)); updateLadder()" class="text-xs">－</button>
                  <span class="text-xs font-black">{{ ladderIncrement }}</span>
                  <button @click="emit('update:ladderIncrement', ladderIncrement + 1); updateLadder()" class="text-xs">＋</button>
               </div>
            </div>
            <div class="space-y-1">
               <span class="text-[7px] text-slate-600 uppercase font-black block">Goal</span>
               <span class="text-xs font-black text-indigo-400">{{ ladderGoal }}</span>
            </div>
         </div>
      </div>

      <!-- TILE 8: Stealth -->
      <div class="glass-card p-4 rounded-3xl flex flex-col gap-4" :class="isStealthEnabled ? 'border-b-4 border-cyan-400/50' : 'opacity-50'">
         <div class="flex justify-between items-center">
            <div class="text-[8px] font-black text-slate-500 uppercase tracking-widest">Stealth</div>
            <button @click="updateStealth" class="w-6 h-6 rounded-lg flex items-center justify-center transition-all bg-slate-900 border border-white/5 text-[10px]">
               {{ isStealthEnabled ? 'ON' : 'OFF' }}
            </button>
         </div>
         <div class="flex-1 flex items-center justify-around">
            <div class="text-center"><span class="text-[7px] text-slate-600">ON</span><div class="text-xs font-black">{{ stealthBarsOn }}</div></div>
            <div class="w-px h-6 bg-white/5"></div>
            <div class="text-center"><span class="text-[7px] text-cyan-400">OFF</span><div class="text-xs font-black">{{ stealthBarsOff }}</div></div>
         </div>
      </div>

      <!-- TILE 9: Groove Map -->
      <div class="glass-card p-4 rounded-3xl col-span-2 row-span-2 flex flex-col gap-2">
         <div class="flex justify-between items-center">
            <div class="text-[8px] font-black text-slate-500 uppercase tracking-widest">Groove Density</div>
            <button @click="reset" class="text-[7px] text-rose-400 font-bold uppercase transition-all hover:text-rose-300">Reset</button>
         </div>
         <div class="flex-1 flex items-center justify-center relative">
            <svg viewBox="0 0 200 200" class="w-full h-full max-h-[180px]">
              <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(255,255,255,0.02)" />
              <circle cx="100" cy="100" r="35" fill="rgba(52, 211, 153, 0.03)" stroke="rgba(52, 211, 153, 0.1)" />
              <circle v-for="(hit, i) in grooveHistory" :key="i"
                :cx="100 + Math.cos((i / grooveHistory.length) * Math.PI * 2 - Math.PI / 2) * (35 + Math.min(55, Math.abs(hit.offset) / 200 * 55))"
                :cy="100 + Math.sin((i / grooveHistory.length) * Math.PI * 2 - Math.PI / 2) * (35 + Math.min(55, Math.abs(hit.offset) / 200 * 55))"
                r="3" :fill="Math.abs(hit.offset) < 30 ? '#34d399' : hit.offset > 0 ? '#fb923c' : '#f43f5e'"
                :opacity="0.4 + (i / grooveHistory.length) * 0.6" />
            </svg>
         </div>
         <div class="grid grid-cols-2 gap-2 text-center py-2 border-t border-white/5">
            <div><div class="text-[7px] text-slate-600 font-black">AVG OFF</div><div class="text-xs font-black">{{ avgOffset }}ms</div></div>
            <div><div class="text-[7px] text-emerald-500 font-black">PERFECT</div><div class="text-xs font-black">{{ stats.perfect }}</div></div>
         </div>
      </div>
      
      <!-- TILE 10: Polyrhythm -->
      <div class="glass-card p-4 rounded-3xl flex flex-col gap-3">
         <div class="text-[8px] font-black text-indigo-400 uppercase tracking-widest">Polyrhythm</div>
         <div class="grid grid-cols-2 gap-2 flex-1 items-center">
            <button v-for="val in [0, 3, 5, 7]" :key="val" @click="updatePolyrhythm(val)"
              class="h-10 rounded-xl font-black text-[10px]"
              :class="polySubdivision === val ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-900 text-slate-500'"
            >{{ val === 0 ? 'OFF' : `${val}:4` }}</button>
         </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 4px; }
</style>
