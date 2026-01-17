<script setup lang="ts">
/**
 * Chord Forge Panel
 * 
 * The embeddable version of Chord Forge, designed to live dynamically
 * inside a ContextDrawer or other containers.
 */

import { ref, computed, watch } from 'vue';
import { Chord } from 'tonal';
import {
  SynthEngine,
  Fretboard,
  Note
} from '@spectralsuite/core';

// --- Props & Emits ---
const props = defineProps<{
  /** Optional: Pre-fill the fretboard with these notes (e.g. ['C3', 'E3', 'G3']) */
  initialNotes?: string[];
  /** Optional: Force a specific instrument, otherwise internal state is used */
  defaultInstrument?: 'guitar' | 'bass' | 'bass5';
  isMaximized?: boolean;
}>();

const emit = defineEmits<{
  ( e: 'update:chord', chordName: string, notes: string[] ): void;
}>();

// --- Configuration State ---
type InstrumentType = 'guitar' | 'bass' | 'bass5';
type TuningPreset = 'standard' | 'dropD' | 'openG' | 'halfStepDown' | 'dadgad';

const selectedInstrument = ref<InstrumentType>( props.defaultInstrument || 'guitar' );
const selectedTuning = ref<TuningPreset>( 'standard' );
const showConfig = ref( false ); // Collapsed by default in panel mode

// --- Fretboard State ---
const stringState = ref<Record<number, number | null>>( {} );

/**
 * Tunings (Mirror of Core/Fretboard)
 */
interface StringConfig { string: number; note: string; octave: number; }
const INSTRUMENT_TUNINGS: Record<InstrumentType, Record<string, StringConfig[]>> = {
  guitar: {
    standard: [{ s: 1, n: 'E', o: 4 }, { s: 2, n: 'B', o: 3 }, { s: 3, n: 'G', o: 3 }, { s: 4, n: 'D', o: 3 }, { s: 5, n: 'A', o: 2 }, { s: 6, n: 'E', o: 2 }].map( x => ( { string: x.s, note: x.n, octave: x.o } ) ),
    dropD: [{ s: 1, n: 'E', o: 4 }, { s: 2, n: 'B', o: 3 }, { s: 3, n: 'G', o: 3 }, { s: 4, n: 'D', o: 3 }, { s: 5, n: 'A', o: 2 }, { s: 6, n: 'D', o: 2 }].map( x => ( { string: x.s, note: x.n, octave: x.o } ) ),
    openG: [{ s: 1, n: 'D', o: 4 }, { s: 2, n: 'B', o: 3 }, { s: 3, n: 'G', o: 3 }, { s: 4, n: 'D', o: 3 }, { s: 5, n: 'G', o: 2 }, { s: 6, n: 'D', o: 2 }].map( x => ( { string: x.s, note: x.n, octave: x.o } ) ),
    dadgad: [{ s: 1, n: 'D', o: 4 }, { s: 2, n: 'A', o: 3 }, { s: 3, n: 'G', o: 3 }, { s: 4, n: 'D', o: 3 }, { s: 5, n: 'A', o: 2 }, { s: 6, n: 'D', o: 2 }].map( x => ( { string: x.s, note: x.n, octave: x.o } ) )
  },
  bass: {
    standard: [{ s: 1, n: 'G', o: 2 }, { s: 2, n: 'D', o: 2 }, { s: 3, n: 'A', o: 1 }, { s: 4, n: 'E', o: 1 }].map( x => ( { string: x.s, note: x.n, octave: x.o } ) ),
    dropD: [{ s: 1, n: 'G', o: 2 }, { s: 2, n: 'D', o: 2 }, { s: 3, n: 'A', o: 1 }, { s: 4, n: 'D', o: 1 }].map( x => ( { string: x.s, note: x.n, octave: x.o } ) )
  },
  bass5: {
    standard: [{ s: 1, n: 'G', o: 2 }, { s: 2, n: 'D', o: 2 }, { s: 3, n: 'A', o: 1 }, { s: 4, n: 'E', o: 1 }, { s: 5, n: 'B', o: 0 }].map( x => ( { string: x.s, note: x.n, octave: x.o } ) )
  }
};

const currentTuning = computed( () => INSTRUMENT_TUNINGS[selectedInstrument.value]?.[selectedTuning.value] || INSTRUMENT_TUNINGS[selectedInstrument.value]?.standard );
const availableTunings = computed( () => Object.keys( INSTRUMENT_TUNINGS[selectedInstrument.value] ) );

// --- Helpers ---
// ============================================================================
// ALTERNATE VOICINGS GENERATOR
// ============================================================================

interface VoicingNote { string: number; fret: number; note: string; }
interface Voicing { id: number; label: string; notes: VoicingNote[]; color: string; }

const activeVoicings = ref<Set<number>>( new Set() );
const VOICING_COLORS = ['#f43f5e', '#06b6d4', '#10b981']; // Rose, Cyan, Emerald

const selectedPitchClasses = computed( () => selectedNotes.value.map( Note.pitchClass ) );

const suggestedVoicings = computed( () => {
  const pitchClasses = selectedPitchClasses.value;
  const tuning = currentTuning.value;
  if ( pitchClasses.length < 3 || !tuning ) return [];

  const voicings: Voicing[] = [];
  const zones = [0, 3, 5, 8, 10];
  const SPAN = 5;

  zones.forEach( startFret => {
    if ( voicings.length >= 3 ) return;
    const currentNotes: VoicingNote[] = [];
    const endFret = startFret + SPAN;
    const coveredPitches = new Set<string>();

    for ( const s of tuning ) {
      for ( let f = startFret; f <= endFret; f++ ) {
        if ( f >= 15 ) continue; // Cap at 15 for panel
        const noteName = getNoteAtFret( s.string, f );
        const pc = Note.pitchClass( noteName || '' );
        if ( pitchClasses.includes( pc ) ) {
          currentNotes.push( { string: s.string, fret: f, note: noteName } );
          coveredPitches.add( pc );
          break;
        }
      }
    }

    const isComplete = pitchClasses.every( pc => coveredPitches.has( pc ) );
    if ( isComplete && currentNotes.length >= 3 ) {
      const isTwice = currentNotes.every( n => stringState.value[n.string] === n.fret );
      const isDuplicate = voicings.some( v =>
        v.notes.length === currentNotes.length &&
        v.notes.every( ( vn, i ) => vn.string === currentNotes[i]?.string && vn.fret === currentNotes[i]?.fret )
      );

      if ( !isTwice && !isDuplicate ) {
        const id = voicings.length + 1;
        voicings.push( {
          id,
          label: `Alt ${id}`,
          notes: currentNotes,
          color: VOICING_COLORS[( id - 1 ) % VOICING_COLORS.length] || '#ffffff'
        } );
      }
    }
  } );
  return voicings;
} );

const toggleVoicing = ( id: number ) => {
  const v = suggestedVoicings.value.find( v => v.id === id );
  if ( !v ) return;

  if ( activeVoicings.value.has( id ) ) {
    activeVoicings.value.delete( id );
    // Clear only these notes
    v.notes.forEach( n => {
      if ( stringState.value[n.string] === n.fret ) stringState.value[n.string] = null;
    } );
  } else {
    activeVoicings.value.clear();
    activeVoicings.value.add( id );
    v.notes.forEach( n => { stringState.value[n.string] = n.fret; } );
  }
};

const fretboardHighlights = computed( () => {
  const highlights: Array<{ string: number; fret: number; color?: string }> = [];
  activeVoicings.value.forEach( id => {
    const v = suggestedVoicings.value.find( v => v.id === id );
    if ( v ) {
      v.notes.forEach( n => {
        highlights.push( { string: n.string, fret: n.fret, color: v.color } );
      } );
    }
  } );
  return highlights;
} );
const getNoteAtFret = ( stringNum: number, fret: number ): string => {
  const tuning = currentTuning.value;
  if ( !tuning ) return '';
  const s = tuning.find( t => t.string === stringNum );
  if ( !s ) return '';
  const openMidi = Note.midi( `${s.note}${s.octave}` );
  if ( openMidi === null ) return '';
  return Note.fromMidi( openMidi + fret ) || '';
};

const initStringState = () => {
  const newState: Record<number, number | null> = {};
  currentTuning.value?.forEach( s => newState[s.string] = null );
  stringState.value = newState;
};

// --- Initialization Logic ---
// We need to map initialNotes (e.g. "C3", "E3") to frets on the current tuning
const mapNotesToFretboard = ( notes: string[] ) => {
  initStringState();
  if ( !notes || notes.length === 0 ) return;

  // Simple greedy algorithm: find the lowest fret for each note on available strings
  // Enhanced to handle pitch classes (e.g. "C") by trying default octaves (3, 4)
  const getPossibleMidis = ( note: string ): number[] => {
    const raw = Note.midi( note );
    if ( raw !== null ) return [raw];
    // If no octave, try 3 and 4
    return [Note.midi( `${note}3` ), Note.midi( `${note}4` )].filter( ( m ): m is number => m !== null );
  };

  const noteObjs = notes.flatMap( n => {
    const midis = getPossibleMidis( String( n ) );
    return midis.map( m => ( { note: n, midi: m } ) );
  } );

  // For each note, find a home
  noteObjs.forEach( n => {
    let bestString = -1;
    let bestFret = 99;

    currentTuning.value?.forEach( s => {
      const openMidi = Note.midi( `${s.note}${s.octave}` );
      if ( openMidi !== null && n.midi! >= openMidi ) {
        const fret = n.midi! - openMidi;
        // Prefer lower frets (< 15) and strings that are empty
        if ( fret <= 15 && fret < bestFret && stringState.value[s.string] === null ) {
          bestFret = fret;
          bestString = s.string;
        }
      }
    } );

    if ( bestString !== -1 ) {
      stringState.value[bestString] = bestFret;
    }
  } );
};

watch( () => props.initialNotes, ( newNotes ) => {
  if ( newNotes ) mapNotesToFretboard( newNotes );
}, { immediate: true } );

watch( selectedInstrument, () => {
  initStringState();
  // If instrument changes, we technically lose the voicing unless we re-map. 
  // For now, reset is safer.
} );

// --- Computed Audio/Theory ---
const selectedNotes = computed( () => {
  const notes: { name: string, midi: number }[] = [];
  currentTuning.value?.forEach( s => {
    const f = stringState.value[s.string];
    if ( f !== null && f !== undefined ) {
      const name = getNoteAtFret( s.string, f );
      notes.push( { name, midi: Note.midi( name ) || 0 } );
    }
  } );
  return notes.sort( ( a, b ) => a.midi - b.midi ).map( n => n.name );
} );

const detectedChord = computed( () => {
  if ( selectedNotes.value.length < 2 ) return '';
  const pitchClasses = selectedNotes.value.map( Note.pitchClass );
  const detections = Chord.detect( pitchClasses );
  return detections.length > 0 ? detections[0] : '';
} );

// --- Actions ---
const handleFretClick = ( s: number, f: number ) => {
  if ( stringState.value[s] === f ) stringState.value[s] = null;
  else {
    stringState.value[s] = f;
    // Audit note
    const note = getNoteAtFret( s, f );
    SynthEngine.getInstance().playNote( Note.freq( note ) || 440, 500, 0.3 );
  }
  emit( 'update:chord', detectedChord.value || '', selectedNotes.value );
};

const strum = () => {
  if ( selectedNotes.value.length === 0 ) return;
  const synth = SynthEngine.getInstance();
  selectedNotes.value.forEach( ( n, i ) => {
    setTimeout( () => synth.playNote( Note.freq( n || '' ) || 440, 800, 0.2 ), i * 40 );
  } );
};

const clear = () => {
  initStringState();
  emit( 'update:chord', '', [] );
};

</script>

<template>
  <div class="chord-forge-panel h-full flex flex-col">
    <!-- Top Controls: Config Toggle & Strum -->
    <div class="flex items-center justify-between mb-6 px-2">
      <div class="flex items-center gap-3">
        <button
          @click="showConfig = !showConfig"
          class="w-10 h-10 rounded-xl border flex items-center justify-center transition-all"
          :class="showConfig ? 'bg-amber-500 border-amber-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'"
          title="Instrument Config"
        >
          <span class="text-sm">⚒️</span>
        </button>
        <div
          v-if=" detectedChord "
          class="flex flex-col"
        >
          <span class="text-[9px] font-black uppercase text-amber-500 tracking-widest">Detected</span>
          <span class="text-2xl font-black text-white italic tracking-tighter leading-none">{{ detectedChord }}</span>
        </div>
      </div>

      <div class="flex gap-2">
        <button
          @click="clear"
          class="px-3 py-2 rounded-lg text-[10px] font-bold uppercase text-slate-500 hover:text-white transition-colors"
        >Clear</button>
        <button
          @click="strum"
          class="px-6 py-2 rounded-full bg-amber-500 text-white font-black uppercase tracking-widest text-xs shadow-lg shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all"
        >
          Strum
        </button>
      </div>
    </div>

    <!-- Configuration Panel (Expandable) -->
    <!-- Simplified for panel usage: just compact selects -->
    <div
      v-if=" showConfig "
      class="mb-6 p-4 rounded-2xl bg-slate-800/50 border border-white/5 grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2"
    >
      <div>
        <label class="text-[9px] uppercase font-bold text-slate-500 block mb-2">Instrument</label>
        <div class="flex flex-col gap-1">
          <button
            v-for=" i in ['guitar', 'bass'] "
            :key="i"
            @click="selectedInstrument = i as any"
            class="px-3 py-2 rounded-lg text-left text-xs font-bold transition-all"
            :class="selectedInstrument === i ? 'bg-amber-500/20 text-amber-400' : 'text-slate-400 hover:bg-white/5'"
          >{{ i.charAt( 0 ).toUpperCase() + i.slice( 1 ) }}</button>
        </div>
      </div>
      <div>
        <label class="text-[9px] uppercase font-bold text-slate-500 block mb-2">Tuning</label>
        <div class="flex flex-col gap-1">
          <button
            v-for=" t in availableTunings.slice( 0, 3 ) "
            :key="t"
            @click="selectedTuning = t as any"
            class="px-3 py-2 rounded-lg text-left text-xs font-bold transition-all"
            :class="selectedTuning === t ? 'bg-sky-500/20 text-sky-400' : 'text-slate-400 hover:bg-white/5'"
          >{{ t }}</button>
        </div>
      </div>
    </div>

    <!-- Fretboard Area -->
    <!-- Fretboard Area -->
    <div class="flex-1 overflow-hidden relative flex gap-6">
      <div class="flex-1 bg-slate-900/50 rounded-2xl border border-white/5 p-4 overflow-hidden relative">
        <Fretboard
          :instrument="selectedInstrument"
          :tuning-preset="selectedTuning"
          :selected-frets="stringState"
          :interactive="true"
          :highlights="fretboardHighlights"
          @fret-click="handleFretClick"
        />
      </div>

      <!-- Maximized Content: Suggested Voicings -->
      <div
        v-if=" isMaximized "
        class="w-60 bg-slate-900/50 rounded-2xl border border-white/5 p-4 flex flex-col animate-fade-in shrink-0"
      >
        <h3 class="text-xs font-black uppercase tracking-widest text-slate-500 mb-4">Suggested Voicings</h3>

        <div
          v-if=" suggestedVoicings.length > 0 "
          class="flex flex-col gap-3"
        >
          <button
            v-for=" voicing in suggestedVoicings "
            :key="voicing.id"
            @click="toggleVoicing( voicing.id )"
            class="px-4 py-3 rounded-xl border flex items-center justify-between transition-all hover:scale-105 active:scale-95 text-left"
            :class="activeVoicings.has( voicing.id )
              ? 'bg-slate-800 border-transparent shadow-lg'
              : 'bg-transparent border-white/10 hover:border-white/20'"
            :style="{
              borderColor: activeVoicings.has( voicing.id ) ? voicing.color : undefined,
              boxShadow: activeVoicings.has( voicing.id ) ? `0 0 10px ${voicing.color}20` : undefined
            }"
          >
            <span
              class="text-xs font-bold uppercase tracking-wider"
              :class="activeVoicings.has( voicing.id ) ? 'text-white' : 'text-slate-400'"
            >
              {{ voicing.label }}
            </span>
            <div
              class="w-2 h-2 rounded-full shadow-sm"
              :style="{ backgroundColor: voicing.color }"
            ></div>
          </button>
        </div>
        <div
          v-else
          class="flex-1 flex items-center justify-center text-slate-600 text-[10px] font-bold italic text-center px-4"
        >
          Build a Triad (3+ notes) to see alternates.
        </div>
      </div>
    </div>
  </div>
</template>
