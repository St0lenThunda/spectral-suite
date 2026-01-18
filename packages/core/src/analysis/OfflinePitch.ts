import { Note } from 'tonal';

export class OfflinePitch {
  /**
   * Peak detection logic adapted from usePolyPitch for offline analysis.
   * Analyzes a single frame of frequency data to find dominant notes.
   * 
   * @param frequencyData Float32Array from AnalyserNode.getFloatFrequencyData or equivalent FFT
   * @param sampleRate The sample rate of the audio context (usually 44100 or 48000)
   * @param threshold dB threshold for peak detection (default -60)
   * @returns Array of detected note names (e.g. ['C3', 'E3', 'G3'])
   */
  public static detectPolyphonicNotes ( 
    frequencyData: Float32Array, 
    sampleRate: number,
    threshold: number = -60
  ): string[] {
    const bufferLength = frequencyData.length;
    // Calculate bin size: Nyquist / binCount
    // Nyquist is sampleRate / 2
    const nyquist = sampleRate / 2;
    const binSize = nyquist / bufferLength;

    const RELATIVE_THRESHOLD = 25; // dB distance from the strongest peak
    const MAX_NOTES = 6;

    // 1. Peak Detection
    const peaks: Array<{ freq: number; magnitude: number }> = [];
    const startBin = Math.floor( 40 / binSize ); // Skip below 40Hz

    for ( let i = startBin; i < bufferLength - 1; i++ ) {
      const val = frequencyData[i]!;

      // Local maximum check
      if ( val > threshold && val > frequencyData[i - 1]! && val > frequencyData[i + 1]! ) {
        // Parabolic interpolation
        const alpha = frequencyData[i - 1]!;
        const beta = frequencyData[i]!;
        const gamma = frequencyData[i + 1]!;
        const p = 0.5 * ( alpha - gamma ) / ( alpha - 2 * beta + gamma );
        const accurateBin = i + p;

        peaks.push( {
          freq: accurateBin * binSize,
          magnitude: val
        } );
      }
    }

    // 2. Sort by magnitude
    peaks.sort( ( a, b ) => b.magnitude - a.magnitude );

    // 2b. Relative Filtering
    const maxMag = peaks.length > 0 ? peaks[0]!.magnitude : -100;
    const filteredPeaks = peaks.filter( p => p.magnitude > ( maxMag - RELATIVE_THRESHOLD ) );

    // 3. Harmonic Filtering & Note Mapping
    const foundNotes = new Set<string>();
    const activeFundamentals: number[] = [];

    for ( const peak of filteredPeaks ) {
      if ( foundNotes.size >= MAX_NOTES ) break;

      let isHarmonic = false;
      for ( const fund of activeFundamentals ) {
        const ratio = peak.freq / fund;
        const nearestInt = Math.round( ratio );
        
        // Harmonic check (logic from usePolyPitch)
        if ( nearestInt > 1 && Math.abs( ratio - nearestInt ) < 0.03 ) {
          isHarmonic = true;
          break;
        }
      }

      if ( !isHarmonic ) {
        const noteName = Note.fromFreq( peak.freq );
        if ( noteName ) {
          foundNotes.add( noteName );
          activeFundamentals.push( peak.freq );
        }
      }
    }

    return Array.from( foundNotes );
  }
}
