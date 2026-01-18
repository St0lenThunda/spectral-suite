<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useChordCapture, useAudioEngine, ChordEngine, SynthEngine, type ChordMatch, useGlobalEngine, Fretboard } from '@spectralsuite/core'
import { useToolInfo } from '../../composables/useToolInfo';
import ContextDrawer from '../../components/ui/ContextDrawer.vue';
import ChordForgePanel from '../chordforge/ChordForgePanel.vue';
import ScaleSleuthPanel from '../scalesleuth/ScaleSleuthPanel.vue';
import CaptureTray from './CaptureTray.vue';
import LiveMonitor from './LiveMonitor.vue';
import EngineSettings from '../../components/settings/EngineSettings.vue';
import LocalSettingsDrawer from '../../components/settings/LocalSettingsDrawer.vue';
import SettingsToggle from '../../components/settings/SettingsToggle.vue';

const { openInfo } = useToolInfo();

// --- UI / Interaction State ---
const isSettingsOpen = ref( false );

// Visibility toggles for different note layers on the fretboard
const showInputNotes = ref( true );
const showChordNotes = ref( true );
const showFretboard = ref( false ); // Fretboard hidden by default

const drawerCategories = computed( () => [
  {
    id: 'General',
    label: 'General',
    description: 'Fretboard & Visuals',
    showIndicator: !showInputNotes.value || !showChordNotes.value || showFretboard.value
  },
  {
    id: 'Engine',
    label: 'Engine',
    description: 'Global Audio Processing',
    showIndicator: useGlobalEngine().isGlobalEngineActive.value
  }
] );

const { 
  pitch, 
  clarity, 
  currentNote, 
  capturedNotes, 
  detectedChords, 
  chordHistory,
  keyCenter,
  clearNotes,
  captureChord,
  clearHistory,
  getFormattedLedger
} = useChordCapture()
const { init, isInitialized, error, activate, deactivate } = useAudioEngine()

onMounted( () => {
 activate();
});

onUnmounted( () => {
 deactivate();
});

watch( isInitialized, ( newVal ) => {
 if ( newVal ) activate();
});

/**
 * The topChord is the primary harmonic match identified by the system.
 * We isolate the first entry from the detectedChords array because it represents
 * the most mathematically probable chord based on the current spectral input.
 */
const topChord = computed( () => detectedChords.value[0] || null );

/**
 * Theoretical suggestions for the "Next Sound" in a harmonic sequence.
 * This is the "Predictive Analysis" feature.
 * 
 * Logic:
 * 1. We take the currently strongest detected chord (topChord).
 * 2. We compare it against the user-selected key center (or detected key).
 * 3. We use the ChordEngine (based on Circle of Fifths/Tonal.js) to find
 *    chords that mathematically resolve tension or extend the narrative (e.g., V7 -> I).
 */
const suggestions = computed( () => {
  if ( !topChord.value ) return [];
  // ChordEngine.suggestNext takes a symbol string (e.g., "Cm7") and a key string (e.g., "Eb")
  // It returns an array of Chord objects that fit the western music theory grammar.
  return ChordEngine.suggestNext( topChord.value.symbol, keyCenter.value );
} );

const selectedChord = ref<ChordMatch | null>( null );
const forgingNotes = ref<string[]>( [] ); // Notes to populate Forge with if no specific chord is selected
const isForgeOpen = ref( false );
const isSleuthOpen = ref( false );




// --- Pause/Freeze Logic ---


const isPaused = ref( false );
// Frozen Snapshots
const frozenCapturedNotes = ref<string[]>( [] );
const frozenTopChord = ref<ChordMatch | null>( null );
const frozenCurrentNote = ref<string | null>( null );
const frozenPitch = ref<number | null>( null );
const frozenClarity = ref<number | null>( null );

// Effective Data (Switches between Live and Frozen)
const effectiveCapturedNotes = computed( () => isPaused.value ? frozenCapturedNotes.value : capturedNotes.value );
const effectiveTopChord = computed( () => isPaused.value ? frozenTopChord.value : topChord.value );
const effectiveCurrentNote = computed( () => isPaused.value ? frozenCurrentNote.value : currentNote.value );
const effectivePitch = computed( () => isPaused.value ? frozenPitch.value : pitch.value );
const effectiveClarity = computed( () => isPaused.value ? frozenClarity.value : clarity.value );

// --- Auto-Capture Logic ---
const isAutoCaptureEnabled = ref( false );
const autoCaptureProgress = ref( 0 ); // 0 to 100
let autoCaptureTimer: ReturnType<typeof setInterval> | null = null;
const HOLD_DURATION = 2000; // 2 seconds to hold
const CHECK_INTERVAL = 100; // Check every 100ms

// Watch for stability
watch( [effectiveTopChord, effectiveClarity], ( [newChord, newClarity], [oldChord] ) => {
  if ( !isAutoCaptureEnabled.value || isPaused.value ) {
    resetAutoCapture();
    return;
  }

  // 1. Check fail conditions (Silence or Chord Change)
  if ( ( newClarity || 0 ) < 0.8 || !newChord || ( oldChord && newChord.symbol !== oldChord.symbol ) ) {
    resetAutoCapture();
    return;
  }

  // 2. If stable and timer not running, start it
  if ( !autoCaptureTimer ) {
    startAutoCapture();
  }
} );

const startAutoCapture = () => {
  const startTime = Date.now();
  autoCaptureTimer = setInterval( () => {
    const elapsed = Date.now() - startTime;
    autoCaptureProgress.value = Math.min( 100, ( elapsed / HOLD_DURATION ) * 100 );

    if ( elapsed >= HOLD_DURATION ) {
      // Complete!
      togglePause();
      resetAutoCapture();
      // Optional: Sound feedback?
      SynthEngine.getInstance().playNote( 880, 100, 0.1 ); // Ding!
    }
  }, CHECK_INTERVAL );
};

const resetAutoCapture = () => {
  if ( autoCaptureTimer ) {
    clearInterval( autoCaptureTimer );
    autoCaptureTimer = null;
  }
  autoCaptureProgress.value = 0;
};

const togglePause = () => {
  isPaused.value = !isPaused.value;
  if ( isPaused.value ) {
    // Snapshot ALL current state
    frozenCapturedNotes.value = [...capturedNotes.value];
    frozenTopChord.value = topChord.value ? { ...topChord.value } : null;
    frozenCurrentNote.value = currentNote.value;
    frozenPitch.value = pitch.value;
    frozenClarity.value = clarity.value;
  }
};

const openChordDetail = ( chord: ChordMatch ) => {
  selectedChord.value = chord;
  isForgeOpen.value = true;
};

const handleChordUpdate = ( name: string, notes: string[] ) => {
  // If the user forged a new voicing, update the history item?
  // For now, we just log it or maybe update the selected chord in place if we had a proper store.
  // Ideally useChordCapture would expose an update method.
  console.log( 'Forged new chord:', name, notes );
};

/**
 * Quick Audition
 * Triggers the SynthEngine to play the voicing of a chord.
 */
const auditChord = ( chord: ChordMatch ) => {
  SynthEngine.getInstance().playChord( chord.notes );
};

const handleChordCapture = ( chord: ChordMatch ) => {
  // Logic: User Feedback Loop
  // When a user "captures" a chord, they expect confirmation.
  // We trigger the synth to play the notes so they can "audit" what they just saved.
  SynthEngine.getInstance().playChord( chord.notes );

  // Hand off to the theory engine to store in history
  captureChord( chord );
};



const handleForge = () => {
  // Always prioritize raw captured notes (with octaves) for the fretboard mapping
  forgingNotes.value = [...effectiveCapturedNotes.value];

  // If we have a Top Chord, set it for the Title context ("Forging: C Major")
  if ( effectiveTopChord.value ) {
    selectedChord.value = { ...effectiveTopChord.value };
    // If for some reason captured notes are empty but we have a chord (e.g. manual history selection),
    // we might want to fallback, but for "Live/Freeze Forge", capturedNotes is the source.
    if ( forgingNotes.value.length === 0 ) {
      forgingNotes.value = selectedChord.value.notes;
    }
  } else {
    selectedChord.value = null;
  }

  // 3. Open the drawer
  console.log( 'Opening Forge with notes:', forgingNotes.value );
  if ( forgingNotes.value.length === 0 ) {
    // If empty, we still open, but we might want to let the user know.
    // Ideally, we'd flash a message, but for now, just logging.
    // If the user expects "Persistence" of the last sound, they need to PAUSE first.
  }
  isForgeOpen.value = true;
};

const start = () => {
  init()
}

const handleExport = async () => {
  const text = getFormattedLedger();
  try {
    await navigator.clipboard.writeText( text );
    // Ideally use a Toast here, but for now we'll rely on button visual feedback or a simple alert
    alert( 'Progression copied to clipboard!' );
  } catch ( err ) {
    console.error( 'Failed to copy:', err );
  }
};

const updateKey = ( val: string ) => {
  keyCenter.value = val;
};

// --- Progression Playback ---
const activePlaybackIndex = ref<number | null>( null );
const isPlayingProgression = ref( false );

const playProgression = async () => {
  if ( isPlayingProgression.value ) return;
  isPlayingProgression.value = true;

  try {
    for ( let i = 0; i < chordHistory.value.length; i++ ) {
      activePlaybackIndex.value = i;
      const chord = chordHistory.value[i];
      if ( !chord ) continue;

      // Play chord for 1 second
      SynthEngine.getInstance().playChord( chord.notes );

      // Visual feedback wait
      await new Promise( resolve => setTimeout( resolve, 1000 ) );
    }
  } finally {
    activePlaybackIndex.value = null;
    isPlayingProgression.value = false;
  }
};

const emit = defineEmits<{
  ( e: 'back' ): void
}>()
</script>

<template>
  <div class="chord-capture-module w-full">
    <!-- Stage 0: Initialization -->
    <div
      v-if=" !isInitialized "
      class="w-full flex flex-col items-center animate-fade-in"
    >
      <div
        class="glass-container w-full max-w-2xl p-12 text-center rounded-[2rem] border border-white/10 bg-white/5 backdrop-blur-3xl shadow-2xl relative"
      >
        <button
          @click="openInfo( 'chordcapture' )"
          class="absolute top-8 right-8 w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-indigo-400 hover:text-white hover:bg-indigo-500/20 transition-all active:scale-95"
          title="Tool Intelligence"
        >
          i
        </button>
        <div v-if=" !error ">
          <div
            class="w-20 h-20 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center mx-auto mb-8 transform -rotate-6"
          >
            <div class="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h2 class="text-3xl font-black mb-4 font-outfit text-white">System Ready</h2>
          <p class="text-slate-400 mb-10 max-w-sm mx-auto text-sm leading-relaxed">
            Enable your microphone to begin analyzing harmonic structures and sequences.
          </p>
          <button
            @click="start"
            class="btn-primary"
          >
            Initialize Audio Engine
          </button>
        </div>
        <div
          v-else
          class="text-center p-4"
        >
          <div class="text-5xl mb-6">🛡️</div>
          <h3 class="text-2xl font-black text-red-400 mb-4">Mic Required</h3>
          <p class="text-slate-500 text-xs mb-8">{{ error }}</p>
          <button
            @click="start"
            class="text-indigo-400 font-bold uppercase tracking-widest text-[10px] hover:text-white transition-all underline underline-offset-8"
          >
            Retry Handshake
          </button>
        </div>
      </div>
    </div>

    <!-- Stage 1-4: The Active Flow -->
    <main
      v-else
      class="w-full flex flex-col items-center gap-6 md:gap-12 animate-fade-in"
    >
      <!-- Standard Module Header -->
      <header class="w-full flex justify-between items-end mb-4">
        <div>
          <button
            @click="emit( 'back' )"
            class="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 hover:text-white transition-colors mb-4 flex items-center gap-2"
          >
            <span>←</span> Back to Tonic
          </button>
          <h2 class="text-3xl font-black text-white italic uppercase tracking-tighter">Session <span
              class="text-indigo-400"
            >View</span></h2>
          <p class="text-slate-500 text-[10px] font-mono uppercase tracking-[0.2em] mt-1">Harmonic Context &
            Flow</p>
        </div>

        <div class="flex items-center gap-3">
          <!-- Sleuth Button -->
          <button
            @click="isSleuthOpen = true"
            class="h-10 px-4 rounded-xl bg-slate-800/50 border border-white/5 text-slate-300 font-bold uppercase text-[10px] tracking-widest flex items-center gap-2 hover:bg-indigo-500/20 hover:text-white transition-all active:scale-95"
            title="Open Scale Sleuth"
          >
            <span>🕵️</span>
            <span class="hidden md:inline">Sleuth</span>
          </button>

          <!-- Forge Button -->
          <button
            @click="handleForge"
            class="h-10 px-4 rounded-xl bg-slate-800/50 border border-white/5 text-slate-300 font-bold uppercase text-[10px] tracking-widest flex items-center gap-2 hover:bg-amber-500/20 hover:text-amber-400 transition-all active:scale-95"
            title="Open Chord Forge"
          >
            <span>⚒️</span>
            <span class="hidden md:inline">Forge</span>
          </button>

          <span class="w-px h-6 bg-white/10 mx-1"></span>

          <SettingsToggle
            :is-open="isSettingsOpen"
            @click="isSettingsOpen = !isSettingsOpen"
          />
          <button
            @click="openInfo( 'chordcapture' )"
            class="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-black text-lg flex items-center justify-center hover:bg-indigo-500/20 transition-all active:scale-95 mb-1"
          >
            ?
          </button>
        </div>
      </header>

      <LocalSettingsDrawer
        :is-open="isSettingsOpen"
        :categories="drawerCategories"
        @close="isSettingsOpen = false"
      >
        <template #General>
          <div class="p-6 space-y-6">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-white font-bold text-base">Show Input Notes</h3>
                <p class="text-xs text-slate-500 uppercase tracking-widest font-mono">Real-time Spectrum</p>
              </div>
              <button
                @click="showInputNotes = !showInputNotes"
                class="w-12 h-6 rounded-full transition-colors relative"
                :class="showInputNotes ? 'bg-sky-500' : 'bg-slate-700'"
              >
                <div
                  class="w-4 h-4 rounded-full bg-white absolute top-1 transition-all"
                  :class="showInputNotes ? 'right-1' : 'left-1'"
                ></div>
              </button>
            </div>

            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-white font-bold text-base">Show Chord Voicing</h3>
                <p class="text-xs text-slate-500 uppercase tracking-widest font-mono">Theoretical Map</p>
              </div>
              <button
                @click="showChordNotes = !showChordNotes"
                class="w-12 h-6 rounded-full transition-colors relative"
                :class="showChordNotes ? 'bg-emerald-500' : 'bg-slate-700'"
              >
                <div
                  class="w-4 h-4 rounded-full bg-white absolute top-1 transition-all"
                  :class="showChordNotes ? 'right-1' : 'left-1'"
                ></div>
              </button>
            </div>

            <div class="p-4 rounded-xl bg-white/5 border border-white/5 text-xs text-slate-400 leading-relaxed">
              <p>
                Toggle these layers to isolate incoming audio detection (Sky Blue) from predicted chord voicings
                (Emerald).
              </p>
            </div>

            <div class="flex items-center justify-between pt-4 border-t border-white/5">
              <div>
                <h3 class="text-white font-bold text-base">Show Fretboard</h3>
                <p class="text-xs text-slate-500 uppercase tracking-widest font-mono">Full-Width Visualizer</p>
              </div>
              <button
                @click="showFretboard = !showFretboard"
                class="w-12 h-6 rounded-full transition-colors relative"
                :class="showFretboard ? 'bg-amber-500' : 'bg-slate-700'"
              >
                <div
                  class="w-4 h-4 rounded-full bg-white absolute top-1 transition-all"
                  :class="showFretboard ? 'right-1' : 'left-1'"
                ></div>
              </button>
            </div>
          </div>
        </template>

        <template #Engine>
          <div class="space-y-6">
            <EngineSettings />
          </div>
        </template>
      </LocalSettingsDrawer>

      <!-- Main Interactive Split: Monitor (Left) & Workspace (Right) -->
      <!-- Lowered breakpoint to md: for better responsiveness -->
      <div
        class="w-full max-w-[100rem] grid grid-cols-1 md:grid-cols-[40%_60%] lg:grid-cols-[35%_65%] gap-8 items-start animate-fade-in relative"
      >

        <!-- 1. Live Monitor (Top-Left) -->
        <div class="relative group">
          <LiveMonitor
            :top-chord="effectiveTopChord || null"
            :captured-notes="effectiveCapturedNotes"
            :current-note="effectiveCurrentNote"
            :pitch="effectivePitch"
            :clarity="effectiveClarity"
            :key-center="keyCenter"
            :is-paused="isPaused"
            :is-auto-capture-enabled="isAutoCaptureEnabled"
            :auto-capture-progress="autoCaptureProgress"
            @update:key-center="updateKey"
            @capture-chord="handleChordCapture"
            @clear-notes="clearNotes"
            @toggle-pause="togglePause"
            @toggle-auto-capture="isAutoCaptureEnabled = !isAutoCaptureEnabled"
          />
          
          <!-- Frozen Overlay Indicator -->
          <div
            v-if=" isPaused "
            class="absolute inset-0 rounded-[2.5rem] border-4 border-red-500/30 pointer-events-none z-10 transition-all"
          ></div>
        </div>


        <!-- 2. Harmonic Suggestions (Top-Right) -->
        <div class="w-full flex justify-center h-full">
          <div
            class="bg-slate-900/50 rounded-3xl p-8 border border-white/5 backdrop-blur-md w-full text-center flex flex-col justify-center min-h-[200px]"
          >
            <span class="text-[9px] font-black uppercase tracking-widest text-slate-500 block mb-6">Theory-Based
              Progressions</span>
            <div class="flex flex-wrap justify-center gap-3">
              <template v-if=" suggestions.length > 0 ">
                <div
                  v-for=" s in suggestions "
                  :key="s"
                  class="px-5 py-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs font-black text-indigo-300 uppercase tracking-tighter hover:bg-indigo-500/20 transition-all cursor-default"
                >
                  {{ s }}
                </div>
              </template>
              <div
                v-else
                class="text-[10px] text-slate-700 italic font-bold uppercase tracking-widest"
              >No suggestions until match</div>
            </div>
          </div>
        </div>

        <!-- 3. Relocated Capture Tray (Bottom-Left) -->
        <!-- Visible on Desktop and Mobile -->
        <CaptureTray
          class="flex lg:h-full min-h-[150px]"
          :captured-notes="effectiveCapturedNotes"
          @clear-notes="clearNotes"
        />

        <!-- 4. Progression Ledger (Bottom-Right of Grid) -->
        <div
          class="w-full bg-black/20 rounded-[3rem] p-8 md:p-10 border border-white/5 shadow-2xl flex-1 flex flex-col lg:h-full min-h-[400px]"
        >
          <div class="flex justify-between items-center mb-6 px-2">
            <div>
              <h3 class="text-xs font-black text-white italic uppercase tracking-tighter">Progression <span
                  class="text-indigo-500"
                >Ledger</span></h3>
              <p class="text-[9px] text-slate-500 uppercase font-bold tracking-widest mt-1">Stored Harmonic Flow</p>
            </div>
            <div class="flex gap-2">
              <button
                v-if=" chordHistory.length > 0 "
                @click="clearHistory"
                class="px-2 py-1 text-[9px] font-black text-slate-600 hover:text-red-400 transition-colors uppercase tracking-widest"
              >Clear</button>
              <button
                v-if=" chordHistory.length > 0 "
                @click="handleExport"
                class="px-3 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[9px] font-black text-indigo-400 hover:bg-indigo-500/20 transition-all uppercase tracking-widest"
              >Export</button>
            </div>
          </div>

          <div class="flex-1 overflow-y-auto">
            <div
              v-if=" chordHistory.length > 0 "
              class="flex flex-wrap gap-4 px-2 pb-4"
            >
              <div
                v-for=" ( item, idx ) in chordHistory "
                :key="idx"
                class="flex items-center gap-3 group transition-all duration-300 rounded-xl p-2"
                :class="{ 'bg-emerald-500/10 scale-105 shadow-xl shadow-emerald-500/10 ring-1 ring-emerald-500/30': activePlaybackIndex === idx }"
              >
                <div
                  class="flex flex-col items-center cursor-pointer hover:scale-110 transition-transform relative"
                  @click="openChordDetail( item )"
                >
                  <button
                    @click.stop="auditChord( item )"
                    class="absolute -top-3 -right-3 w-5 h-5 rounded-full bg-white text-slate-950 flex items-center justify-center translate-y-2 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 transition-all shadow-xl z-20"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-3 w-3"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </button>
                  <div class="text-xl font-black text-white font-outfit group-hover:text-indigo-400 transition-colors">
                    {{ item.symbol }}
                  </div>
                  <div class="text-[9px] font-black text-indigo-500/60 uppercase tracking-tighter">{{ item.roman }}
                  </div>
                </div>
                <div
                  v-if=" idx < chordHistory.length - 1 "
                  class="text-slate-800 font-black text-lg"
                >→</div>
              </div>
            </div>
            <div
              v-else
              class="h-full flex items-center justify-center opacity-20 italic text-xs"
            >
              No chords captured yet.
            </div>
          </div>

          <div
            v-if=" chordHistory.length > 0 "
            class="mt-4 pt-4 border-t border-white/5"
          >
            <button
              @click="playProgression"
              :disabled="isPlayingProgression"
              class="w-full py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-black text-emerald-400 hover:bg-emerald-500/20 transition-all uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{{ isPlayingProgression ? 'Playing...' : 'Play Full Sequence' }}</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-3 w-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                />
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </button>
          </div>
        </div>

      </div>

      <!-- 5. Fretboard / Voicing Atlas (Full-Width Bottom) -->
      <div
        v-if=" showFretboard "
        class="w-full max-w-[100rem] mx-auto pb-24 lg:pb-0 bg-slate-900/40 rounded-[3rem] p-8 border border-white/5 backdrop-blur-xl"
      >
        <Fretboard
          :active-notes="effectiveCapturedNotes"
          :highlight-notes="effectiveTopChord ? effectiveTopChord.notes : []"
          :num-frets="24"
        />
      </div>
    </main>

    <!-- SMART CONTEXT DRAWERS -->

    <!-- 1. Forge Drawer (Edit Mode) -->
    <ContextDrawer
      :is-open="isForgeOpen"
      :title="selectedChord ? `Forging: ${selectedChord.symbol}` : 'Chord Forge'"
      side="right"
      @close="isForgeOpen = false"
    >
      <template #default=" { isMaximized } ">
        <ChordForgePanel
          v-if=" isForgeOpen "
          :initial-notes="forgingNotes"
          :is-maximized="isMaximized"
          @update:chord="handleChordUpdate"
        />
      </template>
    </ContextDrawer>

    <!-- 2. Sleuth Drawer (Analysis Mode) -->
    <!-- 2. Sleuth Drawer (Analysis Mode) -->
    <ContextDrawer
      :is-open="isSleuthOpen"
      :title="isPaused ? 'Scale Detective (Frozen)' : 'Scale Detective'"
      side="left"
      @close="isSleuthOpen = false"
    >
      <template #default=" { isMaximized } ">
        <ScaleSleuthPanel
          :static-notes="isPaused ? frozenCapturedNotes : undefined"
          :is-maximized="isMaximized"
          @select:scale="( name ) => { console.log( 'Selected scale:', name ); }"
        />
      </template>
    </ContextDrawer>



  </div>
</template>

<style scoped>
@reference "tailwindcss";

.chord-capture-module {
  --indigo-500: #6366f1;
  --cyan-400: #22d3ee;
}

.font-outfit {
  font-family: 'Outfit', sans-serif;
}

/* UI Elements */
.btn-primary {
  @apply px-12 py-5 rounded-2xl bg-white text-[#020617] font-black text-lg transition-all shadow-2xl hover:scale-105 active:scale-95;
}

.step-num {
  @apply w-10 h-10 rounded-full border border-white/10 flex items-center justify-center font-black text-slate-500 transition-all text-xs;
}

.step-num.active {
  @apply border-indigo-500 bg-indigo-500/20 text-indigo-400;
  box-shadow: 0 0 20px rgba(99, 102, 241, 0.3);
}

.glass-card {
  @apply backdrop-blur-xl transition-all duration-500;
}

.glass-card:hover {
  @apply border-white/10 bg-white/[0.04];
}

/* Animations */
@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(20px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fade-in 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

/* Ensure the workspace content doesn't overflow its grid cell */
.chord-hero {
  @apply min-w-0 w-full overflow-hidden;
}

/* Drawer Transitions */
.drawer-enter-active,
.drawer-leave-active {
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

.drawer-enter-from,
.drawer-leave-to {
  transform: translateX(-100%);
  opacity: 0;
}
</style>
