
// AudioWorkletProcessor for Pitch Detection using McLeod Pitch Method (MPM)
// Re-implemented to avoid external dependencies and bundling issues.

// Stub types for AudioWorklet scope
declare class AudioWorkletProcessor {
  readonly port: MessagePort;
  process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: Record<string, Float32Array>): boolean;
}
declare function registerProcessor(name: string, processorCtor: new () => AudioWorkletProcessor): void;
declare const sampleRate: number; 

class PitchProcessor extends AudioWorkletProcessor {
  private _bufferSize: number = 4096;
  private _buffer: Float32Array;
  private _bufferIndex: number = 0;

  // MPM Constants
  private _cutoff: number = 0.88; // Relaxed from 0.93 for better lock on string instruments
  private _sampleRate: number;
  private _useLowPass: boolean = false;
  private _downsample: number = 1;
  private _lpfState: number = 0;

  static get parameterDescriptors() {
    return [];
  }

  constructor() {
    super();
    this._buffer = new Float32Array(this._bufferSize);
    this._sampleRate = typeof sampleRate !== 'undefined' ? sampleRate : 44100;

    this.port.onmessage = ( e ) => {
      if ( e.data && e.data.type === 'config' ) {
        if ( typeof e.data.lowPass === 'boolean' ) {
          this._useLowPass = e.data.lowPass;
        }
          if ( typeof e.data.downsample === 'number' ) {
            this._downsample = e.data.downsample;
          }
        }
    }
  }

  process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: Record<string, Float32Array>) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const channelData = input[0];
    const length = channelData.length;

    // Sliding window buffer
    this._buffer.copyWithin(0, length);
    this._buffer.set(channelData, this._bufferSize - length);
    this._bufferIndex += length;

    // Process every ~1024 samples (approx 23ms) to balance CPU load vs responsiveness
    if (this._bufferIndex >= 1024) {
        this.analyze();
        this._bufferIndex = 0;
    }

    return true;
  }

  analyze() {
    let buffer = this._buffer;

    // 1. Low Pass Filter (The "Octave Killer")
    // Physics: Bass instruments often have strong "harmonics" (multiples of the base frequency).
    // Sometimes these harmonics are louder than the base note, confusing the detector (e.g., detecting E2 as E3).
    // A Low Pass filter gently reduces volume of high frequencies, making the base note clearer.
    if ( this._useLowPass ) {
      // Create a snapshot so we don't mess up the circular buffer for next frame
      const analysisBuffer = new Float32Array( this._bufferSize );
      analysisBuffer.set( buffer );
      buffer = analysisBuffer; 

      // "Alpha" controls how heavy the filtering is.
      // 0.15 is roughly a 1000Hz cutoff. Frequencies above this start getting quiet.
      const alpha = 0.15;
      let last = 0; 

      for ( let i = 0; i < buffer.length; i++ ) {
        const current = buffer[i]!;
        // Simple One-Pole Filter Equation:
        // flexible_value = previous_value + (difference * fraction)
        // This visualizes "dragging" a value towards the target slowly, effectively smoothing it out.
        const val = last + alpha * ( current - last );
        buffer[i] = val;
        last = val;
      }
    }

    // 2. Downsampling (The "Bass Mode" Performance Hack)
    // Physics: To detect low frequencies (long waves), we need a "Longer Window" of time.
    // Instead of analyzing 4096 samples at 44100Hz (~0.09 seconds),
    // we can skip every 3 samples (take 1, skip 3).
    // This makes our 4096 buffer represent ~0.37 seconds of audio!
    // It's like "zooming out" on the waveform to see the big bass waves.
    let analysisBuffer = buffer;
    let analysisRate = this._sampleRate;

    if ( this._downsample > 1 ) {
      const newLen = Math.floor( buffer.length / this._downsample );
      const downsampled = new Float32Array( newLen );

      // "Decimation": Taking every Nth sample
      for ( let i = 0; i < newLen; i++ ) {
        downsampled[i] = buffer[i * this._downsample]!;
      }

      analysisBuffer = downsampled;
      // IMPORTANT: Since we skipped samples, the "effective" sample rate is lower.
      // We must tell the pitch math that time is moving "slower" relative to our array indices.
      analysisRate = this._sampleRate / this._downsample;
    }

    const nsdf = this.normalizedSquareDifference( analysisBuffer );
    const maxPositions = this.peakPicking( nsdf );
    
    let pitch: number | null = null;
    let clarity: number = 0;

    if ( maxPositions.length > 0 ) {
      const bestPeakIndex = maxPositions[0]!; 
      const refinedLag = this.parabolicInterpolation( nsdf, bestPeakIndex );

      pitch = analysisRate / refinedLag;
      clarity = nsdf[bestPeakIndex]!;
    }

    // Volume (RMS)
    let sumSquares = 0;
    // Use original buffer for volume, not analysis buffer
    // But buffer variable might have been reassigned to LPF copy.
    // That's fine, LPF volume is similar. 
    // But typically we want RMS of raw signal. 
    // We should use this._buffer for RMS.

    // However, analyze() uses local var buffer which might be LPF'd.
    // Let's use this._buffer explicitly for RMS to be safe/consistent.
    const rawBuffer = this._buffer;
    for (let i = 0; i < this._bufferSize; i++) {
      sumSquares += rawBuffer[i]! * rawBuffer[i]!;
    }
    const volume = Math.sqrt(sumSquares / this._bufferSize);

    this.port.postMessage({
        pitch,
        clarity,
        volume
    });
  }

  // --- McLeod Pitch Method Implementation ---

  private normalizedSquareDifference ( audioBuffer: Float32Array ): Float32Array {
    const len = audioBuffer.length;
    const nsdf = new Float32Array( len );

    // We search for lags up to half the buffer size (detect down to ~10Hz with 4096 buffer)
    // Optimization: No need to calculate full lag if we only care about reasonable pitch range.
    // But for completeness, we do standard MPM window.

    // Calculate 'm' terms (sum of squares)
    // This is a simplified, non-FFT implementation. 
    // For 4096 samples, O(N^2) might be slow in JS (16M ops).
    // However, typical MPM implementations use FFT for correlation.
    // Since this is AudioWorklet, verified O(N^2) on 4096 might be too heavy for 128-sample blocks?
    // No, we run it every 1024 samples. But still heavy.
    // Let's implement the O(N) optimizations or keep lag window small.

    // Optimization: Only compute lags relevant for pitch (e.g., 20Hz+).
    // Max lag for 20Hz @ 44.1k = 2205 samples.
    const maxLag = Math.floor( len / 2 );

    for ( let tau = 0; tau < maxLag; tau++ ) {
      let acf = 0;
      let divisorM = 0;

      // Autocorrelation at lag tau
      for ( let i = 0; i < len - tau; i++ ) {
        acf += audioBuffer[i]! * audioBuffer[i + tau]!;
        divisorM += audioBuffer[i]! * audioBuffer[i]! + audioBuffer[i + tau]! * audioBuffer[i + tau]!;
      }

      nsdf[tau] = 2 * acf / divisorM;
    }

    return nsdf;
  }

  private peakPicking ( nsdf: Float32Array ): number[] {
    const maxPositions: number[] = [];
    let pos = 0;
    let curMaxPos = 0;
    const len = nsdf.length;

    // 1. Find all peaks > 0
    // 2. Filter by threshold

    // Iterate to find peaks
    while ( pos < len - 1 && nsdf[pos]! > 0 ) {
      pos++; // Skip initial positive slope
    }

    while ( pos < len - 1 && nsdf[pos]! <= 0 ) {
      pos++; // Skip negative section
    }

    if ( pos === 0 ) pos = 1;

    while ( pos < len - 1 ) {
      // Identify peak: slope changes from positive to negative
      if ( nsdf[pos]! > nsdf[pos - 1]! && nsdf[pos]! >= nsdf[pos + 1]! ) {
        if ( curMaxPos === 0 ) {
          curMaxPos = pos;
        } else if ( nsdf[pos]! > nsdf[curMaxPos]! ) {
          curMaxPos = pos;
        }
      }

      pos++;

      // Once we cross zero (or dip significantly), we found a 'lobe'
      if ( pos < len - 1 && nsdf[pos]! <= 0 ) {
        // Finish this lobe
        if ( curMaxPos > 0 && nsdf[curMaxPos]! >= this._cutoff ) {
          maxPositions.push( curMaxPos );
        }
        curMaxPos = 0;
      }
    }

    // If we found NO peaks above high cutoff, try lower
    // (Simplified: just stick to high cutoff for now to avoid false positives)

    // Note: MPM logic usually requires finding the *first* peak that is within a factor k of the overall max.
    // Here we just take all peaks > cutoff.

    return maxPositions;
  }

  private parabolicInterpolation ( nsdf: Float32Array, peakIndex: number ): number {
    const x1 = peakIndex - 1;
    const x2 = peakIndex;
    const x3 = peakIndex + 1;

    const y1 = nsdf[x1]!;
    const y2 = nsdf[x2]!;
    const y3 = nsdf[x3]!;

    const denominator = 2 * ( 2 * y2 - y1 - y3 );
    if ( denominator === 0 ) return peakIndex;

    const delta = ( y1 - y3 ) / denominator;
    return peakIndex + delta;
  }
}

registerProcessor('pitch-processor', PitchProcessor);
