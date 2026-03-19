<script setup lang="ts">
/**
 * BendTrainerModule.vue
 *
 * The "Pitch Staircase" Bend Trainer — a visual practice tool for guitarists
 * learning to bend notes to precise pitch targets.
 *
 * ARCHITECTURE:
 * - Pitch math lives in `useBendTrainer()` composable (core package)
 * - This file is purely UI: fretboard, staircase SVG, sidebar, settings
 * - Follows the standard Module pattern (back emit, settings drawer, IntelligenceButton)
 *
 * VISUALIZATION:
 * The "staircase" is a set of pre-computed horizontal bars stacked vertically.
 * A smooth cursor (circle) tracks the live pitch. No snapping — the cursor floats
 * freely to show micro-pitch accuracy.
 */
import { ref, computed, watch, onActivated, onDeactivated } from 'vue';
import {
  useBendTrainer,
  useAudioEngine,
  Fretboard,
  Note
} from '@spectralsuite/core';
import IntelligenceButton from '../../components/IntelligenceButton.vue';
import LocalSettingsDrawer from '../../components/settings/LocalSettingsDrawer.vue';
import SettingsToggle from '../../components/settings/SettingsToggle.vue';
import EngineSettings from '../../components/settings/EngineSettings.vue';

// ============================================================================
// CORE ENGINE
// ============================================================================

const {
  startingNote,
  targetSemitones,
  tolerance,
  bendCents,
  targetCents,
  isOnTarget,
  isInBluesZone,
  stairSteps,
  holdSeconds,
  attemptHistory,
  setStartingNote,
} = useBendTrainer();

const { init, isInitialized, activate, deactivate } = useAudioEngine();

// Activate audio engine when component mounts
onActivated( () => { activate(); } );
onDeactivated( () => { deactivate(); } );

// Auto-activate if user initializes from this screen
watch( isInitialized, ( val ) => { if ( val ) activate(); } );

// ============================================================================
// EVENTS
// ============================================================================

const emit = defineEmits<{
  ( e: 'back' ): void;
}>();

// ============================================================================
// SETTINGS STATE
// ============================================================================

// ============================================================================
// UI STATE (Popover & Drawer)
// ============================================================================

const isSettingsOpen = ref( false );
const isFretboardOpen = ref( false );
const showLegend = ref( true );

/**
 * Pre-defined bend targets (in semitones) for the quick-select buttons.
 * Guitars typically bend in 1-fret increments (1 semitone = 100 cents = ½ step).
 * We export these so the template can loop over them and create the UI buttons.
 */
const TARGET_PRESETS = [
  { label: '½ Step', semitones: 1.0 },
  { label: 'Full', semitones: 2.0 },
  { label: '1 ½', semitones: 3.0 },
  { label: '2 Steps', semitones: 4.0 }
];

/** 
 * Categories for the settings drawer corresponding to the named template slots 
 * Must match the 'Category' interface in LocalSettingsDrawer: {id, label, description}
 */
const drawerCategories = [
  { id: 'Targets', label: 'Bend Targets', description: 'Configure target intervals and tolerance' },
  { id: 'Display', label: 'Display', description: 'Visual overlays and UI settings' },
  { id: 'Engine', label: 'Audio Engine', description: 'Microphone and pitch tracking pipeline' }
];

/**
 * When the user taps a fret on the fretboard, we look up the note at
 * that position and set it as the bend starting point.
 *
 * @param stringNum - Which string was tapped (1 = highest, 6 = lowest)
 * @param fret      - Which fret was tapped (0 = open string)
 */
const STANDARD_TUNING_MIDI = [64, 59, 55, 50, 45, 40]; // E4, B3, G3, D3, A2, E2

const handleFretAction = ( stringNum: number, fret: number ) => {
  const openMidi = STANDARD_TUNING_MIDI[stringNum - 1];
  if ( openMidi === undefined ) return;

  const noteMidi = openMidi + fret;
  const noteName = Note.fromMidi( noteMidi );
  if ( noteName ) {
    setStartingNote( noteName );
    // Close the popover after selection for a snappy feel
    isFretboardOpen.value = false;
  }
};

// ============================================================================
// STAIRCASE SVG CONSTANTS (Pre-computed layout)
// ============================================================================

/**
 * SVG dimensions for the staircase visualization.
 * The staircase is drawn as a vertical stack of horizontal bars.
 *
 * WHY THESE VALUES?
 * - 320px wide gives comfortable space for labels
 * - 40px per step gives clear visual separation
 * - 8 steps (4 semitones × 2 half-steps) is the max practical bend range
 */
const STAIRCASE_WIDTH = 320;
const STEP_HEIGHT = 48;
const STAIRCASE_PADDING = 24;
const CURSOR_RADIUS = 10;

/** Total SVG height: steps stacked + padding top/bottom */
const staircaseHeight = computed( () => {
  // Use 8 as a default fallback when no note is selected (4 semitones * 2 steps per semitone).
  // This prevents the SVG from collapsing before the user selects a note.
  const steps = stairSteps.value.length > 0 ? stairSteps.value.length : 8;
  return ( steps * STEP_HEIGHT ) + ( STAIRCASE_PADDING * 2 );
} );

/**
 * Converts a cents value to a Y position in the staircase SVG.
 * 0 cents = bottom, maxCents = top.
 * The staircase is drawn bottom-up (like a real staircase you climb).
 * 
 * @param cents - The pitch distance from the root note
 * @returns number - The vertical Y position for the cursor
 */
const centsToY = ( cents: number ): number => {
  // Fall back to 8 steps to prevent division by zero when no note anchor is set
  const steps = stairSteps.value.length > 0 ? stairSteps.value.length : 8;
  const maxCents = steps * 50; // 50 cents per step (half semitone)
  
  // We clamp the value to [-50, maxCents + 50] to prevent the cursor from flying
  // out of the SVG entirely, but allow a slight "dip" below 0 or above the top
  // so the user knows they are flat/sharp.
  const clampedCents = Math.max( -50, Math.min( maxCents + 50, cents ) );
  
  // Handle edge case where maxCents could theoretically be 0
  const fraction = maxCents === 0 ? 0 : clampedCents / maxCents;
  
  // Invert the fraction because SVG Y=0 is at the *top*, and we want 0 cents at the *bottom*.
  return STAIRCASE_PADDING + ( steps * STEP_HEIGHT ) * ( 1 - fraction );
};

const TREAD_H = 16;
const FRONT_H = STEP_HEIGHT - TREAD_H;

/**
 * Calculates the width of the staircase bar at a given vertical step.
 * By reducing the width as pitch increases, it visually forms a "staircase" leaning right.
 * 
 * @param idx - The index of the step (0 = bottom, max = top)
 * @param total - Total number of steps
 * @returns number - The pixel width of the bar
 */
const getStepWidth = ( idx: number, total: number ): number => {
  const BASE_WIDTH = STAIRCASE_WIDTH - 40; // 280px wide at base
  const MIN_WIDTH = 120; // 120px wide at top (vanishing point effect)
  
  if ( total <= 1 ) return BASE_WIDTH;
  
  // Linearly decrease width from base to top
  const reductionPerStep = ( BASE_WIDTH - MIN_WIDTH ) / Math.max( 1, total - 1 );
  return BASE_WIDTH - ( idx * reductionPerStep );
};

/** Calculates the centered X coordinate for a step block */
const getStepX = ( idx: number, total: number ): number => {
  return ( STAIRCASE_WIDTH - getStepWidth( idx, total ) ) / 2;
};

/**
 * Generates the four SVG polygon points forming the 3D top tread.
 * Connects the top edge of the current front face to the bottom edge of the next.
 */
const getTreadPoints = ( idx: number, total: number ): string => {
  const w_curr = getStepWidth( idx, total );
  const w_next = getStepWidth( idx + 1, total );
  const x_curr = getStepX( idx, total );
  const x_next = getStepX( idx + 1, total );
  
  // y_top is the absolute back edge of the tread (where it meets the next step)
  const y_top = STAIRCASE_PADDING + ( total - 1 - idx ) * STEP_HEIGHT;
  
  return `${x_curr},${y_top + TREAD_H} ` +
         `${x_curr + w_curr},${y_top + TREAD_H} ` +
         `${x_next + w_next},${y_top} ` +
         `${x_next},${y_top}`;
};

// ── Cursor Spring Physics ─────────────────────────────────────────
/**
 * We animate the cursor position with spring physics to avoid jitter.
 * Same technique used by AuraTune for its needle.
 *
 * PHYSICS:
 * - TENSION: How strongly the spring pulls toward the target (higher = snappier)
 * - FRICTION: Resistance to overshoot (higher = more damped)
 */
let cursorY = centsToY( 0 );
let cursorVelocity = 0;
const CURSOR_TENSION = 0.12;
const CURSOR_FRICTION = 0.78;
let rafId: number | null = null;

// Hardware Refs
const cursorDotEl = ref<SVGCircleElement | null>(null);
const cursorTextEl = ref<SVGTextElement | null>(null);

onActivated( () => {
  const animate = () => {
    // We pass bendCents directly without Math.max(0, ...) so that the dot can visually 
    // move slightly BELOW the starting pitch line, showing the user if they are flat.
    const targetY = centsToY( bendCents.value );
    
    // Safety check: if the cursor previously became NaN (e.g. before fixing the division by zero),
    // force it to the target immediately so physics math doesn't stay poisoned.
    if ( Number.isNaN( cursorY ) ) {
      cursorY = targetY;
      cursorVelocity = 0;
    }
    
    // Physics calculation
    const delta = targetY - cursorY;
    cursorVelocity = ( cursorVelocity + delta * CURSOR_TENSION ) * CURSOR_FRICTION;
    cursorY += cursorVelocity;

    // DIRECT DOM MOUNTING (Bypasses Vue Reactivity for 60FPS)
    if ( cursorDotEl.value && cursorTextEl.value ) {
      cursorDotEl.value.setAttribute('cy', cursorY.toString());
      cursorDotEl.value.setAttribute('fill', cursorColor.value);
      
      const filterUrl = isOnTarget.value ? 'url(#glow-green)' : isInBluesZone.value ? 'url(#glow-bend-cyan)' : '';
      if (filterUrl) {
        cursorDotEl.value.setAttribute('filter', filterUrl);
      } else {
        cursorDotEl.value.removeAttribute('filter');
      }

      cursorTextEl.value.setAttribute('y', (cursorY + 4).toString());
      cursorTextEl.value.textContent = bendCentsDisplay.value;
      cursorTextEl.value.setAttribute('fill', cursorColor.value);
    }

    rafId = requestAnimationFrame( animate );
  };
  animate();
} );

onDeactivated( () => {
  if ( rafId ) cancelAnimationFrame( rafId );
} );

// ============================================================================
// CURSOR COLOR
// ============================================================================

/**
 * Determines the cursor fill color based on bend state.
 * - Green: on target (within tolerance)
 * - Amber: in a blues zone (¼-tone mark)
 * - White: default (between notes)
 */
const cursorColor = computed( () => {
  if ( isOnTarget.value ) return '#22c55e'; // green-500
  if ( isInBluesZone.value ) return '#f59e0b'; // amber-500
  return '#e2e8f0'; // slate-200
} );

// ============================================================================
// DISPLAY HELPERS
// ============================================================================

/** 
 * Format the starting note for display.
 * Includes the octave explicitly (e.g. "E4") to enforce that bending 
 * is tied strictly to that exact physical pitch frequency.
 */
const startingNoteDisplay = computed( () => {
  if ( !startingNote.value ) return '—';
  return startingNote.value;
} );

/** Format bend cents for the sidebar HUD */
const bendCentsDisplay = computed( () => {
  if ( bendCents.value <= 0 ) return '0c';
  return `+${Math.round( bendCents.value )}c`;
} );

/** Accuracy percentage based on attempt history */
const accuracyPercent = computed( () => {
  if ( attemptHistory.value.length === 0 ) return null;
  const hits = attemptHistory.value.filter( a => a.held ).length;
  return Math.round( ( hits / attemptHistory.value.length ) * 100 );
} );
</script>

<template>
  <div class="p-6">
    <!-- ─── HEADER ─────────────────────────────────────────────── -->
    <header class="mb-4 flex justify-between items-end">
      <div>
        <button
          @click="emit( 'back' )"
          class="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 hover:text-white transition-colors mb-4 flex items-center gap-2"
        >
          <span>←</span> Back to Tonic
        </button>
        <h2 class="text-3xl font-black text-white italic uppercase tracking-tighter">
          Pitch <span class="text-amber-500">Stairway</span>
        </h2>
        <p class="text-slate-500 text-[10px] font-mono uppercase tracking-[0.2em] mt-1">
          Precision Bend Practice · To Heaven
        </p>
      </div>
      <div class="flex items-center gap-4">
        <SettingsToggle
          :is-open="isSettingsOpen"
          @click="isSettingsOpen = !isSettingsOpen"
        />
        <IntelligenceButton toolId="bendtrainer" />
      </div>
    </header>

    <!-- ─── SETTINGS DRAWER ───────────────────────────────────── -->
    <LocalSettingsDrawer
      :is-open="isSettingsOpen"
      :categories="drawerCategories"
      @close="isSettingsOpen = false"
    >
      <template #Targets>
        <div class="space-y-4 p-4">
          <div>
            <label class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-2">
              Target Semitones
            </label>
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.5"
              v-model.number="targetSemitones"
              class="w-full accent-amber-500"
            />
            <p class="text-[10px] text-slate-500 font-mono mt-1">
              {{ targetSemitones }} semitones ({{ targetCents }}c)
            </p>
          </div>

          <div>
            <label class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-2">
              Tolerance (±cents)
            </label>
            <input
              type="range"
              min="5"
              max="20"
              step="5"
              v-model.number="tolerance"
              class="w-full accent-amber-500"
            />
            <p class="text-[10px] text-slate-500 font-mono mt-1">
              ±{{ tolerance }}c
            </p>
          </div>
        </div>
      </template>

      <template #Display>
        <div class="p-4 space-y-4">
          <label class="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-colors">
            <div>
              <span class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-1">Color Legend</span>
              <span class="text-[9px] font-mono text-slate-500">Show step color meanings</span>
            </div>
            <div class="relative inline-flex items-center cursor-pointer pointer-events-auto">
              <!-- Tailwind sliding toggle checkbox -->
              <input type="checkbox" v-model="showLegend" class="sr-only peer" />
              <div class="w-9 h-5 bg-black/40 rounded-full peer peer-checked:bg-amber-500/80 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full peer-checked:after:bg-white border border-white/10 shadow-inner"></div>
            </div>
          </label>
        </div>
      </template>

      <template #Engine>
        <EngineSettings />
      </template>
    </LocalSettingsDrawer>

    <!-- ─── INIT PROMPT (shown when audio engine isn't active) ── -->
    <div
      v-if=" !isInitialized "
      class="flex flex-col items-center justify-center py-20"
    >
      <button
        @click="init()"
        class="px-10 py-5 bg-amber-500/20 border border-amber-500/30 rounded-2xl text-amber-400 font-black uppercase tracking-widest text-xs hover:bg-amber-500/30 hover:border-amber-500/50 transition-all"
      >
        🎤 Enable Microphone
      </button>
      <p class="text-slate-600 text-[10px] font-mono uppercase tracking-widest mt-4">
        Tap to activate pitch detection
      </p>
    </div>

    <!-- ─── MAIN CONTENT ────────────────────────────────────────── -->
    <div
      v-else
      class="space-y-6"
    >


      <!-- STAIRCASE + SIDEBAR LAYOUT -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- LEFT: PITCH STAIRCASE (2/3 width on desktop) -->
        <div class="lg:col-span-2 relative">
          <!-- FRETBOARD POPOVER: Floating selection tool -->
          <transition name="popover">
            <div
              v-if=" isFretboardOpen "
              class="absolute inset-0 z-50 flex flex-col items-center justify-center p-6 bg-black/40 backdrop-blur-2xl rounded-3xl"
            >
              <div class="w-full max-w-4xl bg-slate-900/80 border border-white/10 rounded-2xl p-6 shadow-2xl relative">
                <button
                  @click="isFretboardOpen = false"
                  class="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:bg-white/10 hover:text-white transition-all"
                >✕</button>
                <p class="text-[10px] font-black uppercase tracking-[0.4em] text-amber-500 mb-6 text-center">
                  Select Starting Note
                </p>
                <Fretboard
                  instrument="guitar"
                  tuning-preset="standard"
                  :num-frets="15"
                  :interactive="true"
                  :active-notes="startingNote ? [startingNote] : []"
                  @fret-click="handleFretAction"
                />
              </div>
            </div>
          </transition>

          <div
            @click="isFretboardOpen = !isFretboardOpen"
            class="relative p-6 rounded-3xl bg-white/5 border border-white/5 backdrop-blur-xl overflow-hidden min-h-[500px] flex items-center"
          >
            <!-- COLOR LEGEND OVERLAY -->
            <transition name="popover">
              <div
                v-if="showLegend"
                class="absolute bottom-6 left-6 p-4 rounded-xl bg-slate-900/80 border border-white/10 backdrop-blur-md z-10 pointer-events-none"
              >
                <p class="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 mb-2">Color Legend</p>
                <div class="space-y-2">
                  <div class="flex items-center gap-2">
                    <div class="w-3 h-3 rounded shadow-sm bg-amber-500/20 border border-amber-500/60"></div>
                    <span class="text-[9px] font-bold text-slate-400 font-mono tracking-tight">Focus Target</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <div class="w-3 h-3 rounded shadow-sm bg-cyan-500/20 border border-cyan-500/60"></div>
                    <span class="text-[9px] font-bold text-slate-400 font-mono tracking-tight">Blues Bend (¼)</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <div class="w-3 h-3 rounded shadow-sm bg-white/5 border border-white/10"></div>
                    <span class="text-[9px] font-bold text-slate-400 font-mono tracking-tight">Half Step (½)</span>
                  </div>
                </div>
              </div>
            </transition>

            <!-- Decorative glow behind the staircase -->
            <div
              class="absolute -top-20 -left-20 w-60 h-60 bg-amber-500/10 blur-[80px] rounded-full pointer-events-none"
            ></div>

            <svg
              :viewBox="`0 0 ${STAIRCASE_WIDTH} ${staircaseHeight}`"
              class="w-full max-w-sm mx-auto"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                <!-- Green glow filter for on-target state -->
                <filter
                  id="glow-green"
                  x="-50%"
                  y="-50%"
                  width="200%"
                  height="200%"
                >
                  <feGaussianBlur
                    stdDeviation="4"
                    result="blur"
                  />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <!-- Cyan glow filter for blues zone -->
                <filter
                  id="glow-bend-cyan"
                  x="-50%"
                  y="-50%"
                  width="200%"
                  height="200%"
                >
                  <feGaussianBlur
                    stdDeviation="3"
                    result="blur"
                  />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              <!-- STAIR STEPS (rendered bottom-up) -->
              <g
                v-for=" ( step, idx ) in stairSteps "
                :key="step.cents"
              >
                <!-- TOP TREAD (Polygon connecting this step to the next) -->
                <polygon
                  :points="getTreadPoints(idx, stairSteps.length)"
                  :fill="step.isTarget
                    ? 'rgba(245, 158, 11, 0.25)'
                    : step.isBluesZone
                      ? 'rgba(34, 211, 238, 0.15)'
                      : 'rgba(255, 255, 255, 0.08)'"
                  :stroke="step.isTarget
                    ? 'rgba(245, 158, 11, 0.4)'
                    : step.isBluesZone
                      ? 'rgba(34, 211, 238, 0.5)'
                      : 'rgba(255, 255, 255, 0.05)'"
                  stroke-width="1"
                  class="transition-all duration-300 backdrop-blur-sm"
                />

                <!-- FRONT FACE (Rectangle) -->
                <rect
                  :x="getStepX(idx, stairSteps.length)"
                  :y="STAIRCASE_PADDING + ( stairSteps.length - 1 - idx ) * STEP_HEIGHT + TREAD_H"
                  :width="getStepWidth(idx, stairSteps.length)"
                  :height="FRONT_H"
                  :rx="4"
                  :fill="step.isTarget
                    ? 'rgba(245, 158, 11, 0.15)'
                    : step.isBluesZone
                      ? 'rgba(34, 211, 238, 0.1)'
                      : 'rgba(0, 0, 0, 0.4)'"
                  :stroke="step.isTarget
                    ? 'rgba(245, 158, 11, 0.6)'
                    : step.isBluesZone
                      ? 'rgba(34, 211, 238, 0.8)'
                      : 'rgba(255, 255, 255, 0.1)'"
                  stroke-width="1.5"
                  class="transition-all duration-300 backdrop-blur-md"
                />

                <!-- Blues zone label (¼-tone indicator) -->
                <text
                  v-if=" step.isBluesZone "
                  :x="STAIRCASE_WIDTH - 20"
                  :y="STAIRCASE_PADDING + ( stairSteps.length - 1 - idx ) * STEP_HEIGHT + TREAD_H + FRONT_H / 2 + 3"
                  text-anchor="end"
                  class="text-[8px] font-black select-none tracking-tighter"
                  fill="rgba(34, 211, 238, 1)"
                >¼ BEND</text>

                <!-- Target pulsing border (Front face only) -->
                <rect
                  v-if=" step.isTarget "
                  :x="getStepX(idx, stairSteps.length)"
                  :y="STAIRCASE_PADDING + ( stairSteps.length - 1 - idx ) * STEP_HEIGHT + TREAD_H"
                  :width="getStepWidth(idx, stairSteps.length)"
                  :height="FRONT_H"
                  :rx="4"
                  fill="none"
                  stroke="rgba(245, 158, 11, 0.8)"
                  stroke-width="2"
                  class="animate-pulse"
                />

                <!-- INLINE LABEL (Centered on Front Face) -->
                <text
                  :x="STAIRCASE_WIDTH / 2"
                  :y="STAIRCASE_PADDING + ( stairSteps.length - 1 - idx ) * STEP_HEIGHT + TREAD_H + FRONT_H / 2 + 4"
                  text-anchor="middle"
                  class="text-[12px] font-black select-none tracking-tight"
                  :fill="step.isTarget ? 'rgba(255, 255, 255, 0.9)' : 'rgba(226, 232, 240, 0.5)'"
                  :style="step.isTarget ? 'text-shadow: 0 0 8px rgba(245,158,11,0.5)' : ''"
                >{{ step.label }}</text>
              </g>

              <!-- ZERO LINE (unbent starting position) -->
              <line
                :x1="getStepX(0, stairSteps.length)"
                :y1="centsToY( 0 )"
                :x2="getStepX(0, stairSteps.length) + getStepWidth(0, stairSteps.length)"
                :y2="centsToY( 0 )"
                stroke="rgba(226, 232, 240, 0.15)"
                stroke-width="1"
                stroke-dasharray="4 4"
              />
              <text
                v-if=" startingNote "
                :x="STAIRCASE_WIDTH / 2"
                :y="centsToY( 0 ) + 16"
                text-anchor="middle"
                class="text-[10px] font-bold select-none"
                fill="rgba(226, 232, 240, 0.3)"
              >{{ startingNoteDisplay }} (open)</text>

              <!-- INSTRUCTION: Shown when no note is selected -->
              <g v-if=" !startingNote ">
                <text
                  :x="STAIRCASE_WIDTH / 2"
                  :y="staircaseHeight / 2 - 10"
                  text-anchor="middle"
                  class="text-[14px] font-black fill-amber-500/50 uppercase tracking-[0.2em]"
                >No Note Anchor</text>
                <text
                  :x="STAIRCASE_WIDTH / 2"
                  :y="staircaseHeight / 2 + 10"
                  text-anchor="middle"
                  class="text-[9px] font-bold fill-slate-500 uppercase tracking-widest"
                >Tap "Note Anchor" to start</text>
              </g>

              <!-- SMOOTH CURSOR (the main feedback element) -->
              <circle
                ref="cursorDotEl"
                :cx="STAIRCASE_WIDTH / 2"
                :r="CURSOR_RADIUS"
                class="transition-colors duration-150"
              />

              <!-- Cursor cents readout (floats next to the cursor) -->
              <text
                ref="cursorTextEl"
                :x="STAIRCASE_WIDTH / 2 + CURSOR_RADIUS + 8"
                class="text-[10px] font-mono font-bold select-none"
              ></text>
            </svg>
          </div>
        </div>

        <!-- RIGHT: SIDEBAR (1/3 width on desktop) -->
        <div class="space-y-4">
          <!-- TARGET SELECTOR -->
          <div class="p-5 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-xl">
            <p class="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 mb-3">
              Bend Target
            </p>
            <div class="flex gap-2">
              <button
                v-for=" preset in TARGET_PRESETS "
                :key="preset.label"
                @click="targetSemitones = preset.semitones"
                class="flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                :class="targetSemitones === preset.semitones
                  ? 'bg-amber-500/20 border border-amber-500/40 text-amber-400'
                  : 'bg-white/5 border border-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'"
              >{{ preset.label }}</button>
            </div>
          </div>

          <!-- BEND STATUS HUD -->
          <div class="p-5 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-xl space-y-3">
            <p class="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">
              Bend Status
            </p>

            <!-- Starting Note Trigger -->
            <div class="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
              <div>
                <span class="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Note
                  Anchor</span>
                <span class="text-xl font-black text-white italic tracking-tighter">{{ startingNoteDisplay }}</span>
              </div>
              <button
                @click="isFretboardOpen = !isFretboardOpen"
                class="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[9px] font-black uppercase tracking-widest text-amber-400 hover:bg-amber-500/20 hover:border-amber-500/40 transition-all flex items-center gap-2"
              >
                <span>Change</span>
                <span class="text-[10px]">🎸</span>
              </button>
            </div>

            <!-- Current Bend Distance -->
            <div class="flex justify-between items-baseline">
              <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Distance</span>
              <span
                class="text-lg font-mono font-black transition-colors"
                :class="isOnTarget ? 'text-green-400' : isInBluesZone ? 'text-amber-400' : 'text-slate-200'"
              >{{ bendCentsDisplay }}</span>
            </div>

            <!-- Target -->
            <div class="flex justify-between items-baseline">
              <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Target</span>
              <span class="text-sm font-mono font-bold text-amber-500/60">{{ targetCents }}c</span>
            </div>

            <!-- Hold Timer -->
            <div
              v-if=" isOnTarget "
              class="mt-2 p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-center"
            >
              <p class="text-[9px] font-black uppercase tracking-[0.3em] text-green-400/60 mb-1">Holding</p>
              <p class="text-2xl font-black text-green-400 font-mono">
                {{ holdSeconds.toFixed( 1 ) }}<span class="text-sm text-green-400/50">s</span>
              </p>
            </div>

            <!-- Blues Zone Indicator -->
            <div
              v-if=" isInBluesZone && !isOnTarget "
              class="mt-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center"
            >
              <p class="text-[9px] font-black uppercase tracking-[0.3em] text-blue-400/60">
                ♪ Blues ¼ Bend
              </p>
            </div>
          </div>

          <!-- ATTEMPT HISTORY -->
          <div
            v-if=" attemptHistory.length > 0 "
            class="p-5 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-xl"
          >
            <div class="flex justify-between items-baseline mb-3">
              <p class="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">History</p>
              <p
                v-if=" accuracyPercent !== null "
                class="text-[10px] font-mono font-bold"
                :class="accuracyPercent >= 70 ? 'text-green-400' : accuracyPercent >= 40 ? 'text-amber-400' : 'text-red-400'"
              >{{ accuracyPercent }}%</p>
            </div>
            <div class="flex gap-1.5 flex-wrap">
              <div
                v-for=" ( attempt, idx ) in attemptHistory "
                :key="idx"
                class="w-3 h-3 rounded-full transition-all"
                :class="attempt.held ? 'bg-green-500' : 'bg-red-500/40'"
                :title="attempt.held
                  ? `Hit! ${Math.round( attempt.actualCents )}c / ${attempt.targetCents}c`
                  : `Miss: ${Math.round( attempt.actualCents )}c / ${attempt.targetCents}c`"
              ></div>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
/**
 * Pulsing animation for the target step border.
 * Makes the target visually distinct at a glance.
 */
@keyframes pulse-border {

  0%,
  100% {
    opacity: 0.6;
  }

  50% {
    opacity: 1;
  }
}

/* Popover Transition */
.popover-enter-active,
.popover-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.popover-enter-from,
.popover-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(10px);
}
</style>
