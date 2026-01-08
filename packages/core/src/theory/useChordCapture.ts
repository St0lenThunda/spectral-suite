import { ref, watch } from 'vue';
import { Note } from 'tonal';
import { usePitch } from '../audio/usePitch';
import { ChordEngine, type ChordMatch } from '../theory/ChordEngine';

export function useChordCapture () {
  const { pitch, clarity } = usePitch();
  const capturedNotes = ref<string[]>( [] );
  const detectedChords = ref<ChordMatch[]>( [] );
  const currentNote = ref<string | null>( null );

  // Buffer to store notes played to detect the chord
  const noteBuffer = new Set<string>();

  watch( pitch, ( newPitch ) => {
    if ( !newPitch || ( clarity.value || 0 ) < 0.9 ) {
      currentNote.value = null;
      return;
    }

    const note = Note.fromFreq( newPitch );
    const pc = Note.get( note ).pc; // Pitch Class (e.g., "C" instead of "C4")

    if ( pc && pc !== currentNote.value ) {
      currentNote.value = pc;
      noteBuffer.add( pc );

      // Update captured notes array
      capturedNotes.value = Array.from( noteBuffer );

      // Update detected chords
      detectedChords.value = ChordEngine.detectChords( capturedNotes.value );
    }
  } );

  const clearNotes = () => {
    noteBuffer.clear();
    capturedNotes.value = [];
    detectedChords.value = [];
    currentNote.value = null;
  };

  return {
    pitch,
    clarity,
    currentNote,
    capturedNotes,
    detectedChords,
    clearNotes
  };
}
