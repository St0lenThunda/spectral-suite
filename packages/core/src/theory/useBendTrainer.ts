import { ref, shallowRef, computed, watch, onUnmounted } from 'vue';
import { Note, Interval } from 'tonal';
import { usePitch } from '../audio/usePitch';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Represents a single "step" on the staircase visualization.
 *
 * Each step corresponds to a ½-semitone increment (50 cents) above the
 * starting note. The staircase is pre-computed once when the starting note
 * changes, so the Vue template can just loop over this array.
 *
 * @property cents      - Distance from the starting note in cents (e.g. 50, 100, 150…)
 * @property noteName   - The musical pitch class at this step (e.g. "F", "F#")
 * @property label      - Human-readable label (e.g. "F (+½)" or "F# (+1)")
 * @property isTarget   - True if this step is the current bend target
 * @property isBluesZone - True if this step is at a ¼-tone mark (blues bend territory)
 */
export interface StairStep {
  cents: number;
  noteName: string;
  label: string;
  isTarget: boolean;
  isBluesZone: boolean;
}

/**
 * Records the result of a single bend attempt.
 *
 * @property targetCents - What the user was aiming for (e.g. 200 for a full bend)
 * @property actualCents - How far the user actually bent
 * @property held        - Whether the user held the target for >1 second
 */
export interface BendAttempt {
  targetCents: number;
  actualCents: number;
  held: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Maximum number of semitones the staircase will display.
 * 4 semitones = 400 cents — covers even extreme bends (2 full steps).
 */
const MAX_SEMITONES = 4;

/**
 * Number of ½-step increments in the staircase.
 * 8 steps = 4 semitones * 2 (rendering at ½-semitone resolution).
 */
const STEP_COUNT = MAX_SEMITONES * 2;

/**
 * Default tolerance window (in cents) for "on target" detection.
 * ±10 cents is roughly the threshold of human pitch perception.
 */
const DEFAULT_TOLERANCE = 10;

/**
 * How far from a ¼-tone mark (in cents) counts as a "blues zone".
 * ±15 cents around each ¼-tone (50c, 150c, 250c, 350c).
 */
const BLUES_ZONE_WIDTH = 15;

/**
 * Maximum number of recent bend attempts to store.
 * This feeds the "history dots" in the UI.
 */
const MAX_HISTORY = 10;

// ============================================================================
// COMPOSABLE
// ============================================================================

/**
 * useBendTrainer — Core composable for the Bend Trainer module.
 *
 * WHY THIS EXISTS:
 * `usePitch()` tracks the detected pitch vs. the *nearest* note. But for bend
 * training, we need to track pitch distance from a *fixed* starting note. This
 * composable wraps `usePitch()` and adds:
 * 1. A user-chosen "anchor" note (set via fretboard tap).
 * 2. Continuous bend-distance tracking in cents from that anchor.
 * 3. Pre-computed staircase steps with note labels and blues zone markers.
 * 4. A hold timer that counts how long you stay on target.
 *
 * PHYSICS NOTE:
 * We configure usePitch with `smoothing: 3` (instead of default 7) and
 * `averagingWindowMs: 0` (disabled). Bends are rapid pitch changes —
 * heavy smoothing would make the cursor feel like it's dragging through mud.
 */
export function useBendTrainer () {

  // ── Pitch Detection (fast-tracking config) ──────────────────────────
  const {
    pitch,
    clarity,
    currentNote,
    cents: pitchCents,
  } = usePitch( { smoothing: 3, averagingWindowMs: 0 } );

  // ── User State ──────────────────────────────────────────────────────
  const startingNote = ref<string | null>( null );
  const targetSemitones = ref( 2 );   // Default: Full Step bend (2 semitones = 200 cents)
  const tolerance = ref( DEFAULT_TOLERANCE );

  // ── Derived: Starting Frequency ─────────────────────────────────────
  /**
   * The frequency (in Hz) of the user's chosen starting note.
   * We look it up via Tonal's `Note.freq()` whenever `startingNote` changes.
   *
   * WHY `Note.freq()`?
   * It returns the exact frequency for any named pitch (e.g. "E4" → 329.63 Hz),
   * using standard 12-TET equal temperament tuned to A4 = 440 Hz.
   */
  const startingFreq = computed( () => {
    if ( !startingNote.value ) return null;
    return Note.freq( startingNote.value ) ?? null;
  } );

  // ── Derived: Bend Distance ──────────────────────────────────────────
  /**
   * How far the current detected pitch is from the starting note, in cents.
   *
   * MATH:
   * cents = 1200 × log₂(f_current / f_start)
   *
   * WHY LOG₂?
   * Musical pitch is perceived logarithmically. An octave is a 2:1 ratio,
   * which equals 1200 cents. A semitone is 1/12 of an octave = 100 cents.
   * Using log₂ converts the frequency ratio into this perceptual scale.
   *
   * Returns 0 if no pitch or no starting note is set.
   * Can go negative (below starting note) but the UI clamps at 0.
   */
  const bendCents = computed( () => {
    if ( !pitch.value || !startingFreq.value ) return 0;
    
    // Only track if the signal has enough clarity to be meaningful.
    // Lowered from 0.5 down to 0.15 to support rapid decay profiles 
    // (especially acoustic guitars recorded through laptop mics).
    if ( ( clarity.value ?? 0 ) < 0.15 ) return 0;

    const cents = 1200 * Math.log2( pitch.value / startingFreq.value );
    // Round to 1 decimal for display stability
    return Math.round( cents * 10 ) / 10;
  } );

  /**
   * The target distance in cents.
   * e.g. targetSemitones = 1 → 100 cents (full bend)
   *      targetSemitones = 0.5 → 50 cents (half bend)
   */
  const targetCents = computed( () => targetSemitones.value * 100 );

  /**
   * How close the bend is to the target, as a fraction.
   * 0 = unbent, 1.0 = exactly on target, >1.0 = overbend.
   * Clamped to 0 on the low end (no negative fractions).
   */
  const bendFraction = computed( () => {
    if ( targetCents.value === 0 ) return 0;
    return Math.max( 0, bendCents.value / targetCents.value );
  } );

  /**
   * Whether the bend is currently "on target" — within the tolerance window.
   */
  const isOnTarget = computed( () => {
    if ( !startingNote.value || !pitch.value ) return false;
    return Math.abs( bendCents.value - targetCents.value ) <= tolerance.value;
  } );

  /**
   * Whether the cursor is currently sitting in a "blues zone".
   *
   * MUSIC THEORY:
   * Blues bends aren't precise semitones — they land at ¼-tone positions
   * (50 cents into a semitone). These "blue notes" are a hallmark of blues,
   * rock, and jazz guitar. The blues zone markers highlight these positions
   * to teach players about micro-tonal expression.
   *
   * We check if bendCents is within ±BLUES_ZONE_WIDTH of any ¼-tone mark.
   * ¼-tone marks: 50c, 150c, 250c, 350c (i.e. 50 + n*100).
   */
  const isInBluesZone = computed( () => {
    if ( bendCents.value <= 0 ) return false;

    // Check distance from nearest ¼-tone mark
    // The ¼-tone marks are at 50, 150, 250, 350 cents
    // We can find distance to nearest mark with: (cents % 100) → distance from semitone boundary
    // If that remainder is near 50 (±BLUES_ZONE_WIDTH), we're in the blues zone.
    const distFromSemitone = bendCents.value % 100;
    return Math.abs( distFromSemitone - 50 ) <= BLUES_ZONE_WIDTH;
  } );

  // ── Pre-computed Staircase Steps ────────────────────────────────────
  /**
   * Generates the staircase step array whenever the starting note or target changes.
   *
   * Each step is 50 cents (½ semitone). We compute:
   * - The note name at that exact pitch distance from the starting note
   * - A human-readable label like "F (+½)" or "F# (+1)"
   * - Whether it's the target step
   * - Whether it sits at a ¼-tone blues position
   */
  const stairSteps = computed( (): StairStep[] => {
    if ( !startingNote.value ) return [];

    const steps: StairStep[] = [];

    for ( let i = 1; i <= STEP_COUNT; i++ ) {
      const stepCents = i * 50; // 50, 100, 150, 200, …, 400
      const semitones = stepCents / 100; // 0.5, 1.0, 1.5, …, 4.0

      // Calculate note name at this pitch distance
      // For whole semitones, we transpose up exactly. For ½-semitone steps,
      // we show the note of the NEXT whole semitone (since the bend is heading there).
      const wholeSemitones = Math.ceil( semitones );

      // Use Interval.fromSemitones() for reliable transposition
      // (the shorthand like '2m' only works for specific intervals)
      const intervalStr = Interval.fromSemitones( wholeSemitones );
      const transposedNote = Note.transpose( startingNote.value, intervalStr );
      const notePc = Note.pitchClass( transposedNote ) || '?';

      // Build the inline label — the key UX element that removes the learning curve
      const isHalfStep = semitones % 1 !== 0;
      const fractionLabel = isHalfStep
        ? ( Math.floor( semitones ) > 0 ? `${Math.floor( semitones )}½` : '½' )
        : `${semitones}`;
      const label = `${notePc} (+${fractionLabel})`;

      // Is this the target step?
      const isTarget = Math.abs( stepCents - targetCents.value ) < 1;

      // Is this a blues zone? (¼-tone marks: 50, 150, 250, 350)
      const isBluesZone = stepCents % 100 === 50;

      steps.push( { cents: stepCents, noteName: notePc, label, isTarget, isBluesZone } );
    }

    return steps;
  } );

  // ── Hold Timer ──────────────────────────────────────────────────────
  /**
   * Tracks how many seconds the user has held the bend on target.
   * Resets to 0 the moment the pitch drifts outside the tolerance window.
   *
   * WHY A HOLD TIMER?
   * The hard part of bending isn't reaching the target — it's *holding* it
   * there with consistent pressure. The timer gives measurable feedback on
   * this crucial skill.
   */
  const holdSeconds = ref( 0 );
  let holdInterval: ReturnType<typeof setInterval> | null = null;
  let holdStartTime: number | null = null;

  // Watch isOnTarget strictly to start/stop the visible UI hold timer
  watch( isOnTarget, ( onTarget ) => {
    if ( onTarget ) {
      // Start counting
      holdStartTime = performance.now();
      holdInterval = setInterval( () => {
        if ( holdStartTime !== null ) {
          holdSeconds.value = Math.round(
            ( performance.now() - holdStartTime ) / 100
          ) / 10; // Update every 100ms, display to 1 decimal
          
          if ( holdSeconds.value > maxHoldForGesture ) {
            maxHoldForGesture = holdSeconds.value;
          }
        }
      }, 100 ); // Tick every 100ms for smooth display
    } else {
      // Reset timer UI when falling out of the target zone
      holdStartTime = null;
      if ( holdInterval ) clearInterval( holdInterval );
      holdInterval = null;
      holdSeconds.value = 0;
    }
  } );

  // ── Attempt History & Gesture Tracking ──────────────────────────────
  /**
   * Stores the last MAX_HISTORY bend results.
   * Each entry records: what the target was, what the user actually hit,
   * and whether they held it for >1 second.
   */
  const attemptHistory = shallowRef<BendAttempt[]>( [] );

  const recordAttempt = ( actualPeakCents: number, held: boolean ) => {
    const newHistory = [ ...attemptHistory.value, {
      targetCents: targetCents.value,
      actualCents: actualPeakCents,
      held
    } ];

    // Keep only the most recent attempts
    if ( newHistory.length > MAX_HISTORY ) {
      newHistory.shift();
    }
    attemptHistory.value = newHistory;
  };

  // State for tracking a continuous physical bend motion
  let isBending = false;
  let maxCentsForGesture = 0;
  let maxHoldForGesture = 0;

  // Watch bendCents to accurately detect the start and end of a physical bend motion.
  // This solves the issue where missed target zones never generated a history record!
  watch( bendCents, ( cents ) => {
    // A bend motion starts when the pitch crosses 30 cents (a deliberate pull)
    if ( cents > 30 && !isBending ) {
      isBending = true;
      maxCentsForGesture = cents;
      maxHoldForGesture = holdSeconds.value;
    }
    
    if ( isBending ) {
      // Track the absolute highest pitch reached during this single bend motion
      if ( cents > maxCentsForGesture ) {
        maxCentsForGesture = cents;
      }
      
      // When the pitch drops below 20 cents, or signal is completely lost (0 cents),
      // the string has been released or muted. The bend physical gesture is fully over.
      if ( cents < 20 ) {
        // Only record an attempt if they made a meaningful push (say, over 40 cents)
        if ( maxCentsForGesture > 40 ) {
          // Acoustic guitars decay fast, so 0.5s is a much more realistic 
          // required hold time compared to electric guitars with sustain.
          recordAttempt( maxCentsForGesture, maxHoldForGesture >= 0.5 );
        }
        
        // Reset gesture trackers
        isBending = false;
        maxCentsForGesture = 0;
        maxHoldForGesture = 0;
      }
    }
  } );

  // ── Starting Note Setter ────────────────────────────────────────────
  /**
   * Sets the starting note from a fretboard tap.
   *
   * @param noteName - A full note name with octave (e.g. "E4", "B3")
   */
  const setStartingNote = ( noteName: string ) => {
    startingNote.value = noteName;
    // Reset state when changing the anchor note
    holdSeconds.value = 0;
    attemptHistory.value = [];
  };

  // ── Cleanup ─────────────────────────────────────────────────────────
  onUnmounted( () => {
    if ( holdInterval ) clearInterval( holdInterval );
  } );

  // ── Public API ──────────────────────────────────────────────────────
  return {
    // Raw pitch data (pass-through from usePitch for UI displays)
    pitch,
    clarity,
    currentNote,
    pitchCents,

    // Bend-specific state
    startingNote,
    startingFreq,
    targetSemitones,
    tolerance,

    // Computed bend metrics
    bendCents,
    targetCents,
    bendFraction,
    isOnTarget,
    isInBluesZone,

    // Staircase visualization data
    stairSteps,

    // Hold timer
    holdSeconds,

    // History
    attemptHistory,

    // Methods
    setStartingNote,
  };
}
