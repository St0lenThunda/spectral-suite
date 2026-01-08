<script setup lang="ts">
import { usePitch, useAudioEngine, InfoPanel } from '@spectralsuite/core'

const { pitch, clarity, currentNote, cents } = usePitch()
const { init, isInitialized, error } = useAudioEngine()

const start = () => {
  init()
}
</script>

<template>
  <div class="min-h-screen bg-slate-950 text-white p-8">
    <div class="max-w-4xl mx-auto">
      <header class="flex justify-between items-center mb-12">
        <div class="flex items-center gap-6">
          <div>
            <h1 class="text-4xl font-black tracking-tighter text-white uppercase">Aura<span
                class="text-sky-400">Tune</span></h1>
            <p class="text-slate-500 font-mono text-xs uppercase tracking-widest mt-1">Standalone Mode · v1.0</p>
          </div>
          <InfoPanel title="How to use AuraTune">
            <h4>1. Tuning</h4>
            <p>Sing or play a steady note. Watch the frequency display for high-precision feedback.</p>
            <h4>2. Stability</h4>
            <p>The "Stability" status tells you if your breath or finger pressure is consistent.</p>
            <h4>3. Intonation</h4>
            <p>Use the strobe meter to make micro-adjustments until you're perfectly centered.</p>
          </InfoPanel>
        </div>

        <div v-if=" isInitialized ">
          <div
            class="flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] font-black uppercase tracking-widest"
          >
            <div class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
            Engine Active
          </div>
        </div>
      </header>

      <div
        v-if=" isInitialized "
        class="grid grid-cols-1 md:grid-cols-3 gap-8"
      >
        <!-- Tuner Display -->
        <div
          class="md:col-span-2 bg-slate-900 border border-slate-800 p-12 rounded-3xl flex flex-col items-center justify-center"
        >
          <span class="text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-4">Detected Note</span>
          <div class="text-6xl font-black text-sky-400 mb-4 font-mono uppercase tracking-widest">
            {{ currentNote || '--' }}
          </div>
          <span class="text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-4">Live Frequency</span>
          <div class="text-8xl font-mono font-black text-white tracking-tighter">
            {{ pitch ? pitch.toFixed( 1 ) : '000.0' }}<span class="text-3xl text-sky-400 ml-2">Hz</span>
          </div>

          <div class="w-full max-w-sm mt-12">
            <div class="flex justify-between text-[10px] text-slate-500 uppercase tracking-widest mb-4 font-bold">
              <span>Flat</span>
              <span :class="Math.abs( cents || 0 ) < 5 ? 'text-green-500' : 'text-slate-500'">Perfect</span>
              <span>Sharp</span>
            </div>
            <div class="h-1.5 bg-slate-800 rounded-full relative overflow-hidden">
              <!-- Center point -->
              <div class="absolute left-1/2 top-0 bottom-0 w-[1px] bg-slate-700 z-0"></div>
              <!-- Dynamic Indicator -->
              <div
                class="absolute top-0 bottom-0 w-1 bg-sky-400 shadow-[0_0_15px_rgba(56,189,248,1)] transition-all duration-100 ease-out z-10"
                :style="{ left: `calc(50% + ${( cents || 0 )}%)` }"
                :class="{ 'bg-green-500 shadow-[0_0_20px_rgba(34,197,94,1)]': Math.abs( cents || 0 ) < 5 }"
              ></div>
            </div>
            <div class="text-center mt-3">
              <span class="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                {{ cents > 0 ? '+' : '' }}{{ cents }} cents
              </span>
            </div>
          </div>
        </div>

        <!-- Stats Card -->
        <div class="bg-slate-900 border border-slate-800 p-8 rounded-3xl space-y-6">
          <h3 class="text-[10px] font-bold uppercase tracking-widest text-slate-500">Session Analysis</h3>

          <div class="p-6 rounded-2xl bg-slate-950 border border-slate-800">
            <span class="text-[10px] text-slate-600 uppercase font-bold block mb-1">Clarity</span>
            <div class="text-3xl font-black text-white">{{ ( ( clarity || 0 ) * 100 ).toFixed( 0 ) }}%</div>
            <div class="mt-3 h-1 bg-slate-800 rounded-full overflow-hidden">
              <div
                class="h-full bg-sky-500 transition-all duration-300"
                :style="{ width: ( clarity || 0 ) * 100 + '%' }"
              ></div>
            </div>
          </div>

          <div class="p-6 rounded-2xl bg-slate-950 border border-slate-800">
            <span class="text-[10px] text-slate-600 uppercase font-bold block mb-1">Intonation</span>
            <div
              class="text-3xl font-black"
              :class="( clarity || 0 ) > 0.8 ? 'text-green-400' : 'text-slate-400'"
            >
              {{ ( clarity || 0 ) > 0.8 ? 'Stable' : 'Unstable' }}
            </div>
          </div>
        </div>
      </div>

      <div
        v-else
        class="flex flex-col items-center justify-center py-40 bg-slate-900/50 rounded-3xl border border-slate-800"
      >
        <div
          v-if=" !error "
          class="text-center"
        >
          <div class="w-20 h-20 bg-sky-500/10 rounded-full flex items-center justify-center mb-6 mx-auto">
            <div class="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <button
            @click="start"
            class="bg-sky-500 hover:bg-sky-600 px-10 py-4 rounded-2xl font-bold text-xl transition-all shadow-xl shadow-sky-500/20 transform hover:scale-105"
          >
            Enable AuraTune
          </button>
          <p class="text-slate-500 font-mono text-xs uppercase tracking-widest mt-6">Requires microphone access</p>
        </div>
        <div
          v-else
          class="text-center p-8"
        >
          <div class="text-4xl mb-4">⚠️</div>
          <p class="text-red-500 font-bold text-lg mb-2">Microphone Error</p>
          <p class="text-slate-400 text-sm max-w-md">{{ error }}</p>
          <button
            @click="start"
            class="mt-6 text-sky-400 font-bold hover:underline"
          >Try Again</button>
        </div>
      </div>
    </div>
  </div>
</template>
