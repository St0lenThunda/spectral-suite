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
      /**
       * We request "raw" audio without browser processing.
       * 1. echoCancellation: false - Prevents the OS from switching to "VoIP mode" (which lowers sample rate/quality).
       * 2. noiseSuppression: false - We want the full spectral content, even noise, for accurate analysis.
       * 3. autoGainControl: false - Prevents the volume from "pumping" up and down.
       */
      // Simplified constraints for debugging
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: false,
          autoGainControl: false,
          noiseSuppression: false
        }
      };

      console.log( 'Requesting raw audio input...', constraints );
      const stream = await navigator.mediaDevices.getUserMedia( constraints );
      console.log( 'Audio stream acquired:', stream.id );
      this.stream = stream;
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

  public getStream (): MediaStream | null {
    return this.stream;
  }
}
