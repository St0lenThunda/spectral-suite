/**
 * AudioBuilder
 * 
 * A helper class to procedurally generate "Golden Master" audio buffers.
 * Used for integration testing of audio analysis algorithms without external files.
 */
export class AudioBuilder {
  private sampleRate: number;
  private length: number;
  private buffer: Float32Array;

  constructor( durationSeconds: number, sampleRate: number = 44100 ) {
    this.sampleRate = sampleRate;
    this.length = Math.floor( durationSeconds * sampleRate );
    this.buffer = new Float32Array( this.length );
  }

  public getBuffer (): AudioBuffer {
    return {
      length: this.length,
      duration: this.length / this.sampleRate,
      sampleRate: this.sampleRate,
      numberOfChannels: 1,
      getChannelData: () => this.buffer,
      copyFromChannel: () => { },
      copyToChannel: () => { }
    } as unknown as AudioBuffer;
  }

  /**
   * Adds a sine wave of a specific frequency.
   * Useful for testing pitch/key detection.
   */
  public addSine ( freq: number, startSec: number, durationSec: number, amplitude: number = 0.5 ): AudioBuilder {
    const startSample = Math.floor( startSec * this.sampleRate );
    const endSample = Math.min( this.length, startSample + Math.floor( durationSec * this.sampleRate ) );

    for ( let i = startSample; i < endSample; i++ ) {
      const t = ( i - startSample ) / this.sampleRate;
      this.buffer[i] += Math.sin( 2 * Math.PI * freq * t ) * amplitude;
    }
    return this;
  }

  /**
   * Adds a sharp "click" transient (white noise burst).
   * Better for accurate BPM detection than a low-freq kick.
   */
  public addClick ( startSec: number ): AudioBuilder {
    const startSample = Math.floor( startSec * this.sampleRate );
    const duration = 0.05; // 50ms click
    const endSample = Math.min( this.length, startSample + Math.floor( duration * this.sampleRate ) );

    for ( let i = startSample; i < endSample; i++ ) {
      // White noise with exponential decay
      const t = ( i - startSample ) / this.sampleRate;
      const amp = Math.exp( -20 * t ); // Fast decay
      const noise = ( Math.random() * 2 ) - 1;
      this.buffer[i] += noise * amp * 0.8;
    }
    return this;
  }

  /**
   * Fills the buffer with a steady beat at a specific BPM.
   */
  public addBeat ( bpm: number ): AudioBuilder {
    const interval = 60 / bpm;
    for ( let t = 0; t < ( this.length / this.sampleRate ); t += interval ) {
      this.addClick( t );
    }
    return this;
  }
}
