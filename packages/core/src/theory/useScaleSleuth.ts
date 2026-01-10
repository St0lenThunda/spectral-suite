import { ref, watch } from 'vue';
import { Note } from 'tonal';
import { usePitch } from '../audio/usePitch';
import { ScaleEngine, type ScaleMatch } from '../theory/ScaleEngine';
import { sensitivityThreshold } from '../config/sensitivity';

export function useScaleSleuth () {
  const { pitch, clarity, volume, isLowPassEnabled, downsample } = usePitch();
  const detectedNotes = ref<string[]>( [] );
  const potentialScales = ref<ScaleMatch[]>( [] );
  const currentNote = ref<string | null>( null );
  const noteWeights = ref<Record<string, number>>( {} );
  const isLocked = ref( false );

  // Buffer to store notes played recently to detect the scale
  const noteBuffer = new Set<string>();

  watch( pitch, ( newPitch ) => {
    if ( isLocked.value ) return;

    if ( !newPitch || ( clarity.value || 0 ) < 0.7 || volume.value < sensitivityThreshold.value ) {
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

  const lockScale = ( scaleNotes: string[] ) => {
    isLocked.value = true;
    const notesToKeep = new Set<string>();
    const scaleChromas = new Set( scaleNotes.map( n => Note.chroma( n ) ) );

    // Filter the internal set
    for ( const note of noteBuffer ) {
      if ( scaleChromas.has( Note.chroma( note ) ) ) {
        notesToKeep.add( note );
      }
    }

    noteBuffer.clear();
    notesToKeep.forEach( n => noteBuffer.add( n ) );
    detectedNotes.value = Array.from( noteBuffer );

    // Filter weights
    const newWeights: Record<string, number> = {};
    for ( const [n, w] of Object.entries( noteWeights.value ) ) {
      if ( scaleChromas.has( Note.chroma( n ) ) ) {
        newWeights[n] = w;
      }
    }
    noteWeights.value = newWeights;
  };

  const clearNotes = () => {
    noteBuffer.clear();
    detectedNotes.value = [];
    potentialScales.value = [];
    currentNote.value = null;
    noteWeights.value = {};
    isLocked.value = false;
  };

  return {
    pitch,
    clarity,
    currentNote,
    detectedNotes,
    noteWeights,
    potentialScales,
    isLocked,
    lockScale,
    clearNotes,
    isLowPassEnabled,
    downsample
  };
}
