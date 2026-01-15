<script setup lang="ts">
/**
 * Scale Sleuth Panel
 * 
 * Embeddable version of Scale Sleuth.
 */
import { ref, computed } from 'vue';
import { useScaleSleuth, SynthEngine, Fretboard, Note, ScaleEngine } from '@spectralsuite/core';

// --- Props & Emits ---
// --- Props & Emits ---
const props = defineProps<{
  /** Optional area to force analysis on specific notes (e.g. frozen state) */
  staticNotes?: string[];
  isMaximized?: boolean;
}>();

// --- Constants ---
// SVG Fill classes matching the HTML bg classes (but for SVG)
const HEAT_MAP_COLORS = {
  hot: { classes: 'fill-emerald-400 stroke-emerald-200', weight: 0.8 },
  warm: { classes: 'fill-sky-400 stroke-sky-200', weight: 0.5 },
  cold: { classes: 'fill-slate-500 stroke-slate-400', weight: 0 }
};

const emit = defineEmits<{
  ( e: 'select:scale', scaleName: string ): void;
}>();

const {
  currentNote: liveCurrentNote,
  detectedNotes: liveDetectedNotes,
  noteWeights,
  potentialScales: livePotentialScales,
  lockScale,
  clearNotes,
} = useScaleSleuth();

// --- Computed State (Live vs Static) ---
const effectiveDetectedNotes = computed( () => {
  if ( props.staticNotes && props.staticNotes.length > 0 ) return props.staticNotes;
  return liveDetectedNotes.value;
} );

const effectivePotentialScales = computed( () => {
  if ( props.staticNotes && props.staticNotes.length > 0 ) {
    return ScaleEngine.detectScales( props.staticNotes );
  }
  return livePotentialScales.value;
} );

const currentNote = computed( () => {
  return props.staticNotes ? ( props.staticNotes[props.staticNotes.length - 1] || '--' ) : liveCurrentNote.value;
} );

// --- Internal UI State ---
const selectedScale = ref<string | null>( null );
const showDegrees = ref( false );
const showFretboard = ref( true ); // In drawer, maybe toggle off to save space?

// CAGED State
const showCAGED = ref( false );
const selectedCAGEDShape = ref<'C' | 'A' | 'G' | 'E' | 'D'>( 'E' );

// --- Computed ---
const effectiveScale = computed( () => selectedScale.value || effectivePotentialScales.value[0]?.name || null );

const scaleNotes = computed( () => {
  const s = effectivePotentialScales.value.find( s => s.name === effectiveScale.value );
  return s ? s.notes : [];
} );

const degreeLabels = computed( () => {
  if ( !showDegrees.value ) return {}; // If toggle off, Fretboard defaults to Note Names if labels property is empty?
  // Actually Fretboard usually shows note names if no label map provided. 
  // If we want Note Names, we pass nothing. If we want Intervals, we pass this map.

  const targetName = effectiveScale.value;
  if ( !targetName ) return {};
  const found = effectivePotentialScales.value.find( s => s.name === targetName );
  if ( !found || !found.romanIntervals ) return {};
  const mapping: Record<number, string> = {};
  found.notes.forEach( ( note, i ) => {
    const degree = found.romanIntervals?.[i];
    if ( degree ) mapping[Note.chroma( note ) || 0] = degree;
  } );
  return mapping;
} );

// CAGED Logic (Ported from Module)
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

// --- Actions ---
const handleScaleClick = ( name: string ) => {
  selectedScale.value = name;
  const found = effectivePotentialScales.value.find( s => s.name === name );
  if ( found ) {
    lockScale( found.notes );
    emit( 'select:scale', name );
  }
};

const playScale = async ( notes: string[] ) => {
  const synth = SynthEngine.getInstance();
  for ( const note of notes ) {
    const freq = Note.freq( `${note}3` ) || 440;
    synth.playNote( freq, 300 );
    await new Promise( r => setTimeout( r, 300 ) );
  }
  // Resolve
  if ( notes[0] ) synth.playNote( Note.freq( `${notes[0]}` ) || 880, 500 );
};

// --- Visualization Helpers ---
const maxWeight = computed( () => Math.max( ...Object.values( noteWeights.value ), 1 ) );
const getWeightColor = ( note: string ) => {
  const ratio = ( noteWeights.value[note] || 0 ) / maxWeight.value;
  if ( ratio > 0.8 ) return 'bg-emerald-400';
  if ( ratio > 0.5 ) return 'bg-sky-400';
  return 'bg-slate-600';
};

// Heat Map for Fretboard (Manual Highlights)
const fretboardHighlights = computed( () => {
  const highlights: Array<{ string: number; fret: number; color?: string }> = [];
  const notes = effectiveDetectedNotes.value;
  if ( notes.length === 0 ) return highlights;

  // We have to scan the fretboard positions to apply colors to specific frets
  // This is a bit expensive but necessary for per-note coloring on the board
  // Standard Guitar Tuning assumed for simplicity if we don't access tuning stats
  // We'll iterate standard tuning 6 strings, 15 frets
  const tuning = [
    { s: 1, open: 64 }, { s: 2, open: 59 }, { s: 3, open: 55 },
    { s: 4, open: 50 }, { s: 5, open: 45 }, { s: 6, open: 40 }
  ]; // MIDI numbers

  tuning.forEach( str => {
    for ( let f = 0; f <= 15; f++ ) {
      const midi = str.open + f;
      const noteName = Note.fromMidi( midi );
      const pc = Note.pitchClass( noteName || '' );

      if ( notes.includes( pc ) ) {
        // Calculate weight
        const ratio = ( noteWeights.value[pc] || 0 ) / maxWeight.value;
        let colorClass = HEAT_MAP_COLORS.cold.classes;
        if ( ratio > 0.8 ) colorClass = HEAT_MAP_COLORS.hot.classes;
        else if ( ratio > 0.5 ) colorClass = HEAT_MAP_COLORS.warm.classes;

        // Pass the class string as 'color'. Fretboard handles this in its 'manual.color' check
        highlights.push( { string: str.s, fret: f, color: colorClass } );
      }
    }
  } );

  return highlights;
} );
</script>

<template>
  <div class="scale-sleuth-panel h-full flex flex-col p-4 space-y-6">
    <!-- Analysis Header -->
    <div class="flex items-center justify-between">
      <div>
        <span class="text-[9px] font-black uppercase tracking-widest text-slate-500 block">
          {{ staticNotes ? 'FROZEN ANALYSIS' : 'Live Detection' }}
        </span>
        <div class="flex items-baseline gap-2">
          <span class="text-3xl font-black text-white font-mono">{{ currentNote || '--' }}</span>
          <button
            v-if=" !staticNotes "
            @click="clearNotes"
            class="text-[9px] text-slate-500 hover:text-red-400 uppercase tracking-wider border border-white/5 px-2 py-1 rounded"
          >Reset</button>
        </div>
      </div>

      <!-- Detected Notes Strip -->
      <div class="flex gap-1 overflow-x-auto max-w-[50%] p-1">
        <div
          v-for=" n in effectiveDetectedNotes "
          :key="n"
          class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
          :class="getWeightColor( n )"
        >
          {{ n }}
        </div>
        <div
          v-if=" effectiveDetectedNotes.length === 0 "
          class="text-[9px] text-slate-600 w-full text-right italic"
        >Play notes...</div>
      </div>
    </div>

    <!-- Main Content Area: Split when Maximized -->
    <div class="flex-1 min-h-0 flex gap-6">
      <!-- Left: Scale List (Takes full width if not maximized) -->
      <div class="flex-1 flex flex-col gap-2 overflow-hidden">
        <div
          class="flex-1 overflow-y-auto bg-slate-900/30 rounded-2xl border border-white/5 p-2 space-y-2 custom-scrollbar"
        >
          <button
            v-for=" scale in effectivePotentialScales "
            :key="scale.name"
            @click="handleScaleClick( scale.name )"
            class="w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left group"
            :class="selectedScale === scale.name ? 'bg-indigo-500/20 border-indigo-500' : 'bg-transparent border-white/5 hover:bg-white/5'"
          >
            <div>
              <div class="text-sm font-bold text-white group-hover:text-indigo-300">{{ scale.name }}</div>
              <div class="text-[9px] text-slate-500 font-mono">{{ scale.notes.join( ' ' ) }}</div>
            </div>
            <div class="flex items-center gap-3">
              <button
                @click.stop="playScale( scale.notes )"
                class="w-8 h-8 rounded-full bg-white/5 hover:bg-emerald-500 hover:text-white flex items-center justify-center text-slate-500 transition-colors"
              >
                ▶
              </button>
              <div class="text-xs font-black text-indigo-500">{{ ( scale.score * 100 ).toFixed( 0 ) }}%</div>
            </div>
          </button>

          <div
            v-if=" effectivePotentialScales.length === 0 "
            class="text-center py-8 opacity-40"
          >
            {{ staticNotes ? 'No scales found.' : 'Listening for pattern...' }}
          </div>
        </div>

        <!-- Fretboard (Always visible for now, or conditionally) -->
        <div
          v-if=" showFretboard "
          class="h-[200px] shrink-0 bg-slate-800/50 rounded-2xl border border-white/5 p-3 overflow-hidden relative"
        >
          <Fretboard
            :active-notes="effectiveDetectedNotes"
            :highlight-notes="scaleNotes"
            :labels="degreeLabels"
            :num-frets="15"
            :fret-range="showCAGED ? cagedRange : undefined"
            :highlights="fretboardHighlights"
          />
        </div>
      </div>

      <!-- Right: Maximized Advanced Controls -->
      <div
        v-if=" isMaximized "
        class="w-80 bg-slate-900/50 rounded-2xl border border-white/5 p-4 flex flex-col animate-fade-in"
      >
        <h3 class="text-xs font-black uppercase tracking-widest text-slate-500 mb-6">Advanced Analysis</h3>

        <div class="space-y-4">
          <!-- Interval Toggle -->
          <div class="flex items-center justify-between">
            <span class="text-sm font-bold text-slate-300">Show Intervals</span>
            <button
              @click="showDegrees = !showDegrees"
              class="w-12 h-6 rounded-full bg-slate-700 relative transition-colors"
              :class="{ 'bg-indigo-500': showDegrees }"
            >
              <div
                class="absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform"
                :class="{ 'translate-x-6': showDegrees }"
              ></div>
            </button>
          </div>

          <!-- CAGED Overlay -->
          <div class="pt-4 border-t border-white/5">
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs font-black uppercase tracking-widest text-slate-500">CAGED System</span>
              <button
                @click="showCAGED = !showCAGED"
                class="text-[10px] font-bold uppercase transition-colors"
                :class="showCAGED ? 'text-indigo-400' : 'text-slate-600 hover:text-white'"
              >{{ showCAGED ? 'Hide' : 'Show' }}</button>
            </div>
            <div
              class="grid grid-cols-5 gap-2"
              :class="{ 'opacity-50 pointer-events-none': !showCAGED }"
            >
              <button
                v-for=" shape in ['C', 'A', 'G', 'E', 'D'] "
                :key="shape"
                @click="selectedCAGEDShape = shape as any"
                class="aspect-square rounded-lg border flex items-center justify-center font-black transition-all text-xs"
                :class="selectedCAGEDShape === shape && showCAGED ? 'bg-indigo-500 border-indigo-400 text-white shadow-lg shadow-indigo-500/20' : 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-400'"
              >
                {{ shape }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
