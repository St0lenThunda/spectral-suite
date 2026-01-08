<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useScaleSleuth, Fretboard, useAudioEngine } from '@spectralsuite/core';
import { useToolInfo } from '../../composables/useToolInfo';

const {
  pitch,
  clarity,
  currentNote,
  detectedNotes,
  potentialScales,
  clearNotes
} = useScaleSleuth();

const { init, isInitialized } = useAudioEngine();
const { openInfo } = useToolInfo();

const selectedScale = ref<string | null>( null );

const scaleNotes = computed( () => {
  if ( !selectedScale.value ) return [];
  const found = potentialScales.value.find( s => s.name === selectedScale.value );
  return found ? found.notes : [];
} );

const handleScaleClick = ( name: string ) => {
  selectedScale.value = name;
};

onMounted( async () => {
  // Ensure audio engine is initialized
  if ( !isInitialized.value ) {
    await init();
  }
} );
</script>

<template>
  <div class="p-6">
    <header class="mb-8 flex justify-between items-start">
      <div>
        <h2 class="text-3xl font-bold text-white mb-2">Scale <span class="text-sky-400">Sleuth</span></h2>
        <p class="text-slate-400 text-sm">Play notes to identify the scale and see it on the fretboard.</p>
      </div>
      <div class="flex items-center gap-4">
        <button
          @click="openInfo( 'scalesleuth' )"
          class="flex items-center gap-2 px-6 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500/20 transition-all active:scale-95"
        >
          Intelligence
        </button>
        <button
          @click="clearNotes"
          class="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-lg border border-slate-700 transition-all"
        >
          Reset Detective
        </button>
      </div>
    </header>

    <div class="grid grid-cols-1 xl:grid-cols-4 gap-6">
      <!-- Left Column: Detection Info -->
      <div class="xl:col-span-1 space-y-6">
        <!-- Live Note Card -->
        <div class="bg-slate-800/40 rounded-3xl p-6 border border-slate-700/50 backdrop-blur-xl">
          <span class="text-[10px] uppercase font-bold tracking-widest text-slate-500 block mb-2">Live Note</span>
          <div class="flex items-baseline gap-2">
            <span class="text-5xl font-black text-white font-mono">{{ currentNote || '--' }}</span>
            <span class="text-sky-500 font-mono text-xs">{{ pitch ? pitch.toFixed( 1 ) + 'Hz' : '' }}</span>
          </div>
          <!-- Clarity Meter -->
          <div class="mt-4 h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              class="h-full bg-sky-500 transition-all duration-75"
              :style="{ width: ( clarity || 0 ) * 100 + '%' }"
            ></div>
          </div>
        </div>

        <!-- Played Notes -->
        <div class="bg-slate-800/40 rounded-3xl p-6 border border-slate-700/50 backdrop-blur-xl min-h-[150px]">
          <span class="text-[10px] uppercase font-bold tracking-widest text-slate-500 block mb-4">Detected Set</span>
          <div class="flex flex-wrap gap-2">
            <div
              v-for=" note in detectedNotes "
              :key="note"
              class="w-10 h-10 rounded-full bg-slate-900 border border-sky-500/30 flex items-center justify-center font-bold text-sky-400"
            >
              {{ note }}
            </div>
          </div>
          <p
            v-if=" detectedNotes.length === 0 "
            class="text-xs text-slate-600 italic"
          >No notes detected yet...</p>
        </div>
      </div>

      <!-- Center/Right Column: Fretboard & Scales -->
      <div class="xl:col-span-3 space-y-6">
        <!-- Fretboard View -->
        <div class="bg-slate-800/20 rounded-3xl p-6 border border-slate-700/50">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-xs font-bold uppercase tracking-widest text-slate-500">Visual Fretboard</h3>
            <span
              class="text-[10px] text-sky-500 font-bold"
              v-if=" selectedScale "
            >Showing: {{ selectedScale }}</span>
          </div>
          <Fretboard
            :active-notes="detectedNotes"
            :highlight-notes="scaleNotes"
            :num-frets="15"
          />
        </div>

        <!-- Scale Suggestions -->
        <div class="bg-slate-800/40 rounded-3xl p-6 border border-slate-700/50 backdrop-blur-xl">
          <h3 class="text-xs font-bold uppercase tracking-widest text-slate-500 mb-6">Scale Suggestions</h3>

          <div
            v-if=" potentialScales.length === 0 "
            class="flex flex-col items-center py-10 opacity-30"
          >
            <p class="text-sm">Detecting scales requires at least 3 distinct notes</p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              v-for=" scale in potentialScales.slice( 0, 10 ) "
              :key="scale.name"
              @click="handleScaleClick( scale.name )"
              class="group relative flex items-center justify-between p-4 rounded-2xl border transition-all overflow-hidden"
              :class="selectedScale === scale.name ? 'bg-sky-500/10 border-sky-500' : 'bg-slate-900/40 border-slate-700/50 hover:border-slate-500'"
            >
              <div class="text-left">
                <div class="text-sm font-bold text-white group-hover:text-sky-400 transition-colors">{{ scale.name }}
                </div>
                <div class="text-[10px] text-slate-500 uppercase font-mono">{{ scale.notes.join( ' · ' ) }}</div>
              </div>
              <div class="text-right">
                <div
                  class="text-[10px] font-black"
                  :class="scale.score === 1 ? 'text-green-500' : 'text-slate-500'"
                >
                  {{ Math.round( scale.score * 100 ) }}%
                </div>
              </div>
              <!-- Selection Indicator -->
              <div
                v-if=" selectedScale === scale.name "
                class="absolute left-0 top-0 bottom-0 w-1 bg-sky-500"
              ></div>
            </button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>
