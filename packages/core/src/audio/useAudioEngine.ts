import { ref } from 'vue';
import { defineStore, storeToRefs } from 'pinia';
import { AudioEngine } from './AudioEngine';
import { PitchNodePool } from './PitchNodePool';

export const useAudioEngineStore = defineStore('audioEngine', () => {
  const engine = AudioEngine.getInstance();
  const isInitialized = ref( engine.initialized );
  const error = ref<string | null>( null );
  const inputGain = ref( 1.0 );
  const activeConsumers = ref( 0 );
  const availableDevices = ref<MediaDeviceInfo[]>( [] );
  const availableOutputDevices = ref<MediaDeviceInfo[]>( [] );
  const selectedDeviceId = ref<string>( '' );
  const selectedOutputId = ref<string>( '' );
  let suspendTimer: any = null;

  const updateDeviceList = async () => {
    const devices = await engine.getDevices();
    availableDevices.value = devices.filter( d => d.kind === 'audioinput' );
    availableOutputDevices.value = devices.filter( d => d.kind === 'audiooutput' );

    // Try to find current device
    const stream = engine.getStream();
    if ( stream ) {
      const track = stream.getAudioTracks()[0];
      if ( track ) {
        selectedDeviceId.value = track.getSettings().deviceId || '';
      }
    }
  };

  const selectDevice = async ( deviceId: string ) => {
    try {
      await engine.setDevice( deviceId );
      selectedDeviceId.value = deviceId;
      // Pre-warm again on new device
      const ctx = engine.getContext();
      if ( ctx ) {
        PitchNodePool.warmUp( ctx ).catch( console.warn );
      }
    } catch ( err: any ) {
      error.value = err.message;
    }
  };

  const selectOutputDevice = async ( deviceId: string ) => {
    try {
      await engine.setOutputDevice( deviceId );
      selectedOutputId.value = deviceId;
    } catch ( err: any ) {
      console.warn( 'Output selection error:', err );
    }
  };

  const playGlobalTestTone = () => {
    const ctx = engine.getContext();
    if ( !ctx ) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect( gain );
    gain.connect( ctx.destination );

    osc.frequency.value = 440; // A4
    gain.gain.value = 0.3; // Safely moderate volume

    osc.start();
    osc.stop( ctx.currentTime + 0.3 ); // Short beep
  };

  const init = async () => {
    try {
      await engine.init( selectedDeviceId.value || undefined );
      isInitialized.value = true;
      inputGain.value = engine.getGain();
      error.value = null;

      await updateDeviceList();

      // Pre-warm the pitch worklet module for instant first-use
      const ctx = engine.getContext();
      if ( ctx ) {
        PitchNodePool.warmUp( ctx ).catch( e => console.warn( 'PitchNodePool warmUp failed:', e ) );
      }
    } catch ( err: any ) {
      error.value = err.message; // Propagate error properly to the store
    }
  };

  const setGain = ( value: number ) => {
    engine.setGain( value );
    inputGain.value = value;
  };

  /**
   * Registers a consumer that requires the audio engine to be running.
   * Resumes the engine references go from 0 -> 1.
   * NON-BLOCKING: Does not await the resume to prevent HMR freezes.
   */
  const activate = () => {
    if ( suspendTimer ) {
      clearTimeout( suspendTimer );
      suspendTimer = null;
    }
    activeConsumers.value++;
    if ( isInitialized.value ) {
      engine.resume().catch( e => console.warn( 'Resume failed:', e ) );
    }
  };

  /**
   * Unregisters a consumer.
   * Suspends the engine if references drop to 0.
   * NON-BLOCKING: Uses debounced fire-and-forget suspension.
   */
  const deactivate = () => {
    activeConsumers.value = Math.max( 0, activeConsumers.value - 1 );
    if ( activeConsumers.value === 0 ) {
      if ( suspendTimer ) clearTimeout( suspendTimer );
      suspendTimer = setTimeout( () => {
        if ( activeConsumers.value === 0 && isInitialized.value ) {
          engine.suspend().catch( e => console.warn( 'Suspend failed:', e ) );
        }
        suspendTimer = null;
      }, 500 );
    }
  };

  const getAnalyser = () => engine.getAnalyser();
  const getContext = () => engine.getContext();

  return {
    isInitialized,
    error,
    inputGain,
    activeConsumers,
    availableDevices,
    availableOutputDevices,
    selectedDeviceId,
    selectedOutputId,
    updateDeviceList,
    selectDevice,
    selectOutputDevice,
    playGlobalTestTone,
    init,
    setGain,
    activate,
    deactivate,
    getAnalyser,
    getContext,
    resume: () => engine.resume(),
    suspend: () => engine.suspend(),
    close: () => engine.close()
  };
});

// Legacy backward compatibility wrapper for existing UI modules
export function useAudioEngine () {
  const store = useAudioEngineStore();
  const refs = storeToRefs( store );

  return {
    ...refs,
    updateDeviceList: store.updateDeviceList,
    selectDevice: store.selectDevice,
    selectOutputDevice: store.selectOutputDevice,
    playGlobalTestTone: store.playGlobalTestTone,
    init: store.init,
    setGain: store.setGain,
    activate: store.activate,
    deactivate: store.deactivate,
    getAnalyser: store.getAnalyser,
    getContext: store.getContext,
    resume: store.resume,
    suspend: store.suspend,
    close: store.close
  };
}
