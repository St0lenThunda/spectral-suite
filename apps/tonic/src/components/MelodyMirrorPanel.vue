<script setup lang="ts">
import { computed, watch } from 'vue';
import { useMelodyMirror } from '../stores/useMelodyMirror';
import { Note, useAudioEngine } from '@spectralsuite/core';
import { usePitch } from '@spectralsuite/core';

const store = useMelodyMirror();
const { currentNote, clarity } = usePitch();
const { init, isInitialized, activate } = useAudioEngine();

// Auto-activate on mount if already initialized
// This ensures the audio context resumes if it was suspended
watch( isInitialized, ( newVal ) => {
  if ( newVal ) activate();
}, { immediate: true } );

// --- Computed Visual State ---
const statusMessage = computed( () => {
  switch ( store.gameState ) {
    case 'idle': return 'Ready to Mirror?';
    case 'listening': return 'Listen Pattern...';
    case 'playing': return 'Your Turn';
    case 'success': return 'Perfect Mirror!';
    case 'fail': return 'Pattern Broken';
    default: return '';
  }
} );

const statusColor = computed( () => {
  switch ( store.gameState ) {
    case 'listening': return 'text-sky-400';
    case 'playing': return 'text-emerald-400';
    case 'success': return 'text-emerald-300';
    case 'fail': return 'text-rose-400';
    default: return 'text-slate-400';
  }
} );

// Helper to format notes for display
const formatNote = ( note: string ) => Note.pitchClass( note );

// --- FEEDBACK & GUIDANCE LOGIC ---

// Calculate the relative pitch difference (in semitones) between User and Target
const semitoneDiff = computed(() => {
  if (!store.currentTarget || !currentNote.value) return 0;
  
  const targetNote = Note.get(store.currentTarget.note);
  const userNote = Note.get(currentNote.value);
  
  if (targetNote.empty || userNote.empty) return 0;
  
  // Difference in MIDI numbers
  // const diff = (userNote.midi as number) - (targetNote.midi as number);
  
  // OCTAVE AGNOSTIC LOGIC (Guitar Friendly)
  // Calculate shortest distance on the pitch circle (0-11)
  const tChroma = targetNote.chroma; 
  const uChroma = userNote.chroma;

  if (tChroma === undefined || uChroma === undefined) return 0;

  let diff = uChroma - tChroma;

  // Wrap around to find shortest path (e.g. B->C is 1 step, not 11)
  if (diff > 6) diff -= 12;
  if (diff < -6) diff += 12;

  // Normalize huge jumps (just show up/down max 3 semitones)
  return Math.max(-3, Math.min(3, diff));
});

// Feedback text for the user ("Too Low", "Too High", "Locked On")
const pitchGuidance = computed(() => {
  if (!store.currentTarget) return '';
  if (!currentNote.value && (clarity.value || 0) < 0.8) return 'Sing/Play Now'; // No input
  
  const diff = semitoneDiff.value;
  if (diff === 0) return 'LOCKED ON';
  if (diff < 0) return 'TOO LOW';
  return 'TOO HIGH';
});

// Dynamic color for the guidance text
const guidanceColor = computed(() => {
  if (semitoneDiff.value === 0) return 'text-emerald-400';
  return 'text-rose-400';
});

</script>

<template>
  <div class="h-full flex flex-col items-center justify-center relative overflow-hidden">
    
    <!-- Game Container -->
    <div class="w-full max-w-4xl flex flex-col items-center gap-12 z-10" :class="{ 'blur-sm opacity-50 pointer-events-none': !isInitialized }">
      
      <!-- Status Header -->
      <div class="text-center space-y-2">
        <h3 class="text-4xl font-black italic uppercase tracking-tighter transition-colors duration-500" :class="statusColor">
          {{ statusMessage }}
        </h3>
        <div class="flex items-center justify-center gap-6 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
          <span>Level {{ store.level }}</span>
          <span class="w-1 h-1 bg-slate-700 rounded-full"></span>
          <span>Score {{ store.score }}</span>
          <span class="w-1 h-1 bg-slate-700 rounded-full"></span>
          <span class="flex gap-1">
             <span v-for="i in 3" :key="i" :class="i <= store.lives ? 'text-rose-500' : 'text-slate-800'">♥</span>
          </span>
        </div>
      </div>

      <!-- Melody Visualization Strip -->
      <div class="flex gap-4 p-8 bg-white/5 backdrop-blur-xl rounded-[2rem] border border-white/10 shadow-2xl">
        <div 
          v-for="(n, i) in store.targetMelody" 
          :key="i"
          class="relative w-24 h-32 flex items-center justify-center rounded-2xl border-2 transition-all duration-300 transform"
          :class="[
            i < store.playedNotes.length ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 scale-100' : 
            (i === store.playedNotes.length && store.gameState === 'playing') ? 'bg-white/5 border-sky-400 scale-110 shadow-[0_0_30px_rgba(56,189,248,0.3)]' :
            'bg-slate-900/50 border-white/5 text-slate-700 scale-95'
          ]"
        >
          <div class="flex flex-col items-center gap-2">
             <span 
               v-if="i < store.playedNotes.length || store.gameState === 'listening' || store.gameState === 'success' || store.gameState === 'fail'"
               class="text-2xl font-black"
             >
               {{ formatNote(n.note) }}
             </span>
             <span v-else class="text-3xl opacity-20 font-black">?</span>
             
             <!-- Active Target Indicator -->
             <span v-if="i === store.playedNotes.length && store.gameState === 'playing'" class="px-2 py-0.5 rounded-full bg-sky-500 text-white text-[8px] font-black uppercase tracking-widest">
                TARGET
             </span>
          </div>

          <!-- Active Marker Indicator -->
          <div 
            v-if="i === store.playedNotes.length && store.gameState === 'playing'"
            class="absolute -bottom-4 left-1/2 -translate-x-1/2 w-2 h-2 bg-sky-400 rounded-full animate-bounce"
          ></div>
        </div>
      </div>

      <!-- Live Feedback & Calibration Panel -->
      <div 
        class="w-80 h-32 flex flex-col items-center justify-center relative transition-opacity duration-500 bg-slate-900/50 rounded-3xl border border-white/5 backdrop-blur-sm overflow-hidden" 
        :class="store.gameState === 'playing' ? 'opacity-100' : 'opacity-0'"
      >
        <!-- Background Input Confidence Meter (SubtleGlow) -->
        <div 
          class="absolute inset-x-0 bottom-0 bg-emerald-500/10 transition-all duration-75 ease-out"
          :style="{ height: `${(clarity || 0) * 100}%` }"
        ></div>

        <!-- Guidance Message -->
        <div class="text-xs font-black uppercase tracking-[0.2em] mb-2 z-10" :class="guidanceColor">
          {{ pitchGuidance }}
        </div>

        <!-- Main Pitch Display -->
        <div class="flex items-center gap-2 z-10">
             <span class="text-4xl font-black italic font-mono text-white">
               {{ currentNote || '--' }}
             </span>
             <span class="text-slate-500 font-light mx-2">vs</span>
             <span class="text-2xl font-bold text-sky-400">
               {{ store.currentTarget ? formatNote(store.currentTarget.note) : '--' }}
             </span>
        </div>
        
        <!-- Tuning Needle / Difference Indicator -->
        <div class="relative w-full flex justify-center -mt-2 mb-1">
             <span class="text-[9px] font-bold text-slate-500 uppercase tracking-widest bg-slate-900/80 px-2 py-0.5 rounded-full border border-white/5">
                Any Octave Accepted
             </span>
        </div>
        
        <div class="w-48 h-1 bg-slate-800 rounded-full mt-1 relative overflow-visible z-10">
           <!-- Center Mark -->
           <div class="absolute left-1/2 -translate-x-1/2 top-[-4px] w-0.5 h-3 bg-white/20"></div>
           
           <!-- Moving Needle -->
           <div 
             class="absolute top-[-3px] w-2 h-2.5 rounded-full transition-all duration-200 ease-out shadow-[0_0_10px_currentColor]"
             :class="Math.abs(semitoneDiff) < 0.5 ? 'bg-emerald-400 text-emerald-400' : 'bg-rose-400 text-rose-400'"
             :style="{ 
               left: '50%', 
               transform: `translateX(-50%) translateX(${semitoneDiff * 20}px)` // 20px per semitone visually
             }"
           ></div>
        </div>
        
        <div class="absolute top-2 right-4 flex flex-col items-end z-10">
           <span class="text-[8px] uppercase tracking-widest text-slate-600 font-bold">Mic Input</span>
           <div class="w-12 h-1 bg-slate-800 rounded-full mt-1 overflow-hidden">
              <div class="h-full bg-sky-500 transition-all duration-75" :style="{ width: `${(clarity || 0) * 100}%` }"></div>
           </div>
        </div>
      </div>

      <!-- Controls -->
      <div class="flex gap-4">
        <!-- Start Button -->
        <button 
          v-if="store.gameState === 'idle' || store.gameState === 'fail' || store.gameState === 'success'"
          @click="store.startGame"
          class="px-12 py-4 bg-indigo-500 hover:bg-indigo-400 text-white rounded-full font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-indigo-500/30 hover:scale-105 active:scale-95 transition-all"
        >
          {{ store.gameState === 'idle' ? 'Start Game' : 'Next Round' }}
        </button>

        <!-- Replay Button -->
        <button 
          v-if="store.gameState === 'playing' || store.gameState === 'listening'" 
          @click="store.replayTargetMelody"
          class="px-8 py-4 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 rounded-full font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center gap-2"
        >
          <span>↺</span> Replay
        </button>

        <!-- Quit Button -->
        <button 
          v-if="store.gameState !== 'idle'" 
          @click="store.stopGame"
          class="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full font-black text-xs uppercase tracking-[0.2em] transition-all"
        >
          End Session
        </button>
      </div>

    </div>

    <!-- Initialization Overlay -->
    <div v-if="!isInitialized" class="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md">
       <div class="text-center space-y-6 max-w-md p-8 bg-slate-800/80 rounded-3xl border border-white/10 shadow-2xl">
          <div class="w-16 h-16 mx-auto bg-indigo-500 rounded-2xl flex items-center justify-center text-3xl shadow-lg shadow-indigo-500/30">
             🎵
          </div>
          <div>
            <h3 class="text-2xl font-black text-white uppercase italic tracking-tighter">Audio Engine Ready?</h3>
            <p class="text-slate-400 text-sm mt-2 leading-relaxed">
               Melody Mirror requires the audio engine to analyze your pitch and play synthesized targets.
            </p>
          </div>
          <button 
            @click="init"
            class="w-full py-4 bg-sky-500 hover:bg-sky-400 text-white rounded-xl font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-sky-500/20 active:scale-95 transition-all"
          >
            Initialize Audio
          </button>
       </div>
    </div>

    <!-- SUCCESS OVERLAY -->
    <div v-if="store.gameState === 'success'" class="absolute inset-0 z-40 flex flex-col items-center justify-center p-8 pointer-events-none">
       <div class="animate-pop-in text-6xl font-black text-emerald-400 drop-shadow-[0_0_50px_rgba(52,211,153,0.8)] italic uppercase skew-x-[-12deg]">
          Perfect!
       </div>
       <div class="mt-4 text-white font-bold text-xl uppercase tracking-[0.5em] animate-slide-up bg-black/50 px-6 py-2 rounded-full border border-emerald-500/30">
          +{{ 100 * store.level }} Points
       </div>
    </div>

    <!-- FAIL OVERLAY -->
    <div v-if="store.gameState === 'fail'" class="absolute inset-0 z-40 flex flex-col items-center justify-center p-8 pointer-events-none">
       <div class="animate-shake text-6xl font-black text-rose-500 drop-shadow-[0_0_50px_rgba(244,63,94,0.8)] italic uppercase skew-x-[-12deg]">
          Try Again
       </div>
       <div class="mt-4 text-white font-bold text-xl uppercase tracking-[0.5em] animate-slide-up bg-black/50 px-6 py-2 rounded-full border border-rose-500/30">
          Life Lost
       </div>
    </div>

    <!-- GAME OVER OVERLAY -->
    <div v-if="store.gameState === 'game-over'" class="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/90 backdrop-blur-xl">
        <div class="text-center space-y-8 animate-fade-scale-in">
           <h2 class="text-8xl font-black text-white italic uppercase tracking-tighter drop-shadow-2xl">
              <span class="text-rose-500">Game</span> Over
           </h2>
           
           <div class="flex flex-col gap-2">
              <span class="text-slate-500 text-xs font-black uppercase tracking-[0.3em]">Final Score</span>
              <span class="text-6xl font-mono font-black text-white">{{ store.score }}</span>
           </div>

           <div class="flex gap-4 justify-center mt-12 w-full">
               <button 
                  @click="store.startGame"
                  class="px-12 py-5 bg-sky-500 hover:bg-sky-400 text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-sky-500/20 active:scale-95 transition-all hover:-translate-y-1"
               >
                  Play Again
               </button>
               <button 
                  @click="store.gameState = 'idle'"
                  class="px-8 py-5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all"
               >
                  Menu
               </button>
           </div>
        </div>
    </div>

    <!-- Background Elements -->
    <div class="absolute inset-0 z-0 pointer-events-none">
       <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-sky-500/5 blur-[100px] rounded-full animate-pulse" style="animation-duration: 4s"></div>
    </div>

  </div>
</template>

<style scoped>
@keyframes pop-in {
  0% { transform: scale(0.5) translateY(20px); opacity: 0; }
  60% { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes slide-up {
  0% { transform: translateY(20px); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
}
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-10px) rotate(-5deg); }
  75% { transform: translateX(10px) rotate(5deg); }
}
@keyframes fade-scale-in {
  0% { opacity: 0; transform: scale(0.9); }
  100% { opacity: 1; transform: scale(1); }
}
.animate-pop-in { animation: pop-in 0.4s cubic-bezier(0.19, 1, 0.22, 1) forwards; }
.animate-slide-up { animation: slide-up 0.5s ease-out forwards 0.2s; opacity: 0; }
.animate-shake { animation: shake 0.4s ease-in-out forwards; }
.animate-fade-scale-in { animation: fade-scale-in 0.5s ease-out forwards; }
</style>
