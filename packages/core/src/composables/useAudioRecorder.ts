import { ref } from 'vue';

export const useAudioRecorder = () => {
  const isListening = ref( false );
  const listeningDuration = ref( 0 );
  const audioLevel = ref( 0 );
  const error = ref<string | null>( null );

  let mediaRecorder: MediaRecorder | null = null;
  let recordedChunks: Blob[] = [];
  let listeningInterval: number | null = null;
  let audioLevelInterval: number | null = null;
  let listeningAnalyser: AnalyserNode | null = null;
  let listeningAudioCtx: AudioContext | null = null;

  const startListening = async (): Promise<void> => {
    try {
      error.value = null;
      const stream = await navigator.mediaDevices.getUserMedia( { audio: true } );

      // Set up audio level monitoring
      listeningAudioCtx = new AudioContext();
      const source = listeningAudioCtx.createMediaStreamSource( stream );
      listeningAnalyser = listeningAudioCtx.createAnalyser();
      listeningAnalyser.fftSize = 256;
      source.connect( listeningAnalyser );

      const dataArray = new Uint8Array( listeningAnalyser.frequencyBinCount );
      const updateLevel = () => {
        if ( !listeningAnalyser || !isListening.value ) return;
        listeningAnalyser.getByteFrequencyData( dataArray );
        const avg = dataArray.reduce( ( a, b ) => a + b, 0 ) / dataArray.length;
        audioLevel.value = Math.min( 100, avg * 1.5 );
        audioLevelInterval = requestAnimationFrame( updateLevel );
      };
      updateLevel();

      recordedChunks = [];
      mediaRecorder = new MediaRecorder( stream, { mimeType: 'audio/webm' } );

      mediaRecorder.ondataavailable = ( e ) => {
        if ( e.data.size > 0 ) recordedChunks.push( e.data );
      };

      mediaRecorder.start();
      isListening.value = true;
      listeningDuration.value = 0;
      audioLevel.value = 0;

      listeningInterval = window.setInterval( () => {
        listeningDuration.value++;
      }, 1000 );

    } catch ( err: any ) {
      error.value = "Microphone access denied: " + err.message;
      throw err;
    }
  };

  const stopListening = (): Promise<File> => {
    return new Promise( ( resolve, reject ) => {
      if ( !mediaRecorder || mediaRecorder.state === 'inactive' ) {
        reject( new Error( "Recorder not active" ) );
        return;
      }

      mediaRecorder.onstop = async () => {
        if( mediaRecorder && mediaRecorder.stream ) {
            mediaRecorder.stream.getTracks().forEach( t => t.stop() );
        }
        
        if ( listeningAudioCtx ) {
          await listeningAudioCtx.close();
          listeningAudioCtx = null;
        }

        if ( recordedChunks.length > 0 ) {
          const blob = new Blob( recordedChunks, { type: 'audio/webm' } );
          const file = new File( [blob], `recording-${Date.now()}.webm`, { type: 'audio/webm' } );
          resolve( file );
        } else {
            reject( new Error("No data recorded"));
        }
        cleanUp();
      };

      mediaRecorder.stop();
    } );
  };
  
  const cleanUp = () => {
      isListening.value = false;
      audioLevel.value = 0;
      if ( listeningInterval ) {
        clearInterval( listeningInterval );
        listeningInterval = null;
      }
      if ( audioLevelInterval ) {
        cancelAnimationFrame( audioLevelInterval );
        audioLevelInterval = null;
      }
      mediaRecorder = null;
  }
  
  const cancelListening = () => {
      if ( mediaRecorder && mediaRecorder.state !== 'inactive' ) {
        mediaRecorder.stop();
      }
      cleanUp();
  }

  return {
    isListening,
    listeningDuration,
    audioLevel,
    error,
    startListening,
    stopListening,
    cancelListening
  };
};
