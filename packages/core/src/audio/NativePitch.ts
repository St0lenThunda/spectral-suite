
/**
 * NativePitch - McLeod Pitch Method (MPM) Implementation
 * 
 * A completely dependency-free pitch detection algorithm.
 * Implements the same logic as the AudioWorklet PitchProcessor for
 * consistent behavior on the main thread (fallback).
 */
export class NativePitch {
  private bufferSize: number;
  // private buffer: Float32Array; // Removed unused buffer
  private sampleRate: number;
  private cutoff: number = 0.5; // Relaxed to allow downstream filtering
  public useLowPass: boolean = false;
  public downsample: number = 1;
  private lpfState: number = 0;

  constructor( bufferSize: number = 4096, sampleRate: number = 44100 ) {
    this.bufferSize = bufferSize;
    this.sampleRate = sampleRate;
  }

  /**
   * Finds the pitch of the provided audio buffer.
   * @param audioBuffer The time-domain data (must match bufferSize ideally, or be large enough)
   * @param sampleRate The sample rate of the audio context
   * @returns [pitch (Hz), clarity (0-1)]
   */
  /**
  * Finds the pitch of the provided audio buffer.
  * 
  * @param audioBuffer - The time-domain data (amplitude values over time)
  * @param sampleRate - The speed of the audio (samples per second, e.g., 44100)
  * @returns [pitch, clarity] - Pitch in Hz and a confidence score (0-1)
  */
  findPitch ( audioBuffer: Float32Array | any, sampleRate: number ): [number | null, number] {
    if ( sampleRate ) this.sampleRate = sampleRate;

    // Note: For main thread fallback, workingBuffer is usually a view/copy
    let workingBuffer = audioBuffer;
    if ( audioBuffer.length > this.bufferSize ) {
      workingBuffer = audioBuffer.subarray( 0, this.bufferSize );
    }

    // 1. Low Pass Filter (The "Octave Killer")
    // Physics: Bass instruments often have strong "harmonics" (multiples of the base frequency).
    // Sometimes these harmonics are louder than the base note, confusing the detector (e.g., detecting E2 as E3).
    // A Low Pass filter gently reduces volume of high frequencies, making the base note clearer.
    if ( this.useLowPass ) {
      // "Alpha" controls how heavy the filtering is.
      // 0.15 is roughly a 1000Hz cutoff. Frequencies above this start getting quiet.
      const alpha = 0.15; 
      let last = this.lpfState;

      // Mutating workingBuffer (assuming it's safe to mutate analysis buffer)
      for ( let i = 0; i < workingBuffer.length; i++ ) {
        const current = workingBuffer[i]!;
        // Simple One-Pole Filter Equation:
        // flexible_value = previous_value + (difference * fraction)
        // This visualizes "dragging" a value towards the target slowly, effectively smoothing it out.
        const val = last + alpha * ( current - last );
        workingBuffer[i] = val;
        last = val;
      }
      this.lpfState = last;
    }

    // 2. Downsampling (The "Bass Mode" Performance Hack)
    // Physics: To detect low frequencies (long waves), we need a "Longer Window" of time.
    // Instead of analyzing 4096 samples at 44100Hz (~0.09 seconds),
    // we can skip every 3 samples (take 1, skip 3).
    // This makes our 4096 buffer represent ~0.37 seconds of audio!
    // It's like "zooming out" on the waveform to see the big bass waves.
    let analysisBuffer = workingBuffer;
    let analysisRate = this.sampleRate;

    if ( this.downsample > 1 ) {
      const newLen = Math.floor( workingBuffer.length / this.downsample );
      const downsampled = new Float32Array( newLen );

      // "Decimation": Taking every Nth sample
      for ( let i = 0; i < newLen; i++ ) {
        downsampled[i] = workingBuffer[i * this.downsample]!;
      }

      analysisBuffer = downsampled;
      // IMPORTANT: Since we skipped samples, the "effective" sample rate is lower.
      // We must tell the pitch math that time is moving "slower" relative to our array indices.
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
