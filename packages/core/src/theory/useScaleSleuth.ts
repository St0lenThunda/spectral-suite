import { ref, watch } from 'vue';
import { Note } from 'tonal';
import { usePitch } from '../audio/usePitch';
import { ScaleEngine, type ScaleMatch } from '../theory/ScaleEngine';

export function useScaleSleuth () {
  const { pitch, clarity } = usePitch();
  const detectedNotes = ref<string[]>( [] );
  const potentialScales = ref<ScaleMatch[]>( [] );
  const currentNote = ref<string | null>( null );
  const noteWeights = ref<Record<string, number>>( {} );

  // Buffer to store notes played recently to detect the scale
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

      // Update weights
      noteWeights.value[pc] = ( noteWeights.value[pc] || 0 ) + 1;

      // Update detected notes array
      detectedNotes.value = Array.from( noteBuffer );

      // Update potential scales
      potentialScales.value = ScaleEngine.detectScales( detectedNotes.value );
    }
  } );

  const clearNotes = () => {
    noteBuffer.clear();
    detectedNotes.value = [];
    potentialScales.value = [];
    currentNote.value = null;
    noteWeights.value = {};
  };

  return {
    pitch,
    clarity,
    currentNote,
    detectedNotes,
    noteWeights,
    potentialScales,
    clearNotes
  };
}
