<script setup lang="ts">
/**
 * Chord Forge Module
 * 
 * An interactive fretboard tool for building chords by tapping notes.
 * Supports multiple instruments (guitar, bass) and alternate tunings.
 * 
 * @module modules/chordforge/ChordForgeModule.vue
 */

import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { Chord } from 'tonal';
import {
  SynthEngine,
  useAudioEngine,
  useGlobalEngine,
  Fretboard,
  Note
} from '@spectralsuite/core';
import { useToolInfo } from '../../composables/useToolInfo';
import LocalSettingsDrawer from '../../components/settings/LocalSettingsDrawer.vue';
import SettingsToggle from '../../components/settings/SettingsToggle.vue';
import EngineSettings from '../../components/settings/EngineSettings.vue';

const emit = defineEmits<{ ( e: 'back' ): void }>();
const { openInfo } = useToolInfo();
const { activate, deactivate } = useAudioEngine();

const showConfig = ref( true );

const drawerCategories = computed( () => [
  {
    id: 'General',
    label: 'General',
    description: 'View Options',
    icon: '👁️'
  },
  {
    id: 'Engine',
    label: 'Engine',
    description: 'Global Audio Processing',
    showIndicator: useGlobalEngine().isGlobalEngineActive.value
  }
] );

onMounted( () => activate() );
onUnmounted( () => deactivate() );

// ============================================================================
// INSTRUMENT & TUNING CONFIGURATIONS (mirror of Fretboard.vue)
// ============================================================================

type InstrumentType = 'guitar' | 'bass' | 'bass5';
type TuningPreset = 'standard' | 'dropD' | 'openG' | 'halfStepDown' | 'dadgad';

interface StringConfig {
  string: number;
  note: string;
  octave: number;
}

/**
 * Tunings for each instrument.
 * This must stay in sync with Fretboard.vue.
 */
const INSTRUMENT_TUNINGS: Record<InstrumentType, Record<string, StringConfig[]>> = {
  guitar: {
    standard: [
      { string: 1, note: 'E', octave: 4 },
      { string: 2, note: 'B', octave: 3 },
      { string: 3, note: 'G', octave: 3 },
      { string: 4, note: 'D', octave: 3 },
      { string: 5, note: 'A', octave: 2 },
      { string: 6, note: 'E', octave: 2 }
    ],
    dropD: [
      { string: 1, note: 'E', octave: 4 },
      { string: 2, note: 'B', octave: 3 },
      { string: 3, note: 'G', octave: 3 },
      { string: 4, note: 'D', octave: 3 },
      { string: 5, note: 'A', octave: 2 },
      { string: 6, note: 'D', octave: 2 }
    ],
    openG: [
      { string: 1, note: 'D', octave: 4 },
      { string: 2, note: 'B', octave: 3 },
      { string: 3, note: 'G', octave: 3 },
      { string: 4, note: 'D', octave: 3 },
      { string: 5, note: 'G', octave: 2 },
      { string: 6, note: 'D', octave: 2 }
    ],
    halfStepDown: [
      { string: 1, note: 'Eb', octave: 4 },
      { string: 2, note: 'Bb', octave: 3 },
      { string: 3, note: 'Gb', octave: 3 },
      { string: 4, note: 'Db', octave: 3 },
      { string: 5, note: 'Ab', octave: 2 },
      { string: 6, note: 'Eb', octave: 2 }
    ],
    dadgad: [
      { string: 1, note: 'D', octave: 4 },
      { string: 2, note: 'A', octave: 3 },
      { string: 3, note: 'G', octave: 3 },
      { string: 4, note: 'D', octave: 3 },
      { string: 5, note: 'A', octave: 2 },
      { string: 6, note: 'D', octave: 2 }
    ]
  },
  bass: {
    standard: [
      { string: 1, note: 'G', octave: 2 },
      { string: 2, note: 'D', octave: 2 },
      { string: 3, note: 'A', octave: 1 },
      { string: 4, note: 'E', octave: 1 }
    ],
    dropD: [
      { string: 1, note: 'G', octave: 2 },
      { string: 2, note: 'D', octave: 2 },
      { string: 3, note: 'A', octave: 1 },
      { string: 4, note: 'D', octave: 1 }
    ]
  },
  bass5: {
    standard: [
      { string: 1, note: 'G', octave: 2 },
      { string: 2, note: 'D', octave: 2 },
      { string: 3, note: 'A', octave: 1 },
      { string: 4, note: 'E', octave: 1 },
      { string: 5, note: 'B', octave: 0 }
    ]
  }
};

// ============================================================================
// STATE
// ============================================================================

const isSettingsOpen = ref( false );

/** Current instrument */
const selectedInstrument = ref<InstrumentType>( 'guitar' );

/** Current tuning preset */
const selectedTuning = ref<TuningPreset>( 'standard' );

/** Fret selections per string */
const stringState = ref<Record<number, number | null>>( {} );

/**
 * Initialize stringState based on current instrument's string count.
 */
const initStringState = () => {
  const tuning = currentTuning.value;
  if ( !tuning ) return;
  const newState: Record<number, number | null> = {};
  tuning.forEach( s => {
    newState[s.string] = null;
  } );
  stringState.value = newState;
};

// ============================================================================
// COMPUTED
// ============================================================================

/** Get current tuning configuration */
const currentTuning = computed( () => {
  const tunings = INSTRUMENT_TUNINGS[selectedInstrument.value];
  return tunings?.[selectedTuning.value] || tunings?.standard || [];
} );

/** Available tuning presets for current instrument */
const availableTunings = computed( () => {
  return Object.keys( INSTRUMENT_TUNINGS[selectedInstrument.value] );
} );

/** Human-readable tuning names */
const tuningLabels: Record<string, string> = {
  standard: 'Standard',
  dropD: 'Drop D',
  openG: 'Open G',
  halfStepDown: '½ Step Down',
  dadgad: 'DADGAD'
};

/** Human-readable instrument names */
const instrumentLabels: Record<InstrumentType, string> = {
  guitar: '🎸 Guitar',
  bass: '🎸 Bass (4)',
  bass5: '🎸 Bass (5)'
};

// ============================================================================
// WATCH - Reset string state on instrument/tuning change
// ============================================================================

watch( [selectedInstrument, selectedTuning], ( [newInst, _newTun], [oldInst, _oldTun] ) => {
  // Only reset string state if instrument changed (different string count/layout)
  // or if it's the first run (oldInst is undefined)
  if ( !oldInst || newInst !== oldInst ) {
    initStringState();
  }

  // Reset to standard if current tuning not available for new instrument
  if ( !availableTunings.value.includes( selectedTuning.value ) ) {
    selectedTuning.value = 'standard';
  }
}, { immediate: true } );

// ============================================================================
// CHORD DETECTION
// ============================================================================

const getNoteAtFret = ( stringNum: number, fret: number ): string => {
  const tuning = currentTuning.value;
  if ( !tuning ) return '';
  const stringInfo = tuning.find( s => s.string === stringNum );
  if ( !stringInfo ) return '';

  const openNote = `${stringInfo.note}${stringInfo.octave}`;
  const openMidi = Note.midi( openNote );

  if ( openMidi !== null ) {
    const newNote = Note.fromMidi( openMidi + fret );
    return newNote || openNote;
  }

  return openNote;
};

const getPitchClass = ( noteWithOctave: string ): string => {
  return Note.pitchClass( noteWithOctave ) || '';
};

/**
 * Selected notes sorted by actual pitch (MIDI value) ascending.
 * The FIRST note in this array is the TRUE BASS note.
 * 
 * We calculate the MIDI value for each selected fret and sort by that.
 */
const selectedNotes = computed( () => {
  const noteObjects: { note: string; midi: number }[] = [];
  const tuning = currentTuning.value;
  if ( !tuning ) return [];

  for ( const string of tuning ) {
    const fret = stringState.value[string.string];
    if ( fret !== null && fret !== undefined ) {
      const noteName = getNoteAtFret( string.string, fret );
      const midi = Note.midi( noteName ) || 0;
      noteObjects.push( { note: noteName, midi } );
    }
  }

  // Sort by MIDI value (Low -> High)
  noteObjects.sort( ( a, b ) => a.midi - b.midi );

  return noteObjects.map( n => n.note );
} );

const selectedPitchClasses = computed( () => {
  const classes = new Set<string>();
  selectedNotes.value.forEach( note => {
    const pc = getPitchClass( note );
    if ( pc ) classes.add( pc );
  } );
  return Array.from( classes );
} );

/**
 * Hybrid Chord Detection with Fallback
 * 
 * **Strategy:**
 * 1. Try Chord.detect() with all pitch classes
 * 2. If no match, try with each note as potential root (inversions)
 * 3. If still no match, display as pitch class set {C, E, G}
 * 
 * Never returns "Unknown" - always provides meaningful info.
 */
const detectedChord = computed( () => {
  const pitches = selectedPitchClasses.value;
  if ( pitches.length < 2 ) return '';

  const originalBass = pitches[0];
  const candidates: Array<{ name: string; root: string; quality: string }> = [];

  // Try all rotations to find the underlying chord structure
  for ( let i = 0; i < pitches.length; i++ ) {
    const rotated = [...pitches.slice( i ), ...pitches.slice( 0, i )];
    const detections = Chord.detect( rotated );

    if ( detections.length > 0 ) {
      // Tonal returns multiple names, take the first (usually most common)
      const name = detections[0]!;
      // Extract the root from the chord name (e.g. "C#m7" -> "C#")
      // We look for note name at start of string
      const rootMatch = name.match( /^[A-G](?:#|b)?/ );
      const root = rootMatch ? rootMatch[0] : rotated[0];

      candidates.push( { name, root: root!, quality: name } );
    }
  }

  if ( candidates.length === 0 ) {
    // Fallback: Pitch class set
    return `{${pitches.join( ', ' )}}`;
  }

  // Sort candidates to find the "best" name
  // 1. Prefer names that are shorter (e.g. "C" over "Cmaj7no5")
  // 2. Prefer standard qualities (Maj, m, 7) over extended ones
  candidates.sort( ( a, b ) => {
    return a.name.length - b.name.length;
  } );

  const bestMatch = candidates[0];
  if ( !bestMatch ) return `{${pitches.join( ', ' )}}`;

  // If the chord root isn't the bass note, show as slash chord
  // E.g. Found "C" (root C), but bass is E -> "C/E"
  if ( bestMatch.root !== originalBass ) {
    return `${bestMatch.name}/${originalBass}`;
  }

  return bestMatch.name;
} );

const bassNote = computed( () => {
  if ( selectedNotes.value.length === 0 ) return '';
  const firstNote = selectedNotes.value[0];
  return firstNote ? getPitchClass( firstNote ) : '';
} );

// ============================================================================
// INTERACTION HANDLERS
// ============================================================================

const handleFretClick = ( stringNum: number, fret: number ) => {
  const currentFret = stringState.value[stringNum];

  if ( currentFret === fret ) {
    stringState.value[stringNum] = null;
  } else {
    stringState.value[stringNum] = fret;
    const note = getNoteAtFret( stringNum, fret );
    const freq = Note.freq( note );
    console.log( `[ChordForge] Clicked String ${stringNum} Fret ${fret} -> ${note} (${freq}Hz)` );

    if ( freq ) {
      // Single note click: Volume 0.3
      SynthEngine.getInstance().playNote( freq, 500, 0.3 );
    }
  }
};

const handleNutClick = ( stringNum: number ) => {
  const currentFret = stringState.value[stringNum];
  stringState.value[stringNum] = currentFret === null ? 0 : null;
};

const playChord = () => {
  if ( selectedNotes.value.length === 0 ) return;
  console.log( '[ChordForge] Strumming:', selectedNotes.value );

  const synth = SynthEngine.getInstance();
  // Preventing clipping: Scale volume by note count
  // 6 notes -> ~0.12 per note. 1 note -> 0.3 per note.
  const chordVol = Math.min( 0.3, 0.7 / selectedNotes.value.length );

  selectedNotes.value.forEach( ( note, idx ) => {
    const freq = Note.freq( note );
    if ( freq ) {
      // Strum with slightly more spacing and duration
      setTimeout( () => synth.playNote( freq, 600, chordVol ), idx * 50 );
    }
  } );
};

const clearAll = () => {
  initStringState();
  activeVoicings.value = new Set();
};

const shiftFrets = ( delta: number ) => {
  const newState = { ...stringState.value };
  Object.keys( newState ).forEach( key => {
    const k = Number( key );
    const val = newState[k];
    if ( val !== null && val !== undefined && val >= 0 ) {
      const newVal = val + delta;
      // Keep within bounds (0-24)
      if ( newVal >= 0 && newVal <= 24 ) {
        newState[k] = newVal;
      }
    }
  } );
  stringState.value = newState;
};

// ============================================================================
// ALTERNATE VOICINGS GENERATOR
// ============================================================================

interface VoicingNote { string: number; fret: number; note: string; }
interface Voicing { id: number; label: string; notes: VoicingNote[]; color: string; }

const activeVoicings = ref<Set<number>>( new Set() );

const VOICING_COLORS = ['#f43f5e', '#06b6d4', '#10b981']; // Rose, Cyan, Emerald

/**
 * Generates playable voicings for the currently detected pitch classes.
 * Uses a "Zone" based search strategy (CAGED-like) to find valid shapes.
 */
const suggestedVoicings = computed( () => {
  const pitchClasses = selectedPitchClasses.value;
  const tuning = currentTuning.value;
  if ( pitchClasses.length < 3 || !tuning ) return [];

  const voicings: Voicing[] = [];
  
  // Define search zones (start fret)
  const zones = [0, 3, 5, 8, 10]; 
  const SPAN = 5; // Relaxed span to find more shapes

  zones.forEach( startFret => {
    if ( voicings.length >= 3 ) return;

    const currentNotes: VoicingNote[] = [];
    const endFret = startFret + SPAN;
    const coveredPitches = new Set<string>();

    // For each string, try to find a note in the zone that belongs to the chord
    for ( const s of tuning ) {
      // Check frets in range [startFret, endFret]
      const MAX_SEARCH_FRET = 15;
      for ( let f = startFret; f <= endFret; f++ ) {
        if ( f >= MAX_SEARCH_FRET ) continue;
        
        const noteName = getNoteAtFret( s.string, f );
        const pc = getPitchClass( noteName );
        
        if ( pitchClasses.includes( pc ) ) {
          // Found a candidate note. 
          currentNotes.push( { string: s.string, fret: f, note: noteName } );
          coveredPitches.add( pc );
          break; // One note per string maximum
        }
      }
    }

    // Validation
    const isComplete = pitchClasses.every( pc => coveredPitches.has( pc ) );
    
    if ( isComplete && currentNotes.length >= 3 ) {
      const isTwice = currentNotes.every( n => stringState.value[n.string] === n.fret );
      const isDuplicate = voicings.some( v => 
        v.notes.length === currentNotes.length && 
        v.notes.every( ( vn, i ) => vn.string === currentNotes[i]?.string && vn.fret === currentNotes[i]?.fret )
      );

      if ( !isTwice && !isDuplicate ) {
        // Push with unique ID
        const id = voicings.length + 1; // 1-based IDs for safety
        voicings.push( {
          id,
          label: `Alt ${id}`,
          notes: currentNotes,
          color: VOICING_COLORS[(id - 1) % VOICING_COLORS.length] || '#ffffff'
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
    // Optional: Could clear the board, but maybe user wants to keep the notes?
    // Let's clear ONLY the notes that match this voicing to be truly "togglable"
    v.notes.forEach( n => {
      if ( stringState.value[n.string] === n.fret ) {
        stringState.value[n.string] = null;
      }
    } );
  } else {
    // Clear other active voicings to avoid confusion
    activeVoicings.value.clear();
    activeVoicings.value.add( id );

    // Apply this voicing to the board
    v.notes.forEach( n => {
      stringState.value[n.string] = n.fret;
    } );
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
</script>

<template>
  <div class="min-h-screen bg-spectral-950 text-white">
    <!-- Header -->
    <header class="sticky top-0 z-20 bg-spectral-950/80 backdrop-blur-xl border-b border-white/5">
      <div class="container mx-auto px-6 py-4 flex justify-between items-center">
        <div class="flex items-center gap-4">
          <button
            @click="emit( 'back' )"
            class="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all"
          >
            ←
          </button>
          <div>
            <h1 class="text-2xl font-black text-white italic tracking-tighter flex items-center gap-2">
              <span class="text-amber-500">⚒️</span> Chord <span class="text-amber-500 underline decoration-orange-500/50">Forge</span>
            </h1>
            <p class="text-[10px] text-slate-500 font-medium uppercase tracking-widest">
              {{ instrumentLabels[selectedInstrument] }} • {{ tuningLabels[selectedTuning] || selectedTuning }}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-4">
          <SettingsToggle :isOpen="isSettingsOpen" @click="isSettingsOpen = !isSettingsOpen" />
          <button
            @click="openInfo( 'chordforge' )"
            class="w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 hover:bg-blue-500/20 transition-all"
            title="Tool Intelligence"
          >
            ?
          </button>
        </div>
      </div>
    </header>

    <LocalSettingsDrawer
      :isOpen="isSettingsOpen"
      :categories="drawerCategories"
      @close="isSettingsOpen = false"
    >
      <template #General>
        <div class="p-6 space-y-6">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-white font-bold text-base">Show Configurations</h3>
              <p class="text-xs text-slate-500 uppercase tracking-widest font-mono">Visible Panel</p>
            </div>
            <!-- Simple Toggle Switch -->
            <button
              @click="showConfig = !showConfig"
              class="w-12 h-6 rounded-full transition-colors relative"
              :class="showConfig ? 'bg-amber-500' : 'bg-slate-700'"
            >
              <div
                class="w-4 h-4 rounded-full bg-white absolute top-1 transition-all"
                :class="showConfig ? 'left-7' : 'left-1'"
              ></div>
            </button>
          </div>
          <div class="p-4 rounded-xl bg-white/5 border border-white/5 text-xs text-slate-400 leading-relaxed">
            <p>
              Show the instrument and tuning selection panel. Hide it to maximize the fretboard scanning area.
            </p>
          </div>
        </div>
      </template>

      <template #Engine>
        <div class="p-4">
          <EngineSettings />
        </div>
      </template>
    </LocalSettingsDrawer>

    <!-- Main Content -->
    <main class="container mx-auto px-6 py-8">
      <div class="grid lg:grid-cols-12 gap-8 items-start">
        
        <!-- 1. Configuration Panel (Left Side - Toggleable) -->
        <div 
          v-if="showConfig"
          class="lg:col-span-3 space-y-6 animate-in slide-in-from-left-4 fade-in duration-300"
        >
          <div class="glass-container p-6 sticky top-28">
            <h3 class="text-[10px] font-black text-amber-400 uppercase tracking-[0.3em] mb-6">
              Configuration
            </h3>
            
            <div class="space-y-8">
              <!-- Instrument Selector -->
              <div>
                <div class="flex items-center gap-3 mb-4">
                  <div class="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-lg">🎸</div>
                  <div>
                    <h3 class="text-white font-bold text-base">Instrument</h3>
                    <p class="text-xs text-slate-500 uppercase tracking-widest font-mono">Layout</p>
                  </div>
                </div>
                <div class="grid grid-cols-1 gap-2">
                  <button
                    v-for=" inst in ( ['guitar', 'bass', 'bass5'] as InstrumentType[] ) "
                    :key="inst"
                    @click="selectedInstrument = inst"
                    class="flex items-center justify-between p-3 rounded-xl border transition-all text-left group"
                    :class="selectedInstrument === inst
                      ? 'bg-amber-500/10 border-amber-500/50 text-white'
                      : 'bg-slate-900/50 border-white/5 text-slate-400 hover:bg-slate-800'"
                  >
                    <span class="font-black uppercase tracking-widest text-[10px]">{{ instrumentLabels[inst] }}</span>
                    <div
                      v-if=" selectedInstrument === inst "
                      class="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                    ></div>
                  </button>
                </div>
              </div>

              <!-- Tuning Selector -->
              <div>
                <div class="flex items-center gap-3 mb-4">
                  <div class="w-8 h-8 rounded-lg bg-sky-500/20 flex items-center justify-center text-lg">🔧</div>
                  <div>
                    <h3 class="text-white font-bold text-base">Tuning</h3>
                    <p class="text-xs text-slate-500 uppercase tracking-widest font-mono">Pitch</p>
                  </div>
                </div>
                <div class="grid grid-cols-1 gap-2">
                  <button
                    v-for=" tuning in availableTunings "
                    :key="tuning"
                    @click="selectedTuning = tuning as TuningPreset"
                    class="flex items-center justify-between p-3 rounded-xl border transition-all text-left group"
                    :class="selectedTuning === tuning
                      ? 'bg-sky-500/10 border-sky-500/50'
                      : 'bg-slate-900/50 border-white/5 hover:bg-slate-800'"
                  >
                    <div class="flex flex-col">
                      <span
                        class="text-[10px] font-black uppercase tracking-widest"
                        :class="selectedTuning === tuning ? 'text-sky-400' : 'text-slate-500'"
                      >{{ tuningLabels[tuning] || tuning }}</span>
                      <span class="text-[9px] text-slate-600">{{ tuning === 'standard' ? 'Default' : 'Alt' }}</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 2. Fretboard & Info Area (Right Side - Expands) -->
        <div 
          class="space-y-6 transition-all duration-300"
          :class="showConfig ? 'lg:col-span-9' : 'lg:col-span-12'"
        >
          <!-- Chord Info -->
          <div class="glass-container p-6">
            <h3 class="text-[10px] font-black text-amber-400 uppercase tracking-[0.3em] mb-4">
              Chord Info
            </h3>
            <div
              v-if=" detectedChord "
              class="grid grid-cols-2 md:grid-cols-4 gap-4"
            >
              <div class="flex flex-col">
                <span class="text-slate-500 text-[10px] uppercase font-bold tracking-widest">Root</span>
                <span class="font-bold text-white text-lg">{{ selectedPitchClasses[0] || '-' }}</span>
              </div>
              <div class="flex flex-col">
                <span class="text-slate-500 text-[10px] uppercase font-bold tracking-widest">Bass</span>
                <span class="font-bold text-white text-lg">{{ bassNote || '-' }}</span>
              </div>
              <div class="flex flex-col">
                <span class="text-slate-500 text-[10px] uppercase font-bold tracking-widest">Notes</span>
                <span class="font-bold text-white text-lg">{{ selectedNotes.length }}</span>
              </div>
              <div class="flex flex-col">
                <span class="text-slate-500 text-[10px] uppercase font-bold tracking-widest">Unique</span>
                <span class="font-bold text-white text-lg">{{ selectedPitchClasses.length }}</span>
              </div>
            </div>
            <div
              v-else
              class="text-center py-4 opacity-50"
            >
              <p class="text-[10px] text-slate-500 uppercase tracking-widest">Select notes to see chord info</p>
            </div>
          </div>

          <!-- Fretboard Panel (Interactive) -->
          <div class="glass-container p-6">
            <!-- Chord Display -->
            <div class="mb-6 text-center">
              <div
                v-if=" detectedChord "
                class="animate-in fade-in"
              >
                <span class="text-[10px] font-black text-amber-400 uppercase tracking-[0.3em] block mb-1">
                  Detected Chord
                </span>
                <h2 class="text-5xl font-black text-white italic tracking-tighter">
                  {{ detectedChord }}
                </h2>
                <p class="text-sm text-slate-500 mt-2">
                  Notes: {{ selectedPitchClasses.join( ' • ' ) }}
                </p>
              </div>
              <div
                v-else
                class="opacity-50"
              >
                <span class="text-2xl">🎸</span>
                <p class="text-sm text-slate-500 mt-2">Tap frets to build a chord</p>
              </div>
            </div>

            <!-- Fretboard Component -->
            <Fretboard
              :instrument="selectedInstrument"
              :tuning-preset="selectedTuning"
              :selected-frets="stringState"
              :interactive="true"
              :highlights="fretboardHighlights"
              @fret-click="handleFretClick"
              @nut-click="handleNutClick"
            />

            <!-- Action Buttons -->
            <div class="flex justify-center gap-4 mt-6">
              <button
                @click="playChord"
                :disabled="selectedNotes.length === 0"
                class="px-8 py-3 rounded-full bg-amber-600 text-white font-black uppercase tracking-widest text-sm hover:bg-amber-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all transform active:scale-95"
              >
                🎸 Strum
              </button>
              <button
                @click="clearAll"
                class="px-6 py-3 rounded-full bg-white/5 border border-white/10 text-slate-400 font-black uppercase tracking-widest text-sm hover:bg-white/10 hover:text-white transition-all"
              >
                Clear
              </button>

              <div class="flex items-center gap-2 bg-white/5 p-1 rounded-full border border-white/10 ml-4">
                <button
                  @click="shiftFrets( -1 )"
                  class="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:bg-white/10 hover:text-white transition-all font-black"
                  title="Shift Frets Down"
                >
                  -1
                </button>
                <span class="text-[9px] font-black text-slate-500 uppercase tracking-widest px-2">Shift</span>
                <button
                  @click="shiftFrets( 1 )"
                  class="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:bg-white/10 hover:text-white transition-all font-black"
                  title="Shift Frets Up"
                >
                  +1
                </button>
              </div>
            </div>

            <!-- Suggested Voicings Panel -->
            <div
              v-if=" detectedChord "
              class="mt-8 pt-8 border-t border-white/5 animate-in fade-in slide-in-from-bottom-4"
            >
              <h3 class="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4 text-center">
                Suggested Voicings
              </h3>
              
              <div 
                v-if="suggestedVoicings.length > 0"
                class="flex flex-wrap justify-center gap-4"
              >
                <button
                  v-for=" voicing in suggestedVoicings "
                  :key="voicing.id"
                  @click="toggleVoicing( voicing.id )"
                  class="px-5 py-2 rounded-xl border flex items-center gap-3 transition-all hover:scale-105 active:scale-95"
                  :class="activeVoicings.has( voicing.id ) 
                    ? 'bg-slate-800 border-transparent shadow-lg' 
                    : 'bg-transparent border-white/10 hover:border-white/20'"
                  :style="{
                    borderColor: activeVoicings.has( voicing.id ) ? voicing.color : undefined,
                    boxShadow: activeVoicings.has( voicing.id ) ? `0 0 15px ${voicing.color}40` : undefined
                  }"
                >
                  <div
                    class="w-3 h-3 rounded-full shadow-sm"
                    :style="{ backgroundColor: voicing.color }"
                  ></div>
                  <span
                    class="text-xs font-bold uppercase tracking-wider"
                    :class="activeVoicings.has( voicing.id ) ? 'text-white' : 'text-slate-400'"
                  >
                    {{ voicing.label }}
                  </span>
                </button>
              </div>

              <div
                v-else
                class="text-center text-slate-600 text-xs italic"
              >
                <div v-if="selectedPitchClasses.length < 3">
                  Please select at least 3 distinct notes (Triad) to generate alternate voicings.
                </div>
                <div v-else>
                  No alternate playable shapes found in standard guitar range.
                  <br><span class="opacity-50 text-[10px]">Try a simpler chord structure.</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </main>

  </div>
</template>


<style scoped>
@reference "tailwindcss";

.glass-container {
  @apply bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-3xl;
}
</style>
