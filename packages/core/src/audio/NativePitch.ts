
/**
 * NativePitch - McLeod Pitch Method (MPM) Implementation
 * 
 * A completely dependency-free pitch detection algorithm.
 * Implements the same logic as the AudioWorklet PitchProcessor for
 * consistent behavior on the main thread (fallback).
 */
export class NativePitch {
  private bufferSize: number;
  private buffer: Float32Array;
  private sampleRate: number;
  private cutoff: number = 0.93; // Standard MPM cutoff
  public useLowPass: boolean = false;
  public downsample: number = 1;
  private lpfState: number = 0;

  constructor( bufferSize: number = 4096, sampleRate: number = 44100 ) {
    this.bufferSize = bufferSize;
    this.sampleRate = sampleRate;
    this.buffer = new Float32Array( bufferSize );
  }

  /**
   * Finds the pitch of the provided audio buffer.
   * @param audioBuffer The time-domain data (must match bufferSize ideally, or be large enough)
   * @param sampleRate The sample rate of the audio context
   * @returns [pitch (Hz), clarity (0-1)]
   */
  findPitch ( audioBuffer: Float32Array, sampleRate: number ): [number | null, number] {
    if ( sampleRate ) this.sampleRate = sampleRate;

    // Note: For main thread fallback, workingBuffer is usually a view/copy
    let workingBuffer = audioBuffer;
    if ( audioBuffer.length > this.bufferSize ) {
      workingBuffer = audioBuffer.subarray( 0, this.bufferSize );
    }

    // 1. Low Pass Filter (Anti-aliasing / Octave Killer)
    // Important: Run BEFORE downsampling to reduce aliasing if both are on
    if ( this.useLowPass ) {
      const alpha = 0.15; 
      let last = this.lpfState;
      // Mutating workingBuffer (assuming it's safe to mutate analysis buffer)
      for ( let i = 0; i < workingBuffer.length; i++ ) {
        const current = workingBuffer[i]!;
        const val = last + alpha * ( current - last );
        workingBuffer[i] = val;
        last = val;
      }
      this.lpfState = last;
    }

    // 2. Downsampling (Decimation)
    let analysisBuffer = workingBuffer;
    let analysisRate = this.sampleRate;

    if ( this.downsample > 1 ) {
      const newLen = Math.floor( workingBuffer.length / this.downsample );
      const downsampled = new Float32Array( newLen );

      // Simple decimation (pick every Nth sample)
      for ( let i = 0; i < newLen; i++ ) {
        downsampled[i] = workingBuffer[i * this.downsample]!;
      }

      analysisBuffer = downsampled;
      analysisRate = this.sampleRate / this.downsample;
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

    return [pitch, clarity];
  }

  private normalizedSquareDifference ( audioBuffer: Float32Array ): Float32Array {
    const len = audioBuffer.length;
    const nsdf = new Float32Array( len );
    const maxLag = Math.floor( len / 2 );

    for ( let tau = 0; tau < maxLag; tau++ ) {
      let acf = 0;
      let divisorM = 0;

      for ( let i = 0; i < len - tau; i++ ) {
        const sample = audioBuffer[i] || 0;
        const sampleTau = audioBuffer[i + tau] || 0;

        acf += sample * sampleTau;
        divisorM += sample * sample + sampleTau * sampleTau;
      }

      nsdf[tau] = divisorM === 0 ? 0 : 2 * acf / divisorM;
    }

    return nsdf;
  }

  private peakPicking ( nsdf: Float32Array ): number[] {
    const maxPositions: number[] = [];
    let pos = 0;
    let curMaxPos = 0;
    const len = nsdf.length;

    while ( pos < len - 1 && nsdf[pos]! > 0 ) pos++;
    while ( pos < len - 1 && nsdf[pos]! <= 0 ) pos++;
    if ( pos === 0 ) pos = 1;

    while ( pos < len - 1 ) {
      if ( nsdf[pos]! > nsdf[pos - 1]! && nsdf[pos]! >= nsdf[pos + 1]! ) {
        if ( curMaxPos === 0 ) curMaxPos = pos;
        else if ( nsdf[pos]! > nsdf[curMaxPos]! ) curMaxPos = pos;
      }

      pos++;

      if ( pos < len - 1 && nsdf[pos]! <= 0 ) {
        if ( curMaxPos > 0 && nsdf[curMaxPos]! >= this.cutoff ) {
          maxPositions.push( curMaxPos );
        }
        curMaxPos = 0;
      }
    }

    return maxPositions;
  }

  private parabolicInterpolation ( nsdf: Float32Array, peakIndex: number ): number {
    const x1 = peakIndex - 1;
    const x2 = peakIndex;
    const x3 = peakIndex + 1;

    const y1 = nsdf[x1] || 0;
    const y2 = nsdf[x2] || 0;
    const y3 = nsdf[x3] || 0;

    const denominator = 2 * ( 2 * y2 - y1 - y3 );
    if ( denominator === 0 ) return peakIndex;

    const delta = ( y1 - y3 ) / denominator;
    return peakIndex + delta;
  }
}
