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
    // If context exists, ensure it's running and stream is active
    if ( this.context ) {
      if ( this.context.state === 'suspended' ) {
        await this.context.resume();
      }

      // Check if stream is active
      if ( this.stream && this.stream.active ) {
        return;
      }

      // If stream is dead, we need to re-initialize everything
      this.close();
    }

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

  /**
   * Stops the media stream and closes the audio context to release resources.
   */
  public async close (): Promise<void> {
    if ( this.stream ) {
      this.stream.getTracks().forEach( track => track.stop() );
      this.stream = null;
    }

    if ( this.source ) {
      this.source.disconnect();
      this.source = null;
    }

    if ( this.gainNode ) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }

    if ( this.analyser ) {
      this.analyser.disconnect();
      this.analyser = null;
    }

    if ( this.context ) {
      if ( this.context.state !== 'closed' ) {
        await this.context.close();
      }
      this.context = null;
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
