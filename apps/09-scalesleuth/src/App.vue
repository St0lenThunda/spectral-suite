<script setup lang="ts">
import { useScaleSleuth, useAudioEngine, Fretboard } from '@spectralsuite/core'
import { ref, computed } from 'vue'

const {
  pitch,
  clarity,
  currentNote,
  detectedNotes,
  noteWeights,
  potentialScales,
  clearNotes
} = useScaleSleuth()

const { init, isInitialized, error } = useAudioEngine()

const selectedScale = ref<string | null>( null )
const showDegrees = ref( false )

const scaleNotes = computed( () => {
  if ( !selectedScale.value ) return []
  const found = potentialScales.value.find( s => s.name === selectedScale.value )
  return found ? found.notes : []
} )

const start = () => {
  init()
}

const handleScaleClick = ( name: string ) => {
  selectedScale.value = name
}

const maxWeight = computed( () => {
  const weights = Object.values( noteWeights.value );
  if ( weights.length === 0 ) return 1;
  return Math.max( ...weights );
} );

const getWeightColor = ( note: string ) => {
  const weight = noteWeights.value[note] || 0;
  const ratio = weight / ( maxWeight.value || 1 );
  if ( ratio > 0.8 ) return 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]';
  if ( ratio > 0.5 ) return 'bg-sky-400';
  return 'bg-slate-600';
};
</script>

<template>
  <div class="min-h-screen bg-slate-950 text-white p-8">
    <div class="max-w-6xl mx-auto">
      <header class="flex justify-between items-center mb-12">
        <div class="flex items-center gap-6">
          <div>
            <h1 class="text-4xl font-black tracking-tighter text-white uppercase font-outfit">Scale <span
                class="text-sky-400">Sleuth Pro</span>
            </h1>
            <p class="text-slate-500 font-mono text-xs uppercase tracking-widest mt-1">Standalone Mode · Harmonic Forensic</p>
          </div>
        </div>

        <div class="flex items-center gap-4">
          <!-- Degrees Toggle -->
          <div class="flex bg-slate-900 p-1 rounded-xl border border-white/5 mr-4">
            <button 
              @click="showDegrees = false"
              class="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all"
              :class="!showDegrees ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20' : 'text-slate-500 hover:text-slate-300'"
            >Notes</button>
            <button 
              @click="showDegrees = true"
              class="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all"
              :class="showDegrees ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20' : 'text-slate-500 hover:text-slate-300'"
            >Degrees</button>
          </div>

          <div v-if=" !isInitialized ">
            <button
              @click="start"
              class="bg-sky-500 hover:bg-sky-600 px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-sky-500/20"
            >
              Enable Microphone
            </button>
          </div>
          <button
            v-else
            @click="clearNotes"
            class="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-lg border border-slate-700 transition-all"
          >
            Reset Detective
          </button>
        </div>
      </header>

      <div
        v-if=" isInitialized "
        class="grid grid-cols-1 lg:grid-cols-3 gap-8"
      >
        <!-- Input Status -->
        <div class="lg:col-span-1 space-y-6">
          <div class="bg-slate-900 border border-slate-800 p-8 rounded-3xl">
            <span class="text-[10px] uppercase font-bold tracking-widest text-slate-500 block mb-4">Live
              Detection</span>
            <div class="text-7xl font-mono font-black text-white">{{ currentNote || '--' }}</div>
            <div class="mt-4 flex items-center gap-4">
              <div class="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  class="h-full bg-sky-500"
                  :style="{ width: ( clarity || 0 ) * 100 + '%' }"
                ></div>
              </div>
              <span class="text-[10px] font-mono text-slate-500">{{ pitch ? pitch.toFixed( 0 ) + 'Hz' : '' }}</span>
            </div>
          </div>

          <div class="bg-slate-900 border border-slate-800 p-8 rounded-3xl min-h-[200px]">
            <span class="text-[10px] uppercase font-bold tracking-widest text-slate-500 block mb-6">Notes in
              Buffer</span>
            <div class="flex flex-wrap gap-3">
                <div
                  v-for=" note in detectedNotes "
                  :key="note"
                  class="relative w-12 h-12 rounded-2xl bg-slate-950 border border-sky-500/20 flex items-center justify-center font-bold text-sky-400 text-xl overflow-hidden"
                >
                  {{ note }}
                  <!-- Weight indicator -->
                  <div 
                    class="absolute bottom-0 left-0 h-1 transition-all duration-500"
                    :class="getWeightColor(note)"
                    :style="{ width: Math.min((noteWeights[note] || 0) * 10, 100) + '%' }"
                  ></div>
                </div>
              <div
                v-if=" detectedNotes.length === 0 "
                class="text-slate-700 italic text-sm"
              >Waiting for notes...</div>
            </div>
          </div>
        </div>

        <!-- Scale Results -->
        <div class="lg:col-span-2 space-y-8">
          <div class="bg-slate-900 border border-slate-800 p-8 rounded-3xl">
            <h3 class="text-xs font-bold uppercase tracking-widest text-slate-500 mb-6">Visualizer</h3>
            <Fretboard
              :active-notes="detectedNotes"
              :highlight-notes="scaleNotes"
              :num-frets="12"
            />
          </div>

          <div class="bg-slate-900 border border-slate-800 p-8 rounded-3xl">
            <h3 class="text-xs font-bold uppercase tracking-widest text-slate-500 mb-6">Matches</h3>
            <div
              v-if=" potentialScales.length === 0 "
              class="py-12 text-center opacity-20 italic"
            >
              Play 3 or more notes to find matching scales
            </div>
            <div class="space-y-2">
              <button
                v-for=" scale in potentialScales.slice( 0, 5 ) "
                :key="scale.name"
                @click="handleScaleClick( scale.name )"
                class="w-full flex items-center justify-between p-4 rounded-2xl transition-all border"
                :class="selectedScale === scale.name ? 'bg-sky-500/10 border-sky-500' : 'bg-slate-950 border-transparent hover:border-slate-800'"
              >
                <div class="text-left">
                  <div class="font-bold text-white group-hover:text-sky-400 transition-colors">{{ scale.name }}</div>
                  <div class="text-[10px] text-slate-500 font-mono uppercase tracking-tight mt-0.5">
                    <span v-if="!showDegrees">{{ scale.notes.join( ' · ' ) }}</span>
                    <span v-else class="text-sky-400/80">{{ scale.intervals.join( ' · ' ) }}</span>
                  </div>
                  <!-- Modal info placeholder -->
                  <div v-if="scale.type.includes('Dorian') || scale.type.includes('Phrygian') || scale.type.includes('Lydian') || scale.type.includes('Mixolydian') || scale.type.includes('Aeolian') || scale.type.includes('Locrian')" class="text-[8px] text-slate-600 font-bold uppercase tracking-tighter mt-1">
                    Theory: Modal of {{ scale.name.split(' ')[1] }} Major
                  </div>
                </div>
                <div class="text-sky-400 font-black text-xs">{{ Math.round( scale.score * 100 ) }}%</div>
              </button>
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
            Start Scale Detection
          </button>
          <p class="text-slate-500 font-mono text-xs uppercase tracking-widest mt-6">Microphone access required for
            real-time analysis</p>
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
