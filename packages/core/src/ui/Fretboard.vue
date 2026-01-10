<script setup lang="ts">
/**
 * Fretboard Component
 * 
 * A high-precision visual representation of a guitar fretboard.
 * It maps musical notes onto a 24-fret matrix and supports multilayered 
 * highlighting for played notes, scale patterns, and audio playback.
 */
import { computed } from 'vue';
import { Note } from 'tonal';

/**
 * Prop Definitions
 * 
 * @param activeNotes - Notes currently detected from the user's input (Sky Blue)
 * @param highlightNotes - Theoretical notes from a selected scale/mode (Emerald)
 * @param numFrets - The total number of frets to display (Standard Pro = 24)
 * @param labels - Dictionary mapping notes to custom text (e.g., Roman Numerals)
 * @param fretRange - [start, end] tuple to visually isolate a specific area (CAGED)
 * @param playbackNote - The note currently being played by the SynthEngine (Amber)
 */
interface Props {
  activeNotes?: string[];
  highlightNotes?: string[];
  numFrets?: number;
  labels?: Record<string, string>;
  fretRange?: [number, number];
  playbackNote?: string;
}

const props = withDefaults( defineProps<Props>(), {
  activeNotes: () => [],
  highlightNotes: () => [],
  numFrets: 24,
  labels: () => ( {} )
} );

// Standard 6-string guitar tuning in E Standard: E2, A2, D3, G3, B3, E4
const strings = ['E', 'B', 'G', 'D', 'A', 'E'];

// The chromatic sequence used to calculate notes along a string
const noteOrder = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

/**
 * Fretboard Geography:
 * Fret markers (the dots) are traditionally placed on odd frets,
 * with double dots at the 12th and 24th frets (the octaves).
 */
const fretMarkers = [3, 5, 7, 9, 12, 15, 17, 19, 21, 23, 24];
const doubleDotFrets = [12, 24];

/**
 * We use computed sets for "Chromas" (pitch classes 0-11).
 * This ensures that "C#" and "Db" are treated as the same visual note
 * on the fretboard (Enharmonic equivalence).
 */
const activeChromas = computed( () => new Set( props.activeNotes.map( n => Note.chroma( n ) ) ) );
const highlightChromas = computed( () => new Set( props.highlightNotes.map( n => Note.chroma( n ) ) ) );

// --- Helper Functions for Styling ---

const isNoteActive = ( note: string ) => activeChromas.value.has( Note.chroma( note ) );
const isNoteHighlighted = ( note: string ) => highlightChromas.value.has( Note.chroma( note ) );

// PlaybackNote has the highest priority and uses the Amber glow
const isPlaybackNote = ( note: string ) => props.playbackNote && Note.chroma( note ) === Note.chroma( props.playbackNote );

// Special check for open strings (Fret 0)
const isOpenActive = ( stringRoot: string ) => isNoteActive( getNoteAt( stringRoot, 0 ) );
const isOpenHighlighted = ( stringRoot: string ) => isNoteHighlighted( getNoteAt( stringRoot, 0 ) );

/**
 * Resolves the text to display inside a note bubble.
 * If a custom label (like a Roman Numeral) is provided, we use that.
 */
const getLabel = ( note: string ) => {
  const chroma = Note.chroma( note );
  const labelKey = Object.keys( props.labels ).find( k => Note.chroma( k ) === chroma );
  return ( labelKey && props.labels[labelKey] ) ? props.labels[labelKey] : note;
};

/**
 * Calculates the note name for a specific fret on a specific string.
 * @param stringRoot - The open note of the string (e.g., "E")
 * @param fret - The fret number (0 to 24)
 */
const getNoteAt = ( stringRoot: string, fret: number ): string => {
  const rootIndex = noteOrder.indexOf( stringRoot );
  if ( rootIndex === -1 ) return '';
  // Each fret is one semi-tone (one step in the noteOrder array)
  return noteOrder[( rootIndex + fret ) % 12]!;
};

/**
 * Isolation Filter:
 * Checks if a fret is within the active CAGED range.
 */
const isInsideRange = ( fret: number ) => {
  if ( !props.fretRange ) return true; // No range = show everything
  const [min, max] = props.fretRange;
  return fret >= min && fret <= max;
};
</script>

<template>
  <div class="bg-slate-900 p-12 rounded-2xl border border-slate-700 overflow-x-auto overflow-y-hidden">
    <!-- Fretboard Container -->
    <div
      class="relative inline-block bg-slate-800 rounded-lg p-4 border-2 border-slate-700"
      :style="{ width: ( numFrets * 54 + 40 ) + 'px', minHeight: '340px' }"
    >
      <!-- Fret numbers row - NOW INSIDE THE BOARD -->
      <div class="flex mb-4 relative z-40">
        <div
          v-for=" fret in numFrets "
          :key="'fret-num-' + fret"
          class="text-center text-[10px] font-mono font-black"
          :class="fretMarkers.includes( fret ) ? 'text-sky-400' : 'text-slate-600'"
          style="width: 54px;"
        >
          {{ fret }}
        </div>
      </div>

      <!-- Nut (left edge) - Aligned to padding -->
      <div
        class="absolute top-16 bottom-4 bg-slate-100 rounded-sm z-30"
        style="left: 16px; width: 4px; box-shadow: 0 0 10px rgba(255,255,255,0.5);"
      ></div>

      <!-- Fret wires (vertical) -->
      <div
        v-for=" fret in numFrets "
        :key="'fret-wire-' + fret"
        class="absolute top-16 bottom-4 z-20"
        :style="{
          left: ( 16 + fret * 54 ) + 'px',
  width: '3px',
  background: '#e2e8f0',
  boxShadow: '0 0 4px rgba(255,255,255,0.2)'
        }"
      ></div>

      <!-- Fret marker dots -->
      <div class="absolute inset-0 flex items-center pointer-events-none z-10">
        <div
          v-for=" fret in numFrets "
          :key="'marker-' + fret"
          class="absolute flex items-center justify-center h-full"
          :style="{ left: ( 16 + ( fret - 1 ) * 54 ) + 'px', width: '54px' }"
        >
          <!-- Single dot -->
          <div v-if=" fretMarkers.includes( fret ) && !doubleDotFrets.includes( fret ) ">
            <div class="w-5 h-5 rounded-full bg-slate-500 shadow-inner"></div>
          </div>
          <!-- Double dots -->
          <div
            v-if=" doubleDotFrets.includes( fret ) "
            class="flex flex-col gap-24"
          >
            <div class="w-5 h-5 rounded-full bg-slate-500 shadow-inner"></div>
            <div class="w-5 h-5 rounded-full bg-slate-500 shadow-inner"></div>
          </div>
        </div>
      </div>

      <!-- Strings (horizontal) -->
      <div class="relative space-y-8 pb-6 pt-4">
        <div
          v-for=" ( stringRoot, sIdx ) in strings "
          :key="'string-' + sIdx"
          class="relative flex items-center h-6"
        >
          <!-- String label - Now with 'Pro Selected' state -->
          <div
            class="absolute text-sm font-mono font-black transition-all duration-300 px-2 py-1 rounded-md z-30 flex items-center justify-center"
            :class="[
              isOpenActive( stringRoot )
                ? 'bg-sky-500 text-white shadow-[0_0_20px_rgba(56,189,248,0.8)] ring-2 ring-sky-300 scale-110'
                : isOpenHighlighted( stringRoot )
                  ? 'bg-emerald-600/40 text-emerald-100 border border-emerald-400/50 scale-105 backdrop-blur-sm'
                  : 'bg-slate-900/40 text-slate-500 border border-slate-700/50'
            ]"
            style="left: -58px; min-width: 44px; transform-origin: center;"
          >
            {{ getLabel( getNoteAt( stringRoot, 0 ) ) }}
          </div>

          <!-- String line (horizontal) - SOLID, THICK, HIGH CONTRAST -->
          <div
            class="absolute bg-slate-300 rounded-full z-10"
            :style="{
              left: 0,
              right: 0,
              height: ( 2 + ( 5 - sIdx ) * 0.6 ) + 'px',
              top: '50%',
              transform: 'translateY(-50%)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.5)'
            }"
          ></div>

          <!-- Note positions along this string -->
          <div class="relative flex w-full z-20">
            <!-- Fretted positions (Fret 0 shifted to the label) -->

            <!-- Fretted positions -->
            <div
              v-for=" fret in numFrets "
              :key="'note-' + sIdx + '-' + fret"
              class="flex items-center justify-center"
              style="width: 54px;"
            >
              <div
                class="rounded-full flex items-center justify-center text-xs font-black transition-all duration-200 cursor-pointer"
                :class="[
  isPlaybackNote( getNoteAt( stringRoot, fret ) ) && isInsideRange( fret )
    ? 'w-10 h-10 bg-amber-400 text-slate-900 shadow-[0_0_30px_rgba(251,191,36,1)] border-4 border-amber-200 scale-125 z-50'
    : isNoteActive( getNoteAt( stringRoot, fret ) ) && isInsideRange( fret )
      ? 'w-8 h-8 bg-sky-500 text-white shadow-[0_0_20px_rgba(56,189,248,1)] border-2 border-sky-200'
      : isNoteHighlighted( getNoteAt( stringRoot, fret ) ) && isInsideRange( fret )
        ? 'w-7 h-7 bg-emerald-600 text-white border-2 border-emerald-400 hover:scale-110'
        : 'w-5 h-5 opacity-0 hover:opacity-50 hover:bg-slate-500'
                ]"
              >
                <span
                  v-if=" ( isPlaybackNote( getNoteAt( stringRoot, fret ) ) || isNoteActive( getNoteAt( stringRoot, fret ) ) || isNoteHighlighted( getNoteAt( stringRoot, fret ) ) ) && isInsideRange( fret ) "
                >
                  {{ getLabel( getNoteAt( stringRoot, fret ) ) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Legend -->
    <div class="mt-6 flex items-center justify-center gap-8 text-sm">
      <div class="flex items-center gap-2">
        <div class="w-6 h-6 rounded-full bg-sky-500 border-2 border-sky-200 shadow-lg"></div>
        <span class="text-slate-300 font-mono">Played Notes</span>
      </div>
      <div class="flex items-center gap-2">
        <div class="w-6 h-6 rounded-full bg-emerald-600 border-2 border-emerald-400 shadow-lg"></div>
        <span class="text-slate-300 font-mono">Scale Notes</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
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
</style>
