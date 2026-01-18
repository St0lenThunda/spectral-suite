import { ref, watch } from 'vue';
import { Note } from 'tonal';
import { usePitch } from '../audio/usePitch';
import { ChordEngine, type ChordMatch } from '../theory/ChordEngine';

// Module-level persistent state for the chord ledger
const globalChordHistory = ref<ChordMatch[]>( [] );
const globalKeyCenter = ref<string>( 'C' );
const globalCapturedNotes = ref<string[]>( [] );
const globalDetectedChords = ref<ChordMatch[]>( [] );
const globalCurrentNote = ref<string | null>( null );

// Buffer to store notes played to detect the chord (Hidden from UI)
const noteBuffer = new Set<string>();
let bufferTimeout: any = null;
import { sensitivityThreshold, clarityThreshold } from '../config/sensitivity';
const BUFFER_IDLE_TIME = 3000; // 3 seconds of silence to clear the *tray*, but keeps the *visual result*

// Persistence / Debounce Config
/**
 * PERSISTENCE_THRESHOLD (80ms):
 * The amount of time a set of notes must remain unchanged before we trust it.
 * 
 * WHY IS THIS NEEDED?
 * When you strum a guitar, the pick hits strings one by one (transients).
 * This creates a chaotic 50-100ms window where notes appear and disappear rapidly.
 * By waiting 80ms, we ignore this chaos and only capture the "sustain" phase 
 * of the chord.
 */
const PERSISTENCE_THRESHOLD = 80;
let persistenceTimer: any = null;

// NOISE_FLOOR accessed directly via sensitivityThreshold.value in watch

// Initialize from localStorage if available
if ( typeof window !== 'undefined' ) {
  const savedLedger = localStorage.getItem( 'spectral-suite-chord-ledger' );
  if ( savedLedger ) {
    try {
      globalChordHistory.value = JSON.parse( savedLedger );
    } catch ( e ) {
      console.error( 'Failed to load chord ledger', e );
    }
  }

  const savedKey = localStorage.getItem( 'spectral-suite-chord-key' );
  if ( savedKey ) globalKeyCenter.value = savedKey;
}

import { usePolyPitch } from '../audio/usePolyPitch';

/**
 * useChordCapture Composable
 * 
 * The "Brain" of the Session View.
 * this module orchestrates the interaction between:
 * 1. The Audio Engine (Pitch/Volume/Clarity)
 * 2. The Polyphonic Detector (Multi-note analysis)
 * 3. The Chord Theory Engine (Naming chords)
 * 
 * It manages the "Tray" (captured notes) and the "Ledger" (history of chords).
 */
export function useChordCapture () {
  const { pitch, clarity, volume } = usePitch( { smoothing: 3 } );
  const { detectedNotes: polyNotes } = usePolyPitch();

  const capturedNotes = globalCapturedNotes;
  const detectedChords = globalDetectedChords;
  const currentNote = globalCurrentNote;
  const chordHistory = globalChordHistory;
  const keyCenter = globalKeyCenter;

  // Polyphonic Integration
  watch( polyNotes, ( newPoly ) => {
    // Debounce Logic:
    // If input changes, we wait PERSISTENCE_THRESHOLD ms.
    // If it changes again within that time, we reset the timer.
    // Only commit if strictly stable.

    if ( persistenceTimer ) clearTimeout( persistenceTimer );

    persistenceTimer = setTimeout( () => {
    // Logic inside timeout: executes only after input is stable (The "Debounce" effect)


      if ( newPoly.length >= 2 ) {
        /**
         * Smart Sync Logic:
         * If we detect a stable chord (>= 2 notes), we assume this is the INTENDED chord.
         * We sync the tray to match exactly these notes.
         * This allows changing chords (e.g. C -> F) to instantly clear the old notes (C, E, G)
         * and register the new ones (F, A, C) without "accumulation" artifacts.
         */

        // Check for difference to avoid redundant computation
        const currentNotes = Array.from( noteBuffer );
        const isDifferent = newPoly.length !== currentNotes.length ||
          !newPoly.every( n => noteBuffer.has( n ) );

        if ( isDifferent ) {
          noteBuffer.clear();
          newPoly.forEach( pc => noteBuffer.add( pc ) );
          capturedNotes.value = Array.from( noteBuffer );
          detectedChords.value = ChordEngine.detectChords( capturedNotes.value, keyCenter.value );
        }
      }
    }, PERSISTENCE_THRESHOLD );
  } );

  watch( pitch, ( newPitch ) => {
    // Noise Gate: must have pitch, decent clarity (lowered for guitar), and exceed volume threshold
    if ( !newPitch || ( clarity.value || 0 ) < clarityThreshold.value || volume.value < sensitivityThreshold.value ) {
      currentNote.value = null;

      // Start/reset clear timeout if buffer is not empty
      if ( noteBuffer.size > 0 && !bufferTimeout ) {
        bufferTimeout = setTimeout( () => {
          // Clear only the internal buffer and tray, KEEP the last detectedChords visual
          noteBuffer.clear();
          capturedNotes.value = [];
          bufferTimeout = null;
        }, BUFFER_IDLE_TIME );
      }
      return;
    }

    // Cancel timeout if we are detecting notes
    if ( bufferTimeout ) {
      clearTimeout( bufferTimeout );
      bufferTimeout = null;
    }

    const note = Note.fromFreq( newPitch );
    // Use full note name (e.g. "C3") for consistency with new poly engine
    // const pc = Note.get( note ).pc; 

    /**
     * Transient Protection:
     * If the polyphonic engine is already seeing multiple notes (a strum),
     * we ignore the single-pitch detector to prevent "Note Flickering"
     * in the tray. The poly engine is more stable for chords.
     */
    if ( note && note !== currentNote.value ) {
      currentNote.value = note; // Store full note "C3"

      if ( polyNotes.value.length < 2 ) {
        noteBuffer.add( note );
        capturedNotes.value = Array.from( noteBuffer );
        detectedChords.value = ChordEngine.detectChords( capturedNotes.value, keyCenter.value );
      }
    }
  } );

  // Persist chord history to localStorage on changes
  watch( chordHistory, ( val ) => {
    localStorage.setItem( 'spectral-suite-chord-ledger', JSON.stringify( val ) );
  }, { deep: true } );

  watch( keyCenter, ( val ) => {
    localStorage.setItem( 'spectral-suite-chord-key', val );
  } );

  // Re-detect chords when key center changes to update Roman Numerals
  watch( keyCenter, () => {
    if ( capturedNotes.value.length > 0 ) {
      detectedChords.value = ChordEngine.detectChords( capturedNotes.value, keyCenter.value );
    } else if ( detectedChords.value.length > 0 ) {
      // Refresh current display even if tray is empty
      const updated = ChordEngine.detectChords( detectedChords.value[0]!.notes, keyCenter.value );
      if ( updated.length > 0 ) detectedChords.value = updated;
    }
  } );

  const clearNotes = () => {
    noteBuffer.clear();
    capturedNotes.value = [];
    detectedChords.value = [];
    currentNote.value = null;
  };

  const captureChord = ( chord: ChordMatch ) => {
    const roman = ChordEngine.getRomanNumeral( chord.symbol, keyCenter.value );
    chordHistory.value.push( { ...chord, roman } );
    clearNotes();
  };

  const clearHistory = () => {
    chordHistory.value = [];
  };

  const removeChord = ( index: number ) => {
    chordHistory.value.splice( index, 1 );
  };

  const getFormattedLedger = (): string => {
    return chordHistory.value.map( ( chord, i ) => {
      const notes = chord.notes.join( '-' );
      return `${i + 1}. ${chord.symbol} (${chord.roman}) [${notes}]`;
    } ).join( '\n' );
  };

  return {
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
  };
}
