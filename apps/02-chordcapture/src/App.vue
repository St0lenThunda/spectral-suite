<script setup lang="ts">
import { computed } from 'vue'
import { useChordCapture, useAudioEngine, ChordEngine, Fretboard } from '@spectralsuite/core'

const { 
  pitch, 
  clarity, 
  currentNote, 
  capturedNotes, 
  detectedChords, 
  chordHistory,
  keyCenter,
  clearNotes,
  captureChord,
  clearHistory
} = useChordCapture()
const { init, isInitialized, error } = useAudioEngine()

const suggestions = computed( () => {
  const topChord = detectedChords.value[0];
  if ( !topChord ) return [];
  return ChordEngine.suggestNext( topChord.symbol, keyCenter.value );
} );

const start = () => {
  init()
}
</script>

<template>
  <div class="chord-capture-app min-h-screen bg-[#020617] text-slate-200 font-inter overflow-x-hidden relative">
    <!-- Immersive Aurora Background -->
    <div class="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      <div class="aurora-blob blob-1"></div>
      <div class="aurora-blob blob-2"></div>
      <div class="aurora-blob blob-3"></div>
      <div
        class="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 contrast-150 brightness-100"
      ></div>
    </div>

    <!-- Main Content Container -->
    <div class="relative z-10 w-full max-w-6xl mx-auto px-6 py-12 md:py-20 flex flex-col items-center">

      <!-- Brand & Header -->
      <header class="text-center mb-16 animate-fade-in flex flex-col items-center">
        <h1 class="text-6xl md:text-7xl font-black tracking-tighter text-white uppercase font-outfit leading-none">
          Chord<span class="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Capture Pro</span>
        </h1>
        <p class="text-slate-500 font-mono text-[10px] uppercase tracking-[0.4em] font-bold mt-4">
          Forensic Harmonic Sequence Ledger
        </p>

        <!-- Key Selection for analysis -->
        <div class="mt-8 flex items-center gap-3 bg-white/5 px-6 py-3 rounded-2xl border border-white/5">
          <span class="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Analysis Key</span>
          <select 
              v-model="keyCenter" 
              class="bg-transparent text-[11px] font-black text-indigo-400 px-2 focus:outline-none transition-all uppercase cursor-pointer"
            >
              <option v-for="k in ['C', 'C#', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']" :key="k" :value="k">{{ k }}</option>
            </select>
        </div>
      </header>

      <!-- Stage 0: Initialization -->
      <div
        v-if=" !isInitialized "
        class="w-full flex flex-col items-center animate-fade-in"
      >
        <div
          class="glass-container w-full max-w-2xl p-12 text-center rounded-[3rem] border border-white/10 bg-white/5 backdrop-blur-3xl shadow-2xl"
        >
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
              >
                {{ detectedChords.length > 0 ? 'Harmonic Match' : 'Live Monitor' }}
              </span>
              <div
                class="font-black text-white leading-none font-outfit drop-shadow-[0_0_30px_rgba(255,255,255,0.1)] transition-all duration-300"
                :class="[
                  detectedChords.length > 0 && detectedChords[0].symbol.length > 4 ? 'text-[5rem] sm:text-[7rem] md:text-[9rem] lg:text-[11rem]' : 'text-[8rem] sm:text-[10rem] md:text-[12rem] lg:text-[16rem]'
                ]"
              >
                {{ detectedChords.length > 0 ? detectedChords[0].symbol : (currentNote || '--') }}
              </div>
              <div
                class="mt-4 flex items-center justify-center gap-4 text-[10px] md:text-xs font-mono font-bold text-slate-500"
              >
                <span :class="{ 'text-cyan-400': pitch }">{{ pitch ? pitch.toFixed( 1 ) : '000.0' }} Hz</span>
                <span class="opacity-20">|</span>
                <span
                  :class="{ 'text-emerald-400': ( clarity ?? 0 ) > 0.9 }">{{ ( ( clarity ?? 0 ) * 100 ).toFixed( 0 ) }}%
                  Clarity</span>
              </div>
            </div>

            <!-- Pulsing Rings -->
            <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div
                class="ring-pulse ring-1"
                :style="{ opacity: ( clarity ?? 0 ) * 0.3 }"
              ></div>
              <div
                class="ring-pulse ring-2"
                :style="{ opacity: ( clarity ?? 0 ) * 0.1 }"
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
        <div class="w-full max-w-5xl animate-slide-up">
          <div
            v-if=" detectedChords.length > 0 "
            class="flex flex-col gap-6"
          >
            <div
              v-for=" chord in detectedChords.slice(0, 1) "
              :key="chord.symbol"
              class="chord-hero overflow-hidden bg-gradient-to-br from-indigo-500/10 via-slate-900/50 to-transparent border border-white/10 p-12 md:p-20 rounded-[4rem]"
            >
              <div class="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                <div class="flex flex-col items-center lg:items-start text-center lg:text-left">
                  <span
                    class="text-[9px] md:text-[11px] font-black uppercase tracking-[0.4em] md:tracking-[0.5em] text-indigo-400/60 mb-6"
                  >Top Harmonic Match</span>
                  
                  <div class="flex items-baseline gap-3 mb-2">
                    <div class="text-7xl md:text-9xl font-black text-white font-outfit drop-shadow-2xl">
                      {{ chord.symbol }}
                    </div>
                    <div class="text-3xl font-black text-indigo-400 italic">{{ chord.roman }}</div>
                  </div>
                  
                  <div class="text-sm md:text-base font-bold text-slate-400 uppercase tracking-[0.2em] mb-10">
                    {{ chord.name }}
                  </div>

                  <div class="flex flex-wrap gap-2 mb-12">
                    <span
                      v-for=" note in chord.notes "
                      :key="note"
                      class="pc-chip px-5 py-2 text-sm"
                    >
                      {{ note }}
                    </span>
                  </div>

                  <button 
                    @click="captureChord(chord)"
                    class="px-10 py-4 bg-indigo-500 hover:bg-indigo-400 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-2xl shadow-indigo-500/20 active:scale-95 flex items-center gap-3"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 4v16m8-8H4" />
                    </svg>
                    Add to Ledger
                  </button>
                </div>

                <!-- Interactive Fretboard Visualizer -->
                <div class="flex flex-col gap-6 w-full">
                  <div class="bg-black/30 rounded-3xl p-8 border border-white/5 backdrop-blur-md">
                    <div class="flex justify-between items-center mb-6">
                      <span class="text-[10px] font-black uppercase tracking-widest text-slate-500">Guitar Optimized Voicing</span>
                      <span class="text-[10px] font-black uppercase tracking-widest text-indigo-400">Standard Tuning</span>
                    </div>
                    <Fretboard 
                      :active-notes="chord.notes"
                      :highlight-notes="chord.notes"
                      :num-frets="12"
                    />
                  </div>

                  <!-- Suggestions -->
                  <div v-if="suggestions.length > 0" class="px-8 py-6 rounded-3xl bg-white/5 border border-white/5">
                    <span class="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-4 block">Recommended Transitions</span>
                    <div class="flex flex-wrap gap-3">
                      <div 
                        v-for="s in suggestions" 
                        :key="s"
                        class="px-4 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-[11px] font-black text-indigo-300 uppercase tracking-tighter"
                      >
                        {{ s }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Progression Ledger Section -->
          <div class="mt-16 bg-white/[0.02] rounded-[4rem] p-12 border border-white/5 backdrop-blur-2xl">
            <div class="flex justify-between items-end mb-12 px-4">
              <div>
                <h3 class="text-3xl font-black text-white italic uppercase tracking-tighter">Harmonic <span class="text-indigo-500">Ledger</span></h3>
                <p class="text-[10px] text-slate-400 uppercase font-black tracking-[0.4em] mt-2">Historical Sequence Analysis</p>
              </div>
              <button 
                v-if="chordHistory.length > 0"
                @click="clearHistory"
                class="px-6 py-2 text-[10px] font-black text-slate-500 hover:text-red-400 transition-colors uppercase tracking-widest border border-white/5 rounded-full"
              >Clear Archive</button>
            </div>

            <div v-if="chordHistory.length > 0" class="flex flex-wrap gap-8 px-6">
              <div 
                v-for="(item, idx) in chordHistory" 
                :key="idx"
                class="flex items-center gap-8 group animate-pop-in"
                :style="{ animationDelay: (idx * 0.1) + 's' }"
              >
                <div class="flex flex-col items-center">
                  <div class="text-3xl font-black text-white font-outfit group-hover:text-indigo-400 transition-colors">{{ item.symbol }}</div>
                  <div class="text-[11px] font-black text-indigo-500/70 uppercase tracking-tighter mt-1">{{ item.roman }}</div>
                </div>
                <div v-if="idx < chordHistory.length - 1" class="text-slate-800 font-extrabold text-2xl">→</div>
              </div>
            </div>
            <div v-else class="py-20 text-center border-2 border-dashed border-white/5 rounded-[3rem]">
              <div class="text-4xl mb-6 opacity-20">📜</div>
              <p class="text-slate-500 font-medium italic">Pluck chords and hit "Add to Ledger" to document your harmonic journey.</p>
            </div>
          </div>
        </div>

        <!-- Harmonic Insight: Expectations & Context -->
        <div class="w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-8 mt-12 mb-20">
          <div class="glass-card p-8 rounded-[2rem] border border-white/5 bg-white/[0.02]">
            <h4 class="text-[11px] font-black uppercase tracking-[0.3em] text-indigo-400 mb-4">What am I seeing?</h4>
            <p class="text-xs text-slate-400 leading-relaxed mb-4">
              The <span class="text-white font-bold">Live Monitor</span> uses a fast-capture pitch autocorrelation
              algorithm.
              The <span class="text-indigo-300 font-bold">Pulsing Rings</span> react to the clarity of the incoming
              signal—stronger pulses indicate a more stable harmonic fundamental.
            </p>
            <div class="flex items-center gap-2">
              <div class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
              <span class="text-[9px] font-mono text-slate-500 uppercase tracking-widest">Real-time Analysis
                Active</span>
            </div>
          </div>
          <div class="glass-card p-8 rounded-[2rem] border border-white/5 bg-white/[0.02]">
            <h4 class="text-[11px] font-black uppercase tracking-[0.3em] text-cyan-400 mb-4">How it works</h4>
            <ul class="space-y-3">
              <li class="flex items-start gap-3">
                <span class="text-cyan-400 font-mono text-[10px] mt-0.5">01</span>
                <p class="text-[11px] text-slate-400 leading-tight">Notes are automatically captured once their clarity
                  exceeds
                  <span class="text-white">90%</span>.
                </p>
              </li>
              <li class="flex items-start gap-3">
                <span class="text-cyan-400 font-mono text-[10px] mt-0.5">02</span>
                <p class="text-[11px] text-slate-400 leading-tight">The engine filters duplicates and identifies the
                  underlying
                  <span class="text-white">Harmonic Structure</span>.
                </p>
              </li>
            </ul>
          </div>
        </div>

      </main>

    </div>
  </div>
</template>

<style>
@import "tailwindcss";

:root {
  color-scheme: dark;
}

body {
  margin: 0;
  background-color: #020617;
}

.font-inter {
  font-family: 'Inter', sans-serif;
}

.font-outfit {
  font-family: 'Outfit', sans-serif;
}

/* Aurora Blobs */
.aurora-blob {
  position: absolute;
  filter: blur(140px);
  border-radius: 50%;
  opacity: 0.3;
  mix-blend-mode: screen;
}

.blob-1 {
  width: 800px;
  height: 800px;
  background: radial-gradient(circle, #6366f1 0%, transparent 70%);
  top: -10%;
  left: -10%;
  animation: float 25s infinite alternate;
}

.blob-2 {
  width: 700px;
  height: 700px;
  background: radial-gradient(circle, #22d3ee 0%, transparent 70%);
  bottom: -5%;
  right: -5%;
  animation: float 30s infinite alternate-reverse;
}

.blob-3 {
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, #ec4899 0%, transparent 70%);
  top: 30%;
  left: 40%;
  animation: float 20s infinite alternate;
}

@keyframes float {
  from {
    transform: translate(0, 0) scale(1);
  }

  to {
    transform: translate(150px, 80px) scale(1.1);
  }
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
  @apply px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-[11px] font-black text-indigo-300 font-mono tracking-tighter;
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

::selection {
  background: rgba(99, 102, 241, 0.5);
  color: white;
}
</style>
