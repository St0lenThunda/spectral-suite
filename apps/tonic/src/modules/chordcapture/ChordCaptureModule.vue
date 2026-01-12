<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useChordCapture, useAudioEngine, ChordEngine, Fretboard, SynthEngine, type ChordMatch, isLowPassEnabled, downsample } from '@spectralsuite/core'
import { useToolInfo } from '../../composables/useToolInfo';
import ChordModal from '../../components/ChordModal.vue';
import CaptureTray from './CaptureTray.vue';
import LiveMonitor from './LiveMonitor.vue';
import EngineSettings from '../../components/settings/EngineSettings.vue';
import LocalSettingsDrawer from '../../components/settings/LocalSettingsDrawer.vue';
import SettingsToggle from '../../components/settings/SettingsToggle.vue';

const { openInfo } = useToolInfo();

// --- UI / Interaction State ---
const isSettingsOpen = ref( false );

const drawerCategories = computed( () => [
  {
    id: 'Engine',
    label: 'Engine',
    description: 'Global Audio Processing',
    showIndicator: isLowPassEnabled.value || downsample.value > 1
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
  removeChord,
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

/**
 * Modal State Management.
 * Controls the popover that appears when a user clicks a chord to see details.
 * 
 * We track `selectedChord` separately so the modal can display static data
 * even if the live detection engine moves on to a new chord.
 */
const selectedChord = ref<ChordMatch | null>( null );
const isModalOpen = ref( false );

const openChordDetail = ( chord: ChordMatch ) => {
  selectedChord.value = chord;
  isModalOpen.value = true;
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
      <header class="flex justify-between items-end mb-4">
        <div>
          <button
            @click="emit( 'back' )"
            class="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 hover:text-white transition-colors mb-4 flex items-center gap-2"
          >
            <span>←</span> Back to Tonic
          </button>
          <h2 class="text-3xl font-black text-white italic uppercase tracking-tighter">Chord <span
              class="text-indigo-400"
            >Capture Pro</span></h2>
          <p class="text-slate-500 text-[10px] font-mono uppercase tracking-[0.2em] mt-1">Harmonic recognition &
            analysis suite</p>
        </div>

        <div class="flex items-center gap-4">
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
        <template #Engine>
          <div class="space-y-6">
            <EngineSettings />
          </div>
        </template>
      </LocalSettingsDrawer>

      <!-- Main Interactive Split: Monitor (Left) & Workspace (Right) -->
      <div
        class="w-full max-w-[100rem] grid grid-cols-1 lg:grid-cols-[35%_65%] gap-8 items-start animate-fade-in px-4 relative"
      >

        <!-- 1. Live Monitor (Top-Left) -->
        <LiveMonitor
          :top-chord="topChord || null"
          :captured-notes="capturedNotes"
          :current-note="currentNote"
          :pitch="pitch"
          :clarity="clarity"
          :key-center="keyCenter"
          @update:key-center="updateKey"
          @capture-chord="handleChordCapture"
          @clear-notes="clearNotes"
        />

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
        <!-- Visible on Desktop, Hidden on Mobile (Mobile uses internal drawer) -->
        <CaptureTray
          class="hidden lg:flex h-full"
          :captured-notes="capturedNotes"
          @clear-notes="clearNotes"
        />

        <!-- 4. Fretboard / Voicing Atlas (Bottom-Right) -->
        <div
          class="w-full bg-black/20 rounded-[3rem] p-8 md:p-10 border border-white/5 shadow-2xl flex-1 flex flex-col min-h-[300px]"
        >
          <div class="flex justify-between mb-6 px-2">
            <span class="text-[9px] font-black uppercase tracking-widest text-slate-500">Guitar Voicing Atlas</span>
          </div>
          <div class="flex-1 flex flex-col justify-center">
            <Fretboard
              :active-notes="topChord ? topChord.notes : capturedNotes"
              :highlight-notes="topChord ? topChord.notes : capturedNotes"
              :num-frets="24"
            />
          </div>
        </div>

      </div>

      <!-- Progression Ledger -->
      <div
        class="mt-12 w-full max-w-[100rem] bg-slate-900/40 rounded-[3rem] p-10 border border-white/5 backdrop-blur-3xl px-4 mx-auto"
      >
        <div class="flex justify-between items-center mb-10 px-4">
          <div>
            <h3 class="text-xl font-black text-white italic uppercase tracking-tighter">Progression <span
                class="text-indigo-500"
              >Ledger</span></h3>
            <p class="text-[9px] text-slate-500 uppercase font-bold tracking-widest mt-1">Stored Harmonic Flow</p>
          </div>
          <button
            v-if=" chordHistory.length > 0 "
            @click="clearHistory"
            class="px-4 py-2 text-[9px] font-black text-slate-600 hover:text-red-400 transition-colors uppercase tracking-widest"
          >Clear All</button>

          <div class="flex flex-col gap-2 ml-4">
            <button
              v-if=" chordHistory.length > 0 "
              @click="handleExport"
              class="px-6 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-[9px] font-black text-indigo-400 hover:bg-indigo-500/20 transition-all uppercase tracking-widest flex items-center justify-center gap-2"
            >
              <span>Export</span>
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
                  d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                />
              </svg>
            </button>
            <button
              v-if=" chordHistory.length > 0 "
              @click="playProgression"
              :disabled="isPlayingProgression"
              class="px-6 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black text-emerald-400 hover:bg-emerald-500/20 transition-all uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{{ isPlayingProgression ? 'Playing...' : 'Play All' }}</span>
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

        <div
          v-if=" chordHistory.length > 0 "
          class="flex flex-wrap gap-6 px-4"
        >
          <div
            v-for=" ( item, idx ) in chordHistory "
            :key="idx"
            class="flex items-center gap-6 group transition-all duration-300 rounded-xl p-2"
            :class="{ 'bg-emerald-500/10 scale-105 shadow-xl shadow-emerald-500/10 ring-1 ring-emerald-500/30': activePlaybackIndex === idx }"
          >
            <div
              class="flex flex-col items-center cursor-pointer hover:scale-110 transition-transform relative"
              @click="openChordDetail( item )"
            >
              <!-- Play Button Overlay -->
              <button
                @click.stop="auditChord( item )"
                class="absolute -top-4 -right-4 w-6 h-6 rounded-full bg-white text-slate-950 flex items-center justify-center translate-y-2 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 transition-all shadow-xl z-20"
                title="Audition"
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

              <!-- Remove Button -->
              <button
                @click.stop="removeChord( idx )"
                class="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-red-500/10 border border-red-500/30 text-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/20 z-20"
                title="Remove Chord"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-3 w-3"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fill-rule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clip-rule="evenodd"
                  />
                </svg>
              </button>
              <div class="text-2xl font-black text-white font-outfit group-hover:text-indigo-400 transition-colors">
                {{ item.symbol }}
              </div>
              <div class="text-[10px] font-black text-indigo-500/60 uppercase tracking-tighter">{{ item.roman }}</div>
            </div>
            <div
              v-if=" idx < chordHistory.length - 1 "
              class="text-slate-800 font-black text-xl"
            >→</div>
          </div>
        </div>
        <div
          v-else
          class="py-12 text-center opacity-20 italic text-sm"
        >
          Your captured progression will appear here.
        </div>
      </div>

    </main>

    <!-- Detailed Analysis Modal -->
    <ChordModal
      v-if=" selectedChord "
      :is-open="isModalOpen"
      :chord="selectedChord"
      @close=" isModalOpen = false"
    />
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
