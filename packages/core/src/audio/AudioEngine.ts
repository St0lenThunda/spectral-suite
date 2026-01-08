export class AudioEngine {
  private static instance: AudioEngine;
  private context: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;

  private constructor() { }

  public static getInstance (): AudioEngine {
    if ( !AudioEngine.instance ) {
      AudioEngine.instance = new AudioEngine();
    }
    return AudioEngine.instance;
  }

  public async init (): Promise<void> {
    if ( this.context ) return;

    this.context = new ( window.AudioContext || ( window as any ).webkitAudioContext )();

    try {
      this.stream = await navigator.mediaDevices.getUserMedia( { audio: true } );
      this.source = this.context.createMediaStreamSource( this.stream );

      this.gainNode = this.context.createGain();
      this.analyser = this.context.createAnalyser();
      this.analyser.fftSize = 2048;

      // source -> gain -> analyser
      this.source.connect( this.gainNode );
      this.gainNode.connect( this.analyser );
    } catch ( err ) {
      console.error( 'Error accessing microphone:', err );
      throw err;
    }
  }

  public setGain ( value: number ) {
    if ( this.gainNode ) {
      this.gainNode.gain.setTargetAtTime( value, this.context!.currentTime, 0.01 );
    }
  }

  public getGain (): number {
    return this.gainNode ? this.gainNode.gain.value : 1.0;
  }

  public getContext (): AudioContext | null {
    return this.context;
  }

  public getAnalyser (): AnalyserNode | null {
    return this.analyser;
  }

  public resume (): void {
    if ( this.context && this.context.state === 'suspended' ) {
      this.context.resume();
    }
  }

  public suspend (): void {
    if ( this.context && this.context.state === 'running' ) {
      this.context.suspend();
    }
  }
}
