<script setup lang="ts">
import { useAudioEngine } from '@spectralsuite/core'
import { ref } from 'vue'
import ScaleSleuthModule from '../../tonic/src/modules/scalesleuth/ScaleSleuthModule.vue'

const { init, isInitialized, error } = useAudioEngine()

const start = async () => {
  await init()
}
</script>

<template>
  <div class="min-h-screen bg-slate-950 text-white font-inter">
    <!-- Standalone Initialization Screen -->
    <div
      v-if=" !isInitialized "
      class="min-h-screen flex flex-col items-center justify-center p-8 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-cover"
    >
      <div
        class="max-w-md w-full bg-slate-900/80 backdrop-blur-2xl p-10 rounded-[3rem] border border-white/10 text-center shadow-2xl"
      >
        <div v-if=" !error ">
          <h1 class="text-4xl font-black text-white mb-2 uppercase tracking-tighter">Scale Sleuth</h1>
          <p class="text-sky-400 font-bold uppercase tracking-widest text-xs mb-8">Harmonic Detective</p>

<button
            @click="start"
            class="w-full py-4 bg-sky-500 hover:bg-sky-400 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-lg hover:shadow-sky-500/25 active:scale-95"
          >
            Start Analysis
          </button>
          <p class="text-slate-500 text-[10px] uppercase tracking-widest mt-6 opacity-60">Microphone Access Required</p>
        </div>
        <div v-else>
          <div class="text-4xl mb-6">⚠️</div>
          <p class="text-red-400 font-bold mb-4">Initialization Error</p>
          <p class="text-slate-400 text-xs mb-6 font-mono bg-black/20 p-4 rounded-xl">{{ error }}</p>
          <button
            @click="start"
            class="text-sky-400 text-sm font-bold underline"
          >Retry</button>
        </div>
      </div>
    </div>

    <!-- The Module (Consolidated Platform Version) -->
    <!-- We wrap it to fill the screen since the module expects to be inside a container -->
    <div
      v-else
      class="w-full min-h-screen bg-slate-950"
    >
      <ScaleSleuthModule @back="() => { }" />
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
</style>
