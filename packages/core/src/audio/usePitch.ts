import { ref, watch, onMounted, onUnmounted } from 'vue';
import { Note, Interval } from 'tonal';
import { NativePitch } from './NativePitch';
import { useAudioEngine } from './useAudioEngine';
import processorUrl from './worklets/pitch-processor.ts?worker&url';

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
  const isLowPassEnabled = ref( false );
  const downsample = ref( 1 );

  // Median Filter State
  const medianBuffer: number[] = [];
  const MEDIAN_SIZE = 5;

  // Watch for LPF toggle
  // Watch for configuration changes
  watch( [isLowPassEnabled, downsample], () => {
    const config = {
      type: 'config',
      lowPass: isLowPassEnabled.value,
      downsample: downsample.value
    };

    // Update Worklet
    if ( workletNode ) {
      workletNode.port.postMessage( config );
    }
    // Update Legacy
    if ( legacyDetector ) {
      legacyDetector.useLowPass = isLowPassEnabled.value;
      legacyDetector.downsample = downsample.value;
    }
  } );

  // AudioWorklet URL
  
  let workletNode: AudioWorkletNode | null = null;
  const HISTORY_MS = 5000;

  // Legacy main-thread detector for fallback
  let legacyDetector: NativePitch | null = null;
  let legacyBuffer: Float32Array | null = null;


  const initWorklet = async () => {
    const context = getContext();
    if ( !context ) return;

    // Resume if suspended (user interaction requirements usually handled upstream)
    if ( context.state === 'suspended' ) {
       await context.resume();
    }

    try {
        await context.audioWorklet.addModule( processorUrl );
        
        // Check if node already exists? (Singleton pattern vs Component instance)
        // Since usePitch might be used multiple times, we should be careful.
        // Usually usePitch is a singleton or scoped.
        // Hook logic creates new refs each call.
        // We should create a new node for this instance? Or share?
        // Sharing source is cleaner.
        
        // But for updatePitch logic... 
        // Let's create a node per usage for now (easiest refactor), 
        // but typically AudioEngine should manage a global pitch analyzer node.
        // Refactoring to global singleton in AudioEngine is better but bigger scope.
        // Stick to localized node for safey.

        workletNode = new AudioWorkletNode( context, 'pitch-processor' );
        workletNode.port.onmessage = ( event ) => {
            const { pitch: p, clarity: c, volume: v } = event.data;
          updateState( p, c, v );
        };

      // Init config
      workletNode.port.postMessage( {
        type: 'config',
        lowPass: isLowPassEnabled.value,
        downsample: downsample.value
      } );

        // Connect Source
        // We need a source from AudioEngine.
        // getAnalyser() returns an AnalyserNode. We can connect THAT to worklet? 
        // Or get Source from engine?
        // useAudioEngine usually exposes input source.
        
        // We might need to tap into the input stream again or connect from the Analyser.
        // AnalyserNode is a pass-through. So we can connect Analyser -> Worklet.
        // But Analyser might be doing FFT for visuals.
        // Connecting: Input -> Analyser -> Worklet -> Destination (mute).
        
        const analyser = getAnalyser();
        if ( analyser ) {
            analyser.connect( workletNode );
            workletNode.connect( context.destination ); // Keep alive, usually process returns output=input or silence. 
            // My process() code writes input to buffer but doesn't write to output.
            // So it outputs silence (default). 
            // If we connect to destination, we might silence the monitoring?
            // Wait, input[0] is copied. output[0] is left zero? 
            // If output[0] is zero, we output silence. Perfect.
            // Wait, if Input -> Analyser -> Speakers?
            // If we insert worklet: Input -> Analyser -> Worklet -> Destination.
            // This path is parallel to monitoring. Monitoring is usually Input -> Destination separately.
        }

    } catch ( e ) {
      console.warn( 'AudioWorklet failed to load, falling back to Native Main Thread:', e );
      startLegacyLoop();
    }
  };

  const startLegacyLoop = () => {
    const loop = () => {
      if ( isCanceled.value ) return;
      const analyser = getAnalyser();
      const context = getContext();

      if ( !analyser || !context ) {
        requestAnimationFrame( loop );
        return;
      }

      if ( !legacyDetector ) {
        legacyDetector = new NativePitch( analyser.fftSize, context.sampleRate );
        legacyDetector.useLowPass = isLowPassEnabled.value;
        legacyDetector.downsample = downsample.value;
        legacyBuffer = new Float32Array( analyser.fftSize );
      }

      analyser.getFloatTimeDomainData( legacyBuffer! );
      // Cast to any to avoid generic mismatch if Float32Array types differ in env
      const [p, c] = legacyDetector.findPitch( legacyBuffer as any, context.sampleRate );

      // Volume calculation
      let sumSquares = 0;
      for ( let i = 0; i < legacyBuffer!.length; i++ ) {
        sumSquares += legacyBuffer![i]! * legacyBuffer![i]!;
      }
      const v = Math.sqrt( sumSquares / legacyBuffer!.length );

      updateState( p, c, v );
      requestAnimationFrame( loop );
    }
    loop();
  };

  const updateState = ( rawPitch: number | null, rawClarity: number, v: number ) => {
    // Median Filter Logic
    let p = rawPitch;

    if ( rawPitch ) {
      medianBuffer.push( rawPitch );
      if ( medianBuffer.length > MEDIAN_SIZE ) medianBuffer.shift();

      // Copy and sort to find median
      const sorted = [...medianBuffer].sort( ( a, b ) => a - b );
      const mid = Math.floor( sorted.length / 2 );
      p = sorted[mid] || rawPitch;
    } else {
      medianBuffer.length = 0;
    }

    pitch.value = p;
    clarity.value = rawClarity;
    volume.value = v;

    if ( p && rawClarity > 0.8 ) {
        const calibratedFreq = p * ( 440 / concertA.value );
        const rawNoteName = Note.fromFreq( calibratedFreq );
        const displayNote = Note.transpose( rawNoteName, Interval.fromSemitones( transposition.value ) );
        currentNote.value = displayNote;

        const refFreq = Note.get( rawNoteName ).freq;
        if ( refFreq ) {
          cents.value = Math.round( 1200 * Math.log2( calibratedFreq / refFreq ) * 10 ) / 10;
          const now = performance.now();
          pitchHistory.value.push( { time: now, cents: cents.value } );
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
  }

  onMounted( () => {
    initWorklet();
  } );

  onUnmounted( () => {
    isCanceled.value = true;
    if ( workletNode ) {
        workletNode.disconnect(); // Disconnects from destination and inputs?
        // workletNode.port.close();
        workletNode = null;
    }
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
    isLowPassEnabled,
    downsample,
  };
}
