/**
 * useHarmonicTheory — Shared Music Theory Composable
 *
 * This composable is the "brain" of harmonic analysis logic used by
 * both the Harmonic Orbit and the Tonnetz. It was extracted from
 * HarmonicOrbitModule.vue to avoid duplicating theory code.
 *
 * What it provides:
 * - The 12 keys of the Circle of Fifths (FIFTHS_KEYS)
 * - Functions to calculate chord families, neighbor positions, and colors
 * - Audio playback for triads (major, minor, diminished)
 *
 * Why a composable?
 * -----------------
 * In Vue 3, a "composable" is a function that uses Vue's reactivity
 * (ref, computed, etc.) and can be shared across components. It's like
 * a reusable module of reactive logic. We use the naming convention
 * `useXxx` so it's clear this is a composable, not a plain utility.
 *
 * @module composables/useHarmonicTheory
 */

import { ref, computed } from 'vue';
import { SynthEngine, Note } from '@spectralsuite/core';
import type { FifthsKeyEntry } from './harmonicKeys';

// ─── CONSTANTS ──────────────────────────────────────────────────────

/**
 * The 12 keys in Circle of Fifths order.
 *
 * Why this order? Each key is a Perfect 5th (7 semitones) above the
 * previous one: C → G → D → A → E → B → Gb → Db → Ab → Eb → Bb → F.
 * Going clockwise adds a sharp; going counter-clockwise adds a flat.
 *
 * Each entry contains ALL the diatonic chords for that key, plus
 * the key signature and a fun educational fact.
 */
export const FIFTHS_KEYS: FifthsKeyEntry[] = [
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

/**
 * All 12 chromatic pitch class names.
 * Used by the Tonnetz to label nodes and calculate positions.
 */
export const PITCH_CLASSES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

// ─── COMPOSABLE ─────────────────────────────────────────────────────

/**
 * Composable that provides shared harmonic theory logic.
 *
 * Call this once in any component that needs music theory functions.
 * Each call creates a fresh set of reactive refs — if you want to SHARE
 * state between components, use provide/inject with the refs from this
 * composable.
 *
 * @returns An object with reactive state and theory functions
 */
export function useHarmonicTheory () {

  // ── Reactive State ──────────────────────────────────────────────

  /** Whether the circle shows Fifths (true) or Fourths (false) */
  const isFifthsMode = ref( true );

  /** Index of the currently selected key (0-11), or null */
  const selectedKeyIdx = ref<number | null>( null );

  /** The specific chord type selected within the key */
  const selectedType = ref<'major' | 'minor' | 'dim' | 'ii' | 'iii' | 'vi'>( 'major' );

  /** The note names of the currently selected/playing triad (e.g. ['C', 'E', 'G']) */
  const currentTriadNotes = ref<string[]>( [] );

  /**
   * The ordered array of keys based on the current mode.
   * In Fifths mode: C, G, D, A, E, B, Gb, Db, Ab, Eb, Bb, F
   * In Fourths mode: same array reversed (F, Bb, Eb, Ab, Db, Gb, B, E, A, D, G, C)
   */
  const activeKeys = computed( () => {
    return isFifthsMode.value ? FIFTHS_KEYS : [...FIFTHS_KEYS].reverse();
  } );

  // ── Theory Functions ────────────────────────────────────────────

  /**
   * Gets the neighbor index on the circle, wrapping around.
   *
   * On a 12-element circle:
   * - offset +1 = clockwise neighbor (the Dominant / 5th)
   * - offset -1 = counter-clockwise neighbor (the Subdominant / 4th)
   *
   * The `+ 12) % 12` trick ensures wrapping: if we're at index 0
   * and go -1, we get (0 - 1 + 12) % 12 = 11 (wraps to F).
   *
   * @param baseIdx - The starting index (0-11)
   * @param offset - How many steps to move (positive = CW, negative = CCW)
   * @returns The wrapped neighbor index (0-11)
   */
  const getNeighborIdx = ( baseIdx: number, offset: number ): number => {
    return ( baseIdx + offset + 12 ) % 12;
  };

  /**
   * Returns all 7 diatonic chords for a given key, with display metadata.
   *
   * Diatonic = "belonging to the key." Every major key has exactly 7 chords:
   *   I (Major), ii (minor), iii (minor), IV (Major),
   *   V (Major), vi (minor), vii° (diminished)
   *
   * The IV and V chords come from the NEIGHBORS on the Circle of Fifths,
   * which is why this function needs `getNeighborIdx`.
   *
   * @param idx - Index of the key (0-11) in the activeKeys array
   * @param type - Which chord type perspective to use
   * @returns Array of 7 chord objects with degree, name, color info
   */
  const getFamilyChords = (
    idx: number,
    type: 'major' | 'minor' | 'dim' | 'ii' | 'iii' | 'vi' = 'major'
  ) => {
    const keys = activeKeys.value;
    const self = keys[idx]!;
    const ccw = keys[getNeighborIdx( idx, -1 )]!; // Counter-clockwise = IV
    const cw = keys[getNeighborIdx( idx, 1 )]!;   // Clockwise = V

    if ( type === 'major' || type === 'dim' || type === 'ii' || type === 'iii' || type === 'vi' ) {
      // Major key family: I, ii, iii, IV, V, vi, vii°
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

  /**
   * Visual style resolver for Orbit segments.
   *
   * Implements a "Tiered Glow" hierarchy:
   *   1. Selected chord → brightest fill + full stroke
   *   2. Family member → medium fill + partial stroke
   *   3. Non-family → dim fill
   *
   * @param chordName - The chord label to resolve style for (e.g. 'C', 'Dm', 'Bdim')
   * @returns Object with fill, stroke, opacity, and boolean flags
   */
  const getSegmentStyle = ( chordName: string ) => {
    // Check if this chord is the specifically selected target
    const isTarget = selectedKeyIdx.value !== null && (
      ( selectedType.value === 'major' && activeKeys.value[selectedKeyIdx.value]?.major === chordName ) ||
      ( selectedType.value === 'minor' && activeKeys.value[selectedKeyIdx.value]?.vi === chordName ) ||
      ( selectedType.value === 'dim' && activeKeys.value[selectedKeyIdx.value]?.dim === chordName )
    );

    // Default: no selection, everything neutral
    const defaultStyle = {
      fill: 'rgba(255,255,255,0.03)',
      stroke: 'rgba(255,255,255,0.2)',
      isFamily: false,
      isSelected: false,
      color: '#ffffff',
      fillOpacity: 1,
      textOpacity: 0.95
    };

    // Nothing selected? Everything gets the default look
    if ( selectedKeyIdx.value === null ) return defaultStyle;

    const family = getFamilyChords( selectedKeyIdx.value, selectedType.value );

    // Normalize chord names for comparison (strip suffixes like 'm', 'dim')
    const normalize = ( n: string ) =>
      n.toLowerCase().replace( ' major', '' ).replace( ' minor', '' )
        .replace( 'm', '' ).replace( 'dim', '' ).trim();

    const matchingChord = family.find( c => normalize( c.name ) === normalize( chordName ) );

    if ( matchingChord ) {
      // Map Tailwind class names to actual hex colors for SVG fills
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
        // Selected chord: maximum glow
        return { fill: `${color}66`, stroke: color, isFamily: true, isSelected: true, color, fillOpacity: 1, textOpacity: 1 };
      } else {
        // Family member: medium glow
        return { fill: `${color}25`, stroke: `${color}99`, isFamily: true, isSelected: false, color, fillOpacity: 0.8, textOpacity: 1 };
      }
    }

    // Not in the family: sharp text but dimmed path
    return { ...defaultStyle, fillOpacity: 0.4 };
  };

  // ── Audio Functions ─────────────────────────────────────────────

  /**
   * Plays a triad (3-note chord) using the synth engine.
   *
   * A triad is built from a root note plus two intervals:
   *   Major:      root + Major 3rd (4 semitones) + Perfect 5th (7 semitones)
   *   Minor:      root + minor 3rd (3 semitones) + Perfect 5th (7 semitones)
   *   Diminished: root + minor 3rd (3 semitones) + diminished 5th (6 semitones)
   *
   * The notes are staggered by 50ms each to create a "strum" effect.
   *
   * @param note - The chord label (e.g. 'C', 'Dm', 'Bdim'). We strip
   *               suffixes to get the root note.
   * @param type - The chord quality: 'major', 'minor', or 'dim'
   */
  const playTriad = ( note: string, type: 'major' | 'minor' | 'dim' ) => {
    const synth = SynthEngine.getInstance();

    // Strip 'm' and 'dim' to get the raw root note name (e.g. 'Dm' → 'D')
    const root = note.replace( 'm', '' ).replace( 'dim', '' );

    // Get the root frequency at octave 3
    const f1 = Note.freq( `${root}3` );

    // Calculate the other two notes of the triad using interval transposition
    let n2Name: string;
    let n3Name: string;

    if ( type === 'major' ) {
      n2Name = Note.transpose( root, 'M3' ); // Major 3rd = 4 semitones up
      n3Name = Note.transpose( root, 'P5' ); // Perfect 5th = 7 semitones up
    } else if ( type === 'minor' ) {
      n2Name = Note.transpose( root, 'm3' ); // minor 3rd = 3 semitones up
      n3Name = Note.transpose( root, 'P5' ); // Perfect 5th = 7 semitones up
    } else {
      // Diminished: minor 3rd + diminished 5th (tritone)
      n2Name = Note.transpose( root, 'm3' ); // minor 3rd = 3 semitones up
      n3Name = Note.transpose( root, 'd5' ); // diminished 5th = 6 semitones up
    }

    // Store note names for UI display (e.g. "C - E - G")
    currentTriadNotes.value = [root, n2Name, n3Name];

    // Get frequencies at octave 3
    const f2 = Note.freq( n2Name + '3' );
    const f3 = Note.freq( n3Name + '3' );

    // Play each note with a 50ms stagger for a natural "strum" feel
    // 500ms duration = half a second per note
    if ( f1 ) synth.playNote( f1, 500 );
    setTimeout( () => { if ( f2 ) synth.playNote( f2, 500 ); }, 50 );
    setTimeout( () => { if ( f3 ) synth.playNote( f3, 500 ); }, 100 );
  };

  /**
   * Handles selecting a chord on the Orbit or Tonnetz.
   *
   * Updates the selection state and plays the corresponding triad.
   *
   * @param idx - Index of the key (0-11) in activeKeys
   * @param type - The specific chord type being selected
   */
  const handleSelection = (
    idx: number,
    type: 'major' | 'minor' | 'dim' | 'ii' | 'iii' | 'vi'
  ) => {
    const key = activeKeys.value[idx]!;
    selectedKeyIdx.value = idx;
    selectedType.value = type;

    // Get the chord label based on the selected type
    let label = '';
    if ( type === 'major' ) label = key.major;
    else if ( type === 'ii' ) label = key.ii;
    else if ( type === 'iii' ) label = key.iii;
    else if ( type === 'vi' || type === 'minor' ) label = key.vi;
    else label = key.dim;

    // Map sub-types to base triad types for audio playback
    // ii, iii, and vi are all minor chords — they use the same triad shape
    const playType = ( type === 'ii' || type === 'iii' || type === 'vi' ) ? 'minor' : type;
    playTriad( label, playType );
  };

  /**
   * Finds a chord by name across all keys and selects it.
   *
   * Used when clicking chord cards in the Key Family panel — the user
   * clicks "Dm" and we need to find which key's `ii` that is (it's C Major's ii).
   *
   * @param chordName - The chord name to search for (e.g. 'Dm', 'G', 'Bdim')
   */
  const selectChordByName = ( chordName: string ) => {
    const keys = activeKeys.value;

    for ( let i = 0; i < keys.length; i++ ) {
      const key = keys[i]!;

      if ( key.major === chordName ) { handleSelection( i, 'major' ); return; }
      if ( key.ii === chordName ) { handleSelection( i, 'ii' ); return; }
      if ( key.iii === chordName ) { handleSelection( i, 'iii' ); return; }
      if ( key.vi === chordName ) { handleSelection( i, 'vi' ); return; }
      if ( key.dim === chordName ) { handleSelection( i, 'dim' ); return; }
    }
  };

  // ── Tonnetz Utility Functions ───────────────────────────────────

  /**
   * Converts a pitch class index (0-11) to a note name.
   *
   * This uses our PITCH_CLASSES array where:
   *   0=C, 1=C#, 2=D, 3=Eb, 4=E, 5=F, 6=F#, 7=G, 8=Ab, 9=A, 10=Bb, 11=B
   *
   * @param pc - Pitch class index (0-11)
   * @returns The note name string
   */
  const pitchClassName = ( pc: number ): string => {
    // The `(( pc % 12 ) + 12 ) % 12` handles negative numbers gracefully
    return PITCH_CLASSES[( ( pc % 12 ) + 12 ) % 12]!;
  };

  /**
   * Converts a note name to its pitch class index (0-11).
   *
   * @param name - A note name (e.g. 'C', 'F#', 'Bb')
   * @returns The pitch class index, or 0 if not found
   */
  const pitchClassIndex = ( name: string ): number => {
    const idx = PITCH_CLASSES.indexOf( name );
    return idx >= 0 ? idx : 0;
  };

  // ── Return Public API ───────────────────────────────────────────

  return {
    // Reactive state
    isFifthsMode,
    selectedKeyIdx,
    selectedType,
    currentTriadNotes,
    activeKeys,

    // Theory functions
    getNeighborIdx,
    getFamilyChords,
    getSegmentStyle,

    // Audio functions
    playTriad,
    handleSelection,
    selectChordByName,

    // Tonnetz utilities
    pitchClassName,
    pitchClassIndex,

    // Constants
    FIFTHS_KEYS,
    PITCH_CLASSES
  };
}
