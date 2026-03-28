<script setup lang="ts">
/**
 * LeftInteractionZone.vue
 * Handles the left-side "Glass Strip" and its associated slide-out control tabs.
 * 
 * INTERACTION:
 * This component now uses a 'tabs' prop (v-model) passed from the parent. 
 * This allows the parent to force-close the tabs if the user clicks 
 * elsewhere on the screen.
 */
import { computed } from 'vue'
import { PlayButton } from '@spectralsuite/core'

/**
 * Props and Emits
 */
interface Props {
  isPlaying: boolean;
  tempo: number;
  subdivision: number;
  polySubdivision: number;
  togglePlay: () => void;
  updateTempo: (v: number) => void; 
  updateSubdivision: (v: number) => void;
  updatePolyrhythm: (v: number) => void;
  /** 
   * The 'tabs' state is now an external prop. 
   * The '?' means it's optional, but we expect it for the side-interaction to work.
   */
  tabs?: {
    transport: boolean;
    subdivision: boolean;
    rhythm: boolean;
  };
}

const props = defineProps<Props>()
/**
 * Emits allow us to send "Upstairs" to the parent layout when 
 * the user clicks a tab button.
 */
const emit = defineEmits(['update:tabs'])

/**
 * Toggles a specific tab open or closed.
 * 
 * @param tabId - The string ID of the tab to toggle ('transport', 'subdivision', or 'rhythm')
 * 
 * WHY: We use an emit 'update:tabs' to notify the parent ConsoleLayout.vue.
 * This is a standard Vue pattern called "v-model". It allows the parent
 * to stay in control of the state while the child requests changes.
 */
const toggleTab = (tabId: 'transport' | 'subdivision' | 'rhythm') => {
  if (!props.tabs) return;
  
  // We spread (...) the existing tabs into a new object to maintain "Immutability".
  // In Vue/React, we avoid changing the original object directly so 
  // the system can easily detect that something has changed.
  const newTabs = { ...props.tabs };
  newTabs[tabId] = !newTabs[tabId];
  
  // Send the new state back up to the parent.
  emit('update:tabs', newTabs);
}

/**
 * Computed helper to check if anything is open.
 * Returns true if at least one tab's boolean value is 'true'.
 */
const anyOpen = computed(() => {
  if (!props.tabs) return false;
  // The '||' operator means "OR". If any of these are true, the whole thing is true.
  return props.tabs.transport || props.tabs.subdivision || props.tabs.rhythm
})
</script>

<template>
  <div class="w-[10%] relative z-50 flex flex-col pt-2 pb-2">
    <!-- The Sidebar Strip: Always Visible -->
    <div class="h-full flex flex-col">
      <!-- Logic: Loop over categories to create the 10% buttons -->
      <button 
        v-for="tabId in (['transport', 'subdivision', 'rhythm'] as const)" 
        :key="tabId"
        @click="toggleTab(tabId)"
        class="flex-1 w-12 glass-card flex flex-col items-center justify-center transition-all border-x-2 border-y first:rounded-t-3xl last:rounded-b-3xl group relative"
        :class="tabs?.[tabId] ? 'border-orange-500 bg-orange-500/10 text-orange-400' : 'border-white/5 text-slate-600'"
      >
        <!-- The Vertical Label -->
        <span class="text-[8px] font-black uppercase tracking-widest rotate-180 vertical-text mb-2">
          {{ tabId }}
        </span>
        <span v-if="tabId === 'transport'" class="text-[10px] font-bold">SYNC</span>
        <span v-if="tabId === 'subdivision'" class="text-[10px] font-bold">DIV</span>
        <span v-if="tabId === 'rhythm'" class="text-[10px] font-bold">PLY</span>
        
        <!-- Selection Indicator Highlight -->
        <span 
          v-if="tabs?.[tabId]" 
          class="absolute left-0 top-2 bottom-2 w-1 bg-orange-500 rounded-r-full shadow-lg"
        ></span>
      </button>
    </div>

    <!-- The Slide-Out Overlay Container -->
    <Transition name="slide-left">
      <div 
        v-if="anyOpen" 
        class="absolute left-full ml-4 top-0 bottom-0 flex flex-col justify-center gap-4 py-8 pointer-events-none z-50"
      >
        <div 
          v-if="tabs?.transport" 
          class="glass-card p-8 rounded-3xl w-80 pointer-events-auto border-t-8 border-orange-500/50 shadow-2xl relative overflow-hidden group"
        >
          <div class="absolute inset-0 bg-linear-to-b from-orange-500/10 to-transparent opacity-50 pointer-events-none"></div>
          <label class="text-[10px] font-black text-slate-500 uppercase tracking-widest block text-center mb-4">Master Sync</label>
          <div class="flex justify-center mb-6">
            <PlayButton :is-playing="isPlaying" @click="togglePlay" />
          </div>
          <div class="space-y-3">
            <div class="flex justify-between items-end">
              <span class="text-[9px] font-black text-slate-600 uppercase">Tempo</span>
              <span class="text-3xl font-black font-mono text-orange-500">{{ tempo }}</span>
            </div>
            <input type="range" min="40" max="300" :value="tempo" @input="updateTempo(parseInt(($event.target as HTMLInputElement).value))" class="w-full accent-orange-500" />
          </div>
        </div>

        <div v-if="tabs?.subdivision" class="glass-card p-6 rounded-3xl w-64 pointer-events-auto border-t-4 border-slate-500/30">
          <label class="text-[9px] font-black text-slate-500 uppercase tracking-widest text-center block mb-4">Subdivision</label>
          <div class="grid grid-cols-2 gap-2">
            <button v-for="(label, s) in { 1: '1/4', 2: '1/8', 3: '1/12', 4: '1/16' }" :key="s"
              @click="updateSubdivision(Math.floor(Number(s)))"
              class="h-10 rounded-xl font-black text-[10px] transition-all border"
              :class="subdivision === Math.floor(Number(s)) ? 'bg-orange-600 border-orange-400 text-white shadow-lg' : 'bg-slate-950/50 border-white/5 text-slate-600'"
            >
              {{ label }}
            </button>
          </div>
        </div>

        <div v-if="tabs?.rhythm" class="glass-card p-6 rounded-3xl w-64 pointer-events-auto border-t-4 border-indigo-500/50">
          <label class="text-[9px] font-black text-slate-500 uppercase tracking-widest text-center block mb-4">Polyrhythm</label>
          <div class="grid grid-cols-4 gap-2">
            <button v-for="val in [0, 3, 5, 7]" :key="val" @click="updatePolyrhythm(val)"
              class="h-10 rounded-xl font-black text-[10px] transition-all border"
              :class="polySubdivision === val ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-slate-950/50 border-white/5 text-slate-600'"
            >
              {{ val === 0 ? 'OFF' : val }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.vertical-text { writing-mode: vertical-lr; }
.glass-card {
  backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  background: rgba(255, 255, 255, 0.02);
}
.slide-left-enter-active, .slide-left-leave-active { transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1); }
.slide-left-enter-from, .slide-left-leave-to { opacity: 0; transform: translateX(-40px); }
</style>
