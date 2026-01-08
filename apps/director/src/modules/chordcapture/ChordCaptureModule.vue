<script setup lang="ts">
import { useChordCapture, useAudioEngine } from '@spectralsuite/core'
import { useToolInfo } from '../../composables/useToolInfo';

const { openInfo } = useToolInfo();

const { pitch, clarity, currentNote, capturedNotes, detectedChords, clearNotes } = useChordCapture()
const { init, isInitialized, error } = useAudioEngine()

const start = () => {
  init()
}
</script>

<template>
  <div class="chord-capture-module w-full">
    <!-- Stage 0: Initialization -->
    <div
      v-if=" !isInitialized "
      class="w-full flex flex-col items-center animate-fade-in"
    >
      <div
        class="glass-container w-full max-w-2xl p-12 text-center rounded-[3rem] border border-white/10 bg-white/5 backdrop-blur-3xl shadow-2xl relative"
      >
        <button
          @click="openInfo( 'chordcapture' )"
          class="absolute top-8 right-8 w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-indigo-400 hover:text-white hover:bg-indigo-500/20 transition-all active:scale-95"
          title="Tool Intelligence"
        >
          i
        </button>
        <div v-if=" !error ">
          <div
            class="w-20 h-20 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center mx-auto mb-8 transform -rotate-6"
          >
            <div class="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h2 class="text-3xl font-black mb-4 font-outfit text-white">System Ready</h2>
          <p class="text-slate-400 mb-10 max-w-sm mx-auto text-sm leading-relaxed">
            Enable your microphone to begin analyzing harmonic structures and sequences.
          </p>
          <button
            @click="start"
            class="btn-primary"
          >
            Initialize Audio Engine
          </button>
        </div>
        <div
          v-else
          class="text-center p-4"
        >
          <div class="text-5xl mb-6">🛡️</div>
          <h3 class="text-2xl font-black text-red-400 mb-4">Mic Required</h3>
          <p class="text-slate-500 text-xs mb-8">{{ error }}</p>
          <button
            @click="start"
            class="text-indigo-400 font-bold uppercase tracking-widest text-[10px] hover:text-white transition-all underline underline-offset-8"
          >
            Retry Handshake
          </button>
        </div>
      </div>
    </div>

    <!-- Stage 1-4: The Active Flow -->
    <main
      v-else
      class="w-full flex flex-col items-center gap-12 animate-fade-in"
    >
      <!-- Standard Module Header -->
      <header class="w-full max-w-3xl flex justify-between items-end px-4">
        <div>
          <h2 class="text-3xl font-bold text-white mb-2">Chord <span class="text-indigo-400">Capture</span></h2>
          <p class="text-slate-400 text-sm italic">Harmonic recognition and sequence building.</p>
        </div>
        <button
          @click="openInfo( 'chordcapture' )"
          class="flex items-center gap-2 px-6 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500/20 transition-all active:scale-95 mb-1"
        >
          Intelligence
        </button>
      </header>

      <!-- Step Indicator / Instructions -->
      <div class="w-full max-w-3xl grid grid-cols-3 gap-4 px-4 text-center">
        <div class="flex flex-col items-center gap-3">
          <div
            class="step-num"
            :class="{ 'active': capturedNotes.length === 0 }"
          >1</div>
          <div class="flex flex-col">
            <span class="text-[9px] font-black uppercase tracking-widest text-slate-500">Action</span>
            <span class="text-[10px] font-bold text-white leading-tight">Isolate Note</span>
          </div>
        </div>
        <div class="flex flex-col items-center gap-3">
          <div
            class="step-num"
            :class="{ 'active': capturedNotes.length > 0 && capturedNotes.length < 3 }"
          >2</div>
          <div class="flex flex-col">
            <span class="text-[9px] font-black uppercase tracking-widest text-slate-500">Growth</span>
            <span class="text-[10px] font-bold text-white leading-tight">Build Set</span>
          </div>
        </div>
        <div class="flex flex-col items-center gap-3">
          <div
            class="step-num"
            :class="{ 'active': detectedChords.length > 0 }"
          >3</div>
          <div class="flex flex-col">
            <span class="text-[9px] font-black uppercase tracking-widest text-slate-500">Outcome</span>
            <span class="text-[10px] font-bold text-white leading-tight">Match Chord</span>
          </div>
        </div>
      </div>

      <!-- Main Interactive Split -->
      <div class="w-full max-w-[90rem] grid grid-cols-1 lg:grid-cols-[3fr_1fr] gap-8 items-start animate-fade-in">

        <!-- Column 1: The Eye (Live Monitor) -->
        <div
          class="relative w-full aspect-[16/10] md:aspect-video rounded-[3rem] md:rounded-[4rem] bg-black/40 border border-white/10 backdrop-blur-sm flex flex-col items-center justify-center overflow-hidden shadow-2xl"
        >
          <div class="absolute inset-0 bg-gradient-to-t from-indigo-500/5 to-transparent"></div>

          <!-- Large Reactive Note -->
          <div
            class="relative z-10 text-center transition-all duration-300 transform px-8"
            :class="{ 'scale-105': currentNote }"
          >
            <span
              class="block text-[9px] md:text-[11px] font-black uppercase tracking-[0.4em] md:tracking-[0.6em] text-indigo-400/40 mb-2"
            >Live
              Monitor</span>
            <div
              class="text-[8rem] sm:text-[10rem] md:text-[12rem] lg:text-[16rem] font-black text-white leading-none font-outfit drop-shadow-[0_0_30px_rgba(255,255,255,0.1)]"
            >
              {{ currentNote || '--' }}
            </div>
            <div
              class="mt-4 flex items-center justify-center gap-4 text-[10px] md:text-xs font-mono font-bold text-slate-500"
            >
              <span :class="{ 'text-cyan-400': pitch }">{{ pitch ? pitch.toFixed( 1 ) : '000.0' }} Hz</span>
              <span class="opacity-20">|</span>
              <span
                :class="{ 'text-emerald-400': ( clarity || 0 ) > 0.9 }">{{ ( ( clarity || 0 ) * 100 ).toFixed( 0 ) }}%
                Clarity</span>
            </div>
          </div>

          <!-- Pulsing Rings -->
          <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              class="ring-pulse ring-1"
              :style="{ opacity: ( clarity || 0 ) * 0.3 }"
            ></div>
            <div
              class="ring-pulse ring-2"
              :style="{ opacity: ( clarity || 0 ) * 0.1 }"
            ></div>
          </div>
        </div>

        <!-- Column 2: Note Tray & Management -->
        <div class="flex flex-col gap-6 h-full">
          <div class="flex items-center gap-4 w-full">
            <span class="h-px bg-white/5 flex-1"></span>
            <h3 class="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 text-center">Capture Tray</h3>
            <span class="h-px bg-white/5 flex-1"></span>
          </div>

          <div
            class="grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] gap-3 lg:max-h-[60vh] lg:overflow-y-auto w-full p-6 rounded-[2.5rem] bg-white/5 border border-white/5 backdrop-blur-md custom-scrollbar"
          >
            <template v-if=" capturedNotes.length > 0 ">
              <div
                v-for=" note in capturedNotes "
                :key="note"
                class="note-pill animate-pop-in text-center py-4 text-2xl"
              >
                {{ note }}
              </div>
              <button
                @click="clearNotes"
                class="note-pill-clear w-full mt-2 col-span-full sticky bottom-0 bg-indigo-500/10 backdrop-blur-md py-4"
              >
                Reset Sequence
              </button>
            </template>
            <div
              v-else
              class="flex items-center justify-center w-full py-8 px-6 border border-dashed border-white/10 rounded-3xl opacity-20 text-center"
            >
              <p class="text-[9px] font-black uppercase tracking-widest leading-relaxed">Pluck notes to build a
                sequence...</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Final Result: Harmonic Matches -->
      <div class="w-full max-w-3xl animate-slide-up">
        <div
          v-if=" detectedChords.length > 0 "
          class="flex flex-col gap-6"
        >
          <div
            v-for=" chord in detectedChords "
            :key="chord.symbol"
            class="chord-hero px-8 py-12 md:p-16"
          >
            <div class="flex flex-col items-center text-center">
              <span
                class="text-[9px] md:text-[11px] font-black uppercase tracking-[0.4em] md:tracking-[0.5em] text-indigo-400/60 mb-6"
              >Identified
                Structure</span>
              <div class="text-6xl md:text-8xl font-black text-white font-outfit mb-2 drop-shadow-xl">
                {{ chord.symbol }}
              </div>
              <div class="text-xs md:text-sm font-bold text-slate-400 uppercase tracking-[0.2em] mb-8">
                {{ chord.name }}
              </div>

              <div class="flex gap-2">
                <span
                  v-for=" note in chord.notes "
                  :key="note"
                  class="pc-chip"
                >
                  {{ note }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>


    </main>
  </div>
</template>

<style scoped>
@reference "tailwindcss";

.chord-capture-module {
  --indigo-500: #6366f1;
  --cyan-400: #22d3ee;
}

.font-outfit {
  font-family: 'Outfit', sans-serif;
}

/* UI Elements */
.btn-primary {
  @apply px-12 py-5 rounded-2xl bg-white text-[#020617] font-black text-lg transition-all shadow-2xl hover:scale-105 active:scale-95;
}

.step-num {
  @apply w-10 h-10 rounded-full border border-white/10 flex items-center justify-center font-black text-slate-500 transition-all text-xs;
}

.step-num.active {
  @apply border-indigo-500 bg-indigo-500/20 text-indigo-400;
  box-shadow: 0 0 20px rgba(99, 102, 241, 0.3);
}

.glass-card {
  @apply backdrop-blur-xl transition-all duration-500;
}

.glass-card:hover {
  @apply border-white/10 bg-white/[0.04];
}

.ring-pulse {
  @apply absolute rounded-full border border-white/10 transition-all duration-300;
}

.ring-1 {
  width: 28rem;
  height: 28rem;
  animation: ring-pulse 4s infinite linear;
}

.ring-2 {
  width: 34rem;
  height: 34rem;
  animation: ring-pulse 6s infinite linear reverse;
}

@keyframes ring-pulse {
  0% {
    transform: scale(1) rotate(0deg);
  }

  50% {
    transform: scale(1.05) rotate(180deg);
    opacity: 0.2;
  }

  100% {
    transform: scale(1) rotate(360deg);
  }
}

.note-pill {
  @apply px-8 py-5 rounded-2xl bg-white/10 border border-white/20 text-3xl font-black text-white shadow-lg shadow-black/20;
  font-family: 'Outfit', sans-serif;
}

.note-pill-clear {
  @apply px-6 py-5 rounded-2xl bg-red-500/10 border border-red-500/20 text-[10px] font-black uppercase tracking-widest text-red-400 hover:bg-red-500/20 transition-all;
}

/* Custom Scrollbar */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  @apply bg-transparent rounded-full;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  @apply bg-white/10 rounded-full transition-all hover:bg-indigo-500/30;
}

.chord-hero {
  @apply p-16 rounded-[4rem] bg-gradient-to-b from-indigo-500/20 to-transparent border border-white/10 backdrop-blur-3xl shadow-2xl;
}

.pc-chip {
  @apply px-3 py-1.5 rounded-lg bg-black/40 border border-white/5 text-[11px] font-black text-indigo-300 font-mono tracking-tighter;
}

/* Animations */
@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(20px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fade-in 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes pop-in {
  from {
    opacity: 0;
    transform: scale(0.8);
  }

  to {
    opacity: 1;
    transform: scale(1);
  }
}

.animate-pop-in {
  animation: pop-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}

@keyframes slide-up {
  from {
    opacity: 0;
    transform: translateY(40px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-slide-up {
  animation: slide-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
</style>
