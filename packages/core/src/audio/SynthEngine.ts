import { AudioEngine } from './AudioEngine';

export class SynthEngine {
  private static instance: SynthEngine;
  private context: AudioContext | null = null;
  private gainNode: GainNode | null = null;

  private constructor() { }

  public static getInstance (): SynthEngine {
    if ( !SynthEngine.instance ) {
      SynthEngine.instance = new SynthEngine();
    }
    return SynthEngine.instance;
  }

  private init () {
    if ( this.context ) return;
    const audioEngine = AudioEngine.getInstance();
    this.context = audioEngine.getContext();
    if ( !this.context ) return;

    this.gainNode = this.context.createGain();
    this.gainNode.connect( this.context.destination );
    this.gainNode.gain.value = 1.0;
  }

  public playNote ( frequency: number, durationMs: number = 300 ) {
    this.init();
    if ( !this.context || !this.gainNode ) return;

    // Ensure context is running (fixes silent playback after user interaction)
    if ( this.context.state === 'suspended' ) {
      this.context.resume();
    }

    const osc = this.context.createOscillator();
    const noteGain = this.context.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime( frequency, this.context.currentTime );

    osc.connect( noteGain );
    noteGain.connect( this.gainNode );

    const now = this.context.currentTime;
    const attack = 0.05;
    const release = 0.1;
    const duration = durationMs / 1000;

    noteGain.gain.setValueAtTime( 0, now );
    noteGain.gain.linearRampToValueAtTime( 0.2, now + attack );
    noteGain.gain.setValueAtTime( 0.2, now + duration - release );
    noteGain.gain.linearRampToValueAtTime( 0, now + duration );

    osc.start( now );
    osc.stop( now + duration );
  }
}
