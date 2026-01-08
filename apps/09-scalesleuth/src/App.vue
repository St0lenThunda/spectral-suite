<script setup lang="ts">
import { useScaleSleuth, useAudioEngine, Fretboard } from '@spectralsuite/core'
import { ref, computed } from 'vue'

const {
  pitch,
  clarity,
  currentNote,
  detectedNotes,
  potentialScales,
  clearNotes
} = useScaleSleuth()

const { init, isInitialized, error } = useAudioEngine()

const selectedScale = ref<string | null>( null )

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
</script>

<template>
  <div class="min-h-screen bg-slate-950 text-white p-8">
    <div class="max-w-6xl mx-auto">
      <header class="flex justify-between items-center mb-12">
        <div class="flex items-center gap-6">
          <div>
            <h1 class="text-4xl font-black tracking-tighter text-white uppercase">Scale <span
                class="text-sky-400">Sleuth</span>
            </h1>
            <p class="text-slate-500 font-mono text-xs uppercase tracking-widest mt-1">Standalone Mode · v1.0</p>
          </div>
          <InfoPanel title="How to use ScaleSleuth">
            <h4>1. Detection</h4>
            <p>Play at least 3 distinct notes. The app listens for stable pitches and adds them to your session buffer.
            </p>
            <h4>2. Identification</h4>
            <p>The "Scale Suggestions" list updates in real-time. A 100% score means all your played notes fit that
              scale perfectly.</p>
            <h4>3. Visualization</h4>
            <p>Select a scale to see its full pattern on the fretboard. Active notes (those you played) are highlighted
              in blue.</p>
            <h4>4. Reset</h4>
            <p>Use the Reset button to clear the buffer when switching to a new song or key.</p>
          </InfoPanel>
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
          class="text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-white transition-colors"
        >
          Reset Session
        </button>
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
                class="w-12 h-12 rounded-2xl bg-slate-950 border border-sky-500/20 flex items-center justify-center font-bold text-sky-400 text-xl"
              >
                {{ note }}
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
                  <div class="font-bold text-white">{{ scale.name }}</div>
                  <div class="text-[10px] text-slate-500 font-mono">{{ scale.notes.join( ' ' ) }}</div>
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
