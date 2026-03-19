<script setup lang="ts">
/**
 * Tonnetz Module — Full Interactive Neo-Riemannian Lattice Explorer
 *
 * The Tonnetz (German for "tone network") is a grid where every node is a
 * pitch class and every triangle is a triad. This tool lets you:
 *   - Click nodes to hear triads
 *   - Apply Neo-Riemannian transforms (P, L, R) to morph between chords
 *   - Explore harmonic relationships visually
 *
 * Neo-Riemannian transforms explain how chords can smoothly morph by
 * moving just one note by one or two semitones:
 *   P (Parallel):  C Major ↔ C minor (change the 3rd)
 *   L (Leading-tone): C Major ↔ E minor (change the root)
 *   R (Relative):  C Major ↔ A minor (change the 5th)
 *
 * @module modules/tonnetz/TonnetzModule
 */

import { ref, computed, provide, onMounted, onUnmounted } from 'vue';
import {
  useAudioEngine,
  useGlobalEngine
} from '@spectralsuite/core';
import { Chord, Note } from 'tonal';
import { useHarmonicTheory } from '../../composables/useHarmonicTheory';
import IntelligenceButton from '../../components/IntelligenceButton.vue';
import { useSongDatabase } from '../../composables/useSongDatabase';
import {
  HARMONIC_SELECTION_KEY,
  type HarmonicSelectionState
} from '../../composables/harmonicKeys';
import TonnetzLattice from '../../components/TonnetzLattice.vue';
import HarmonicDNA from '../../components/HarmonicDNA.vue';
import LocalSettingsDrawer from '../../components/settings/LocalSettingsDrawer.vue';
import SettingsTrigger from '../../components/settings/SettingsTrigger.vue';
import EngineSettings from '../../components/settings/EngineSettings.vue';
import InstrumentBrowser from '../../components/settings/InstrumentBrowser.vue';
import type { ScoredSuggestion, SongEntry } from '@spectralsuite/core';

// ─── COMPOSABLES ────────────────────────────────────────────────────

const { activate, deactivate } = useAudioEngine();
const {
  playTriad,
  pitchClassName,
  pitchClassIndex,
  PITCH_CLASSES
} = useHarmonicTheory();

const {
  trackMovement,
  isDatabaseReady,
  isImporting,
  importProgress,
  currentPath,
  chordHistory,
  initDatabase,
  getHybridSuggestions,
  removeChord,
  clearHistory
} = useSongDatabase();

// ─── LOCAL STATE ──────────────────────────────────────────────────

const activeComparisonPath = ref<any[]>( [] );

// ─── AUDIO ENGINE LIFECYCLE ─────────────────────────────────────────
// Register when mounted, unregister when unmounted
onMounted( () => {
  activate();
  initDatabase();
  console.log( 'TonnetzModule: Database status:', { isDatabaseReady: isDatabaseReady.value, isImporting: isImporting.value } );
} );
onUnmounted( () => deactivate() );

// ─── EMITS ──────────────────────────────────────────────────────────

const emit = defineEmits( ['back', 'reset'] );

// ─── STATE ──────────────────────────────────────────────────────────

const isSettingsOpen = ref( false );

/**
 * Data-driven chord recommendations
 */
const suggestions = ref<ScoredSuggestion[]>( [] );

/**
 * Songs with similar harmonic paths
 */
const similarSongs = ref<{ song: SongEntry, score: number }[]>( [] );

/**
 * Resolved Spotify metadata for the similar songs
 */
const resolvedMetadata = ref<Record<string, any>>( {} );

/**
 * Tracks if we've hit Spotify Development Mode restrictions (403s)
 */
const hasSpotifyDevRestriction = ref( false );

/**
 * The pitch class name at the center of the lattice.
 * Changing this re-centers the entire grid around a new note.
 */
const centerNote = ref( 'C' );

/**
 * The currently selected triad, stored as 3 pitch class names.
 * e.g. ['C', 'E', 'G'] for C Major or ['C', 'Eb', 'G'] for C minor.
 *
 * Empty array = nothing selected.
 */
const selectedTriad = ref<string[]>( [] );

/**
 * Whether the selected triad is Major or Minor.
 * This determines which Neo-Riemannian transforms are available.
 */
const selectedTriadType = ref<'major' | 'minor'>( 'major' );

/**
 * The root note of the currently selected triad.
 * Used for display in the info panel.
 */
const selectedRoot = ref( '' );

/**
 * Tracks the last applied transform for the animation label display.
 */
const lastTransform = ref<string | null>( null );

/**
 * Animation key — bumped on each transform to restart CSS animations.
 */
const transformAnimKey = ref( 0 );

/**
 * Active tab for the sidebar panel.
 */
const activeTab = ref<'selection' | 'suggestions' | 'songs'>( 'selection' );

// ─── PROVIDE/INJECT ─────────────────────────────────────────────────

/**
 * We "provide" the selection state so any child component (e.g. a future
 * sub-panel) can inject it without prop-drilling.
 *
 * The `selectedKeyIdx` and `selectedType` are mapped from our local
 * triad state for compatibility with the shared interface.
 */
const injectedKeyIdx = ref<number | null>( null );
const injectedType = ref<'major' | 'minor' | 'dim' | 'ii' | 'iii' | 'vi'>( 'major' );
const injectedActiveKeys = computed( () => useHarmonicTheory().activeKeys.value );
const injectedTriadNotes = ref<string[]>( [] );

provide( HARMONIC_SELECTION_KEY, {
  selectedKeyIdx: injectedKeyIdx,
  selectedType: injectedType,
  activeKeys: injectedActiveKeys,
  currentTriadNotes: injectedTriadNotes
} as HarmonicSelectionState );

// ─── SETTINGS ───────────────────────────────────────────────────────

const drawerCategories = computed( () => [
  {
    id: 'general',
    label: 'General',
    description: 'Lattice Configuration',
    showIndicator: centerNote.value !== 'C'
  },
  {
    id: 'instruments',
    label: 'Instruments',
    description: 'Real Tone Samples'
  },
  {
    id: 'engine',
    label: 'Engine',
    description: 'Global Audio Processing',
    showIndicator: useGlobalEngine().isGlobalEngineActive.value
  }
] );

// ─── NEO-RIEMANNIAN TRANSFORMS ──────────────────────────────────────

/**
 * Applies Neo-Riemannian transform P (Parallel).
 *
 * P swaps between Major ↔ minor by moving the middle note (the 3rd):
 *   C Major [C, E, G] → C minor [C, Eb, G]  (E moves down to Eb)
 *   C minor [C, Eb, G] → C Major [C, E, G]  (Eb moves up to E)
 *
 * Only the 3rd changes — root and 5th stay fixed.
 * This is called "Parallel" because C Major and C minor share the same root.
 */
const applyP = () => {
  if ( selectedTriad.value.length !== 3 ) return;

  const root = selectedTriad.value[0]!;
  const fifth = selectedTriad.value[2]!;
  const rootPc = pitchClassIndex( root );

  if ( selectedTriadType.value === 'major' ) {
    // Major → minor: lower the 3rd by 1 semitone
    // Major 3rd (4 semitones) → minor 3rd (3 semitones)
    const newThird = pitchClassName( rootPc + 3 );
    selectTriad( root!, newThird, fifth!, 'minor' );
  } else {
    // minor → Major: raise the 3rd by 1 semitone
    const newThird = pitchClassName( rootPc + 4 );
    selectTriad( root!, newThird, fifth!, 'major' );
  }

  lastTransform.value = 'P';
  transformAnimKey.value++;

  // P keeps the same root, so re-center on the (unchanged) root
  centerNote.value = selectedTriad.value[0]!;
};

/**
 * Applies Neo-Riemannian transform L (Leading-tone exchange).
 *
 * L moves the note that is NOT shared between the Major and minor triads
 * built on its root:
 *   C Major [C, E, G] → E minor [B, E, G]  (C moves down to B)
 *   E minor [B, E, G] → C Major [C, E, G]  (B moves up to C)
 *
 * It's called "Leading-tone" because:
 *   In C Major, B is the leading tone (7th degree, wants to resolve to C).
 *   L swaps between C and its leading tone B.
 */
const applyL = () => {
  if ( selectedTriad.value.length !== 3 ) return;

  const root = selectedTriad.value[0]!;
  const third = selectedTriad.value[1]!;
  const fifth = selectedTriad.value[2]!;
  const rootPc = pitchClassIndex( root );

  if ( selectedTriadType.value === 'major' ) {
    // Major → minor: move root down 1 semitone, reinterpret
    // C Major [C, E, G] → E minor [B, E, G]
    const newRoot = pitchClassName( rootPc - 1 );
    selectTriad( newRoot, third!, fifth!, 'minor' );
  } else {
    // minor → Major: move 5th up 1 semitone, reinterpret
    // E minor [B, E, G] → C Major [C, E, G]
    const fifthPc = pitchClassIndex( fifth! );
    const newFifth = pitchClassName( fifthPc + 1 );
    selectTriad( root!, third!, newFifth, 'major' );
  }

  lastTransform.value = 'L';
  transformAnimKey.value++;

  // L changes the root — re-center lattice on the new root (triggers FLIP)
  centerNote.value = selectedTriad.value[0]!;
};

/**
 * Applies Neo-Riemannian transform R (Relative).
 *
 * R connects a Major key to its Relative minor (and vice versa):
 *   C Major [C, E, G] → A minor [A, C, E]  (G moves down to... wait.)
 *
 * More precisely:
 *   Major → minor: move the 5th down 2 semitones to become the new root
 *   C Major [C, E, G] → A minor [A, C, E]  (G→A conceptually, C and E stay)
 *
 * It's called "Relative" because C Major and A minor are relative keys
 * (they share all the same notes in their scales).
 */
const applyR = () => {
  if ( selectedTriad.value.length !== 3 ) return;

  const root = selectedTriad.value[0]!;
  const third = selectedTriad.value[1]!;
  const fifth = selectedTriad.value[2]!;
  const rootPc = pitchClassIndex( root );
  const fifthPc = pitchClassIndex( fifth );

  if ( selectedTriadType.value === 'major' ) {
    // Major → minor: move 5th up 2 semitones
    // C Major [C, E, G] → A minor [A, C, E]
    const newNote = pitchClassName( fifthPc + 2 );
    selectTriad( root!, third!, newNote, 'minor' );
  } else {
    // minor → Major: move root down 2 semitones
    // A minor [A, C, E] → C Major [C, E, G]
    const newNote = pitchClassName( rootPc - 2 );
    selectTriad( newNote, root!, third!, 'major' );
  }

  lastTransform.value = 'R';
  transformAnimKey.value++;

  // R changes the root — re-center lattice on the new root (triggers FLIP)
  centerNote.value = selectedTriad.value[0]!;
};

// ─── TRIAD SELECTION ────────────────────────────────────────────────

/**
 * Sets the currently selected triad and plays its notes.
 *
 * @param n1 - First pitch class name (root or lowest note)
 * @param n2 - Second pitch class name (3rd)
 * @param n3 - Third pitch class name (5th)
 * @param type - Whether this triad is Major or minor
 */
const selectTriad = async ( n1: string, n2: string, n3: string, type: 'major' | 'minor' ) => {
  selectedTriad.value = [n1, n2, n3];
  selectedTriadType.value = type;
  selectedRoot.value = n1;
  injectedTriadNotes.value = [n1, n2, n3];

  // Play the triad (using the shared playTriad from useHarmonicTheory)
  playTriad( n1, type );

  // Data-Driven Features
  const chordSymbol = `${n1}${type === 'minor' ? 'm' : ''}`;
  suggestions.value = await getHybridSuggestions( chordSymbol );

  const matches = await trackMovement( chordSymbol );
  similarSongs.value = matches;

  // Resolve metadata for new matches
  for ( const item of matches ) {
    if ( item.song.spotifyId && !resolvedMetadata.value[item.song.spotifyId] ) {
      // Pass both SpotifyID and internal SongID to enable sidecar caching
      useSongDatabase().resolveSongMetadata( item.song.spotifyId, item.song.id ).then( meta => {
        if ( meta ) {
          resolvedMetadata.value[item.song.spotifyId!] = meta;
        } else {
          // If we get null back, it's likely a 403 restriction in Dev Mode
          hasSpotifyDevRestriction.value = true;
        }
      } );
    }
  }
};

/**
 * Handles a node click from the TonnetzLattice component.
 *
 * When a node is clicked, we build the Major triad rooted on that note
 * and select it. We also re-center the lattice on the clicked note.
 *
 * @param note - The pitch class name of the clicked node
 */
const handleNodeSelect = ( note: string ) => {
  const pc = pitchClassIndex( note );

  // Build a Major triad: root + Major 3rd (4 semitones) + Perfect 5th (7 semitones)
  const third = pitchClassName( pc + 4 );
  const fifth = pitchClassName( pc + 7 );

  selectTriad( note, third, fifth, 'major' );
  centerNote.value = note;
};

/**
 * Handles clicking a triangle (triad) on the lattice.
 * This is the primary way to select both Major and Minor chords.
 */
const handleTriadSelect = ( notes: string[], type: 'major' | 'minor' ) => {
  if ( notes.length < 3 ) return;

  // Use Tonal to get canonical name (e.g. "Am", "C")
  const detected = Chord.detect( notes );
  const chordName = detected[0] || ( notes[0] + ( type === 'minor' ? 'm' : '' ) );

  // Re-center on the first note
  centerNote.value = notes[0];

  selectTriad( notes[0], notes[1], notes[2], type );
};

/**
 * Gets a human-readable chord name from the triad.
 * e.g. ['C', 'E', 'G'] + 'major' → "C Major"
 *      ['A', 'C', 'E'] + 'minor' → "A minor"
 */
const chordDisplayName = computed( () => {
  if ( !selectedRoot.value ) return '';
  return `${selectedRoot.value} ${selectedTriadType.value === 'major' ? 'Major' : 'minor'}`;
} );

/**
 * Gets the interval names for educational display.
 * Shows what intervals make up the current triad.
 */
const intervalDisplay = computed( () => {
  if ( selectedTriad.value.length !== 3 ) return [];

  if ( selectedTriadType.value === 'major' ) {
    return [
      { note: selectedTriad.value[0], label: 'Root', color: 'text-indigo-400' },
      { note: selectedTriad.value[1], label: 'Major 3rd', color: 'text-emerald-400' },
      { note: selectedTriad.value[2], label: 'Perfect 5th', color: 'text-sky-400' }
    ];
  } else {
    return [
      { note: selectedTriad.value[0], label: 'Root', color: 'text-rose-400' },
      { note: selectedTriad.value[1], label: 'minor 3rd', color: 'text-amber-400' },
      { note: selectedTriad.value[2], label: 'Perfect 5th', color: 'text-sky-400' }
    ];
  }
} );
const resetLattice = () => {
  centerNote.value = 'C';
  selectedTriad.value = [];
  selectedRoot.value = '';
  suggestions.value = [];
  similarSongs.value = [];
  activeComparisonPath.value = [];
  lastTransform.value = null;
  activeTab.value = 'selection';
  clearHistory();
  emit( 'reset' );
};
</script>

<template>
  <div class="space-y-8 max-w-6xl mx-auto px-6">

    <!-- Module Header -->
    <header class="flex justify-between items-end animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <button
          @click="emit( 'back' )"
          class="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 hover:text-white transition-colors mb-4 flex items-center gap-2"
        >
          <span>←</span> Back to Tonic
        </button>
        <h2 class="text-4xl font-black text-white italic tracking-tighter uppercase">
          Tonnetz <span class="text-violet-500">Lab</span>
          <span class="text-violet-400 text-lg">Explorer</span>
        </h2>
        <p class="text-slate-500 text-xs font-mono uppercase tracking-widest mt-1">
          Neo-Riemannian Tone Network &amp; Harmonic Lattice
        </p>
      </div>
      <div class="flex items-center gap-3">
        <!-- Reset Button -->
        <button
          @click="resetLattice"
          class="w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-slate-400 flex items-center justify-center hover:bg-white/10 hover:text-white transition-all active:scale-95"
          title="Reset Lattice"
        >
          <span class="text-lg">↻</span>
        </button>
<IntelligenceButton
          toolId="tonnetz"
          label="Learn & How-To"
          colorClass="text-indigo-400"
          bgClass="bg-indigo-500/10"
          borderClass="border-indigo-500/20"
        />


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
            <h4 class="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Center Note</h4>

            <!-- Note Picker Grid -->
            <div class="grid grid-cols-4 gap-2">
              <button
                v-for=" note in PITCH_CLASSES "
                :key="note"
                @click="centerNote = note"
                class="p-3 rounded-xl border transition-all text-center font-black text-sm uppercase"
                :class="centerNote === note
                  ? 'bg-violet-500/20 border-violet-500/50 text-violet-400'
                  : 'bg-slate-900/50 border-white/5 text-slate-500 hover:bg-slate-800 hover:text-slate-400'"
              >
                {{ note }}
              </button>
            </div>
          </div>
        </div>
      </template>

      <template #engine>
        <EngineSettings />
      </template>

      <template #instruments>
        <InstrumentBrowser />
      </template>
    </LocalSettingsDrawer>

    <!-- Main Content Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

      <!-- Tonnetz Lattice (Main Visualization) -->
      <div class="lg:col-span-8 flex justify-center">
        <div
          class="glass-container p-6 w-full animate-in fade-in zoom-in-95 duration-700"
          style="animation-delay: 0.1s"
        >
          <!-- Lattice Viewport -->
          <div class="relative overflow-hidden rounded-2xl bg-spectral-950/50 border border-white/5">
            <TonnetzLattice
              :width="650"
              :height="450"
              :center-note="centerNote"
              :path="currentPath"
              :comparison-path="activeComparisonPath"
              :highlight-triad="selectedTriad"
              :suggested-notes="suggestions.map( s => s.chord.replace( /m$/, '' ) )"
              :show-transform-labels="true"
              @select-note="handleNodeSelect"
              @select-triad="handleTriadSelect"
            />

            <!-- Floating Action Button for Indicators -->
            <div class="absolute bottom-6 left-6 flex flex-col items-start gap-2 group z-10">
              <!-- Expanded State (Unraveled) -->
              <div
                class="flex flex-col gap-2 transition-all duration-300 origin-bottom-left scale-0 opacity-0 group-hover:scale-100 group-hover:opacity-100"
              >
                <!-- Center Note Badge -->
                <div
                  class="px-4 py-2 rounded-xl bg-white border border-violet-500/30 backdrop-blur-md shadow-xl flex items-center gap-3 "
                >
                  <div class="text-[9px] text-centfont-black text-slate-400 uppercase tracking-widest">Center</div>
                  <div class="text-xs text-centerfont-black text-violet-400">{{ centerNote }}</div>
                </div>

                <!-- Last Transform Badge -->
                <div
                  v-if=" lastTransform "
                  class="px-4 py-2 rounded-xl bg-spectral-900/90 border border-emerald-500/30 backdrop-blur-md shadow-xl flex items-center gap-3"
                >
                  <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Action</div>
                  <div class="text-xs font-black text-emerald-400">{{ lastTransform }}</div>
                </div>

                <!-- Reset Lattice Button -->
                <button
                  @click="resetLattice"
                  class="px-4 py-2 rounded-xl bg-spectral-900/90 border border-red-500/30 backdrop-blur-md shadow-xl flex items-center gap-3 hover:bg-red-500/10 transition-colors text-left"
                >
                  <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Reset</div>
                  <div class="text-xs font-bold text-red-400">Reset Lattice</div>
                </button>

                <!-- Legend / Help -->
                <div
                  class="px-4 py-3 rounded-xl bg-spectral-900/90 border border-white/10 backdrop-blur-md shadow-xl flex flex-col gap-2"
                >
                  <div class="flex items-center gap-2">
                    <div class="w-3 h-0.5 bg-white/30 border-t border-white/50 border-dashed"></div>
                    <span class="text-[9px] text-slate-400 uppercase tracking-wider">Dotted Line = Your Path</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <div class="w-2 h-2 rounded-full border border-yellow-500/50"></div>
                    <span class="text-[9px] text-slate-400 uppercase tracking-wider">Yellow Ring = Selected</span>
                  </div>
                </div>
              </div>

              <!-- FAB Trigger -->
              <button
                class="w-8 h-8 rounded-full bg-white/5 border border-white/10 text-slate-400 flex items-center justify-center hover:bg-white/10 hover:text-white hover:border-white/20 transition-all active:scale-95 group-hover:bg-violet-500/20 group-hover:text-violet-300 group-hover:border-violet-500/30"
              >
                <span class="text-xs">ℹ️</span>
              </button>
            </div>
          </div>

          <!-- Quick Instructions -->
          <p class="text-[10px] text-slate-500 font-mono uppercase tracking-widest mt-4 text-center">
            Click any node to select a triad • Use P / L / R to transform
          </p>

          <!-- Progression Ledger (Visual Chord History) -->
          <div
            v-if=" chordHistory.length > 0 "
            class="mt-6 pt-6 border-t border-white/5 animate-in fade-in slide-in-from-bottom-2 duration-500"
          >
            <div class="flex items-center justify-between mb-4 px-2">
              <h4 class="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <span>Progression Ledger</span>
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              </h4>
              <span class="text-[9px] font-mono text-slate-600 uppercase">{{ chordHistory.length }} steps</span>
            </div>

            <div class="flex items-center gap-3 overflow-x-auto pb-4 custom-scrollbar px-1">
              <div
                v-for=" ( chord, idx ) in chordHistory "
                :key="idx"
                class="flex items-center shrink-0"
              >
                <!-- Chord Card -->
                <div
                  class="group relative px-5 py-3 rounded-2xl bg-white/5 border border-white/5 flex flex-col items-center justify-center min-w-[70px] hover:bg-violet-500/10 hover:border-violet-500/20 transition-all duration-300"
                >
                  <!-- Delete Button -->
                  <button
                    @click.stop="removeChord( idx )"
                    class="absolute top-1 right-1 p-1 text-red-500/60 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all duration-200 z-10"
                    title="Remove chord"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="3"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <line
                        x1="18"
                        y1="6"
                        x2="6"
                        y2="18"
                      ></line>
                      <line
                        x1="6"
                        y1="6"
                        x2="18"
                        y2="18"
                      ></line>
                    </svg>
                  </button>

                  <span class="text-lg font-black text-white italic tracking-tighter">{{ chord }}</span>
                  <span
                    class="text-[8px] font-bold text-slate-500 uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity"
                  >Beat {{ idx + 1 }}</span>
                </div>

                <!-- Connector -->
                <div
                  v-if=" idx < chordHistory.length - 1 "
                  class="mx-2 w-6 h-0.5 bg-gradient-to-r from-white/10 to-transparent rounded-full flex items-center justify-center"
                >
                  <div class="w-1 h-1 rounded-full bg-white/20"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Panel: Tabbed Interface -->
      <div class="lg:col-span-4 flex flex-col h-full">

        <!-- Unified Tabbed Sidebar -->
        <div class="glass-container p-0 overflow-hidden flex flex-col min-h-[600px]">
          <!-- Tab Headers -->
          <div class="flex border-b border-white/5 bg-white/5">
            <button
              @click="activeTab = 'selection'"
              class="flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-colors hover:bg-white/5"
              :class="activeTab === 'selection' ? 'text-indigo-400 bg-white/5 border-b-2 border-indigo-500' : 'text-slate-500'"
            >
              Current
            </button>
            <button
              @click="activeTab = 'suggestions'"
              class="flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-colors hover:bg-white/5"
              :class="activeTab === 'suggestions' ? 'text-violet-400 bg-white/5 border-b-2 border-violet-500' : 'text-slate-500'"
            >
              Ex. Moves
            </button>
            <button
              @click="activeTab = 'songs'"
              class="flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-colors hover:bg-white/5"
              :class="activeTab === 'songs' ? 'text-emerald-400 bg-white/5 border-b-2 border-emerald-500' : 'text-slate-500'"
            >
              Songs
            </button>
          </div>

          <!-- Tab Content -->
          <div class="p-6 flex-1 flex flex-col relative">

            <!-- SELECTION TAB -->
            <div
              v-if=" activeTab === 'selection' "
              class="flex-1 flex flex-col animate-in fade-in slide-in-from-left-4 duration-300"
            >
              <div
                v-if=" selectedTriad.length === 3 "
                class="space-y-6"
                :key="transformAnimKey"
              >
                <!-- Chord Name -->
                <div>
                  <p class="text-[13px] font-black text-violet-400 uppercase tracking-[0.4em] mb-3">
                    Selected Triad
                  </p>
                  <h3 class="text-4xl font-black text-white italic tracking-tighter">
                    {{ chordDisplayName }}
                  </h3>
                  <p class="text-[10px] text-slate-500 uppercase tracking-widest mt-2">
                    {{ selectedTriadType === 'major' ? '▲ Major (upward triangle)' : '▼ Minor (downward triangle)' }}
                  </p>
                </div>

                <!-- Interval Breakdown -->
                <div class="space-y-2">
                  <h4 class="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    Intervals
                  </h4>
                  <div
                    v-for=" ( interval, i ) in intervalDisplay "
                    :key="i"
                    class="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5"
                  >
                    <div
                      class="w-8 h-8 rounded-lg bg-black/30 flex items-center justify-center font-black text-[15px]"
                      :class="interval.color"
                    >
                      {{ interval.note }}
                    </div>
                    <span class="text-xs font-bold text-slate-400">{{ interval.label }}</span>
                  </div>
                </div>

                <!-- Neo-Riemannian Transform Buttons -->
                <div class="space-y-3 pt-4 border-t border-white/5">
                  <h4 class="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    Transforms
                  </h4>
                  <div class="grid grid-cols-3 gap-2">
                    <!-- P (Parallel) -->
                    <button
                      @click="applyP"
                      class="transform-btn group p-4 rounded-2xl border transition-all text-center bg-indigo-500/5 border-indigo-500/20 hover:bg-indigo-500/15 hover:border-indigo-500/40 active:scale-95"
                    >
                      <span
                        class="block text-2xl font-black text-indigo-400 mb-1 group-hover:scale-110 transition-transform"
                      >P</span>
                      <span class="text-[9px] font-bold text-slate-500">Parallel</span>
                    </button>

                    <!-- L (Leading-tone) -->
                    <button
                      @click="applyL"
                      class="transform-btn group p-4 rounded-2xl border transition-all text-center bg-emerald-500/5 border-emerald-500/20 hover:bg-emerald-500/15 hover:border-emerald-500/40 active:scale-95"
                    >
                      <span
                        class="block text-2xl font-black text-emerald-400 mb-1 group-hover:scale-110 transition-transform"
                      >L</span>
                      <span class="text-[9px] font-bold text-slate-500">Leading</span>
                    </button>

                    <!-- R (Relative) -->
                    <button
                      @click="applyR"
                      class="transform-btn group p-4 rounded-2xl border transition-all text-center bg-rose-500/5 border-rose-500/20 hover:bg-rose-500/15 hover:border-rose-500/40 active:scale-95"
                    >
                      <span
                        class="block text-2xl font-black text-rose-400 mb-1 group-hover:scale-110 transition-transform"
                      >R</span>
                      <span class="text-[9px] font-bold text-slate-500">Relative</span>
                    </button>
                  </div>
                </div>
              </div>

              <!-- Empty State -->
              <div
                v-else
                class="flex-1 flex flex-col items-center justify-center opacity-20 text-center py-12"
              >
                <div
                  class="w-20 h-20 rounded-full border border-dashed border-white/20 mb-6 flex items-center justify-center text-4xl"
                >
                  🔺
                </div>
                <p class="font-black uppercase tracking-widest text-[10px] text-white">Explore the Lattice</p>
                <p class="text-xs text-slate-500 px-10 mt-2 italic">
                  Click any node to build a triad and explore harmonic relationships on the Tonnetz.
                </p>
              </div>
            </div>

            <!-- SUGGESTIONS TAB -->
            <div
              v-else-if=" activeTab === 'suggestions' "
              class="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300"
            >
              <div class="flex items-center justify-between mb-2">
                <p class="text-[10px] text-slate-500 uppercase tracking-widest">
                  Next Moves
                </p>
                <div
                  v-if=" !isDatabaseReady "
                  class="text-[8px] text-amber-500 animate-pulse font-black uppercase"
                >
                  Loading Database...
                </div>
              </div>

              <div
                v-if=" suggestions.length > 0 "
                class="grid grid-cols-2 gap-2"
              >
                <button
                  v-for=" s in suggestions "
                  :key="s.chord"
                  @click="handleNodeSelect( s.chord.replace( /m$/, '' ) )"
                  class="p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-violet-500/10 hover:border-violet-500/30 transition-all text-left group"
                >
                  <div class="flex justify-between items-center mb-1">
                    <span class="text-sm font-black text-white">{{ s.chord }}</span>
                    <span class="text-[9px] font-mono text-slate-500">
                      {{ Math.round( s.score * 100 ) }}%
                    </span>
                  </div>
                  <div class="text-[8px] uppercase tracking-tighter text-slate-500 group-hover:text-violet-400">
                    {{ s.reason }}
                  </div>
                </button>
              </div>
              <div
                v-else
                class="py-8 text-center opacity-30"
              >
                <p class="text-[9px] uppercase tracking-widest">Select a chord to see best-fit paths</p>
              </div>
            </div>

            <!-- SIMILAR SONGS TAB -->
            <div
              v-else-if=" activeTab === 'songs' "
              class="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300"
            >
              <div class="flex items-center justify-between mb-2">
                <p class="text-[10px] text-slate-500 uppercase tracking-widest">
                  Matches Pattern
                </p>
                <div
                  v-if=" hasSpotifyDevRestriction "
                  class="group relative"
                >
                  <span
                    class="text-[10px] bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded-full cursor-help font-black tracking-tighter"
                  >DEV MODE LIMIT</span>
                  <div
                    class="absolute right-0 bottom-full mb-2 w-48 p-3 rounded-xl bg-slate-900 border border-white/10 text-[9px] text-slate-400 leading-relaxed shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50"
                  >
                    Spotify restricts major label metadata (Beatles, etc.) for apps in Development Mode. Only
                    whitelisted
                    test users can see these.
                  </div>
                </div>
              </div>

              <div
                v-if=" similarSongs.length > 0 "
                class="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar"
              >
                <div
                  v-for=" item in similarSongs "
                  :key="item.song.id"
                  @click="activeComparisonPath = ( activeComparisonPath === item.matchedPath ? [] : item.matchedPath )"
                  class="p-3 rounded-xl bg-spectral-900/50 border flex gap-4 items-center group transition-all hover:bg-white/5 cursor-pointer"
                  :class="activeComparisonPath === item.matchedPath ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-white/5'"
                >
                  <!-- Album Art -->
                  <div
                    v-if=" item.song.spotifyId && resolvedMetadata[item.song.spotifyId] "
                    class="w-12 h-12 shrink-0 rounded-lg overflow-hidden bg-black/40 border border-white/10"
                  >
                    <img
                      :src="resolvedMetadata[item.song.spotifyId].artwork"
                      class="w-full h-full object-cover"
                    >
                  </div>
                  <div
                    v-else
                    class="w-12 h-12 shrink-0 rounded-lg bg-white/5 flex items-center justify-center text-xs opacity-20"
                  >
                    🎵
                  </div>

                  <div class="flex-1 min-w-0">
                    <template v-if=" item.song.spotifyId && resolvedMetadata[item.song.spotifyId] ">
                      <p class="text-xs font-bold text-white truncate">{{ resolvedMetadata[item.song.spotifyId].title }}
                      </p>
                      <p class="text-[10px] text-indigo-400 truncate">{{ resolvedMetadata[item.song.spotifyId].artist }}
                      </p>
                    </template>
                    <template v-else>
                      <p class="text-xs font-bold text-white mb-0.5">Song #{{ item.song.id }}</p>
                    </template>

                    <!-- Harmonic DNA Sparkline -->
                    <div class="mt-2 flex items-center gap-2">
                      <HarmonicDNA
                        :path="item.matchedPath"
                        :width="60"
                        :height="15"
                        :color="activeComparisonPath === item.matchedPath ? '#10b981' : '#64748b'"
                        :glow="activeComparisonPath === item.matchedPath"
                      />
                      <span
                        class="text-[8px] font-black uppercase tracking-tighter text-slate-500 group-hover:text-emerald-400 transition-colors"
                      >
                        {{ activeComparisonPath === item.matchedPath ? 'Plotted' : 'Plot DNA' }}
                      </span>
                    </div>

                    <div class="flex items-center gap-2 mt-1">
                      <p class="text-[8px] text-slate-500 uppercase tracking-widest">{{ item.song.genre }} •
                        {{ item.song.decade }}
                      </p>
                      <a
                        v-if=" item.song.spotifyId "
                        :href="`https://open.spotify.com/track/${item.song.spotifyId}`"
                        target="_blank"
                        class="text-[10px] grayscale hover:grayscale-0 opacity-50 hover:opacity-100 transition-all"
                        title="Open in Spotify"
                        @click.stop
                      >
                        Spotify ↗
                      </a>
                    </div>
                  </div>
                  <!-- Score Badge -->
                  <div class="text-[10px] font-mono font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-md">
                    {{ Math.round( item.score * 100 ) }}%
                  </div>
                </div>
              </div>
              <div
                v-else
                class="py-8 text-center opacity-30"
              >
                <p class="text-[9px] uppercase tracking-widest">
                  {{ currentPath.length < 2 ? 'Play 2+ chords to find matches' : 'No similar songs found' }}
                </p>
              </div>
            </div>

          </div>
        </div>

      </div>


    </div>



    <!-- Data Import Overlay -->
    <transition
      enter-active-class="transition duration-500 ease-out"
      enter-from-class="opacity-0 scale-105"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-1000 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if=" isImporting "
        class="fixed inset-0 z-100 bg-spectral-950/90 backdrop-blur-3xl flex flex-col items-center justify-center p-6 text-center"
      >
        <div class="w-16 h-16 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin mb-8"></div>
        <h3 class="text-3xl font-black text-white tracking-tighter uppercase italic mb-4">
          Syncing <span class="text-violet-500">Chordonomicon</span>
        </h3>
        <p class="text-slate-400 max-w-sm text-sm leading-relaxed mb-8">
          We are downloading the compressed Spectral Database (20MB). This only happens once.
        </p>
        <div class="w-64 h-1.5 bg-white/5 rounded-full overflow-hidden mb-2">
          <div
            class="h-full bg-violet-500 transition-all duration-300 ease-out"
            :style="{ width: `${importProgress}%` }"
          ></div>

 
      </div>
        <p class="text-[10px] font-mono text-violet-400 font-bold opacity-80">
          {{ Math.round( importProgress ) }}%
        </p>

 
    </div>
    </transition>
  </div>
</template>

<style scoped>
@reference "tailwindcss";

.glass-container {
  @apply rounded-lg bg-white/5 border border-white/5 backdrop-blur-xl;
}

/* Animations */
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

/* Transform button hover pulse */
.transform-btn {
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.transform-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
}

.transform-btn:active {
  transform: scale(0.95) translateY(0);
}
</style>
