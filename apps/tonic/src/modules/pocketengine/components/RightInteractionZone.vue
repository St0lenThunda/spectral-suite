<script setup lang="ts">
/**
 * RightInteractionZone.vue
 * Handles the right-side "Glass Strip" and its associated training control tabs.
 * 
 * INTERACTION:
 * This component now uses a 'tabs' prop (v-model) passed from the parent. 
 * This allows the parent to force-close the tabs if the user clicks 
 * elsewhere on the screen.
 */
import { computed } from 'vue'

/**
 * Props and Emits
 */
interface Props {
  isFlashEnabled: boolean;
  gapIntensity: number;
  isLadderEnabled: boolean;
  ladderIncrement: number;
  ladderInterval: number;
  ladderGoal: number;
  stealthBarsOn: number;
  stealthBarsOff: number;
  isStealthEnabled: boolean;
  accentPattern: number[];
  updateGapIntensity: (v: number) => void;
  updateLadder: () => void;
  updateStealth: () => void;
  cycleAccent: (i: number) => void;
  applyPattern: (type: 'downbeat' | 'backbeat' | 'jazz') => void;
  /** 
   * The 'tabs' state is now an external prop. 
   */
  tabs?: {
    accents: boolean;
    stability: boolean;
    ladder: boolean;
    stealth: boolean;
  };
}

const props = defineProps<Props>()
const emit = defineEmits(['update:isFlashEnabled', 'update:ladderIncrement', 'update:ladderInterval', 'update:ladderGoal', 'update:stealthBarsOn', 'update:stealthBarsOff', 'update:tabs'])

/**
 * Toggles a specific tab open or closed.
 * 
 * @param tabId - The ID of the right-side tab to toggle.
 * 
 * LOGIC: Just like the left side, we create a copy of the state,
 * flip the bit for the specific tab, and emit it to the parent.
 */
const toggleTab = (tabId: 'accents' | 'stability' | 'ladder' | 'stealth') => {
  if (!props.tabs) return;
  const newTabs = { ...props.tabs };
  newTabs[tabId] = !newTabs[tabId];
  emit('update:tabs', newTabs);
}

/**
 * Returns true if any of the right-side tabs are currently expanded.
 */
const anyOpen = computed(() => {
  if (!props.tabs) return false;
  return props.tabs.accents || props.tabs.stability || props.tabs.ladder || props.tabs.stealth
})
</script>

<template>
  <div class="w-[10%] relative z-50 flex flex-col pt-2 pb-2 items-end">
    <!-- The Sidebar Strip -->
    <div class="h-full flex flex-col">
      <button v-for="tabId in (['accents', 'stability', 'ladder', 'stealth'] as const)" :key="tabId"
        @click="toggleTab(tabId)"
        class="flex-1 w-12 glass-card flex flex-col items-center justify-center transition-all border-x-2 border-y first:rounded-t-3xl last:rounded-b-3xl group relative"
        :class="tabs?.[tabId] ? 'border-rose-500 bg-rose-500/10 text-rose-400' : 'border-white/5 text-slate-600'"
      >
        <!-- Selection Indicator -->
        <span 
          v-if="tabs?.[tabId]" 
          class="absolute right-0 top-2 bottom-2 w-1 bg-rose-500 rounded-l-full shadow-lg"
        ></span>
        
        <span v-if="tabId === 'accents'" class="text-[10px] font-bold">ACC</span>
        <span v-if="tabId === 'stability'" class="text-[10px] font-bold">GAP</span>
        <span v-if="tabId === 'ladder'" class="text-[10px] font-bold">LDR</span>
        <span v-if="tabId === 'stealth'" class="text-[10px] font-bold">STL</span>
        <span class="text-[8px] font-black uppercase tracking-widest vertical-text mt-2">
          {{ tabId }}
        </span>
      </button>
    </div>

    <!-- The Slide-Out Overlay Container (Right to Left) -->
    <Transition name="slide-right">
      <div 
        v-if="anyOpen" 
        class="absolute right-full mr-4 top-0 bottom-0 flex flex-col justify-center gap-4 py-8 pointer-events-none z-50 items-end"
      >
        <!-- Tab 1: Accents -->
        <div v-if="tabs?.accents" class="glass-card p-6 rounded-3xl w-72 pointer-events-auto border-t-4 border-rose-500/50">
          <div class="flex justify-between items-center mb-4">
            <label class="text-[9px] font-black text-slate-500 uppercase tracking-widest">Accents</label>
            <div class="flex gap-1">
              <button @click="applyPattern('downbeat')" class="text-[8px] font-black p-1.5 bg-slate-900 rounded-lg">STD</button>
              <button @click="applyPattern('jazz')" class="text-[8px] font-black p-1.5 bg-slate-900 rounded-lg">JAZZ</button>
            </div>
          </div>
          <div class="grid grid-cols-4 gap-2 h-32 overflow-y-auto pr-1 small-scrollbar">
            <button v-for="(level, idx) in accentPattern" :key="idx" @click="cycleAccent(idx)"
              class="h-10 rounded-lg flex flex-col items-center justify-center transition-all border"
              :class="level === 3 ? 'bg-rose-500 border-rose-400' : level === 2 ? 'bg-slate-800' : 'bg-slate-950 opacity-40'"
            >
              <span 
                class="w-1 rounded-full" 
                :class="[level === 3 ? 'h-4 bg-white' : level === 2 ? 'h-2 bg-slate-400' : 'h-1.5 bg-slate-600']"
              ></span>
            </button>
          </div>
        </div>

        <!-- Tab 2: Stability GAP -->
        <div v-if="tabs?.stability" class="glass-card p-6 rounded-3xl w-64 pointer-events-auto border-t-4 border-emerald-500/50">
          <div class="flex justify-between items-center mb-4">
            <label class="text-[9px] font-black text-slate-500 uppercase tracking-widest">Stability GAP</label>
            <span class="text-[12px] font-black text-emerald-400">{{ gapIntensity }}%</span>
          </div>
          <input 
            type="range" min="0" max="90" step="5" 
            :value="gapIntensity" 
            @input="updateGapIntensity(parseInt(($event.target as HTMLInputElement).value))" 
            class="w-full accent-emerald-500" 
          />
        </div>

        <!-- Tab 3: Ladder -->
        <div v-if="tabs?.ladder" class="glass-card p-6 rounded-3xl w-64 pointer-events-auto border-t-4 border-indigo-500/50" :class="{ 'opacity-40': !isLadderEnabled }">
          <div class="flex justify-between items-center mb-4">
            <label class="text-[9px] font-black text-slate-500 uppercase tracking-widest">Ladder</label>
            <button @click="updateLadder" class="w-10 h-5 rounded-full bg-slate-800 relative transition-all" :class="{ 'bg-indigo-500': isLadderEnabled }">
              <span class="absolute top-1 bottom-1 w-3 bg-white rounded-full transition-all" :class="isLadderEnabled ? 'left-6' : 'left-1'"></span>
            </button>
          </div>
          <div class="grid grid-cols-2 gap-4 text-center">
            <div>
              <span class="text-[8px] text-slate-500 font-bold">INCR</span>
              <div class="text-[12px] font-black text-white">+{{ ladderIncrement }}</div>
            </div>
            <div>
              <span class="text-[8px] text-slate-500 font-bold">INTV</span>
              <div class="text-[12px] font-black text-white">{{ ladderInterval }}</div>
            </div>
          </div>
        </div>

        <!-- Tab 4: Stealth -->
        <div v-if="tabs?.stealth" class="glass-card p-6 rounded-3xl w-64 pointer-events-auto border-t-4 border-cyan-500/50" :class="{ 'opacity-40': !isStealthEnabled }">
          <div class="flex justify-between items-center mb-4">
            <label class="text-[9px] font-black text-slate-500 uppercase tracking-widest">Stealth</label>
            <button @click="updateStealth" class="w-10 h-5 rounded-full bg-slate-800 relative transition-all" :class="{ 'bg-cyan-500': isStealthEnabled }">
              <span class="absolute top-1 bottom-1 w-3 bg-white rounded-full transition-all" :class="isStealthEnabled ? 'left-6' : 'left-1'"></span>
            </button>
          </div>
          <div class="flex justify-around items-center">
            <div class="text-center">
              <span class="text-[8px] text-slate-500">ON</span>
              <div class="text-[12px] font-black text-white">{{ stealthBarsOn }}</div>
            </div>
            <div class="text-center">
              <span class="text-[8px] text-cyan-400">OFF</span>
              <div class="text-[12px] font-black text-white">{{ stealthBarsOff }}</div>
            </div>
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
.small-scrollbar::-webkit-scrollbar { width: 4px; }
.small-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 4px; }
.slide-right-enter-active, .slide-right-leave-active { transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1); }
.slide-right-enter-from, .slide-right-leave-to { opacity: 0; transform: translateX(40px); }
</style>
