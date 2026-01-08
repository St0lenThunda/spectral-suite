<script setup lang="ts">
import { usePitch, useAudioEngine } from '@spectralsuite/core'
import { onMounted } from 'vue'
import { useToolInfo } from '../../composables/useToolInfo';

const { pitch, clarity, currentNote, cents } = usePitch()
const { init, isInitialized } = useAudioEngine()
const { openInfo } = useToolInfo();

onMounted( () => {
  // In the framework, the audio engine might already be initialized by the host
} )
</script>

<template>
  <div class="p-6">
    <header class="mb-8 flex justify-between items-end">
      <div>
        <h2 class="text-3xl font-bold text-white mb-2">AuraTune <span class="text-sky-400">Assistant</span></h2>
        <p class="text-slate-400 text-sm">Intonation analysis and stability tracking.</p>
      </div>
      <button
        @click="openInfo( 'auratune' )"
        class="flex items-center gap-2 px-6 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500/20 transition-all active:scale-95 mb-1"
      >
        Intelligence
      </button>
    </header>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Tuner Card -->
      <div class="lg:col-span-2 bg-slate-800/50 rounded-3xl p-8 border border-slate-700 backdrop-blur-xl">
        <div class="flex items-center justify-between mb-8">
          <div
            class="h-3 w-3 rounded-full animate-pulse"
            :class="isInitialized ? 'bg-green-500' : 'bg-red-500'"
          ></div>
          <span class="text-xs font-mono text-slate-500 uppercase">Live Frequency Stream</span>
        </div>

        <div class="flex flex-col items-center py-12">
          <div class="text-3xl font-bold text-sky-400 mb-2 font-mono uppercase tracking-[0.3em] h-8 flex items-center">
            {{ currentNote || '--' }}
          </div>
          <div class="text-8xl font-black font-mono tracking-tighter text-white">
            {{ pitch ? pitch.toFixed( 1 ) : '000.0' }}<span class="text-2xl text-sky-400">Hz</span>
          </div>

          <div class="w-full max-w-md mt-12">
            <div class="flex justify-between text-[10px] text-slate-500 uppercase tracking-widest mb-2 font-bold px-2">
              <span>Flat</span>
              <span :class="Math.abs( cents || 0 ) < 5 ? 'text-green-500' : 'text-slate-500'">In Tune</span>
              <span>Sharp</span>
            </div>
            <div class="h-1 bg-slate-700 rounded-full relative overflow-hidden">
              <!-- Center point -->
              <div class="absolute left-1/2 top-0 bottom-0 w-[1px] bg-slate-600 z-0"></div>
              <!-- Dynamic Indicator -->
              <div
                class="absolute top-0 bottom-0 w-1 bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.8)] transition-all duration-100 ease-out z-10"
                :style="{ left: `calc(50% + ${( cents || 0 )}%)` }"
                :class="{ 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.8)]': Math.abs( cents || 0 ) < 5 }"
              ></div>
            </div>
            <div class="text-center mt-2">
              <span class="text-[10px] font-mono text-slate-500 uppercase tracking-tighter">
                {{ cents > 0 ? '+' : '' }}{{ cents }} cents
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Stats Card -->
      <div class="bg-slate-800/50 rounded-3xl p-6 border border-slate-700 backdrop-blur-xl">
        <h3 class="text-sm font-bold uppercase tracking-widest text-slate-500 mb-6">Session Stats</h3>
        <div class="space-y-4">
          <div class="bg-slate-900/50 p-4 rounded-2xl border border-slate-700/50">
            <span class="text-[10px] text-slate-500 uppercase">Clarity Score</span>
            <div class="text-2xl font-bold text-white">{{ ( ( clarity || 0 ) * 100 ).toFixed( 0 ) }}%</div>
          </div>
          <div class="bg-slate-900/50 p-4 rounded-2xl border border-slate-700/50">
            <span class="text-[10px] text-slate-500 uppercase">Stability</span>
            <div class="text-2xl font-bold text-white">Good</div>
          </div>
          <button
            v-if=" !isInitialized "
            @click="init"
            class="w-full py-4 bg-sky-500 hover:bg-sky-600 text-white rounded-2xl font-bold transition-all"
          >
            Enable Audio
          </button>
        </div>
      </div>
    </div>

  </div>
</template>
