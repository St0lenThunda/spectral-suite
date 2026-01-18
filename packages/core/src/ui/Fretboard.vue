<script setup lang="ts">
/**
 * Unified Fretboard Component
 * 
 * A high-precision, interactive SVG fretboard visualization.
 * Supports multiple instruments, alternate tunings, and multi-layered highlighting.
 * 
 * Features:
 * - Instrument modes: guitar (6 strings), bass (4 strings), bass5 (5 strings)
 * - Tuning presets: standard, dropD, openG, halfStepDown, dadgad
 * - Interactive mode for chord building (Chord Forge)
 * - Highlight mode for scales/theory (Scale Sleuth, Chord Capture)
 * - Compatibility layer for legacy note-based highlighting
 * 
 * @module ui/Fretboard.vue
 */

import { computed } from 'vue';
import { Note } from 'tonal';

// ============================================================================
// INSTRUMENT & TUNING CONFIGURATIONS
// ============================================================================

type InstrumentType = 'guitar' | 'bass' | 'bass5';
type TuningPreset = 'standard' | 'dropD' | 'openG' | 'halfStepDown' | 'dadgad';

interface StringConfig {
  string: number;
  note: string;
  octave: number;
  label: string;
}

const INSTRUMENT_CONFIGS: Record<InstrumentType, {
  defaultFrets: number;
  tunings: Record<string, StringConfig[]>;
}> = {
  guitar: {
    defaultFrets: 24,
    tunings: {
      standard: [
        { string: 1, note: 'E', octave: 4, label: 'e' },
        { string: 2, note: 'B', octave: 3, label: 'B' },
        { string: 3, note: 'G', octave: 3, label: 'G' },
        { string: 4, note: 'D', octave: 3, label: 'D' },
        { string: 5, note: 'A', octave: 2, label: 'A' },
        { string: 6, note: 'E', octave: 2, label: 'E' }
      ],
      dropD: [
        { string: 1, note: 'E', octave: 4, label: 'e' },
        { string: 2, note: 'B', octave: 3, label: 'B' },
        { string: 3, note: 'G', octave: 3, label: 'G' },
        { string: 4, note: 'D', octave: 3, label: 'D' },
        { string: 5, note: 'A', octave: 2, label: 'A' },
        { string: 6, note: 'D', octave: 2, label: 'D' }
      ],
      openG: [
        { string: 1, note: 'D', octave: 4, label: 'd' },
        { string: 2, note: 'B', octave: 3, label: 'B' },
        { string: 3, note: 'G', octave: 3, label: 'G' },
        { string: 4, note: 'D', octave: 3, label: 'D' },
        { string: 5, note: 'G', octave: 2, label: 'G' },
        { string: 6, note: 'D', octave: 2, label: 'D' }
      ],
      halfStepDown: [
        { string: 1, note: 'Eb', octave: 4, label: 'eb' },
        { string: 2, note: 'Bb', octave: 3, label: 'Bb' },
        { string: 3, note: 'Gb', octave: 3, label: 'Gb' },
        { string: 4, note: 'Db', octave: 3, label: 'Db' },
        { string: 5, note: 'Ab', octave: 2, label: 'Ab' },
        { string: 6, note: 'Eb', octave: 2, label: 'Eb' }
      ],
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
      standard: [
        { string: 1, note: 'G', octave: 2, label: 'G' },
        { string: 2, note: 'D', octave: 2, label: 'D' },
        { string: 3, note: 'A', octave: 1, label: 'A' },
        { string: 4, note: 'E', octave: 1, label: 'E' }
      ],
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

interface Props {
  // --- New Core / Chord Forge Props ---
  instrument?: InstrumentType;
  tuningPreset?: TuningPreset;
  frets?: number;
  selectedFrets?: Record<number, number | null>;
  interactive?: boolean;
  highlights?: Array<{ string: number; fret: number; color?: string }>;

  // --- Legacy Compatibility Props ---
  activeNotes?: string[];
  highlightNotes?: string[];
  labels?: Record<string, string>;
  fretRange?: [number, number];
  playbackNote?: string;
  numFrets?: number;
}

const props = withDefaults( defineProps<Props>(), {
  instrument: 'guitar',
  tuningPreset: 'standard',
  selectedFrets: () => ( {} ),
  interactive: true,
  highlights: () => [],
  activeNotes: () => [],
  highlightNotes: () => [],
  labels: () => ( {} ),
  numFrets: undefined
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

const instrumentConfig = computed( () => INSTRUMENT_CONFIGS[props.instrument] );

const currentTuning = computed( () => {
  const config = instrumentConfig.value;
  const tuning = config.tunings[props.tuningPreset];
  return tuning || config.tunings.standard || [];
} );

const fretCount = computed( () => {
  return props.frets ?? props.numFrets ?? instrumentConfig.value.defaultFrets;
} );

const stringCount = computed( () => currentTuning.value?.length || 6 );

// ============================================================================
// COMPATIBILITY LAYER - NOTE PROCESSING
// ============================================================================

/**
 * Enhanced matching logic:
 * We convert note names to Chromas (0-11) to handle enharmonic equivalence (C# == Db).
 */
const activeChromas = computed( () => {
  const notes = props.activeNotes || [];
  const chromas = notes
    .map( n => Note.get( n ).pc ) // Get Pitch Class (e.g. "C#")
    .filter( ( pc ): pc is string => !!pc )
    .map( pc => Note.chroma( pc ) ) // Get Chroma index (0-11)
    .filter( ( c ): c is number => c !== undefined && c !== null );
  return new Set( chromas );
} );

const highlightChromas = computed( () => {
  const notes = props.highlightNotes || [];
  const chromas = notes
    .map( n => Note.get( n ).pc )
    .filter( ( pc ): pc is string => !!pc )
    .map( pc => Note.chroma( pc ) )
    .filter( ( c ): c is number => c !== undefined && c !== null );
  return new Set( chromas );
} );

/**
 * Resolves the display label for a note (supports custom mapping from 'labels' prop).
 */
const getLabel = ( noteName: string ) => {
  const chroma = Note.chroma( noteName );
  const labelKey = Object.keys( props.labels ).find( k => Note.chroma( k ) === chroma );
  return ( labelKey && props.labels[labelKey] ) ? props.labels[labelKey] : Note.pitchClass( noteName );
};

// ============================================================================
// CONSTANTS - SVG DIMENSIONS
// ============================================================================

const FRETBOARD_WIDTH = 800;
const NUT_WIDTH = 40;
const STRING_SPACING = 30;
const FIRST_STRING_Y = 25;

const FRETBOARD_HEIGHT = computed( () => {
  return FIRST_STRING_Y + ( stringCount.value - 1 ) * STRING_SPACING + 30;
} );

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
 * Calculates the note at a specific fret and string.
 */
const getNoteAtFret = ( stringNum: number, fret: number ): string => {
  const tuning = currentTuning.value;
  if ( !tuning ) return '';
  const stringInfo = tuning.find( s => s.string === stringNum );
  if ( !stringInfo ) return '';

  const openNote = `${stringInfo.note}${stringInfo.octave}`;
  const openMidi = Note.midi( openNote );

  if ( openMidi !== null ) {
    return Note.fromMidi( openMidi + fret ) || openNote;
  }

  return openNote;
};

// ============================================================================
// HELPER METHODS - STYLING & FILTERING
// ============================================================================

const isInsideRange = ( fret: number ) => {
  if ( !props.fretRange ) return true;
  const [min, max] = props.fretRange;
  return fret >= min && fret <= max;
};

const getHighlightStyle = ( stringNum: number, fret: number ) => {
  const note = getNoteAtFret( stringNum, fret );
  const chroma = Note.chroma( note );

  // 1. Playback Note (Amber Glow)
  if ( props.playbackNote && Note.chroma( props.playbackNote ) === chroma && isInsideRange( fret ) ) {
    return {
      classes: 'fill-amber-400 stroke-amber-100',
      style: { filter: 'url(#glow-amber)' }
    };
  }

  // 2. Manual highlights array (ChordForge Alt Voicings)
  // We prioritize this over "selection" so that alt-voicings keep their Rose/Cyan/Emerald colors
  const manual = props.highlights?.find( h => h.string === stringNum && h.fret === fret );
  if ( manual ) {
    const isHex = manual.color?.startsWith( '#' );
    return {
      classes: isHex ? 'stroke-white/50' : ( manual.color || 'fill-indigo-500/50 stroke-indigo-300/50' ),
      style: isHex ? { fill: manual.color } : {}
    };
  }

  // 3. Selection from Chord Forge (Amber Solid)
  if ( props.selectedFrets[stringNum] === fret ) {
    return {
      classes: 'fill-amber-500 stroke-amber-200',
      style: {}
    };
  }

  // 4. Active Note from compatibility prop (Sky Blue)
  // We show active (played) notes everywhere for better feedback, ignoring range
  if ( activeChromas.value.has( chroma ) ) {
    return {
      classes: 'fill-sky-500 stroke-sky-200',
      style: { filter: 'url(#glow-sky)' }
    };
  }

  // 5. Highlight Note from compatibility prop (Emerald / Scale Suggestions)
  // These stay within the range (e.g. CAGED shapes)
  if ( highlightChromas.value.has( chroma ) && isInsideRange( fret ) ) {
    return {
      classes: 'fill-emerald-600 stroke-emerald-300',
      style: {}
    };
  }

  return null;
};

const getFretX = ( fret: number ): number => {
  if ( fret === 0 ) return NUT_WIDTH / 2;
  const fretWidth = ( FRETBOARD_WIDTH - NUT_WIDTH ) / fretCount.value;
  return NUT_WIDTH + ( fret - 0.5 ) * fretWidth;
};

const getStringY = ( stringNum: number ): number => {
  const tuning = currentTuning.value;
  if ( !tuning ) return FIRST_STRING_Y;
  const stringIndex = tuning.findIndex( s => s.string === stringNum );
  if ( stringIndex === -1 ) return FIRST_STRING_Y;
  return FIRST_STRING_Y + stringIndex * STRING_SPACING;
};

// ============================================================================
// METHODS - INTERACTION
// ============================================================================

const handleFretAction = ( stringNum: number, fret: number ) => {
  if ( props.interactive ) {
    emit( 'fretClick', stringNum, fret );
  }
};

const handleNutAction = ( stringNum: number ) => {
  if ( props.interactive ) {
    emit( 'nutClick', stringNum );
  }
};
</script>

<template>
  <div class="fretboard-container overflow-x-auto p-4 bg-slate-950 rounded-2xl border border-slate-800">
    <svg
      :viewBox="`0 0 ${FRETBOARD_WIDTH} ${FRETBOARD_HEIGHT}`"
      class="w-full min-w-[600px] mx-auto"
      preserveAspectRatio="xMidYMid meet"
    >
      <!-- Wood Texture Background -->
      <rect
        :x="NUT_WIDTH"
        y="0"
        :width="FRETBOARD_WIDTH - NUT_WIDTH"
        :height="FRETBOARD_HEIGHT"
        fill="url(#fretboardGrain)"
        rx="4"
      />

      <defs>
        <linearGradient
          id="fretboardGrain"
          x1="0%"
          y1="0%"
          x2="0%"
          y2="100%"
        >
          <stop
            offset="0%"
            stop-color="#2d2218"
          />
          <stop
            offset="50%"
            stop-color="#1a140f"
          />
          <stop
            offset="100%"
            stop-color="#2d2218"
          />
        </linearGradient>

        <filter
          id="glow-amber"
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
        <filter
          id="glow-sky"
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

      <!-- Nut -->
      <rect
        x="0"
        y="0"
        :width="NUT_WIDTH"
        :height="FRETBOARD_HEIGHT"
        fill="#f5f5f5"
        rx="2"
      />

      <!-- Range Indicator (Area Highlight) -->
      <rect
        v-if=" props.fretRange "
        :x="getFretX( props.fretRange[0] ) - ( ( FRETBOARD_WIDTH - NUT_WIDTH ) / fretCount ) / 2"
        y="0"
        :width="( ( FRETBOARD_WIDTH - NUT_WIDTH ) / fretCount ) * ( props.fretRange[1] - props.fretRange[0] + 1 )"
        :height="FRETBOARD_HEIGHT"
        fill="rgba(99, 102, 241, 0.1)"
        stroke="rgba(99, 102, 241, 0.3)"
        stroke-width="2"
        rx="8"
        class="pointer-events-none transition-all duration-300"
      />

      <!-- Fret Wires -->
      <line
        v-for=" fret in fretCount "
        :key="`wire-${fret}`"
        :x1="NUT_WIDTH + ( fret * ( ( FRETBOARD_WIDTH - NUT_WIDTH ) / fretCount ) )"
        y1="0"
        :x2="NUT_WIDTH + ( fret * ( ( FRETBOARD_WIDTH - NUT_WIDTH ) / fretCount ) )"
        :y2="FRETBOARD_HEIGHT"
        stroke="#71717a"
        stroke-width="2"
      />

      <!-- Fret Markers -->
      <circle
        v-for=" fret in fretMarkers.filter( f => f !== 12 && f !== 24 ) "
        :key="`marker-${fret}`"
        :cx="getFretX( fret )"
        :cy="FRETBOARD_HEIGHT / 2"
        r="6"
        fill="rgba(255,255,255,0.1)"
      />

      <!-- Double Dots -->
      <template
        v-for=" fret in [12, 24].filter( f => f <= fretCount ) "
        :key="`dbl-${fret}`"
      >
        <circle
          :cx="getFretX( fret )"
          :cy="FRETBOARD_HEIGHT / 2 - 25"
          r="6"
          fill="rgba(255,255,255,0.1)"
        />
        <circle
          :cx="getFretX( fret )"
          :cy="FRETBOARD_HEIGHT / 2 + 25"
          r="6"
          fill="rgba(255,255,255,0.1)"
        />
      </template>

      <!-- Strings (Back) -->
      <line
        v-for=" ( string, idx ) in currentTuning "
        :key="`s-back-${string.string}`"
        x1="0"
        :y1="getStringY( string.string )"
        :x2="FRETBOARD_WIDTH"
        :y2="getStringY( string.string )"
        :stroke="idx > ( stringCount / 2 ) ? '#fbbf24' : '#a1a1aa'"
        :stroke-width="1 + ( idx * 0.4 )"
        opacity="0.3"
      />

      <!-- Note Positions & Interaction Zones -->
      <g
        v-for=" string in currentTuning "
        :key="`notes-${string.string}`"
      >
        <!-- Nut Interaction & Highlight -->
        <g
          @click="handleNutAction( string.string )"
          class="cursor-pointer"
        >
          <!-- Highlight Circle for Open String -->
          <circle
            v-if=" getHighlightStyle( string.string, 0 ) "
            :cx="NUT_WIDTH / 2"
            :cy="getStringY( string.string )"
            r="10"
            class="stroke-2 transition-all duration-300"
            :class="getHighlightStyle( string.string, 0 )?.classes"
            :style="getHighlightStyle( string.string, 0 )?.style"
          />
          <!-- X/O or Note Name if highlighted -->
          <text
            :x="NUT_WIDTH / 2"
            :y="getStringY( string.string ) + 5"
            text-anchor="middle"
            class="text-[14px] font-black select-none transition-colors"
            :fill="getHighlightStyle( string.string, 0 )
              ? '#ffffff'
              : ( selectedFrets[string.string] === null || selectedFrets[string.string] === undefined ? '#ef4444' : '#22c55e' )"
          >
            {{ getHighlightStyle( string.string, 0 )
              ? getLabel( getNoteAtFret( string.string, 0 ) )
              : ( selectedFrets[string.string] === null || selectedFrets[string.string] === undefined ? 'X' : 'O' ) }}
          </text>
        </g>

        <!-- Frets -->
        <g
          v-for=" fret in fretCount "
          :key="`f-${string.string}-${fret}`"
        >
          <!-- Interaction Hitbox -->
          <rect
            :x="NUT_WIDTH + ( ( fret - 1 ) * ( ( FRETBOARD_WIDTH - NUT_WIDTH ) / fretCount ) )"
            :y="getStringY( string.string ) - 15"
            :width="( FRETBOARD_WIDTH - NUT_WIDTH ) / fretCount"
            height="30"
            fill="transparent"
            class="cursor-pointer hover:fill-white/5 transition-colors"
            @click="handleFretAction( string.string, fret )"
          />

          <!-- Note Visual (Legacy Highlights or Selected Dots) -->
          <template v-if=" selectedFrets[string.string] === fret || getHighlightStyle( string.string, fret ) ">
            <circle
              :cx="getFretX( fret )"
              :cy="getStringY( string.string )"
              r="10"
              class="stroke-2 transition-all duration-300"
              :class="getHighlightStyle( string.string, fret )?.classes || 'fill-indigo-500 stroke-indigo-300'"
              :style="getHighlightStyle( string.string, fret )?.style"
            />
            <text
              :x="getFretX( fret )"
              :y="getStringY( string.string ) + 4"
              text-anchor="middle"
              class="text-[10px] font-black fill-white select-none pointer-events-none"
            >
              {{ getLabel( getNoteAtFret( string.string, fret ) ) }}
            </text>
          </template>
        </g>
      </g>

      <!-- Fret Numbers (Bottom) -->
      <text
        v-for=" fret in fretLabels "
        :key="`fnum-${fret}`"
        :x="getFretX( fret )"
        :y="FRETBOARD_HEIGHT - 5"
        text-anchor="middle"
        class="text-[9px] font-bold fill-slate-500 select-none"
      >
        {{ fret }}
      </text>

      <!-- String Labels (Right) -->
      <text
        v-for=" string in currentTuning "
        :key="`slabl-${string.string}`"
        :x="FRETBOARD_WIDTH - 15"
        :y="getStringY( string.string ) + 4"
        text-anchor="middle"
        class="text-[10px] font-black fill-slate-600 select-none"
      >
        {{ string.label }}
      </text>
    </svg>
  </div>
</template>

<style scoped>
.fretboard-container::-webkit-scrollbar {
  height: 6px;
}
.fretboard-container::-webkit-scrollbar-track {
  background: transparent;
}
.fretboard-container::-webkit-scrollbar-thumb {
  background: #334155;
  border-radius: 10px;
}
</style>
