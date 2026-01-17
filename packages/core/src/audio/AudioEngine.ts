import { isRawAudioMode } from '../config/sensitivity';

export class AudioEngine {
  private static instance: AudioEngine;
  private context: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  public initialized: boolean = false;

  private constructor() { }

  public static getInstance (): AudioEngine {
    if ( !AudioEngine.instance ) {
      AudioEngine.instance = new AudioEngine();
    }
    return AudioEngine.instance;
  }

  public async init ( deviceId?: string ): Promise<void> {
    // If context exists, ensure it's running and stream is active
    if ( this.context ) {
      if ( this.context.state === 'suspended' ) {
        await this.context.resume();
      }

      // Check if stream is active AND if it matches the requested device (if provided)
      if ( this.stream && this.stream.active ) {
        const track = this.stream.getAudioTracks()[0];
        const currentDeviceId = track?.getSettings().deviceId;

        // If no specific device requested, or current matches request, we are good.
        if ( !deviceId || deviceId === currentDeviceId ) {
          return;
        }
      }

      // If stream is dead or device mismatch, we need to re-initialize everything
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
      const rawMode = isRawAudioMode.value;
      const constraints: MediaStreamConstraints = {
        audio: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          echoCancellation: !rawMode,
          autoGainControl: !rawMode,
          noiseSuppression: !rawMode
        }
      };

      console.log( 'Requesting raw audio input...', constraints );
      const stream = await navigator.mediaDevices.getUserMedia( constraints );
      console.log( 'Audio stream acquired:', stream.id );
      stream.getTracks().forEach( t => console.log( 'Track:', t.label, t.readyState, t.enabled ) );
      this.stream = stream;
      this.source = this.context.createMediaStreamSource( this.stream );

      this.gainNode = this.context.createGain();
      this.analyser = this.context.createAnalyser();
      this.analyser.fftSize = 2048;

      // source -> gain -> analyser
      this.source.connect( this.gainNode );
      this.gainNode.connect( this.analyser );
      console.log( 'Audio Graph Connected: Source -> Gain -> Analyser' );
      this.initialized = true;
    } catch ( err ) {
      this.initialized = false;
      console.error( 'Error accessing microphone:', err );
      throw err;
    }
  }

  /**
   * Stops the media stream and closes the audio context to release resources.
   */
  public async close (): Promise<void> {
    this.initialized = false;
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

  public async resume (): Promise<void> {
    if ( this.context && this.context.state === 'suspended' ) {
      await this.context.resume();
    }
  }

  public async suspend (): Promise<void> {
    if ( this.context && this.context.state === 'running' ) {
      await this.context.suspend();
    }
  }

  public getStream (): MediaStream | null {
    return this.stream;
  }

  public async getDevices (): Promise<MediaDeviceInfo[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      // Returns both inputs and outputs (excluding 'communications' duplicates usually)
      return devices.filter( d =>
        ( d.kind === 'audioinput' || d.kind === 'audiooutput' ) &&
        d.deviceId !== 'default' &&
        d.deviceId !== 'communications'
      );
    } catch ( e ) {
      console.warn( 'Failed to enumerate devices:', e );
      return [];
    }
  }

  public async setDevice ( deviceId: string ): Promise<void> {
    console.log( 'Switching Audio Input Device to:', deviceId );
    await this.init( deviceId );
  }

  public async setOutputDevice ( deviceId: string ): Promise<void> {
    if ( !this.context ) return;

    console.log( 'Switching Audio Output Device to:', deviceId );

    // Feature detection for setSinkId (Chrome/Edge/Opera)
    if ( 'setSinkId' in this.context && typeof ( this.context as any ).setSinkId === 'function' ) {
      try {
        await ( this.context as any ).setSinkId( deviceId );
        console.log( 'Output device set successfully' );
      } catch ( err ) {
        console.error( 'Failed to set output device:', err );
        throw err;
      }
    } else {
      console.warn( 'Browser does not support AudioContext.setSinkId()' );
      throw new Error( 'Output selection not supported in this browser' );
    }
  }
}
