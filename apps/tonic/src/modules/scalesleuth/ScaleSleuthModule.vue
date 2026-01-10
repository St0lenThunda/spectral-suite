<script setup lang="ts">
import { ref, computed, watch, Transition, onMounted } from 'vue';
import { useScaleSleuth, useAudioEngine, ScaleEngine, SynthEngine, Fretboard, Note } from '@spectralsuite/core';
import { useToolInfo } from '../../composables/useToolInfo';
import { sensitivityThreshold } from '@spectralsuite/core';

const {
  pitch,
  clarity,
  currentNote,
  detectedNotes,
  noteWeights,
  potentialScales,
  isLocked,
  lockScale,
  clearNotes
} = useScaleSleuth();

const { init, isInitialized } = useAudioEngine();
const { openInfo } = useToolInfo();

const selectedScale = ref<string | null>( null );
const showDegrees = ref( false );
const showPlayedNotes = ref( true );
const showScaleNotes = ref( true );
const showCAGED = ref( false );
const selectedCAGEDShape = ref<'C' | 'A' | 'G' | 'E' | 'D'>( 'E' );
const playbackNote = ref<string | null>( null );
const isPlaying = ref( false );
const playingScaleName = ref<string | null>( null );
let playbackAborted = false;

const scaleNotes = computed( () => {
  const targetName = effectiveScale.value;
  if ( !targetName ) return [];
  const found = potentialScales.value.find( s => s.name === targetName );
  return found ? found.notes : [];
} );

const effectiveScale = computed( () => {
  if ( selectedScale.value ) return selectedScale.value;
  return potentialScales.value[0]?.name || null;
} );

const degreeLabels = computed( () => {
  const targetName = effectiveScale.value;
  if ( !targetName ) return {};
  const found = potentialScales.value.find( s => s.name === targetName );
  if ( !found || !found.romanIntervals ) return {};

  const mapping: Record<number, string> = {};
  found.notes.forEach( ( note, i ) => {
    const degree = found.romanIntervals?.[i];
    if ( degree ) mapping[Note.chroma( note ) || 0] = degree;
  } );
  return mapping;
} );

const cagedRange = computed( () => {
  if ( !showCAGED.value || !effectiveScale.value ) return undefined;

  const rootNote = effectiveScale.value.split( ' ' )[0];
  if ( !rootNote ) return undefined;
  const rootChroma = Note.chroma( rootNote );
  if ( rootChroma === undefined ) return undefined;

  const r6 = ( rootChroma - ( Note.chroma( 'E' ) || 0 ) + 12 ) % 12;
  const r5 = ( rootChroma - ( Note.chroma( 'A' ) || 0 ) + 12 ) % 12;

  let baseRange: [number, number];
  switch ( selectedCAGEDShape.value ) {
    case 'E': baseRange = [r6, r6 + 3]; break;
    case 'A': baseRange = [r5, r5 + 3]; break;
    case 'G': baseRange = [r6 - 3, r6]; break;
    case 'C': baseRange = [r5 - 3, r5]; break;
    case 'D': baseRange = [r6 + 2, r6 + 5]; break;
    default: baseRange = [0, 24];
  }

  if ( baseRange[0] < 0 ) {
    baseRange[0] += 12;
    baseRange[1] += 12;
  }

  return baseRange as [number, number];
} );

const handleScaleClick = ( name: string ) => {
  selectedScale.value = name;
  const found = potentialScales.value.find( s => s.name === name );
  if ( found ) {
    lockScale( found.notes );
    showToast( `Detection Locked: ${name}` );
  }
};

const toastVisible = ref( false );
const toastMessage = ref( '' );
let toastTimeout: any = null;

const showToast = ( msg: string ) => {
  toastMessage.value = msg;
  toastVisible.value = true;
  if ( toastTimeout ) clearTimeout( toastTimeout );
  toastTimeout = setTimeout( () => {
    toastVisible.value = false;
  }, 3500 );
};

const stopScale = () => {
  playbackAborted = true;
  isPlaying.value = false;
  playingScaleName.value = null;
  playbackNote.value = null;
};

const playScale = async ( notes: string[], name: string ) => {
  if ( isPlaying.value ) {
    const wasPlayingThis = playingScaleName.value === name;
    stopScale();
    if ( wasPlayingThis ) return;
    await new Promise( resolve => setTimeout( resolve, 50 ) );
  }

  isPlaying.value = true;
  playingScaleName.value = name;
  playbackAborted = false;

  const synth = SynthEngine.getInstance();
  const interval = 400;

  for ( const note of notes ) {
    if ( playbackAborted ) break;
    playbackNote.value = note;
    const freq = Note.get( note ).freq || Note.freq( `${note}3` ) || Note.freq( `${note}4` ) || 440;
    synth.playNote( freq, interval - 50 );
    await new Promise( resolve => setTimeout( resolve, interval ) );
  }

  if ( !playbackAborted ) {
    playbackNote.value = notes[0]!;
    const freq = Note.freq( `${notes[0]}4` ) || 880;
    synth.playNote( freq, interval - 50 );
    await new Promise( resolve => setTimeout( resolve, interval ) );
  }

  isPlaying.value = false;
  playingScaleName.value = null;
  playbackNote.value = null;
};

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

onMounted( async () => {
  if ( !isInitialized.value ) {
    await init();
  }
} );
</script>

<template>
  <div class="p-6">
    <header class="mb-8 flex justify-between items-start">
      <div>
        <h2 class="text-3xl font-bold text-white mb-2">Scale <span class="text-sky-400">Sleuth</span> <span
            class="text-indigo-400 text-lg"
          >Pro</span></h2>
        <p class="text-slate-400 text-sm">Play notes to identify the scale and see it on the fretboard.</p>
      </div>
      <div class="flex items-center gap-4">
        <button
          @click="openInfo( 'scalesleuth' )"
          class="flex items-center gap-2 px-6 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500/20 transition-all active:scale-95"
        >Intelligence</button>
        <button
          @click="clearNotes"
          class="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-lg border border-slate-700 transition-all"
        >Reset Detective</button>
      </div>
    </header>

    <div class="grid grid-cols-1 xl:grid-cols-4 gap-6">
      <div class="xl:col-span-1 space-y-6">
        <div
          class="bg-slate-800/40 rounded-3xl p-6 border border-slate-700/50 backdrop-blur-xl relative overflow-hidden"
        >
          <div
            v-if=" isLocked "
            class="absolute top-0 right-0 px-3 py-1 bg-indigo-500 text-[8px] font-black uppercase tracking-widest text-white z-50 rounded-bl-xl shadow-lg animate-pulse"
          >Detection Locked</div>
          <span class="text-[10px] uppercase font-bold tracking-widest text-slate-500 block mb-2">Live Note</span>
          <div class="flex items-baseline gap-2">
            <span class="text-5xl font-black text-white font-mono">{{ currentNote || '--' }}</span>
            <span class="text-sky-500 font-mono text-xs">{{ pitch ? pitch.toFixed( 1 ) + 'Hz' : '' }}</span>
          </div>
          <div class="mt-4 h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              class="h-full bg-sky-500 transition-all duration-75"
              :style="{ width: ( clarity || 0 ) * 100 + '%' }"
            ></div>
          </div>
        </div>

        <div class="bg-slate-800/40 rounded-3xl p-6 border border-slate-700/50 backdrop-blur-xl min-h-[150px]">
          <span class="text-[10px] uppercase font-bold tracking-widest text-slate-500 block mb-4">Detected Set</span>
          <div class="flex flex-wrap gap-4">
            <div
              v-for=" note in detectedNotes "
              :key="note"
              class="group/note perspective-500 relative w-12 h-12"
            >
              <div
                class="relative w-full h-full transition-transform duration-500 preserve-3d group-hover/note:rotate-y-180"
              >
                <div
                  class="absolute inset-0 backface-hidden rounded-full bg-slate-900 border border-sky-500/30 flex items-center justify-center font-bold text-sky-400 text-sm shadow-lg"
                >{{ note }}</div>
                <div
                  class="absolute inset-0 backface-hidden rotate-y-180 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex flex-col items-center justify-center shadow-lg shadow-indigo-500/10"
                >
                  <span
                    class="text-[8px] text-indigo-400/60 uppercase font-black tracking-tighter leading-none mb-0.5">Degree</span>
                  <span
                    class="text-xs font-black text-white leading-none">{{ degreeLabels[Note.chroma( note ) || 0] || '?' }}</span>
                </div>
              </div>
              <div
                class="absolute -bottom-2 left-1/2 -translate-x-1/2 h-1 rounded-full transition-all duration-500 z-0"
                :class="getWeightColor( note )"
                :style="{ width: Math.min( ( noteWeights[note] || 0 ) * 4, 32 ) + 'px' }"
              ></div>
            </div>
          </div>
          <p
            v-if=" detectedNotes.length === 0 "
            class="text-xs text-slate-600 italic"
          >No notes detected yet...</p>
        </div>
      </div>

      <div class="xl:col-span-3 space-y-6">
        <div class="bg-slate-800/20 rounded-3xl p-6 border border-slate-700/50">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-xs font-bold uppercase tracking-widest text-slate-500">Visual Fretboard</h3>
            <div class="flex items-center gap-3">
              <button
                @click="showPlayedNotes = !showPlayedNotes"
                class="flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-[10px] font-black uppercase"
                :class="showPlayedNotes ? 'bg-sky-500/10 border-sky-500 text-sky-400' : 'bg-slate-900 border-slate-700 text-slate-500'"
              >
                <span class="w-2 h-2 rounded-full bg-sky-500"></span> Played
              </button>
              <button
                @click="showScaleNotes = !showScaleNotes"
                class="flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-[10px] font-black uppercase"
                :class="showScaleNotes ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-slate-900 border-slate-700 text-slate-500'"
              >
                <span class="w-2 h-2 rounded-full bg-emerald-500"></span> Scale
              </button>

<!-- Refined Play Button -->
              <button
               @click="playScale( scaleNotes, 'current' )"
                :disabled="!selectedScale"
                class="flex items-center gap-2 px-4 py-1.5 transition-all duration-300 transform active:scale-95 text-[10px] font-black uppercase disabled:opacity-20"
                :class="isPlaying && playingScaleName === 'current' ? 'bg-red-500 text-white rounded-lg' : 'bg-emerald-500 text-white rounded-full'"
              >
                <div class="relative w-3 h-3 flex items-center justify-center">
                  <svg
                    v-if=" isPlaying && playingScaleName === 'current' "
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-3 w-3"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <rect
                      x="6"
                      y="6"
                      width="12"
                      height="12"
                    />
                  </svg>
                  <svg
                    v-else
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-3 w-3"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
                {{ isPlaying && playingScaleName === 'current' ? 'Stop' : 'Play' }}
              </button>

              <button
                @click="showCAGED = !showCAGED"
                class="flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-[10px] font-black uppercase ml-4"
                :class="showCAGED ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400' : 'bg-slate-900 border-slate-700 text-slate-500'"
              >
                <span
                  class="w-2 h-2 rounded-full"
                  :class="showCAGED ? 'bg-indigo-500' : 'bg-slate-600'"
                ></span> CAGED Mode
              </button>
              <div
                v-if=" showCAGED "
                class="flex bg-slate-950 p-1 rounded-xl border border-white/5 animate-pop-in"
              >
                <button
                  v-for=" shape in ['C', 'A', 'G', 'E', 'D'] "
                  :key="shape"
                  @click="selectedCAGEDShape = shape as any"
                  class="w-8 h-8 rounded-lg text-[10px] font-black transition-all flex items-center justify-center"
                  :class="selectedCAGEDShape === shape ? 'bg-indigo-500 text-white' : 'text-slate-500 hover:text-slate-300'"
                >{{ shape }}</button>
              </div>
              <span
                class="text-[10px] text-sky-500 font-bold ml-2"
                v-if=" selectedScale "
              >Showing: {{ selectedScale }}</span>
            </div>
          </div>
          <Fretboard
            :active-notes="showPlayedNotes ? detectedNotes : []"
            :highlight-notes="showScaleNotes ? scaleNotes : []"
            :labels="degreeLabels"
            :num-frets="24"
            :fret-range="showCAGED ? cagedRange : undefined"
            :playback-note="playbackNote || undefined"
          />
        </div>

        <div class="bg-slate-800/40 rounded-3xl p-6 border border-slate-700/50 backdrop-blur-xl">
          <div class="flex justify-between items-center mb-6">
            <h3 class="text-xs font-bold uppercase tracking-widest text-slate-500">Scale Suggestions</h3>
            <div class="flex bg-slate-900 p-1 rounded-xl border border-white/5">
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
          </div>
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
              :class="selectedScale === scale.name ? 'bg-indigo-500/10 border-indigo-500' : 'bg-slate-900/40 border-slate-700/50 hover:border-slate-500'"
            >
              <div class="flex items-center justify-between flex-1 pr-4">
                <div class="text-left">
                  <div class="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">
                    {{ scale.name }}</div>
                  <div class="text-[10px] text-slate-500 uppercase font-mono tracking-tight mt-0.5">
                    <span v-if=" !showDegrees ">{{ scale.notes.join( ' · ' ) }}</span>
                    <span
                      v-else
                      class="text-indigo-500/80"
                    >{{ scale.romanIntervals?.join( ' · ' ) || scale.intervals.join( ' · ' ) }}</span>
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <!-- Morphing Individual Play Button -->
                  <button
                    @click.stop="playScale( scale.notes, scale.name )"
                    class="w-10 h-10 transition-all duration-300 transform active:scale-95 border border-white/10 flex items-center justify-center text-white shadow-xl"
                    :class="isPlaying && playingScaleName === scale.name ? 'bg-red-500 rounded-xl' : 'bg-emerald-500 rounded-full'"
                    title="Play Scale"
                  >
                    <svg
                      v-if=" isPlaying && playingScaleName === scale.name "
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-4 w-4"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <rect
                        x="6"
                        y="6"
                        width="12"
                        height="12"
                      />
                    </svg>
                    <svg
                      v-else
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-4 w-4"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </button>
                  <div
                    class="w-10 h-10 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-[10px] font-black text-indigo-400"
                  >{{ ( scale.score * 100 ).toFixed( 0 ) }}</div>
                </div>
              </div>
              <div
                v-if=" selectedScale === scale.name "
                class="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500"
              ></div>
            </button>
          </div>
        </div>
      </div>
    </div>

    <Transition name="toast">
      <div
        v-if=" toastVisible "
        class="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] bg-indigo-600 border border-indigo-400 px-8 py-4 rounded-2xl shadow-2xl text-white font-black uppercase tracking-widest text-xs flex items-center gap-4 backdrop-blur-3xl"
      >
        <span class="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm">🔒</span>
        {{ toastMessage }}
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.perspective-500 {
  perspective: 500px;
}

.preserve-3d {
  transform-style: preserve-3d;
}

.backface-hidden {
  backface-visibility: hidden;
}

.rotate-y-180 {
  transform: rotateY(180deg);
}

div::-webkit-scrollbar {
  height: 8px;
}

div::-webkit-scrollbar-track {
  background: #1e293b;
  border-radius: 10px;
}

div::-webkit-scrollbar-thumb {
  background: #475569;
  border-radius: 10px;
}

div::-webkit-scrollbar-thumb:hover {
  background: #64748b;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, 40px);
}
</style>
