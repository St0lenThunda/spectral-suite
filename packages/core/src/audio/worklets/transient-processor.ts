// AudioWorkletProcessor for Transient Detection
// Calculates RMS and Energy for each processing block (128 samples by default)

// Stub types for AudioWorklet scope if not available
declare class AudioWorkletProcessor {
  readonly port: MessagePort;
  process ( inputs: Float32Array[][], outputs: Float32Array[][], parameters: Record<string, Float32Array> ): boolean;
}
declare function registerProcessor ( name: string, processorCtor: new () => AudioWorkletProcessor ): void;
declare const currentTime: number;


class TransientProcessor extends AudioWorkletProcessor {
  private _bufferSize: number;
  private _buffer: Float32Array;
  private _bufferIndex: number;

  // Config parameters
  static get parameterDescriptors () {
    return [];
  }

  constructor() {
    super();
    this._bufferSize = 512; // Match previous Meyda buffer size if possible, or accumulate
    this._buffer = new Float32Array( this._bufferSize );
    this._bufferIndex = 0;
  }

  process ( inputs: Float32Array[][], outputs: Float32Array[][], parameters: Record<string, Float32Array> ) {
    const input = inputs[0];
    if ( !input || !input[0] ) return true; // Keep processor alive

    const channelData = input[0];
    const length = channelData.length;

    // Accumulate samples into our buffer
    for ( let i = 0; i < length; i++ ) {
      this._buffer[this._bufferIndex] = channelData[i];
      this._bufferIndex++;

      // When buffer is full, process it
      if ( this._bufferIndex >= this._bufferSize ) {
        this.analyze( this._buffer, currentTime );
        this._bufferIndex = 0;
      }
    }

    return true; // Keep alive
  }

  analyze ( buffer: Float32Array, currentAudioTime: number ) {
    let sum = 0;
    let energy = 0;

    for ( let i = 0; i < buffer.length; i++ ) {
      const sample = buffer[i];
      const sq = sample * sample;
      sum += sq;
    }

    const rms = Math.sqrt( sum / buffer.length );
    energy = sum;

    // Send data back to main thread with the exact hardware clock time
    this.port.postMessage( {
      rms: rms,
      energy: energy,
      time: currentAudioTime
    } );
  }
}

registerProcessor( 'transient-processor', TransientProcessor );
