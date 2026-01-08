<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { useAudioEngine } from '@spectralsuite/core';
import { Oscilloscope } from './visualizers/Oscilloscope';
import { Spectrogram } from './visualizers/Spectrogram';
import { Harmonograph } from './visualizers/Harmonograph';

const { init, isInitialized, getAnalyser, error } = useAudioEngine();

const oscilloscopeCanvas = ref<HTMLCanvasElement | null>( null );
const spectrogramCanvas = ref<HTMLCanvasElement | null>( null );
const harmonographCanvas = ref<HTMLCanvasElement | null>( null );

let osc: Oscilloscope | null = null;
let spec: Spectrogram | null = null;
let harm: Harmonograph | null = null;
let animationId: number | null = null;

const start = async () => {
  await init();
  if ( isInitialized.value ) {
    const analyser = getAnalyser();
    if ( analyser ) {
      analyser.fftSize = 2048;

      await nextTick();

      if ( oscilloscopeCanvas.value ) osc = new Oscilloscope( oscilloscopeCanvas.value, analyser );
      if ( spectrogramCanvas.value ) spec = new Spectrogram( spectrogramCanvas.value, analyser );
      if ( harmonographCanvas.value ) harm = new Harmonograph( harmonographCanvas.value, analyser );

      render();
    }
  }
};

const render = () => {
  if ( osc ) osc.draw();
  if ( spec ) spec.draw();
  if ( harm ) harm.draw();
  animationId = requestAnimationFrame( render );
};

const handleResize = () => {
  if ( osc ) osc.resize();
  if ( spec ) spec.resize();
  if ( harm ) harm.resize();
};

onMounted( () => {
  window.addEventListener( 'resize', handleResize );
} );

onUnmounted( () => {
  window.removeEventListener( 'resize', handleResize );
  if ( animationId ) cancelAnimationFrame( animationId );
} );
</script>

<template>
  <div class="min-h-screen bg-[#0a0a0c] text-slate-200 overflow-hidden flex flex-col font-mono text-xs">
    <!-- Top Status Bar -->
    <header class="h-12 border-b border-white/5 flex items-center justify-between px-6 bg-black/40 backdrop-blur-md">
      <div class="flex items-center gap-6">
        <h1 class="text-white font-black tracking-tighter text-sm uppercase">
          Freq<span class="text-[#00f3ff]">Flow</span> <span class="text-slate-600 font-normal ml-2">v0.1.0-alpha</span>
        </h1>

        <div class="flex items-center gap-4 text-slate-500 uppercase tracking-widest text-[9px]">
          <div class="flex items-center gap-2">
            <span
              class="w-1 h-1 rounded-full"
              :class="isInitialized ? 'bg-green-500 shadow-[0_0_5px_green]' : 'bg-red-500'"
            ></span>
            {{ isInitialized ? 'Engine Active' : 'Off-line' }}
          </div>
          <div class="h-3 w-[1px] bg-white/10"></div>
          <div>Sample Rate: 44.1kHz</div>
        </div>
      </div>

      <div class="flex items-center gap-4">
        <button
          v-if=" !isInitialized "
          @click="start"
          class="bg-[#00f3ff] hover:bg-[#00d8e2] text-black px-4 py-1.5 rounded-md font-bold uppercase tracking-tighter transition-all"
        >
          Initialize Audio
        </button>
        <div
          v-else
          class="flex items-center gap-4"
        >
          <button class="hover:text-white transition-colors">FFT: 2048</button>
          <button class="hover:text-white transition-colors">XY-Mode</button>
          <div
            class="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 cursor-pointer"
          >
            ⚙️
          </div>
        </div>
      </div>
    </header>

    <!-- Main Grid -->
    <main class="flex-1 p-6 grid grid-cols-12 gap-6 overflow-hidden">

      <!-- Left: Oscilloscope (Raw Waveform) -->
      <section class="col-span-12 lg:col-span-8 glass-card rounded-[2rem] overflow-hidden flex flex-col relative group">
        <div class="absolute top-6 left-8 flex items-center gap-3 z-10">
          <div class="w-2 h-2 rounded-full bg-[#00f3ff] animate-pulse shadow-[0_0_8px_#00f3ff]"></div>
          <h2 class="uppercase font-black text-[10px] tracking-[0.2em] text-white">Live Oscilloscope</h2>
        </div>

        <canvas
          ref="oscilloscopeCanvas"
          class="flex-1 w-full bg-black/20"
        ></canvas>

        <div
          class="absolute bottom-6 left-8 right-8 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <div class="text-[9px] text-slate-500 uppercase tracking-widest">Coupling: AC · Offset: 0.0ms</div>
          <div class="flex gap-4">
            <div class="h-1 w-20 bg-white/5 rounded-full overflow-hidden">
              <div class="h-full bg-[#00f3ff] w-1/2"></div>
            </div>
          </div>
        </div>
      </section>

      <!-- Right Column -->
      <aside class="col-span-12 lg:col-span-4 space-y-6 flex flex-col">
        <!-- Harmonograph -->
        <div class="flex-1 glass-card rounded-[2rem] overflow-hidden flex flex-col relative group">
          <div class="absolute top-6 left-8 flex items-center gap-3 z-10">
            <h2 class="uppercase font-black text-[10px] tracking-[0.2em] text-[#ff00ff]">Harmonograph XY</h2>
          </div>
          <canvas
            ref="harmonographCanvas"
            class="flex-1 w-full"
          ></canvas>
        </div>

        <!-- Session Monitor -->
        <div class="h-48 glass-card rounded-[2rem] p-8 flex flex-col justify-center gap-4">
          <div
            v-for=" i in 3 "
            :key="i"
            class="flex items-center gap-4"
          >
            <div class="w-20 text-[9px] uppercase tracking-widest text-slate-500 font-bold">Ch. 0{{ i }}</div>
            <div class="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
              <div
                class="h-full bg-white/40"
                :style="{ width: ( 30 + i * 20 ) + '%' }"
              ></div>
            </div>
          </div>
        </div>
      </aside>

      <!-- Bottom: Spectrogram (Waterfall) -->
      <section class="col-span-12 h-64 glass-card rounded-[2rem] overflow-hidden flex flex-col relative">
        <div class="absolute top-6 left-8 flex items-center gap-3 z-10">
          <h2 class="uppercase font-black text-[10px] tracking-[0.2em] text-white">Spectral History <span
              class="text-slate-600 font-normal"
            >(Waterfall)</span></h2>
        </div>
        <canvas
          ref="spectrogramCanvas"
          class="flex-1 w-full"
        ></canvas>

        <!-- Frequency Labels -->
        <div
          class="absolute bottom-0 left-0 right-0 h-8 flex justify-between px-8 text-[8px] text-slate-600 border-t border-white/5 bg-black/80"
        >
          <div class="flex items-center">20Hz</div>
          <div class="flex items-center">100Hz</div>
          <div class="flex items-center">500Hz</div>
          <div class="flex items-center">1kHz</div>
          <div class="flex items-center">5kHz</div>
          <div class="flex items-center">10kHz</div>
          <div class="flex items-center">20kHz</div>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.glass-card {
  transition: border-color 0.3s ease;
}

.glass-card:hover {
  border-color: rgba(255, 255, 255, 0.1);
}
</style>
