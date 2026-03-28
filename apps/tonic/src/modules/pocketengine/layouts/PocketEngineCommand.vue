<script setup lang="ts">
/**
 * POCKET ENGINE COMMAND
 * Focus: Large Central Visualizer + Persistent Sidebars
 * 
 * DESIGN GOAL: 
 * All advanced controls are immediately accessible in sidebars.
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
  <div class="h-full flex flex-col p-4 gap-4 overflow-hidden">
    <!-- 
       Header and Drawer removed. Now handled by PocketEngineModule.vue
    -->

    <!-- Main Center Row -->
    <div class="flex-1 flex gap-4 min-h-0">
      
      <!-- LEFT SIDEBAR: RHYTHM & ACCENTS -->
      <div class="w-72 glass-card p-6 rounded-4xl flex flex-col gap-6 overflow-y-auto custom-scrollbar border-l-4 border-indigo-500/50">
        <div class="space-y-4">
          <h3 class="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Rhythmic DNA</h3>
          
          <div class="space-y-3 p-4 bg-slate-900/50 rounded-2xl border border-white/5">
             <label class="text-[8px] font-black text-slate-500 uppercase">Subdivision</label>
             <div class="grid grid-cols-2 gap-2">
               <button v-for="(label, s) in { 1: '1/4', 2: '1/8', 3: '1/12', 4: '1/16' }" :key="s"
                 @click="updateSubdivision(Math.floor(Number(s)))"
                 class="h-8 rounded-lg font-black text-[9px] transition-all"
                 :class="subdivision === Math.floor(Number(s)) ? 'bg-indigo-500 text-white' : 'bg-slate-950 text-slate-600 hover:text-white'"
               >{{ label }}</button>
             </div>
          </div>

          <div class="p-4 bg-slate-900/50 rounded-2xl border border-white/5">
             <label class="text-[8px] font-black text-slate-500 uppercase mb-3 block">Accent Sequence</label>
             <div class="flex flex-wrap gap-1.5">
                <button v-for="(level, idx) in accentPattern" :key="idx" @click="cycleAccent(idx)"
                  class="w-7 h-10 rounded-lg flex flex-col items-center justify-center transition-all border"
                  :class="[
                    isPlaying && (currentPulse % accentPattern.length === idx) ? 'ring-2 ring-indigo-400' : '',
                    level === 3 ? 'bg-rose-500 border-rose-400' : 
                    level === 2 ? 'bg-slate-800 border-slate-700' : 
                    'bg-slate-950 border-white/5 opacity-50'
                  ]"
                >
                  <div class="w-1 rounded-full" :class="[level === 3 ? 'h-4 bg-white' : level === 2 ? 'h-2 bg-slate-400' : 'h-1 bg-slate-600']"></div>
                </button>
             </div>
          </div>
        </div>

        <!-- Master Settings Info -->
        <div class="space-y-4 mt-auto pt-6 border-t border-white/5">
          <p class="text-[9px] text-slate-600 italic">Advanced engine parameters are available in the main settings (top right).</p>
        </div>
      </div>

      <!-- CENTER: VISUAL DIAGNOSTICS -->
      <div class="flex-1 flex flex-col gap-3 min-w-0">
         <!-- Transport Cluster -->
         <div class="w-[90%] mx-auto flex items-center justify-between bg-white/5 backdrop-blur-3xl px-6 py-2 rounded-full border border-white/10 shadow-2xl">
            <div class="flex items-center gap-4">
               <span class="text-[7px] font-black text-slate-500 uppercase tracking-widest pl-2">Tempo</span>
               <div class="flex items-center gap-3">
                  <button @click="updateTempo(tempo - 1)" class="text-[10px] text-slate-500 hover:text-white transition-colors">－</button>
                  <span class="text-xl font-black font-mono text-white tracking-widest">{{ tempo }} <span class="text-[10px] text-slate-600">BPM</span></span>
                  <button @click="updateTempo(tempo + 1)" class="text-[10px] text-slate-500 hover:text-white transition-colors">＋</button>
               </div>
            </div>
            
            <div class="flex items-center gap-4">
               <div class="h-3 w-px bg-white/10"></div>
               <PlayButton :is-playing="isPlaying" @click="togglePlay" size="sm" class="scale-90" />
            </div>
         </div>

         <!-- MAIN HUD CARD -->
         <div class="flex-1 glass-card rounded-[3rem] p-6 flex flex-col justify-between relative overflow-hidden text-center border-b-8 border-indigo-500/10" :class="{ 'ring-8 ring-white/5': isFlashing }">
            <div class="absolute inset-0 bg-linear-to-b from-indigo-500/5 to-transparent"></div>
            
            <div class="relative z-10 flex flex-col h-full justify-between gap-8">
               <div class="flex items-center justify-between gap-2 px-2">
                  <!-- Hits Logged -->
                  <div class="text-left">
                     <div class="text-[7px] font-black text-slate-500 uppercase tracking-[0.3em] mb-1">Hits Logged</div>
                     <div class="text-4xl font-black font-mono text-white tracking-widest">{{ stats.total }}</div>
                  </div>

                  <!-- Visual Target (Command Layout Center) -->
                  <div class="w-[50%] h-64 relative flex items-center justify-center">
                     <svg viewBox="0 0 200 200" class="w-full h-full">
                       <!-- Concentric Rings -->
                       <circle cx="100" cy="100" r="95" fill="none" stroke="currentColor" class="text-white/5" stroke-width="0.5" />
                       <circle cx="100" cy="100" r="80" fill="none" stroke="currentColor" class="text-white/5" stroke-width="0.5" />
                       <circle cx="100" cy="100" r="60" fill="none" stroke="currentColor" class="text-white/5" stroke-width="0.5" />
                       <circle cx="100" cy="100" r="40" fill="none" stroke="currentColor" class="text-white/5" stroke-width="0.5" />
                       <circle cx="100" cy="100" r="20" fill="currentColor" stroke="currentColor" class="text-indigo-500/5 stroke-indigo-500/20" stroke-width="1" />
                       
                       <circle v-for="(hit, i) in grooveHistory" :key="i"
                         :cx="100 + Math.cos((i / grooveHistory.length) * Math.PI * 2 - Math.PI / 2) * (40 + Math.min(50, Math.abs(hit.offset) / 200 * 50))"
                         :cy="100 + Math.sin((i / grooveHistory.length) * Math.PI * 2 - Math.PI / 2) * (40 + Math.min(50, Math.abs(hit.offset) / 200 * 50))"
                         r="4" :fill="Math.abs(hit.offset) < 30 ? '#34d399' : hit.offset > 0 ? '#fb923c' : '#f43f5e'"
                         :opacity="0.3 + (i / grooveHistory.length) * 0.7" />
                     </svg>
                  </div>

                  <!-- Precision -->
                  <div class="text-right">
                     <div class="text-[7px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-1">Precision</div>
                     <div class="text-4xl font-black font-mono text-emerald-400 tracking-tighter">{{ Math.round((stats.perfect / (stats.total || 1)) * 100) }}%</div>
                  </div>
               </div>

               <!-- Primary Offset Display -->
               <div class="flex flex-col items-center">
                  <div class="text-2xl font-black font-mono text-white italic drop-shadow-2xl leading-none">
                    {{ timingOffset > 0 ? '+' : '' }}{{ Math.round(timingOffset) }}
                  </div>
                  <div class="text-[10px] font-black text-indigo-400 uppercase tracking-[0.5em] mt-2">{{ tendency }}</div>
               </div>

               <!-- Pocket Diagnostic Zone (Bottom) -->
               <div class="w-full max-w-2xl mx-auto space-y-3 pb-6">
                  <div class="h-3 bg-slate-950/50 rounded-full border border-white/5 relative overflow-hidden">
                     <div class="absolute inset-y-0 left-1/2 -translate-x-1/2 w-32 bg-indigo-500/20 border-x border-indigo-500/40"></div>
                     <div class="absolute inset-y-0 w-1.5 rounded-full transition-all duration-100 shadow-[0_0_15px_rgba(52,211,153,0.5)]" :class="pocketColor" :style="{ left: pocketPosition + '%', transform: 'translateX(-50%)' }"></div>
                  </div>
                  <div class="flex justify-between text-[7px] font-black text-slate-500 uppercase tracking-widest px-2">
                     <span>Rush / Advance</span>
                     <div class="text-[8px] font-black text-indigo-400 tracking-widest">Active Groove Stability</div>
                     <span>Lag / Drag</span>
                  </div>
               </div>
            </div>
         </div>
      </div>

      <!-- RIGHT SIDEBAR: TRAINING MODES -->
      <div class="w-72 glass-card p-6 rounded-4xl flex flex-col gap-6 overflow-y-auto custom-scrollbar border-r-4 border-rose-500/50">
        <h3 class="text-[10px] font-black text-rose-500 uppercase tracking-widest">Training Modules</h3>
        
        <div class="space-y-6">
           <!-- Gap Click -->
           <div class="p-4 bg-slate-900/50 rounded-2xl border border-white/5 space-y-4" :class="{ 'border-rose-500/30 bg-rose-500/5': gapIntensity > 0 }">
              <div class="flex justify-between items-center">
                 <label class="text-[8px] font-black text-slate-500 uppercase">Stability GAP</label>
                 <span class="text-[10px] font-mono font-black text-rose-400">{{ gapIntensity }}%</span>
              </div>
              <input type="range" min="0" max="90" step="5" :value="gapIntensity" @input="updateGapIntensity(parseInt(($event.target as HTMLInputElement).value))" class="w-full h-1 bg-slate-800 accent-rose-500" />
           </div>

           <!-- Speed Ladder -->
           <div class="p-4 bg-slate-900/50 rounded-2xl border border-white/5 space-y-4" :class="{ 'border-indigo-500/30 bg-indigo-500/5': isLadderEnabled }">
              <div class="flex justify-between items-center">
                 <label class="text-[8px] font-black text-slate-500 uppercase">Speed Ladder</label>
                 <button @click="updateLadder" class="w-8 h-4 rounded-full bg-slate-800 relative transition-all" :class="{ 'bg-indigo-500': isLadderEnabled }">
                    <div class="absolute top-0.5 bottom-0.5 w-3 bg-white rounded-full transition-all" :class="isLadderEnabled ? 'left-4.5' : 'left-0.5'"></div>
                 </button>
              </div>
              <div v-if="isLadderEnabled" class="grid grid-cols-2 gap-4">
                 <div class="space-y-1">
                    <span class="text-[7px] font-black text-slate-500 uppercase block">Incr (BPM)</span>
                    <div class="flex items-center gap-2">
                       <button @click="emit('update:ladderIncrement', Math.max(1, ladderIncrement - 1)); updateLadder()" class="text-[10px] text-slate-500 hover:text-white transition-colors">－</button>
                       <span class="text-xs font-black">{{ ladderIncrement }}</span>
                       <button @click="emit('update:ladderIncrement', ladderIncrement + 1); updateLadder()" class="text-[10px] text-slate-500 hover:text-white transition-colors">＋</button>
                    </div>
                 </div>
                 <div class="space-y-1">
                    <span class="text-[7px] font-black text-slate-500 uppercase block">Bars Intv</span>
                    <div class="flex items-center gap-2">
                       <button @click="emit('update:ladderInterval', Math.max(1, ladderInterval - 1)); updateLadder()" class="text-[10px] text-slate-500 hover:text-white transition-colors">－</button>
                       <span class="text-xs font-black">{{ ladderInterval }}</span>
                       <button @click="emit('update:ladderInterval', ladderInterval + 1); updateLadder()" class="text-[10px] text-slate-500 hover:text-white transition-colors">＋</button>
                    </div>
                 </div>
                 <div class="col-span-2 space-y-1 pt-2 border-t border-white/5">
                    <span class="text-[7px] font-black text-slate-500 uppercase block">Ladder Goal</span>
                    <div class="flex items-center justify-between">
                       <input type="range" min="60" max="300" step="5" :value="ladderGoal" @input="emit('update:ladderGoal', parseInt(($event.target as HTMLInputElement).value)); updateLadder()" class="flex-1 h-1 bg-slate-800 accent-indigo-500 mr-4" />
                       <span class="text-xs font-black text-indigo-400 font-mono">{{ ladderGoal }}</span>
                    </div>
                 </div>
              </div>
           </div>

           <!-- Stealth Mode -->
           <div class="p-4 bg-slate-900/50 rounded-2xl border border-white/5 space-y-4" :class="{ 'border-cyan-500/30 bg-cyan-500/5': isStealthEnabled }">
              <div class="flex justify-between items-center">
                 <label class="text-[8px] font-black text-slate-500 uppercase">Stealth Flow</label>
                 <button @click="updateStealth" class="w-8 h-4 rounded-full bg-slate-800 relative transition-all" :class="{ 'bg-cyan-500': isStealthEnabled }">
                    <div class="absolute top-0.5 bottom-0.5 w-3 bg-white rounded-full transition-all" :class="isStealthEnabled ? 'left-4.5' : 'left-0.5'"></div>
                 </button>
              </div>
              <div v-if="isStealthEnabled" class="flex justify-between items-center text-center">
                 <div class="flex flex-col items-center gap-1">
                    <span class="text-[7px] text-slate-500 font-black uppercase">Visible</span>
                    <div class="flex items-center gap-2">
                       <button @click="emit('update:stealthBarsOn', Math.max(1, stealthBarsOn - 1)); updateStealth()" class="text-[10px] text-slate-500 hover:text-white transition-colors">－</button>
                       <span class="text-xs font-black">{{ stealthBarsOn }}</span>
                       <button @click="emit('update:stealthBarsOn', stealthBarsOn + 1); updateStealth()" class="text-[10px] text-slate-500 hover:text-white transition-colors">＋</button>
                    </div>
                 </div>
                 <div class="h-8 w-px bg-white/10 mx-2"></div>
                 <div class="flex flex-col items-center gap-1">
                    <span class="text-[7px] text-cyan-400 font-black uppercase tracking-widest">Silenced</span>
                    <div class="flex items-center gap-2">
                       <button @click="emit('update:stealthBarsOff', Math.max(1, stealthBarsOff - 1)); updateStealth()" class="text-[10px] text-slate-500 hover:text-white transition-colors">－</button>
                       <span class="text-xs font-black">{{ stealthBarsOff }}</span>
                       <button @click="emit('update:stealthBarsOff', stealthBarsOff + 1); updateStealth()" class="text-[10px] text-slate-500 hover:text-white transition-colors">＋</button>
                    </div>
                 </div>
              </div>
           </div>
        </div>

        <button @click="reset" class="mt-auto w-full py-3 bg-slate-900 hover:bg-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Reset Stats</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 3px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 4px; }
</style>
