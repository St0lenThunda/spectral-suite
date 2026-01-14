<script setup lang="ts">
/**
 * Fretboard Component
 * 
 * A **reusable, interactive SVG fretboard** visualization.
 * Supports multiple instruments (guitar, bass) and alternate tunings.
 * 
 * **Features:**
 * - Instrument modes: guitar (6 strings), bass (4 strings), bass5 (5 strings)
 * - Tuning presets: standard, dropD, openG, halfStepDown, dadgad
 * - Interactive mode for chord building (Chord Forge)
 * - Display mode for scale visualization (Scale Sleuth)
 * 
 * @module components/Fretboard.vue
 */

import { computed } from 'vue';
import { Note } from 'tonal';

// ============================================================================
// INSTRUMENT & TUNING CONFIGURATIONS
// ============================================================================

/**
 * Supported instrument types.
 * Each has different string count and default frets.
 */
type InstrumentType = 'guitar' | 'bass' | 'bass5';

/**
 * Tuning preset names.
 * Different presets are available for different instruments.
 */
type TuningPreset = 'standard' | 'dropD' | 'openG' | 'halfStepDown' | 'dadgad';

/**
 * String configuration: note name, octave, and display label.
 */
interface StringConfig {
  string: number;
  note: string;
  octave: number;
  label: string;
}

/**
 * Instrument configurations.
 * 
 * **Why separate configs?**
 * Bass guitars have different string counts, tuning, and feel.
 * By configuring each instrument separately, we can:
 * 1. Set appropriate default fret counts (bass = 20, guitar = 24)
 * 2. Render correct string gauges visually
 * 3. Calculate correct pitches per string
 */
const INSTRUMENT_CONFIGS: Record<InstrumentType, {
  defaultFrets: number;
  tunings: Record<string, StringConfig[]>;
}> = {
  guitar: {
    defaultFrets: 24,
    tunings: {
      /**
       * Standard guitar tuning: e B G D A E
       * Most common tuning for rock, pop, jazz, classical.
       */
      standard: [
        { string: 1, note: 'E', octave: 4, label: 'e' },
        { string: 2, note: 'B', octave: 3, label: 'B' },
        { string: 3, note: 'G', octave: 3, label: 'G' },
        { string: 4, note: 'D', octave: 3, label: 'D' },
        { string: 5, note: 'A', octave: 2, label: 'A' },
        { string: 6, note: 'E', octave: 2, label: 'E' }
      ],
      /**
       * Drop D: Low E tuned down to D.
       */
      dropD: [
        { string: 1, note: 'E', octave: 4, label: 'e' },
        { string: 2, note: 'B', octave: 3, label: 'B' },
        { string: 3, note: 'G', octave: 3, label: 'G' },
        { string: 4, note: 'D', octave: 3, label: 'D' },
        { string: 5, note: 'A', octave: 2, label: 'A' },
        { string: 6, note: 'D', octave: 2, label: 'D' }
      ],
      /**
       * Open G: D G D G B D
       */
      openG: [
        { string: 1, note: 'D', octave: 4, label: 'd' },
        { string: 2, note: 'B', octave: 3, label: 'B' },
        { string: 3, note: 'G', octave: 3, label: 'G' },
        { string: 4, note: 'D', octave: 3, label: 'D' },
        { string: 5, note: 'G', octave: 2, label: 'G' },
        { string: 6, note: 'D', octave: 2, label: 'D' }
      ],
      /**
       * Half-step down
       */
      halfStepDown: [
        { string: 1, note: 'Eb', octave: 4, label: 'eb' },
        { string: 2, note: 'Bb', octave: 3, label: 'Bb' },
        { string: 3, note: 'Gb', octave: 3, label: 'Gb' },
        { string: 4, note: 'Db', octave: 3, label: 'Db' },
        { string: 5, note: 'Ab', octave: 2, label: 'Ab' },
        { string: 6, note: 'Eb', octave: 2, label: 'Eb' }
      ],
      /**
       * DADGAD
       */
      dadgad: [
        { string: 1, note: 'D', octave: 4, label: 'd' },
        { string: 2, note: 'A', octave: 3, label: 'A' },
        { string: 3, note: 'G', octave: 3, label: 'G' },
        { string: 4, note: 'D', octave: 3, label: 'D' },
        { string: 5, note: 'A', octave: 2, label: 'A' },
        { string: 6, note: 'D', octave: 2, label: 'D' }
      ]
    }
  },
  bass: {
    defaultFrets: 20,
    tunings: {
      /**
       * Standard 4-string bass: G D A E
       */
      standard: [
        { string: 1, note: 'G', octave: 2, label: 'G' },
        { string: 2, note: 'D', octave: 2, label: 'D' },
        { string: 3, note: 'A', octave: 1, label: 'A' },
        { string: 4, note: 'E', octave: 1, label: 'E' }
      ],
      /**
       * Drop D bass: G D A D
       */
      dropD: [
        { string: 1, note: 'G', octave: 2, label: 'G' },
        { string: 2, note: 'D', octave: 2, label: 'D' },
        { string: 3, note: 'A', octave: 1, label: 'A' },
        { string: 4, note: 'D', octave: 1, label: 'D' }
      ]
    }
  },
  bass5: {
    defaultFrets: 20,
    tunings: {
      /**
       * Standard 5-string bass: G D A E B
       */
      standard: [
        { string: 1, note: 'G', octave: 2, label: 'G' },
        { string: 2, note: 'D', octave: 2, label: 'D' },
        { string: 3, note: 'A', octave: 1, label: 'A' },
        { string: 4, note: 'E', octave: 1, label: 'E' },
        { string: 5, note: 'B', octave: 0, label: 'B' }
      ]
    }
  }
};

// ============================================================================
// PROPS DEFINITION
// ============================================================================

const props = withDefaults( defineProps<{
  /**
   * Instrument type: guitar (6 strings), bass (4), or bass5 (5).
   */
  instrument?: InstrumentType;

  /**
   * Tuning preset. Available options depend on instrument.
   * See INSTRUMENT_CONFIGS for all options.
   */
  tuningPreset?: TuningPreset;

  /**
   * Number of frets to display.
   * Defaults based on instrument (guitar=24, bass=20).
   */
  frets?: number;

  /**
   * Map of string number to fret number.
   * Key: String number, Value: Fret (0=open, null=muted, 1-24=fretted)
   */
  selectedFrets?: Record<number, number | null>;

  /**
   * Enable click interactions.
   */
  interactive?: boolean;

  /**
   * Highlight dots for scales/intervals.
   */
  highlights?: Array<{ string: number; fret: number; color?: string }>;
}>(), {
  instrument: 'guitar',
  tuningPreset: 'standard',
  selectedFrets: () => ( {} ),
  interactive: true,
  highlights: () => []
} );

// ============================================================================
// EMITS DEFINITION
// ============================================================================

const emit = defineEmits<{
  ( e: 'fretClick', stringNum: number, fret: number ): void;
  ( e: 'nutClick', stringNum: number ): void;
}>();

// ============================================================================
// COMPUTED - INSTRUMENT CONFIGURATION
// ============================================================================

/**
 * Get the current instrument's configuration.
 */
const instrumentConfig = computed( () => INSTRUMENT_CONFIGS[props.instrument] );

/**
 * Get the tuning for current instrument and preset.
 * Falls back to standard if preset doesn't exist for this instrument.
 */
const currentTuning = computed( () => {
  const config = instrumentConfig.value;
  const tuning = config.tunings[props.tuningPreset];
  // Fallback to standard if preset not available for this instrument
  return tuning || config.tunings.standard || [];
} );

/**
 * Number of frets to display.
 * Uses prop if provided, otherwise uses instrument default.
 */
const fretCount = computed( () => {
  return props.frets ?? instrumentConfig.value.defaultFrets;
} );

/**
 * Number of strings on current instrument.
 */
const stringCount = computed( () => currentTuning.value?.length || 6 );

// ============================================================================
// CONSTANTS - SVG DIMENSIONS
// ============================================================================

const FRETBOARD_WIDTH = 800;
const NUT_WIDTH = 40;
const STRING_SPACING = 30;
const FIRST_STRING_Y = 25;

/**
 * Dynamic height based on string count.
 * 4 strings = 130px, 5 strings = 160px, 6 strings = 200px
 */
const FRETBOARD_HEIGHT = computed( () => {
  return FIRST_STRING_Y + ( stringCount.value - 1 ) * STRING_SPACING + 30;
} );

// ============================================================================
// COMPUTED - FRET MARKERS
// ============================================================================

const fretMarkers = computed( () => {
  const markers = [3, 5, 7, 9, 12, 15, 17, 19, 21, 24];
  return markers.filter( f => f <= fretCount.value );
} );

const fretLabels = computed( () => {
  const labels = [1, 3, 5, 7, 9, 12, 15, 17, 19, 21, 24];
  return labels.filter( f => f <= fretCount.value );
} );

// ============================================================================
// METHODS - NOTE CALCULATION
// ============================================================================

/**
 * Get note at a specific fret on a string.
 * Uses MIDI-based calculation for accurate chromatic notes.
 */
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

/**
 * Extract pitch class (note without octave).
 */
const getPitchClass = ( noteWithOctave: string ): string => {
  return Note.pitchClass( noteWithOctave ) || '';
};

// ============================================================================
// METHODS - SVG COORDINATES
// ============================================================================

const getFretX = ( fret: number ): number => {
  if ( fret === 0 ) return NUT_WIDTH / 2;
  const fretWidth = ( FRETBOARD_WIDTH - NUT_WIDTH ) / fretCount.value;
  return NUT_WIDTH + ( fret - 0.5 ) * fretWidth;
};

const getStringY = ( stringNum: number ): number => {
  const tuning = currentTuning.value;
  if ( !tuning ) return FIRST_STRING_Y;
  // Find the index of this string in current tuning (0 = top)
  const stringIndex = tuning.findIndex( s => s.string === stringNum );
  if ( stringIndex === -1 ) return FIRST_STRING_Y;
  return FIRST_STRING_Y + stringIndex * STRING_SPACING;
};

// ============================================================================
// METHODS - INTERACTION
// ============================================================================

const handleFretClick = ( stringNum: number, fret: number ) => {
  if ( props.interactive ) {
    emit( 'fretClick', stringNum, fret );
  }
};

const handleNutClick = ( stringNum: number ) => {
  if ( props.interactive ) {
    emit( 'nutClick', stringNum );
  }
};
</script>

<template>
  <div class="overflow-x-auto">
    <svg
      :viewBox="`0 0 ${FRETBOARD_WIDTH} ${FRETBOARD_HEIGHT}`"
      class="w-full min-w-[600px] h-auto"
      style="background: linear-gradient(180deg, rgba(139,69,19,0.3) 0%, rgba(101,67,33,0.2) 100%)"
    >
      <!-- Fretboard Background -->
      <rect
        :x="NUT_WIDTH"
        y="0"
        :width="FRETBOARD_WIDTH - NUT_WIDTH"
        :height="FRETBOARD_HEIGHT"
        fill="url(#fretboardGradient)"
        rx="4"
      />

      <defs>
        <linearGradient
          id="fretboardGradient"
          x1="0%"
          y1="0%"
          x2="0%"
          y2="100%"
        >
          <stop
            offset="0%"
            stop-color="rgba(139,90,43,0.8)"
          />
          <stop
            offset="100%"
            stop-color="rgba(101,67,33,0.9)"
          />
        </linearGradient>
      </defs>

      <!-- Nut -->
      <rect
        x="0"
        y="0"
        :width="NUT_WIDTH"
        :height="FRETBOARD_HEIGHT"
        fill="rgba(245,245,220,0.9)"
        rx="2"
      />

      <!-- Fret Wires -->
      <line
        v-for=" fret in fretCount "
        :key="`fret-${fret}`"
        :x1="NUT_WIDTH + ( fret * ( ( FRETBOARD_WIDTH - NUT_WIDTH ) / fretCount ) )"
        y1="10"
        :x2="NUT_WIDTH + ( fret * ( ( FRETBOARD_WIDTH - NUT_WIDTH ) / fretCount ) )"
        :y2="FRETBOARD_HEIGHT - 10"
        stroke="rgba(192,192,192,0.7)"
        stroke-width="2"
      />

      <!-- Fret Markers (single dots) -->
      <circle
        v-for=" fret in fretMarkers.filter( f => f !== 12 && f !== 24 ) "
        :key="`marker-${fret}`"
        :cx="getFretX( fret )"
        :cy="FRETBOARD_HEIGHT / 2"
        r="8"
        fill="rgba(255,255,255,0.15)"
      />

      <!-- Double dots (12th, 24th) -->
      <template
        v-for=" fret in [12, 24].filter( f => f <= fretCount ) "
        :key="`dbl-${fret}`"
      >
        <circle
          :cx="getFretX( fret )"
          :cy="FRETBOARD_HEIGHT / 2 - 25"
          r="8"
          fill="rgba(255,255,255,0.15)"
        />
        <circle
          :cx="getFretX( fret )"
          :cy="FRETBOARD_HEIGHT / 2 + 25"
          r="8"
          fill="rgba(255,255,255,0.15)"
        />
      </template>

      <!-- Strings -->
      <line
        v-for=" string in currentTuning "
        :key="`string-${string.string}`"
        x1="0"
        :y1="getStringY( string.string )"
        :x2="FRETBOARD_WIDTH"
        :y2="getStringY( string.string )"
        :stroke="string.string > ( stringCount / 2 ) ? 'rgba(255,215,0,0.6)' : 'rgba(192,192,192,0.8)'"
        :stroke-width="3 - ( ( currentTuning?.findIndex( s => s.string === string.string ) ?? 0 ) / stringCount * 1.5 )"
      />

      <!-- Nut Indicators (X/O) -->
      <g
        v-for=" string in currentTuning "
        :key="`nut-${string.string}`"
      >
        <text
          :x="NUT_WIDTH / 2"
          :y="getStringY( string.string ) + 5"
          text-anchor="middle"
          :class="['text-[14px] font-black select-none', interactive ? 'cursor-pointer' : '']"
          :fill="selectedFrets[string.string] === null || selectedFrets[string.string] === undefined ? '#ef4444' : '#22c55e'"
          @click="handleNutClick( string.string )"
        >
          {{ selectedFrets[string.string] === null || selectedFrets[string.string] === undefined ? 'X' : 'O' }}
        </text>
      </g>

      <!-- Clickable Fret Zones -->
      <g
        v-if=" interactive "
        v-for=" string in currentTuning "
        :key="`zones-${string.string}`"
      >
        <rect
          v-for=" fret in fretCount "
          :key="`zone-${string.string}-${fret}`"
          :x="NUT_WIDTH + ( ( fret - 1 ) * ( ( FRETBOARD_WIDTH - NUT_WIDTH ) / fretCount ) )"
          :y="getStringY( string.string ) - 12"
          :width="( FRETBOARD_WIDTH - NUT_WIDTH ) / fretCount"
          height="24"
          fill="transparent"
          class="cursor-pointer hover:fill-white/10 transition-all"
          @click="handleFretClick( string.string, fret )"
        />
      </g>

      <!-- Scale Highlights -->
      <g
        v-for=" highlight in highlights "
        :key="`hl-${highlight.string}-${highlight.fret}`"
      >
        <circle
          :cx="getFretX( highlight.fret )"
          :cy="getStringY( highlight.string )"
          r="8"
          :fill="highlight.color || 'rgba(99, 102, 241, 0.5)'"
          class="pointer-events-none"
        />
      </g>

      <!-- Selected Fret Dots -->
      <g
        v-for=" string in currentTuning "
        :key="`dots-${string.string}`"
      >
        <circle
          v-if=" selectedFrets[string.string] !== null && selectedFrets[string.string] !== undefined && selectedFrets[string.string]! > 0 "
          :cx="getFretX( selectedFrets[string.string]! )"
          :cy="getStringY( string.string )"
          r="10"
          class="fill-amber-500 stroke-amber-300 stroke-2 animate-in zoom-in"
        />
        <text
          v-if=" selectedFrets[string.string] !== null && selectedFrets[string.string] !== undefined && selectedFrets[string.string]! > 0 "
          :x="getFretX( selectedFrets[string.string]! )"
          :y="getStringY( string.string ) + 4"
          text-anchor="middle"
          class="text-[9px] font-black fill-spectral-950 select-none pointer-events-none"
        >
          {{ getPitchClass( getNoteAtFret( string.string, selectedFrets[string.string]! ) ) }}
        </text>
      </g>

      <!-- String Labels -->
      <text
        v-for=" string in currentTuning "
        :key="`label-${string.string}`"
        :x="FRETBOARD_WIDTH - 15"
        :y="getStringY( string.string ) + 4"
        text-anchor="middle"
        class="text-[10px] font-bold fill-slate-400 select-none"
      >
        {{ string.label }}
      </text>

      <!-- Fret Numbers -->
      <text
        v-for=" fret in fretLabels "
        :key="`fretnum-${fret}`"
        :x="getFretX( fret )"
        :y="FRETBOARD_HEIGHT - 5"
        text-anchor="middle"
        class="text-[10px] font-bold fill-slate-500 select-none"
      >
        {{ fret }}
      </text>
    </svg>
  </div>
</template>

<style scoped>
/* Using Tailwind classes */
</style>
