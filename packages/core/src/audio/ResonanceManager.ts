import { ref, computed } from 'vue';
import { AudioEngine } from './AudioEngine';
import { getResonanceInsight } from './ResonanceInsights';
import type { ResonanceFact } from './ResonanceInsights';

/**
 * ResonanceManager - The "Brain" of the Resonance Lab.
 * This class handles the math of finding resonant peaks and the logic
 * for mirroring them back using high-precision oscillators.
 * 
 * Educational Note: We use the "Manager" pattern to centralize state, 
 * so the UI only has to worry about looking pretty, while this file 
 * handles the "Physics."
 */
export class ResonanceManager {
  private static instance: ResonanceManager;

  /**
   * We use a getter for the AudioContext.
   * This ensures that as soon as the AudioEngine is initialized, 
   * this manager picks up the correct hardware context.
   */
  private get context (): AudioContext | null {
    return AudioEngine.getInstance().getContext();
  }

  // Discovery & Feedback State
  public isSignalDetected = ref( false );
  public signalLevel = ref( 0 ); // 0-255
  private _targetFrequency = ref( 0 );
  public targetFrequency = computed( () => this._targetFrequency.value );

  // Intelligence: Contextual scientific facts
  public insight = computed<ResonanceFact | null>( () => getResonanceInsight( this._targetFrequency.value ) );

  // Mirroring State (Projection)
  private oscillator: OscillatorNode | null = null;
  private mirrorGain: GainNode | null = null;
  public isMirroring = ref( false );

  // Stroboscopic State (Analysis)
  private strobeInterval: any = null;
  public isStrobing = ref( false );
  public strobeFrequency = ref( 10 ); // Hz
  public useAudioPulse = ref( false );

  private constructor() {
    // Singleton initialization
  }

  public static getInstance (): ResonanceManager {
    if ( !ResonanceManager.instance ) {
      ResonanceManager.instance = new ResonanceManager();
    }
    return ResonanceManager.instance;
  }

  /**
   * Finds the peak frequency in the current audio buffer.
   * We use this during the "discovery" phase when the user taps an object.
   * 
   * @param analyser - The Web Audio AnalyserNode providing the FFT data
   */
  public analyzePeak ( analyser: AnalyserNode ) {
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array( bufferLength );
    analyser.getByteFrequencyData( dataArray );

    let maxVal = -1;
    let maxIndex = -1;

    // Peak detection logic: Find the loudest frequency bin
    for ( let i = 0; i < bufferLength; i++ ) {
      if ( ( dataArray[i] ?? 0 ) > maxVal ) {
        maxVal = dataArray[i] ?? 0;
        maxIndex = i;
      }
    }

    // Sensitivity Calibration:
    this.signalLevel.value = maxVal;

    // DEBUG: Only log if we catch at least some "room noise"
    if ( maxVal > 20 && Math.random() > 0.98 ) {
      // console.log( `[ResonanceManager] Current Max Peak: ${maxVal} at index ${maxIndex}` );
    }

    if ( maxVal > 50 ) { // Slightly lower threshold again
      this.isSignalDetected.value = true;

      const ctx = this.context;
      if ( !ctx ) {
        console.warn( '[ResonanceManager] Signal reached threshold but AudioContext is null!' );
        return;
      }

      const nyquist = ctx.sampleRate / 2;
      const freq = maxIndex * ( nyquist / bufferLength );

      this._targetFrequency.value = Math.round( freq );
    } else {
      this.isSignalDetected.value = false;
    }
  }

  /**
   * Starts playing a pure sine wave at the target frequency.
   * This "mirrors" the object's vibration back at it.
   */
  public startMirror () {
    const ctx = this.context;
    if ( !ctx || this.isMirroring.value ) return;

    this.oscillator = ctx.createOscillator();
    this.mirrorGain = ctx.createGain();

    // 1. Create a Sine wave (the purest mathematical tone)
    this.oscillator.type = 'sine';
    this.oscillator.frequency.value = this._targetFrequency.value;

    // 2. Set moderate volume (20%) to prevent feedback loops/speaker damage
    this.mirrorGain.gain.value = 0.2;

    this.oscillator.connect( this.mirrorGain );
    this.mirrorGain.connect( ctx.destination );

    this.oscillator.start();
    this.isMirroring.value = true;
  }

  /**
   * Safely stops the harmonic projection.
   */
  public stopMirror () {
    if ( this.oscillator ) {
      this.oscillator.stop();
      this.oscillator.disconnect();
      this.oscillator = null;
    }
    if ( this.mirrorGain ) {
      this.mirrorGain.disconnect();
      this.mirrorGain = null;
    }
    this.isMirroring.value = false;
  }

  /**
   * Manages the stroboscopic pulse.
   * Fires a visual event and optionally a high-frequency "click" sound.
   * 
   * @param enabled - Whether the strobe should be active
   */
  public toggleStrobe ( enabled: boolean ) {
    this.isStrobing.value = enabled;

    if ( this.strobeInterval ) {
      clearInterval( this.strobeInterval );
      this.strobeInterval = null;
    }

    if ( enabled ) {
      // Calculate delay based on frequency (Hz)
      const delay = 1000 / this.strobeFrequency.value;

      this.strobeInterval = setInterval( () => {
        // Audio Pulse (The "Click")
        if ( this.useAudioPulse.value ) {
          this.playAudioClick();
        }

        // Note: Visual strobe is handled by the UI listening to a custom event
        window.dispatchEvent( new CustomEvent( 'resonance-strobe' ) );
      }, delay );
    }
  }

  /**
   * Plays a very short, high-pitched click.
   * We use a "Triangle" wave with a very fast frequency ramp for a sharp transient.
   */
  private playAudioClick () {
    const ctx = this.context;
    if ( !ctx ) return;

    const osc = ctx.createOscillator();
    const g = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime( 2000, ctx.currentTime );
    osc.frequency.exponentialRampToValueAtTime( 40, ctx.currentTime + 0.01 );

    g.gain.setValueAtTime( 0.1, ctx.currentTime );
    g.gain.exponentialRampToValueAtTime( 0.0001, ctx.currentTime + 0.01 );

    osc.connect( g );
    g.connect( ctx.destination );

    osc.start();
    osc.stop( ctx.currentTime + 0.02 );
  }
}

/**
 * Hook to provide easy access to the ResonanceManager in Vue components.
 */
export function useResonance () {
  return ResonanceManager.getInstance();
}
