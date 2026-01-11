<script setup lang="ts">
import type { ChordMatch } from '@spectralsuite/core';
import { ref } from 'vue';
import CaptureTray from './CaptureTray.vue';

interface Props {
  topChord?: ChordMatch | null;
  capturedNotes: string[];
  currentNote: string | null;
  pitch: number | null;
  clarity: number | null;
  keyCenter: string;
}

defineProps<Props>();

const emit = defineEmits<{
  ( e: 'captureChord', chord: ChordMatch ): void;
  ( e: 'clearNotes' ): void;
  ( e: 'update:keyCenter', key: string ): void;
}>();

const isTrayOpen = ref( false );
const isKeySelectorOpen = ref( false );
const toggleTray = () => { isTrayOpen.value = !isTrayOpen.value };
const toggleKeySelector = () => { isKeySelectorOpen.value = !isKeySelectorOpen.value };

const keys = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

const selectKey = ( key: string ) => {
  emit( 'update:keyCenter', key );
  isKeySelectorOpen.value = false;
};

</script>

<template>
  <div
    class="monitor-container min-w-0 relative w-full aspect-square md:aspect-[4/3] rounded-[3rem] md:rounded-[4rem] bg-black/40 border border-white/10 backdrop-blur-sm flex flex-col items-center justify-center overflow-hidden shadow-2xl p-8"
  >
    <div class="absolute inset-0 bg-gradient-to-t from-indigo-500/5 to-transparent"></div>

    <!-- Mobile Tray Toggle (Hidden on Desktop) -->
    <button
      @click="toggleTray"
      class="lg:hidden absolute top-8 left-8 z-30 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all flex items-center gap-3 active:scale-95"
    >
      <div class="flex flex-col gap-1 w-4">
        <div
          class="h-0.5 w-full bg-indigo-400 rounded-full transition-all"
          :class="{ 'rotate-45 translate-y-1.5': isTrayOpen }"
        ></div>
        <div
          class="h-0.5 w-full bg-indigo-400 rounded-full transition-all"
          :class="{ 'opacity-0': isTrayOpen }"
        ></div>
        <div
          class="h-0.5 w-full bg-indigo-400 rounded-full transition-all"
          :class="{ '-rotate-45 -translate-y-1.5': isTrayOpen }"
        ></div>
      </div>
      <span class="text-[9px] font-black uppercase tracking-widest text-indigo-300">Tray</span>
    </button>

    <!-- Key Context Selector (Top Right) -->
    <div class="absolute top-8 right-8 z-30 flex flex-col items-end gap-2">
      <button
        @click="toggleKeySelector"
        class="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all flex items-center gap-3 active:scale-95"
      >
        <span class="text-[9px] font-black uppercase tracking-widest text-slate-500">Key</span>
        <span class="text-sm font-black text-indigo-400 w-4 text-center">{{ keyCenter }}</span>
      </button>

      <!-- Key Grid Dropdown -->
      <div
        v-if=" isKeySelectorOpen "
        class="absolute top-12 right-0 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl p-3 grid grid-cols-4 gap-2 shadow-2xl w-48 animate-fade-in"
      >
        <button
          v-for=" k in keys "
          :key="k"
          @click="selectKey( k )"
          class="aspect-square rounded-lg flex items-center justify-center text-xs font-bold transition-all"
          :class="k === keyCenter ? 'bg-indigo-500 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'"
        >
          {{ k }}
        </button>
      </div>
    </div>

    <!-- Pulsing Rings (Background) -->
    <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div
        class="ring-pulse ring-1 absolute rounded-full border border-indigo-500/30"
        :style="{ opacity: ( clarity || 0 ) * 0.3 }"
      ></div>
      <div
        class="ring-pulse ring-2 absolute rounded-full border border-indigo-500/30"
        :style="{ opacity: ( clarity || 0 ) * 0.1 }"
      ></div>
    </div>

    <!-- Central Data Display -->
    <div
      class="relative z-10 flex flex-col items-center text-center transition-all duration-300 w-full"
      :class="{ 'scale-105': currentNote }"
    >
      <!-- 1. Header / Status -->
      <span
        class="block font-black uppercase tracking-[0.4em] text-indigo-400/40 mb-4"
        style="font-size: 3cqw;"
      >
        {{ topChord ? 'Harmonic Match' : 'Live Monitor' }}
      </span>

      <!-- 2. Main Symbol / Notes -->
      <!-- Fluid Typography using cqw (Container Query Width) -->
      <div
        class="font-black text-white leading-none font-outfit drop-shadow-[0_0_30px_rgba(255,255,255,0.1)] transition-all duration-300 mb-2"
        style="font-size: 18cqw;"
      >
        <template v-if=" topChord ">{{ topChord.symbol }}</template>
        <template v-else-if=" capturedNotes.length > 0 ">
          <div
            class="flex flex-wrap justify-center gap-4"
            style="font-size: 14cqw;"
          >
            <span
              v-for=" n in capturedNotes.slice( 0, 3 ) "
              :key="n"
            >{{ n }}</span>
          </div>
        </template>
        <template v-else>{{ currentNote || '--' }}</template>
      </div>

      <!-- 3. Chord Details (If Matched) -->
      <template v-if=" topChord ">
        <div class="flex items-center gap-4 mb-4">
          <!-- <span class="text-3xl font-black text-indigo-400 italic">{{ topChord.roman }}</span> -->
          <span class="h-6 w-px bg-white/10"></span>
          <span
            class="text-sm md:text-base font-bold text-slate-400 uppercase tracking-[0.2em]">{{ topChord.name }}</span>
        </div>

        <div class="flex flex-wrap justify-center gap-2 mb-8">
          <span
            v-for=" note in topChord.notes "
            :key="note"
            class="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-bold text-slate-300 shadow-sm font-mono tracking-tighter backdrop-blur-sm"
          >{{ note }}</span>
        </div>

        <button
          @click="emit( 'captureChord', topChord )"
          class="px-10 py-4 bg-indigo-500 hover:bg-indigo-400 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-indigo-500/20 active:scale-95 flex items-center gap-3"
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
              stroke-width="3"
              d="M12 4v16m8-8H4"
            />
          </svg>
          Capture Chord
        </button>
      </template>

      <!-- 4. Default Stats (If No Match) -->
      <div
        v-else
        class="mt-4 flex items-center justify-center gap-4 text-[10px] md:text-xs font-mono font-bold text-slate-500"
      >
        <span :class="{ 'text-cyan-400': pitch }">{{ pitch ? pitch.toFixed( 1 ) : '000.0' }} Hz</span>
        <span class="opacity-20">|</span>
        <span :class="{ 'text-emerald-400': ( clarity || 0 ) > 0.9 }">{{ ( ( clarity || 0 ) * 100 ).toFixed( 0 ) }}%
          Clarity</span>
      </div>
    </div>

    <!-- Mobile Capture Tray Drawer (Hidden on Desktop) -->
    <Transition name="drawer">
      <div
        v-if=" isTrayOpen "
        class="lg:hidden absolute inset-y-0 left-0 w-64 bg-slate-900/95 backdrop-blur-3xl border-r border-white/10 z-20 flex flex-col pt-24 shadow-2xl"
      >
        <CaptureTray
          class="h-full border-none bg-transparent rounded-none"
          :captured-notes="capturedNotes"
          @clear-notes="emit( 'clearNotes' )"
        />
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* Define the container context for container queries */
.monitor-container {
  container-type: inline-size;
}

.drawer-enter-active,
.drawer-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.drawer-enter-from,
.drawer-leave-to {
  transform: translateX(-100%);
  opacity: 0;
}

.ring-pulse {
  width: 100%;
  height: 100%;
  animation: pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.ring-2 {
  animation-delay: 0.5s;
}

@keyframes pulse-ring {
  0% {
    transform: scale(0.8);
    opacity: 0;
  }

  50% {
    opacity: 0.5;
  }

  100% {
    transform: scale(1.5);
    opacity: 0;
  }
}


.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background-color: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 9999px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: rgba(255, 255, 255, 0.2);
}
</style>
