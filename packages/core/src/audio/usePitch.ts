import { ref, onMounted, onUnmounted } from 'vue';
import { PitchDetector } from 'pitchy';
import { Note, Interval } from 'tonal';
import { useAudioEngine } from './useAudioEngine';

export function usePitch () {
  const { getAnalyser, getContext } = useAudioEngine();
  const pitch = ref<number | null>( null );
  const clarity = ref<number | null>( null );
  const volume = ref<number>( 0 );
  const currentNote = ref<string | null>( null );
  const cents = ref<number>( 0 );
  const concertA = ref<number>( 440 );
  const transposition = ref<number>( 0 ); // semitones
  const pitchHistory = ref<Array<{ time: number, cents: number }>>( [] );
  const isCanceled = ref( false );

  let detector: PitchDetector<Float32Array<ArrayBuffer>> | null = null;
  let inputBuffer: Float32Array<ArrayBuffer> | null = null;
  const HISTORY_MS = 5000;

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

    // Volume calculation (RMS)
    if ( inputBuffer ) {
      let sumSquares = 0;
      for ( let i = 0; i < inputBuffer.length; i++ ) {
        sumSquares += inputBuffer[i]! * inputBuffer[i]!;
      }
      volume.value = Math.sqrt( sumSquares / inputBuffer.length );
    }

    if ( p && c > 0.8 ) {
      const calibratedFreq = p * ( 440 / concertA.value );
      const rawNoteName = Note.fromFreq( calibratedFreq );

      // Apply transposition for display note
      const displayNote = Note.transpose( rawNoteName, Interval.fromSemitones( transposition.value ) );
      currentNote.value = displayNote;

      const refFreq = Note.get( rawNoteName ).freq;
      if ( refFreq ) {
        // Cents calculation: 1200 * log2(f / f_ref)
        cents.value = Math.round( 1200 * Math.log2( calibratedFreq / refFreq ) * 10 ) / 10;

        // Add to history
        const now = performance.now();
        pitchHistory.value.push( { time: now, cents: cents.value } );

        // Prune history older than 5s
        while ( pitchHistory.value.length > 0 && ( now - ( pitchHistory.value[0]?.time ?? 0 ) ) > HISTORY_MS ) {
          pitchHistory.value.shift();
        }
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
    volume,
    currentNote,
    cents,
    concertA,
    transposition,
    pitchHistory,
  };
}
