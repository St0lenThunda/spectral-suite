import { ref, onMounted, onUnmounted } from 'vue';
import { PitchDetector } from 'pitchy';
import { Note } from 'tonal';
import { useAudioEngine } from './useAudioEngine';

export function usePitch () {
  const { getAnalyser, getContext } = useAudioEngine();
  const pitch = ref<number | null>( null );
  const clarity = ref<number | null>( null );
  const currentNote = ref<string | null>( null );
  const cents = ref<number>( 0 );
  const isCanceled = ref( false );

  let detector: PitchDetector<Float32Array<ArrayBuffer>> | null = null;
  let inputBuffer: Float32Array<ArrayBuffer> | null = null;

  const updatePitch = () => {
    if ( isCanceled.value ) return;

    const analyser = getAnalyser();
    const context = getContext();

    if ( !analyser || !context ) {
      requestAnimationFrame( updatePitch );
      return;
    }

    if ( !detector ) {
      detector = PitchDetector.forFloat32Array( analyser.fftSize );
      inputBuffer = new Float32Array( analyser.fftSize );
    }

    analyser.getFloatTimeDomainData( inputBuffer! );
    const [p, c] = detector.findPitch( inputBuffer!, context.sampleRate );

    pitch.value = p;
    clarity.value = c;

    if ( p && c > 0.8 ) {
      const noteName = Note.fromFreq( p );
      currentNote.value = noteName;

      const refFreq = Note.get( noteName ).freq;
      if ( refFreq ) {
        // Cents calculation: 1200 * log2(f / f_ref)
        cents.value = Math.round( 1200 * Math.log2( p / refFreq ) );
      } else {
        cents.value = 0;
      }
    } else {
      currentNote.value = null;
      cents.value = 0;
    }

    requestAnimationFrame( updatePitch );
  };

  onMounted( () => {
    updatePitch();
  } );

  onUnmounted( () => {
    isCanceled.value = true;
  } );

  return {
    pitch,
    clarity,
    currentNote,
    cents,
  };
}
