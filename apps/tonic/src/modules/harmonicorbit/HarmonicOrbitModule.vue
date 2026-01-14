<script setup lang="ts">
/**
 * Harmonic Orbit Module
 * 
 * An interactive, visual exploration of the Circle of Fifths and Fourths.
 * Designed to bridge the gap between abstract theory and tactile exploration.
 * 
 * @module modules/harmonicorbit/HarmonicOrbitModule.vue
 */

import { ref, computed, onMounted, onUnmounted } from 'vue';
import {
  SynthEngine,
  Note,
  useAudioEngine,
  useGlobalEngine
} from '@spectralsuite/core';
import { useToolInfo } from '../../composables/useToolInfo';
import LocalSettingsDrawer from '../../components/settings/LocalSettingsDrawer.vue';
import SettingsTrigger from '../../components/settings/SettingsTrigger.vue';
import EngineSettings from '../../components/settings/EngineSettings.vue';

const { openInfo } = useToolInfo();
const { activate, deactivate } = useAudioEngine();

// --- AUDIO ENGINE LIFECYCLE ---
// Register as an audio consumer when component mounts,
// unregister when it unmounts to manage the audio context efficiently
onMounted( () => activate() );
onUnmounted( () => deactivate() );

// --- STATE MANAGEMENT ---

const isSettingsOpen = ref( false );
const isFifthsMode = ref( true ); // Toggle between 5ths and 4ths
const showDegrees = ref( true ); // Show I, IV, V labels - default ON
const showGlow = ref( true );      // Visual aesthetic setting
const hoveredKeyIdx = ref<number | null>( null );
const selectedKeyIdx = ref<number | null>( null );
const selectedType = ref<'major' | 'minor' | 'dim' | 'ii' | 'iii' | 'vi'>( 'major' );
const currentTriadNotes = ref<string[]>( [] );

// The 12 Keys in Circle of Fifths order
// Based on the "Three-Ring" theory: Outer (Major), Middle (Minor ii/iii/vi), Inner (Diminished)
// ii = supertonic, iii = mediant, vi = submediant (relative minor)
const FIFTHS_KEYS = [
  { note: 'C', major: 'C', signature: '0', ii: 'Dm', iii: 'Em', vi: 'Am', dim: 'Bdim', fact: 'The "Home Base" of music! C Major has no sharps or flats, so it uses only the white keys on a piano. This makes it perfect for beginners and the foundation of all music theory.' },
  { note: 'G', major: 'G', signature: '1♯', ii: 'Am', iii: 'Bm', vi: 'Em', dim: 'F#dim', fact: 'The "Guitarist\'s Friend." G Major has just one sharp (F#), making it one of the easiest keys to play on guitar. Many folk and rock songs are written in G!' },
  { note: 'D', major: 'D', signature: '2♯', ii: 'Em', iii: 'F#m', vi: 'Bm', dim: 'C#dim', fact: 'The "Heroic Key." D Major sounds bright and triumphant! Many famous movie themes and national anthems are in D because it sounds strong, brave, and victorious.' },
  { note: 'A', major: 'A', signature: '3♯', ii: 'Bm', iii: 'C#m', vi: 'F#m', dim: 'G#dim', fact: 'The "Golden Key." A Major sounds very warm and is great for singing along with. It\'s a favorite for pop, country, and classic rock songs.' },
  { note: 'E', major: 'E', signature: '4♯', ii: 'F#m', iii: 'G#m', vi: 'C#m', dim: 'D#dim', fact: 'Super powerful! E Major makes guitars sound huge because the lowest string is an E. Many rock and blues songs love this key for its raw energy.' },
  { note: 'B', major: 'B', signature: '5♯', ii: 'C#m', iii: 'D#m', vi: 'G#m', dim: 'A#dim', fact: 'The "Black Key Specialist." B Major uses 5 sharps, so you\'ll be playing lots of black keys! It has a bright, shimmering quality.' },
  { note: 'Gb', major: 'Gb', signature: '6♭', ii: 'Abm', iii: 'Bbm', vi: 'Ebm', dim: 'Fdim', fact: 'The "Perfect Balance." Gb/F# Major is exactly halfway around our musical clock. It uses 6 flats (or 6 sharps), creating a perfectly symmetrical key.' },
  { note: 'Db', major: 'Db', signature: '5♭', ii: 'Ebm', iii: 'Fm', vi: 'Bbm', dim: 'Cdim', fact: 'Velvet-smooth! Db Major is famous for being very soft, sweet, and dreamy. Composers use it for romantic and introspective pieces.' },
  { note: 'Ab', major: 'Ab', signature: '4♭', ii: 'Bbm', iii: 'Cm', vi: 'Fm', dim: 'Gdim', fact: 'The "Rich and Royal" key. Ab Major feels very deep and colorful, like a sunset. Jazz musicians love its sophisticated, mellow sound.' },
  { note: 'Eb', major: 'Eb', signature: '3♭', ii: 'Fm', iii: 'Gm', vi: 'Cm', dim: 'Ddim', fact: 'The "Regal Trumpet" key. Eb Major sounds very grand and is often used for brass instruments. Symphony composers use it for noble, majestic themes.' },
  { note: 'Bb', major: 'Bb', signature: '2♭', ii: 'Cm', iii: 'Dm', vi: 'Gm', dim: 'Adim', fact: 'Smooth and Jazzy. Bb Major is perfect for brass instruments like trumpets and saxophones. It\'s the most common key in jazz and blues music.' },
  { note: 'F', major: 'F', signature: '1♭', ii: 'Gm', iii: 'Am', vi: 'Dm', dim: 'Edim', fact: 'Simple and Sweet. F Major has only one flat (Bb), so it\'s one of the easiest keys to learn! It sounds pastoral and pleasant.' }
];

// Calculation to get all 7 diatonic chords for a selected key
// Based on the Circle of Fifths positions
// ii = supertonic minor, iii = mediant minor, vi = relative minor
const getFamilyChords = ( idx: number, type: 'major' | 'minor' | 'dim' | 'ii' | 'iii' | 'vi' = 'major' ) => {
  const keys = activeKeys.value;
  const self = keys[idx]!;
  const ccw = keys[getNeighborIdx( idx, -1 )]!; // Counter-clockwise neighbor
  const cw = keys[getNeighborIdx( idx, 1 )]!;   // Clockwise neighbor

  if ( type === 'major' || type === 'dim' || type === 'ii' || type === 'iii' || type === 'vi' ) {
    // Major key family: I, ii, iii, IV, V, vi, vii° (used for all diatonic chords in the major key)
    return [
      { degree: 'I', name: `${self.major}`, type: 'Major', desc: 'The Tonic (Home)', color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
      { degree: 'ii', name: `${self.ii}`, type: 'Minor', desc: 'The Super-Tonic', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
      { degree: 'iii', name: `${self.iii}`, type: 'Minor', desc: 'The Mediant', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
      { degree: 'IV', name: `${ccw.major}`, type: 'Major', desc: 'The Sub-Dominant', color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
      { degree: 'V', name: `${cw.major}`, type: 'Major', desc: 'The Dominant', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
      { degree: 'vi', name: `${self.vi}`, type: 'Minor', desc: 'The Relative Minor', color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
      { degree: 'vii°', name: `${self.dim}`, type: 'Dim', desc: 'The Leading Tone', color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-500/20' }
    ];
  } else {
    // Natural Minor key family: i, ii°, III, iv, v, VI, VII
    return [
      { degree: 'i', name: `${self.vi}`, type: 'Minor', desc: 'The Tonic (Home)', color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
      { degree: 'ii°', name: `${self.dim}`, type: 'Dim', desc: 'The Super-Tonic', color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-500/20' },
      { degree: 'III', name: `${self.major}`, type: 'Major', desc: 'The Mediant', color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
      { degree: 'iv', name: `${self.ii}`, type: 'Minor', desc: 'The Sub-Dominant', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
      { degree: 'v', name: `${self.iii}`, type: 'Minor', desc: 'The Dominant', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
      { degree: 'VI', name: `${ccw.major}`, type: 'Major', desc: 'The Sub-Mediant', color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
      { degree: 'VII', name: `${cw.major}`, type: 'Major', desc: 'The Sub-Tonic', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' }
    ];
  }
};

// Computed keys based on mode (Fifths vs Fourths)
const activeKeys = computed( () => {
  return isFifthsMode.value ? FIFTHS_KEYS : [...FIFTHS_KEYS].reverse();
} );

// --- SETTINGS CONFIGURATION ---

const drawerCategories = computed( () => [
  {
    id: 'general',
    label: 'General',
    description: 'Orbit Display & Theory',
    showIndicator: !isFifthsMode.value || showDegrees.value
  },
  {
    id: 'engine',
    label: 'Engine',
    description: 'Global Audio Processing',
    showIndicator: useGlobalEngine().isGlobalEngineActive.value
  }
] );

// --- HARMONIC CALCULATIONS ---

/**
 * Gets the relative neighbor index.
 * In a circle of 12, the 4th is 1 step CCW (-1) and the 5th is 1 step CW (+1).
 */
const getNeighborIdx = ( baseIdx: number, offset: number ) => {
  return ( baseIdx + offset + 12 ) % 12;
};

// --- COLOR MAPPING ---
/**
 * Determines the visual style (fill, stroke, opacity) for an Orbit segment.
 * Implements a "Tiered Glow" hierarchy: Selected > Family > Non-Family.
 */
const getSegmentStyle = ( chordName: string ) => {
  // Check if this chord name matches the selected target chord
  const isTarget = selectedKeyIdx.value !== null && (
    ( selectedType.value === 'major' && activeKeys.value[selectedKeyIdx.value]?.major === chordName ) ||
    ( selectedType.value === 'minor' && activeKeys.value[selectedKeyIdx.value]?.vi === chordName ) ||
    ( selectedType.value === 'dim' && activeKeys.value[selectedKeyIdx.value]?.dim === chordName )
  );

  // Default Style (Non-Selected, Non-Family)
  const defaultStyle = {
    fill: 'rgba(255,255,255,0.03)',
    stroke: 'rgba(255,255,255,0.2)', // Brighter default stroke
    isFamily: false,
    isSelected: false,
    color: '#ffffff',
    fillOpacity: 1,
    textOpacity: 0.95 // Keep all text high-visibility
  };

  if ( selectedKeyIdx.value === null ) return defaultStyle;

  const family = getFamilyChords( selectedKeyIdx.value, selectedType.value );

  // Normalization for comparison
  const normalize = ( n: string ) => n.toLowerCase().replace( ' major', '' ).replace( ' minor', '' ).replace( 'm', '' ).replace( 'dim', '' ).trim();
  const matchingChord = family.find( c => normalize( c.name ) === normalize( chordName ) );

  if ( matchingChord ) {
    const colorMap: Record<string, string> = {
      'text-indigo-400': '#818cf8',
      'text-emerald-400': '#10b981',
      'text-orange-400': '#f59e0b',
      'text-cyan-400': '#06b6d4',
      'text-blue-400': '#3b82f6',
      'text-rose-400': '#f43f5e',
      'text-fuchsia-400': '#a855f7'
    };
    const color = colorMap[matchingChord.color] || '#ffffff';

    if ( isTarget ) {
      return { fill: `${color}66`, stroke: color, isFamily: true, isSelected: true, color, fillOpacity: 1, textOpacity: 1 };
    } else {
      return { fill: `${color}25`, stroke: `${color}99`, isFamily: true, isSelected: false, color, fillOpacity: 0.8, textOpacity: 1 };
    }
  }

  // Non-Family: Sharp text but dimmed segment
  return { ...defaultStyle, fillOpacity: 0.4 };
};

// --- AUDIO LOGIC ---

/**
 * Plays the root triad of the selected key.
 * 
 * @param keyName - The major key name (e.g., "C Major")
 */
const playTriad = ( note: string, type: 'major' | 'minor' | 'dim' ) => {
  const synth = SynthEngine.getInstance();
  const root = note.replace( 'm', '' ).replace( 'dim', '' ); // Get base note for Tonal

  const f1 = Note.freq( `${root}3` );
  let n2Name, n3Name;

  if ( type === 'major' ) {
    n2Name = Note.transpose( root, 'M3' );
    n3Name = Note.transpose( root, 'P5' );
  } else if ( type === 'minor' ) {
    n2Name = Note.transpose( root, 'm3' );
    n3Name = Note.transpose( root, 'P5' );
  } else { // diminished
    n2Name = Note.transpose( root, 'm3' );
    n3Name = Note.transpose( root, 'd5' ); // Diminished fifth
  }

  // Store for UI display
  currentTriadNotes.value = [root, n2Name, n3Name];

  const f2 = Note.freq( n2Name + '3' );
  const f3 = Note.freq( n3Name + '3' );

  if ( f1 ) synth.playNote( f1, 500 );
  setTimeout( () => { if ( f2 ) synth.playNote( f2, 500 ) }, 50 );
  setTimeout( () => { if ( f3 ) synth.playNote( f3, 500 ) }, 100 );
};

const handleSelection = ( idx: number, type: 'major' | 'minor' | 'dim' | 'ii' | 'iii' | 'vi' ) => {
  const key = activeKeys.value[idx]!;
  selectedKeyIdx.value = idx;

  // Store the actual type so we can display the correct chord
  selectedType.value = type;

  // Get the chord label based on type
  let label = '';
  if ( type === 'major' ) label = key.major;
  else if ( type === 'ii' ) label = key.ii;
  else if ( type === 'iii' ) label = key.iii;
  else if ( type === 'vi' || type === 'minor' ) label = key.vi;
  else label = key.dim;

  // Map to base type for playTriad (minor chords all use same triad logic)
  const playType = ( type === 'ii' || type === 'iii' || type === 'vi' ) ? 'minor' : type;
  playTriad( label, playType );
};

/**
 * Finds the key that contains the given chord name and selects it.
 * Used when clicking on a chord in the Key Family panel.
 * @param chordName - The name of the chord to find (e.g., 'Dm', 'Em', 'Am')
 */
const selectChordByName = ( chordName: string ) => {
  const keys = activeKeys.value;

  // Search through all keys to find where this chord lives
  for ( let i = 0; i < keys.length; i++ ) {
    const key = keys[i]!;

    // Check Major
    if ( key.major === chordName ) {
      handleSelection( i, 'major' );
      return;
    }
    // Check ii
    if ( key.ii === chordName ) {
      handleSelection( i, 'ii' );
      return;
    }
    // Check iii
    if ( key.iii === chordName ) {
      handleSelection( i, 'iii' );
      return;
    }
    // Check vi (relative minor)
    if ( key.vi === chordName ) {
      handleSelection( i, 'vi' );
      return;
    }
    // Check dim
    if ( key.dim === chordName ) {
      handleSelection( i, 'dim' );
      return;
    }
  }
};

// --- EMITS ---
const emit = defineEmits( ['back'] );

onMounted( () => activate() );
onUnmounted( () => deactivate() );

</script>

<template>
  <div class="space-y-8 max-w-5xl mx-auto px-6">

    <!-- Module Header -->
    <header class="flex justify-between items-end">
      <div>
        <button
          @click="emit( 'back' )"
          class="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 hover:text-white transition-colors mb-4 flex items-center gap-2"
        >
          <span>←</span> Back to Tonic
        </button>
        <h2 class="text-4xl font-black text-white italic tracking-tighter uppercase">Harmonic <span
            class="text-indigo-500"
          >Orbit</span> <span class="text-indigo-400 text-lg">Lab</span></h2>
        <p class="text-slate-500 text-xs font-mono uppercase tracking-widest mt-1">Holographic Relationship Mapping &
          Diatonic Zoom
        </p>
      </div>
      <div class="flex items-center gap-3">
        <button
          @click="openInfo( 'harmonicorbit' )"
          class="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center hover:bg-indigo-500/20 transition-all active:scale-95"
          title="Intelligence"
        >
          <span class="text-lg font-bold">?</span>
        </button>

        <SettingsTrigger @click="isSettingsOpen = true" />
      </div>
    </header>

    <!-- Settings Drawer -->
    <LocalSettingsDrawer
      :is-open="isSettingsOpen"
      :categories="drawerCategories"
      @close="isSettingsOpen = false"
    >
      <template #general>
        <div class="space-y-6">
          <div class="space-y-4">
            <h4 class="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Theory Mode</h4>

            <!-- Fifths vs Fourths Toggle -->
            <button
              @click="isFifthsMode = !isFifthsMode"
              class="w-full flex flex-col items-start p-4 rounded-xl border transition-all text-left group"
              :class="!isFifthsMode ? 'bg-indigo-500/10 border-indigo-500/50' : 'bg-slate-900/50 border-white/5 hover:bg-slate-800'"
            >
              <div class="flex items-center justify-between w-full mb-2">
                <span
                  class="text-xs font-black uppercase tracking-widest transition-colors"
                  :class="!isFifthsMode ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-400'"
                >{{ isFifthsMode ? 'Circle of Fifths' : 'Circle of Fourths' }}</span>
                <div
                  class="w-8 h-4 rounded-full relative transition-colors"
                  :class="!isFifthsMode ? 'bg-indigo-500' : 'bg-slate-700'"
                >
                  <div
                    class="absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform"
                    :class="!isFifthsMode ? 'translate-x-4' : 'translate-x-0'"
                  ></div>
                </div>
              </div>
              <p class="text-[11px] text-slate-500 leading-relaxed group-hover:text-slate-400 transition-colors">
                Choose the direction of the musical clock (Fifths or Fourths).
              </p>
            </button>

            <!-- Show Degrees Toggle -->
            <button
              @click="showDegrees = !showDegrees"
              class="w-full flex flex-col items-start p-4 rounded-xl border transition-all text-left group"
              :class="showDegrees ? 'bg-sky-500/10 border-sky-500/50' : 'bg-slate-900/50 border-white/5 hover:bg-slate-800'"
            >
              <div class="flex items-center justify-between w-full mb-2">
                <span
                  class="text-xs font-black uppercase tracking-widest transition-colors"
                  :class="showDegrees ? 'text-sky-400' : 'text-slate-500 group-hover:text-slate-400'"
                >Display Degrees</span>
                <div
                  class="w-8 h-4 rounded-full relative transition-colors"
                  :class="showDegrees ? 'bg-sky-500' : 'bg-slate-700'"
                >
                  <div
                    class="absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform"
                    :class="showDegrees ? 'translate-x-4' : 'translate-x-0'"
                  ></div>
                </div>
              </div>
              <p class="text-[11px] text-slate-500 leading-relaxed group-hover:text-slate-400 transition-colors">
                Show the "Family Numbers" (I, IV, V) to see how the keys are related.
              </p>
            </button>
          </div>

          <div class="space-y-4 pt-6 border-t border-white/5">
            <h4 class="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Visuals</h4>
            <button
              @click="showGlow = !showGlow"
              class="w-full flex flex-col items-start p-4 rounded-xl border transition-all text-left group"
              :class="showGlow ? 'bg-rose-500/10 border-rose-500/50' : 'bg-slate-900/50 border-white/5 hover:bg-slate-800'"
            >
              <div class="flex items-center justify-between w-full mb-2">
                <span
                  class="text-xs font-black uppercase tracking-widest transition-colors"
                  :class="showGlow ? 'text-rose-400' : 'text-slate-500 group-hover:text-slate-400'"
                >Plasma Glow</span>
                <div
                  class="w-8 h-4 rounded-full relative transition-colors"
                  :class="showGlow ? 'bg-rose-500' : 'bg-slate-700'"
                >
                  <div
                    class="absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform"
                    :class="showGlow ? 'translate-x-4' : 'translate-x-0'"
                  ></div>
                </div>
              </div>
              <p class="text-[11px] text-slate-500 leading-relaxed group-hover:text-slate-400 transition-colors">
                Enable intensity gradients and harmonic neighbor bloom effects.
              </p>
            </button>
          </div>
        </div>
      </template>

      <template #engine>
        <EngineSettings />
      </template>
    </LocalSettingsDrawer>

    <!-- Main Lab View -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">

      <!-- Interactive Circle (The Orbit) - Sticky at top -->
      <div class="lg:col-span-7 flex justify-center py-6 sticky top-24">
        <svg
          viewBox="0 0 750 750"
          class="w-full max-w-[650px] transform transition-transform duration-500"
        >

          <!-- Key Segments -->
          <!-- Note: idx * 30 - 90 puts 'C' (idx 0) exactly at the top center. -->
          <g
            v-for=" ( key, idx ) in activeKeys "
            :key="key.note"
            class="group/segment"
          >
            <!-- 1. Outer Ring (Major) -->
            <path
              :d="`
                M ${375 + 260 * Math.cos( ( idx * 30 - 105 ) * Math.PI / 180 )} ${375 + 260 * Math.sin( ( idx * 30 - 105 ) * Math.PI / 180 )} 
                L ${375 + 340 * Math.cos( ( idx * 30 - 105 ) * Math.PI / 180 )} ${375 + 340 * Math.sin( ( idx * 30 - 105 ) * Math.PI / 180 )} 
                A 340 340 0 0 1 ${375 + 340 * Math.cos( ( idx * 30 - 75 ) * Math.PI / 180 )} ${375 + 340 * Math.sin( ( idx * 30 - 75 ) * Math.PI / 180 )} 
                L ${375 + 260 * Math.cos( ( idx * 30 - 75 ) * Math.PI / 180 )} ${375 + 260 * Math.sin( ( idx * 30 - 75 ) * Math.PI / 180 )} 
                A 260 260 0 0 0 ${375 + 260 * Math.cos( ( idx * 30 - 105 ) * Math.PI / 180 )} ${375 + 260 * Math.sin( ( idx * 30 - 105 ) * Math.PI / 180 )} 
                Z`"
              class="transition-all duration-300 pointer-events-none"
              :style="{
                fill: getSegmentStyle( key.major ).fill,
                stroke: getSegmentStyle( key.major ).stroke,
                opacity: getSegmentStyle( key.major ).fillOpacity
              }"
              @mouseenter="hoveredKeyIdx = idx"
              @mouseleave="hoveredKeyIdx = null"
            />
            <text
              :x="375 + 300 * Math.cos( ( idx * 30 - 90 ) * Math.PI / 180 )"
              :y="375 + 300 * Math.sin( ( idx * 30 - 90 ) * Math.PI / 180 )"
              class="text-[25px] font-black select-none cursor-pointer transition-all duration-300"
              text-anchor="middle"
              dominant-baseline="middle"
              :style="{
                fill: getSegmentStyle( key.major ).isFamily ? getSegmentStyle( key.major ).stroke : 'rgba(255,255,255,0.95)',
  fontSize: selectedKeyIdx === idx && selectedType === 'major' ? '35px' : '28px',
                opacity: getSegmentStyle( key.major ).textOpacity
              }"
              @click="handleSelection( idx, 'major' )"
            >
              {{ key.major }}
            </text>

            <!-- 2. Middle Ring (Minor: 36 sections - 3 per Major key: ii, iii, vi) -->
            <g>
              <!-- Segment 1: ii chord (left third, 10°) -->
              <path
                :d="`
                  M ${375 + 165 * Math.cos( ( idx * 30 - 105 ) * Math.PI / 180 )} ${375 + 165 * Math.sin( ( idx * 30 - 105 ) * Math.PI / 180 )} 
                  L ${375 + 260 * Math.cos( ( idx * 30 - 105 ) * Math.PI / 180 )} ${375 + 260 * Math.sin( ( idx * 30 - 105 ) * Math.PI / 180 )} 
                  A 260 260 0 0 1 ${375 + 260 * Math.cos( ( idx * 30 - 95 ) * Math.PI / 180 )} ${375 + 260 * Math.sin( ( idx * 30 - 95 ) * Math.PI / 180 )} 
                  L ${375 + 165 * Math.cos( ( idx * 30 - 95 ) * Math.PI / 180 )} ${375 + 165 * Math.sin( ( idx * 30 - 95 ) * Math.PI / 180 )} 
                  A 165 165 0 0 0 ${375 + 165 * Math.cos( ( idx * 30 - 105 ) * Math.PI / 180 )} ${375 + 165 * Math.sin( ( idx * 30 - 105 ) * Math.PI / 180 )} 
                  Z`"
                class="transition-all duration-300 pointer-events-none"
                :style="{
                  fill: getSegmentStyle( key.ii ).fill,
                  stroke: getSegmentStyle( key.ii ).stroke,
                  opacity: getSegmentStyle( key.ii ).fillOpacity
                }"
              />
              <text
                :x="375 + 215 * Math.cos( ( idx * 30 - 100 ) * Math.PI / 180 )"
                :y="375 + 215 * Math.sin( ( idx * 30 - 100 ) * Math.PI / 180 )"
                class="text-[13px] font-bold select-none cursor-pointer"
                :fill="getSegmentStyle( key.ii ).isFamily ? getSegmentStyle( key.ii ).stroke : 'rgba(255,255,255,0.85)'"
                text-anchor="middle"
                dominant-baseline="middle"
                @click="handleSelection( idx, 'ii' )"
              >
                {{ key.ii }}
              </text>

              <!-- Segment 2: iii chord (center third, 10°) -->
              <path
                :d="`
                  M ${375 + 165 * Math.cos( ( idx * 30 - 95 ) * Math.PI / 180 )} ${375 + 165 * Math.sin( ( idx * 30 - 95 ) * Math.PI / 180 )} 
                  L ${375 + 260 * Math.cos( ( idx * 30 - 95 ) * Math.PI / 180 )} ${375 + 260 * Math.sin( ( idx * 30 - 95 ) * Math.PI / 180 )} 
                  A 260 260 0 0 1 ${375 + 260 * Math.cos( ( idx * 30 - 85 ) * Math.PI / 180 )} ${375 + 260 * Math.sin( ( idx * 30 - 85 ) * Math.PI / 180 )} 
                  L ${375 + 165 * Math.cos( ( idx * 30 - 85 ) * Math.PI / 180 )} ${375 + 165 * Math.sin( ( idx * 30 - 85 ) * Math.PI / 180 )} 
                  A 165 165 0 0 0 ${375 + 165 * Math.cos( ( idx * 30 - 95 ) * Math.PI / 180 )} ${375 + 165 * Math.sin( ( idx * 30 - 95 ) * Math.PI / 180 )} 
                  Z`"
                class="transition-all duration-300 pointer-events-none"
                :style="{
                  fill: getSegmentStyle( key.iii ).fill,
                  stroke: getSegmentStyle( key.iii ).stroke,
                  opacity: getSegmentStyle( key.iii ).fillOpacity
                }"
              />
              <text
                :x="375 + 215 * Math.cos( ( idx * 30 - 90 ) * Math.PI / 180 )"
                :y="375 + 215 * Math.sin( ( idx * 30 - 90 ) * Math.PI / 180 )"
                class="text-[13px] font-bold select-none cursor-pointer"
                :fill="getSegmentStyle( key.iii ).isFamily ? getSegmentStyle( key.iii ).stroke : 'rgba(255,255,255,0.85)'"
                text-anchor="middle"
                dominant-baseline="middle"
                @click="handleSelection( idx, 'iii' )"
              >
                {{ key.iii }}
              </text>

              <!-- Segment 3: vi chord (right third, 10°) -->
              <path
                :d="`
                  M ${375 + 165 * Math.cos( ( idx * 30 - 85 ) * Math.PI / 180 )} ${375 + 165 * Math.sin( ( idx * 30 - 85 ) * Math.PI / 180 )} 
                  L ${375 + 260 * Math.cos( ( idx * 30 - 85 ) * Math.PI / 180 )} ${375 + 260 * Math.sin( ( idx * 30 - 85 ) * Math.PI / 180 )} 
                  A 260 260 0 0 1 ${375 + 260 * Math.cos( ( idx * 30 - 75 ) * Math.PI / 180 )} ${375 + 260 * Math.sin( ( idx * 30 - 75 ) * Math.PI / 180 )} 
                  L ${375 + 165 * Math.cos( ( idx * 30 - 75 ) * Math.PI / 180 )} ${375 + 165 * Math.sin( ( idx * 30 - 75 ) * Math.PI / 180 )} 
                  A 165 165 0 0 0 ${375 + 165 * Math.cos( ( idx * 30 - 85 ) * Math.PI / 180 )} ${375 + 165 * Math.sin( ( idx * 30 - 85 ) * Math.PI / 180 )} 
                  Z`"
                class="transition-all duration-300 pointer-events-none"
                :style="{
                  fill: getSegmentStyle( key.vi ).fill,
                  stroke: getSegmentStyle( key.vi ).stroke,
                  opacity: getSegmentStyle( key.vi ).fillOpacity
                }"
              />
              <text
                :x="375 + 215 * Math.cos( ( idx * 30 - 80 ) * Math.PI / 180 )"
                :y="375 + 215 * Math.sin( ( idx * 30 - 80 ) * Math.PI / 180 )"
                class="text-[13px] font-bold select-none cursor-pointer"
                :fill="getSegmentStyle( key.vi ).isFamily ? getSegmentStyle( key.vi ).stroke : 'rgba(255,255,255,0.85)'"
                text-anchor="middle"
                dominant-baseline="middle"
                @click="handleSelection( idx, 'vi' )"
              >
                {{ key.vi }}
              </text>
            </g>

            <!-- 3. Inner Ring (Diminished) - Fixed geometry, separate from Minor -->
            <path
              :d="`
                M ${375 + 90 * Math.cos( ( idx * 30 - 105 ) * Math.PI / 180 )} ${375 + 90 * Math.sin( ( idx * 30 - 105 ) * Math.PI / 180 )} 
                L ${375 + 165 * Math.cos( ( idx * 30 - 105 ) * Math.PI / 180 )} ${375 + 165 * Math.sin( ( idx * 30 - 105 ) * Math.PI / 180 )} 
                A 165 165 0 0 1 ${375 + 165 * Math.cos( ( idx * 30 - 75 ) * Math.PI / 180 )} ${375 + 165 * Math.sin( ( idx * 30 - 75 ) * Math.PI / 180 )} 
                L ${375 + 90 * Math.cos( ( idx * 30 - 75 ) * Math.PI / 180 )} ${375 + 90 * Math.sin( ( idx * 30 - 75 ) * Math.PI / 180 )} 
                A 90 90 0 0 0 ${375 + 90 * Math.cos( ( idx * 30 - 105 ) * Math.PI / 180 )} ${375 + 90 * Math.sin( ( idx * 30 - 105 ) * Math.PI / 180 )} 
                Z`"
              class="transition-all duration-300 pointer-events-none"
              :style="{
                fill: getSegmentStyle( key.dim ).fill,
                stroke: getSegmentStyle( key.dim ).stroke,
                opacity: getSegmentStyle( key.dim ).fillOpacity
              }"
            />
            <text
              :x="375 + 130 * Math.cos( ( idx * 30 - 90 ) * Math.PI / 180 )"
              :y="375 + 130 * Math.sin( ( idx * 30 - 90 ) * Math.PI / 180 )"
              class="text-[15px] font-bold select-none cursor-pointer"
              text-anchor="middle"
              dominant-baseline="middle"
              :style="{
                fill: getSegmentStyle( key.dim ).isFamily ? getSegmentStyle( key.dim ).stroke : 'rgba(255,255,255,0.85)'
              }"
              @click="handleSelection( idx, 'dim' )"
            >
              {{ key.dim }}
            </text>

            <!-- Mode/Degree Indicator (Appears when Degrees enabled) -->
            <text
              v-if=" showDegrees && selectedKeyIdx !== null && ( idx === getNeighborIdx( selectedKeyIdx, -1 ) || idx === getNeighborIdx( selectedKeyIdx, 1 ) ) "
              :x="375 + 365 * Math.cos( ( idx * 30 - 90 ) * Math.PI / 180 )"
              :y="375 + 365 * Math.sin( ( idx * 30 - 90 ) * Math.PI / 180 )"
              class="text-[15px] font-black uppercase tracking-widest pointer-events-none fill-indigo-400 animate-pulse"
              text-anchor="middle"
              dominant-baseline="middle"
            >
              {{ idx === getNeighborIdx( selectedKeyIdx!, -1 ) ? 'IV' : 'V' }}
            </text>
          </g>

          <!-- Central Core Glow - Non-interactive decorative elements -->
          <circle
            cx="375"
            cy="375"
            r="85"
            class="fill-spectral-950 stroke-white/5 pointer-events-none"
            stroke-width="1"
          />
          <defs>
            <radialGradient id="centerGlow">
              <stop
                offset="0%"
                stop-color="rgba(99, 102, 241, 0.2)"
              />
              <stop
                offset="100%"
                stop-color="transparent"
              />
            </radialGradient>
          </defs>
          <circle
            cx="375"
            cy="375"
            r="85"
            fill="url(#centerGlow)"
            v-if=" showGlow "
            class="animate-pulse pointer-events-none"
          />
        </svg>

        <!-- Center Selection Display -->
        <div class="absolute inset-0 flex items-center justify-center pointer-events-none pt-4">
          <div
            v-if=" selectedKeyIdx !== null && activeKeys[selectedKeyIdx] "
            class="text-center animate-in fade-in zoom-in duration-500"
          >
            <span class="text-indigo-400 text-[9px] font-black uppercase tracking-[0.3em] block mb-1">Center</span>
            <h4 class="text-3xl font-black text-white italic tracking-tighter">
              {{
                selectedType === 'major' ? activeKeys[selectedKeyIdx]!.major :
                  selectedType === 'ii' ? activeKeys[selectedKeyIdx]!.ii :
                    selectedType === 'iii' ? activeKeys[selectedKeyIdx]!.iii :
                      selectedType === 'vi' ? activeKeys[selectedKeyIdx]!.vi :
                        selectedType === 'minor' ? activeKeys[selectedKeyIdx]!.vi :
                          activeKeys[selectedKeyIdx]!.dim
              }}
            </h4>
          </div>
          <div
            v-else
            class="text-center opacity-30"
          >
            <span class="text-2xl">🎡</span>
            <p class="text-[8px] text-white font-black uppercase tracking-widest mt-2">Explore</p>
          </div>
        </div>
      </div>

      <!-- Diatonic Zoom (Anatomy Panel) -->
      <div class="lg:col-span-5 space-y-6">
        <div class="glass-container p-8 min-h-[400px] flex flex-col">
          <div
            v-if=" selectedKeyIdx !== null && activeKeys[selectedKeyIdx] "
            class="space-y-8 animate-in slide-in-from-right-4 duration-500"
          >
            <!-- Anatomy Header -->
            <div class="flex justify-between items-start">
              <div>
                <p class="text-[13px] font-black text-indigo-400 uppercase tracking-[0.4em] mb-4">Key Family</p>
                <div class="flex items-center gap-3 mb-2">
                  <h3 class="text-5xl font-black text-slate-100 italic tracking-tighter">
                    {{ activeKeys[selectedKeyIdx]!.major }}
                  </h3>
                  <!-- Key Signature Badge -->
                  <div
                    class="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center gap-1"
                  >
                    <span class="text-2xl font-black text-indigo-400">
                      {{ activeKeys[selectedKeyIdx]!.signature === '0' ? '♮' : activeKeys[selectedKeyIdx]!.signature }}
                    </span>
                    <span class="text-[10px] font-black text-slate-500 uppercase">
                      {{ activeKeys[selectedKeyIdx]!.signature === '0' ? 'Natural' :
                        activeKeys[selectedKeyIdx]!.signature.includes( '♯' ) ? 'Sharp' + ( activeKeys[selectedKeyIdx]!.signature.charAt( 0 ) !== '1' ? 's' : '' ) :
                          'Flat' + ( activeKeys[selectedKeyIdx]!.signature.charAt( 0 ) !== '1' ? 's' : '' ) }}
                    </span>
                  </div>
                </div>
                <p class="text-[14px] text-slate-500 leading-relaxed italic">
                  Notes and chords belonging to the house of {{ activeKeys[selectedKeyIdx]!.major }} Major.
                </p>
              </div>

              <!-- Musical Staff Notation SVG - Enlarged & Detailed -->
              <div class="flex flex-col items-center gap-3">
                <div
                  class="w-36 h-24 bg-white/5 rounded-2xl border border-white/10 relative overflow-hidden flex items-center justify-center"
                >
                  <svg
                    viewBox="0 0 100 60"
                    class="w-full h-full stroke-white/20"
                  >
                    <!-- Staff Lines -->
                    <line
                      x1="10"
                      y1="15"
                      x2="90"
                      y2="15"
                      stroke-width="0.8"
                    />
                    <line
                      x1="10"
                      y1="25"
                      x2="90"
                      y2="25"
                      stroke-width="0.8"
                    />
                    <line
                      x1="10"
                      y1="35"
                      x2="90"
                      y2="35"
                      stroke-width="0.8"
                    />
                    <line
                      x1="10"
                      y1="45"
                      x2="90"
                      y2="45"
                      stroke-width="0.8"
                    />
                    <line
                      x1="10"
                      y1="55"
                      x2="90"
                      y2="55"
                      stroke-width="0.8"
                    />

                    <!-- Clef Symbol -->
                    <text
                      x="10"
                      y="50"
                      class="fill-indigo-400 font-serif text-5xl select-none"
                    >∮</text>

                    <!-- Triad Notes -->
                    <circle
                      cx="45"
                      cy="45"
                      r="5"
                      class="fill-white stroke-none"
                    />
                    <circle
                      cx="60"
                      cy="35"
                      r="5"
                      class="fill-white stroke-none opacity-80"
                    />
                    <circle
                      cx="75"
                      cy="25"
                      r="5"
                      class="fill-white stroke-none opacity-60"
                    />
                  </svg>
                </div>
                <!-- Note Labels (F - A - C) -->
                <p
                  class="text-[15px] font-black tracking-[0.3em] text-indigo-400 uppercase bg-indigo-500/5 px-3 py-1 rounded-full border border-indigo-500/10">
                  {{ currentTriadNotes.join( ' - ' ) || '???' }}
                </p>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2">
              <div
                v-for=" chord in getFamilyChords( selectedKeyIdx, selectedType ) "
                :key="chord.degree"
                class="p-4 rounded-2xl border transition-all group flex flex-col items-start gap-2"
                :class="[chord.bg, chord.border, 'hover:brightness-125 hover:scale-[1.02] cursor-pointer']"
                @click="selectChordByName( chord.name )"
              >
                <div class="flex items-center justify-between w-full">
                  <div
                    class="w-8 h-8 rounded-lg bg-black/20 flex items-center justify-center font-black text-[13px]"
                    :class="chord.color"
                  >
                    {{ chord.degree }}
                  </div>
                  <div
                    class="text-[10px] font-black uppercase"
                    :class="chord.color"
                  >
                    {{ chord.type }}
                  </div>
                </div>
                <div>
                  <p class="text-[16px] font-black text-slate-100 italic leading-tight">{{ chord.name }}</p>
                  <p class="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">{{ chord.desc }}</p>
                </div>
              </div>
            </div>

            <div class="p-6 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 flex gap-4">
              <span class="text-2xl mt-1">💡</span>
              <div>
                <h5 class="text-[13px] font-black text-indigo-300 uppercase tracking-widest mb-1">Mentor Fact</h5>
                <p class="text-[14px] text-slate-400 leading-relaxed">
                  {{ activeKeys[selectedKeyIdx]!.fact }}
                </p>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div
            v-else
            class="flex-1 flex flex-col items-center justify-center opacity-20 text-center"
          >
            <div
              class="w-20 h-20 rounded-full border border-dashed border-white/20 mb-6 flex items-center justify-center text-4xl"
            >
              🔭</div>
            <p class="font-black uppercase tracking-widest text-[10px] text-white">Deploy Scanner</p>
            <p class="text-xs text-slate-500 px-10 mt-2 italic mb-6">Select a key segment in the orbit to analyze its
              harmonic structure.</p>

            <div class="px-8 mt-4 border-t border-white/5 pt-8">
              <p class="text-[10px] text-slate-500 leading-relaxed max-w-[200px] mx-auto">
                Think of this wheel like a **Musical Clock**! Move right for bright "Sharps" and left for dreamy
                "Flats".
              </p>
            </div>
          </div>
        </div>
      </div>

    </div>

  </div>
</template>

<style scoped>
@reference "tailwindcss";

.glass-container {
  @apply rounded-[3rem] bg-white/5 border border-white/5 backdrop-blur-xl;
}

/* Ensure centering of rotating groups */
.origin-center {
  transform-origin: center;
}

/* Animations from standard UI set */
.animate-in {
  animation: animate-in 0.5s ease-out forwards;
}

@keyframes animate-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.perspective-500 {
  perspective: 500px;
}
</style>
