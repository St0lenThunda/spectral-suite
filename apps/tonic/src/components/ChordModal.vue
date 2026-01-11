<script setup lang="ts">
/**
 * ChordModal Component
 *
 * Displays a detailed view of a chord from the Ledger.
 * Includes a Fretboard visualization and a Play button for audio feedback.
 */
import { onMounted, onUnmounted } from 'vue';
import { Fretboard, SynthEngine, type ChordMatch } from '@spectralsuite/core';

const props = defineProps<{
  chord: ChordMatch;
  isOpen: boolean;
}>();

const emit = defineEmits( ['close'] );

/**
 * Audio Playback
 * We use the SynthEngine to play all notes of the chord simultaneously.
 */
const playChord = () => {
  SynthEngine.getInstance().playChord( props.chord.notes );
};

const handleKeydown = ( e: KeyboardEvent ) => {
  if ( e.key === 'Escape' && props.isOpen ) {
    emit( 'close' );
  }
};

onMounted( () => window.addEventListener( 'keydown', handleKeydown ) );
onUnmounted( () => window.removeEventListener( 'keydown', handleKeydown ) );
</script>

<template>
  <Transition name="fade">
    <div
      v-if=" isOpen "
      class="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-8"
    >
      <!-- Backdrop -->
      <div
        class="absolute inset-0 bg-black/80 backdrop-blur-2xl"
        @click="emit( 'close' )"
      ></div>

      <!-- Modal Card -->
      <div
        class="relative w-full max-w-4xl bg-slate-900 border border-white/10 rounded-[4rem] shadow-2xl overflow-hidden flex flex-col animate-pop-in"
        @click.stop
      >
        <div class="absolute inset-0 bg-gradient-to-b from-indigo-500/10 to-transparent pointer-events-none"></div>

        <!-- Header -->
        <header class="p-12 pb-6 flex justify-between items-start relative z-10">
          <div>
            <div class="flex items-center gap-3 mb-2">
              <span class="text-indigo-400 font-mono text-[10px] uppercase tracking-[0.4em]">Harmonic Detail</span>
              <div class="h-px w-8 bg-indigo-500/30"></div>
            </div>
            <div class="flex items-baseline gap-4">
              <h2 class="text-6xl font-black text-white italic tracking-tighter uppercase font-outfit">
                {{ chord.symbol }}
              </h2>
              <span class="text-2xl font-black text-indigo-400 italic">{{ chord.roman }}</span>
            </div>
            <p class="text-slate-400 font-bold uppercase tracking-widest text-xs mt-2">{{ chord.name }}</p>
          </div>
          <button
            @click="emit( 'close' )"
            class="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all active:scale-95"
          >
            ✕
          </button>
        </header>

        <!-- Content Area -->
        <div class="flex-1 p-12 pt-0 space-y-12 relative z-10">
          <!-- Fretboard Visualization -->
          <div class="bg-black/40 rounded-[3rem] p-8 border border-white/5 backdrop-blur-md">
            <div class="flex justify-between mb-6 px-4">
              <span class="text-[9px] font-black uppercase tracking-widest text-slate-500">Guitar Voicing Map</span>
              <div class="flex gap-2">
                <span
                  v-for=" note in chord.notes "
                  :key="note"
                  class="px-3 py-1 bg-indigo-500/20 rounded text-[10px] font-black text-indigo-300 border border-indigo-500/20"
                >
                  {{ note }}
                </span>
              </div>
            </div>
            <Fretboard
              :active-notes="chord.notes"
              :highlight-notes="chord.notes"
              :num-frets="24"
            />
          </div>

          <!-- Actions -->
          <div class="flex justify-center">
            <button
              @click="playChord"
              class="group flex items-center gap-6 px-12 py-6 bg-white text-slate-950 rounded-3xl font-black text-xl hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-white/10"
            >
              <div
                class="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white group-hover:bg-indigo-600 transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-6 w-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              Audition Voicing
            </button>
          </div>
        </div>

        <!-- Footer -->
        <footer class="p-8 bg-black/40 border-t border-white/5 text-center relative z-10">
          <p class="text-[9px] font-mono text-slate-600 uppercase tracking-[0.5em]">
            Spectral Suite Harmonic Engineering v1.0
          </p>
        </footer>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.font-outfit {
  font-family: 'Outfit', sans-serif;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.4s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@keyframes pop-in {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(20px);
  }

  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.animate-pop-in {
  animation: pop-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
</style>
