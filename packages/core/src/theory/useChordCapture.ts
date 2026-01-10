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
import { sensitivityThreshold } from '../config/sensitivity';
const BUFFER_IDLE_TIME = 10000; // 10 seconds of silence to clear the *tray*, but keeps the *visual result*
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

export function useChordCapture () {
  const { pitch, clarity, volume } = usePitch();

  const capturedNotes = globalCapturedNotes;
  const detectedChords = globalDetectedChords;
  const currentNote = globalCurrentNote;
  const chordHistory = globalChordHistory;
  const keyCenter = globalKeyCenter;

  watch( pitch, ( newPitch ) => {
    // Noise Gate: must have pitch, decent clarity (lowered for guitar), and exceed volume threshold
    if ( !newPitch || ( clarity.value || 0 ) < 0.7 || volume.value < sensitivityThreshold.value ) {
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
    const pc = Note.get( note ).pc;

    if ( pc && pc !== currentNote.value ) {
      currentNote.value = pc;
      noteBuffer.add( pc );

      // Update captured notes array
      capturedNotes.value = Array.from( noteBuffer );

      // Update detected chords (This stays visible until a new note is played later)
      detectedChords.value = ChordEngine.detectChords( capturedNotes.value, keyCenter.value );
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
    clearHistory
  };
}
