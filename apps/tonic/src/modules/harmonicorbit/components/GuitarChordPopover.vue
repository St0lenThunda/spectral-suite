<script setup lang="ts">
/**
 * Guitar Chord Popover
 * 
 * Displays the localized fretboard voicing for a selected chord in the Harmonic Orbit.
 * Integrates with the "Plug-and-Play" architecture via `useHarmonicOrbitGuitar`.
 */
import { computed, ref } from 'vue';
import { Fretboard } from '@spectralsuite/core';
import { useHarmonicOrbitGuitar } from '../composables/useHarmonicOrbitGuitar';

export interface OrbitChord {
  degree: string;
  name: string;
  type: string;
  hexColor: string;
}

const props = defineProps<{
  // Controls visibility
  isOpen: boolean;
  // Diatonic family chords for toggling
  familyChords?: OrbitChord[];
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

// Grab our manager hook! This keeps the math entirely out of the UI.
const { displayMode, activeCagedZone, toggledChords, multiVoicing, toggleMode, toggleChord, isChordToggled } = useHarmonicOrbitGuitar();

// Header Title Display
const displayTitle = computed(() => {
  if (toggledChords.value.length === 0) return 'No Chords Selected';
  if (toggledChords.value.length === 1) return toggledChords.value[0].name;
  return `${toggledChords.value.length} Chords Active`;
});

// Since the colors can come from multiple chords, the toggle determines if we pass the whole map
const isVoiceLed = computed(() => displayMode.value === 'VOICE_LED');
const useOrbitColors = ref(true); // Togglable setting for custom chord colors
const isZoomed = ref(false); // Zoom to active Fret Range bounds
</script>

<template>
  <transition name="popover">
    <!-- 
      Centered floating panel 
    -->
    <div
      v-if="isOpen && toggledChords.length > 0"
      class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] w-[600px] max-h-[95vh] bg-slate-900/90 backdrop-blur-3xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
    >
      <!-- Header area: Shows the chord name and the mode toggle -->
      <div class="px-6 py-4 flex-shrink-0 flex items-center justify-between bg-white/5 border-b border-white/5">
        <div>
          <h3 class="text-2xl font-black text-white italic tracking-tighter">{{ displayTitle }}</h3>
          <p class="text-[9px] uppercase font-black tracking-[0.3em] text-indigo-400 mt-1">
            Fretboard Explorer
          </p>
        </div>
        
        <div class="flex items-center gap-3">
          <!-- Togglable Orbit Colors -->
          <label class="flex items-center gap-2 cursor-pointer border px-3 py-1.5 rounded-xl border-white/10 hover:bg-white/5 transition-colors group">
            <input type="checkbox" v-model="useOrbitColors" class="sr-only peer" />
            <div class="flex -space-x-1">
              <div 
                v-for="(chord, idx) in toggledChords.slice(0, 3)" 
                :key="chord.name"
                class="w-3 h-3 rounded-full border border-white/20 transition-all" 
                :style="{ backgroundColor: useOrbitColors ? chord.color : '#10b981', zIndex: 10 - idx }"
              ></div>
            </div>
            <span class="text-[9px] font-black uppercase tracking-widest transition-colors" :class="useOrbitColors ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'">
              Orbit Colors
            </span>
          </label>

          <!-- Zoom Toggle -->
          <button 
            @click="isZoomed = !isZoomed"
            class="px-3 py-1.5 rounded-xl border transition-all flex items-center gap-2 group"
            :class="isZoomed ? 'bg-sky-500/10 border-sky-500/30' : 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-500 hover:text-white'"
            title="Pan & Scan Fretboard Camera"
          >
            <span class="text-sm transition-transform group-hover:scale-110" :class="isZoomed ? 'text-sky-400' : ''">🔍</span>
            <span class="text-[9px] font-black uppercase tracking-widest transition-colors" :class="isZoomed ? 'text-white' : ''">
              Zoom
            </span>
          </button>

          <!-- Mode Toggle -->
          <button 
            @click="toggleMode"
            class="px-3 py-1.5 rounded-xl border transition-all flex items-center gap-2"
            :class="isVoiceLed ? 'bg-amber-500/10 border-amber-500/30' : 'bg-indigo-500/10 border-indigo-500/30'"
          >
            <div class="w-2 h-2 rounded-full" :class="isVoiceLed ? 'bg-amber-400 animate-pulse' : 'bg-indigo-400'"></div>
            <span class="text-[9px] font-black uppercase tracking-widest text-white">
              {{ isVoiceLed ? 'Voice Leading' : 'CAGED Blocks' }}
            </span>
          </button>
          
          <button
            @click="emit('close')"
            class="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:bg-white/10 hover:text-white transition-all border border-white/5"
          >✕</button>
        </div>
      </div>

      <!-- Quick Toggles -->
      <div v-if="familyChords && familyChords.length > 0" class="flex-shrink-0 px-6 py-3 bg-black/60 border-b border-white/5 flex items-center justify-center gap-2 overflow-x-auto">
        <button 
          v-for="chord in familyChords" 
          :key="chord.name"
          @click="toggleChord(chord.name, chord.hexColor)"
          class="px-3 py-1.5 rounded-xl border flex items-center gap-2 transition-all"
          :class="isChordToggled(chord.name) ? 'bg-white/10 border-white/20' : 'bg-transparent border-transparent opacity-50 hover:opacity-100'"
        >
          <div class="w-2 h-2 rounded-full border border-black/50" :style="{ backgroundColor: chord.hexColor }"></div>
          <span class="text-[10px] font-black tracking-widest whitespace-nowrap" :class="isChordToggled(chord.name) ? 'text-white' : 'text-slate-400'">
            {{ chord.degree }} <span class="opacity-50 font-normal">({{ chord.name }})</span>
          </span>
        </button>
      </div>

      <!-- Scrollable Inner Content for Fretboard and Footer -->
      <div class="flex-1 overflow-y-auto custom-scrollbar">
        <!-- The Fretboard -->
        <div class="px-6 py-6 border-b border-white/5 bg-black/60 relative">
          <!-- Glow effect behind fretboard -->
        <div class="absolute inset-0 bg-indigo-500/5 blur-3xl pointer-events-none"></div>
        <Fretboard
          class="relative z-10"
          instrument="guitar"
          tuning-preset="standard"
          :interactive="false"
          :zoom-to-range="isZoomed"
          :fret-range="multiVoicing.fretRange"
          :highlight-notes="multiVoicing.highlightNotes"
          :highlight-color-map="useOrbitColors ? multiVoicing.highlightColorMap : undefined"
        />
      </div>

      <!-- Footer / Instructions / Controls -->
      <div class="px-6 py-4 bg-indigo-500/5 min-h-[70px] flex flex-col items-center justify-center text-center">
        <transition name="fade" mode="out-in">
          <div v-if="isVoiceLed" key="voice" class="w-full">
            <p class="text-[10px] text-amber-500/80 font-mono uppercase tracking-widest mb-1">
              Anchor Fret Enabled
            </p>
            <p class="text-[11px] text-slate-400 leading-relaxed max-w-[400px] mx-auto">
              Clicking other chords will automatically find voicings physically closest to your current hand position.
            </p>
          </div>
          <div v-else key="caged" class="w-full flex items-center justify-between">
            <p class="text-[11px] text-slate-400 leading-relaxed text-left max-w-[250px]">
              Explore familiar 4-fret block shapes by switching zones.
            </p>
            <div class="flex gap-2">
              <button 
                v-for="zone in 5" 
                :key="zone"
                @click="activeCagedZone = zone"
                class="w-8 h-8 rounded-lg text-[10px] font-black transition-all border outline-none"
                :class="activeCagedZone === zone 
                  ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/50 scale-110 shadow-[0_0_15px_rgba(99,102,241,0.3)]' 
                  : 'bg-white/5 text-slate-500 border-white/10 hover:bg-white/10 hover:text-white'"
              >
                {{ zone }}
              </button>
            </div>
          </div>
        </transition>
      </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.popover-enter-active,
.popover-leave-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.popover-enter-from,
.popover-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}
</style>
