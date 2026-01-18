<script setup lang="ts">
import { useAudioEngine } from '@spectralsuite/core'
import { ref } from 'vue'
import ChordCaptureModule from '../../tonic/src/modules/chordcapture/ChordCaptureModule.vue'

const { init, isInitialized, error } = useAudioEngine()

const start = async () => {
  await init()
}
</script>

<template>
  <div class="min-h-screen bg-[#020617] text-white font-inter">
    <!-- Standalone Initialization Screen -->
    <div
      v-if=" !isInitialized "
      class="min-h-screen flex flex-col items-center justify-center p-8 relative overflow-hidden"
    >
      <!-- Immersive Aurora Background -->
      <div class="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div class="aurora-blob blob-1"></div>
        <div class="aurora-blob blob-2"></div>
        <div class="aurora-blob blob-3"></div>
        <div
          class="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 contrast-150 brightness-100"
        ></div>
      </div>

      <div
        class="max-w-md w-full bg-slate-900/80 backdrop-blur-3xl p-10 rounded-[3rem] border border-white/10 text-center shadow-2xl relative z-10"
      >
        <div v-if=" !error ">
          <h1 class="text-4xl font-black text-white mb-2 uppercase tracking-tighter">Chord Capture</h1>
          <p class="text-indigo-400 font-bold uppercase tracking-widest text-xs mb-8">Forensic Ledger</p>

<button
            @click="start"
            class="w-full py-4 bg-indigo-500 hover:bg-indigo-400 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-lg hover:shadow-indigo-500/25 active:scale-95"
          >
            Initialize Engine
          </button>
          <p class="text-slate-500 text-[10px] uppercase tracking-widest mt-6 opacity-60">Microphone Access Required</p>
        </div>
        <div v-else>
          <div class="text-4xl mb-6">⚠️</div>
          <p class="text-red-400 font-bold mb-4">Initialization Error</p>
          <p class="text-slate-400 text-xs mb-6 font-mono bg-black/20 p-4 rounded-xl">{{ error }}</p>
          <button
            @click="start"
            class="text-indigo-400 text-sm font-bold underline"
          >Retry</button>
        </div>
      </div>
    </div>

    <!-- The Module (Consolidated Platform Version) -->
    <div
      v-else
      class="w-full min-h-screen bg-[#020617]"
    >
      <ChordCaptureModule @back="() => { }" />
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
</style>
