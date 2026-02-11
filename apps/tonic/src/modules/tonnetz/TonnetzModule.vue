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
import { useHarmonicTheory } from '../../composables/useHarmonicTheory';
import { useToolInfo } from '../../composables/useToolInfo';
import {
  HARMONIC_SELECTION_KEY,
  type HarmonicSelectionState
} from '../../composables/harmonicKeys';
import TonnetzLattice from '../../components/TonnetzLattice.vue';
import LocalSettingsDrawer from '../../components/settings/LocalSettingsDrawer.vue';
import SettingsTrigger from '../../components/settings/SettingsTrigger.vue';
import EngineSettings from '../../components/settings/EngineSettings.vue';
import InstrumentBrowser from '../../components/settings/InstrumentBrowser.vue';

// ─── COMPOSABLES ────────────────────────────────────────────────────

const { openInfo } = useToolInfo();
const { activate, deactivate } = useAudioEngine();
const {
  playTriad,
  pitchClassName,
  pitchClassIndex,
  PITCH_CLASSES
} = useHarmonicTheory();

// ─── AUDIO ENGINE LIFECYCLE ─────────────────────────────────────────
// Register when mounted, unregister when unmounted
onMounted( () => activate() );
onUnmounted( () => deactivate() );

// ─── EMITS ──────────────────────────────────────────────────────────

const emit = defineEmits( ['back'] );

// ─── STATE ──────────────────────────────────────────────────────────

const isSettingsOpen = ref( false );

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
const selectTriad = ( n1: string, n2: string, n3: string, type: 'major' | 'minor' ) => {
  selectedTriad.value = [n1, n2, n3];
  selectedTriadType.value = type;
  selectedRoot.value = n1;
  injectedTriadNotes.value = [n1, n2, n3];

  // Play the triad (using the shared playTriad from useHarmonicTheory)
  playTriad( n1, type );
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
        <button
          @click="openInfo( 'tonnetz' )"
          class="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center hover:bg-violet-500/20 transition-all active:scale-95"
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
              :visible-radius="3"
              :interactive="true"
              :highlight-triad="selectedTriad"
              :show-transform-labels="true"
              @select-note="handleNodeSelect"
            />

            <!-- Center Note Badge -->
            <div class="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20">
              <span class="text-[10px] font-black text-violet-400 uppercase tracking-widest">
                Center: {{ centerNote }}
              </span>
            </div>

            <!-- Last Transform Badge (shows briefly after a transform) -->
            <transition
              enter-active-class="transition duration-300 ease-out"
              enter-from-class="opacity-0 translate-y-2"
              enter-to-class="opacity-100 translate-y-0"
              leave-active-class="transition duration-500 ease-in"
              leave-from-class="opacity-100"
              leave-to-class="opacity-0"
            >
              <div
                v-if=" lastTransform "
                :key="transformAnimKey"
                class="absolute top-4 right-4 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20"
              >
                <span class="text-xs font-black text-emerald-400 uppercase tracking-widest">
                  Transform: {{ lastTransform }}
                </span>
              </div>
            </transition>
          </div>

          <!-- Quick Instructions -->
          <p class="text-[10px] text-slate-500 font-mono uppercase tracking-widest mt-4 text-center">
            Click any node to select a triad • Use P / L / R to transform
          </p>
        </div>
      </div>

      <!-- Right Panel: Selection Info + Transforms -->
      <div class="lg:col-span-4 space-y-6">

        <!-- Selected Triad Info -->
        <div class="glass-container p-8 min-h-[300px] flex flex-col">
          <div
            v-if=" selectedTriad.length === 3 "
            class="space-y-6 animate-in slide-in-from-right-4 duration-500"
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
                    class="block text-2xl font-black text-rose-400 mb-1 group-hover:scale-110 transition-transform">R</span>
                  <span class="text-[9px] font-bold text-slate-500">Relative</span>
                </button>
              </div>
            </div>

            <!-- Educational Tip -->
            <div class="p-5 rounded-2xl bg-violet-500/5 border border-violet-500/10">
              <span class="text-2xl">💡</span>
              <p class="text-[11px] text-slate-400 leading-relaxed mt-2">
                <span class="font-black text-violet-300">Neo-Riemannian theory</span> shows
                how chords connect by moving just
                <span class="text-white font-bold">one note</span> at a time. Try chaining
                transforms: <span class="font-mono text-violet-400">P → L → R</span> to
                explore "parsimonious voice leading."
              </p>
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
              🔺
            </div>
            <p class="font-black uppercase tracking-widest text-[10px] text-white">Explore the Lattice</p>
            <p class="text-xs text-slate-500 px-10 mt-2 italic mb-6">
              Click any node to build a triad and explore harmonic relationships on the Tonnetz.
            </p>
            <div class="px-8 mt-4 border-t border-white/5 pt-8">
              <p class="text-[10px] text-slate-500 leading-relaxed max-w-[200px] mx-auto">
                Each triangle is a chord. Upward ▲ = Major, Downward ▼ = minor. Nodes along
                each axis are separated by fifths, major thirds, and minor thirds.
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
