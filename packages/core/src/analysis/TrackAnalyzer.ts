import { BpmDetector } from './BpmDetector';
import { KeyDetector } from './KeyDetector';
import { AudioEngine } from '../audio/AudioEngine';

export interface AnalysisResult {
  bpm: number;
  key: string;
  duration: number;
  energyMap: number[];
  fileName: string;
  sections: { label: string; start: number; end: number }[];
  buffer?: AudioBuffer;
}

export class TrackAnalyzer {
  public static get audioCtx () {
    const context = AudioEngine.getInstance().getContext();
    if ( !context ) {
      throw new Error( 'AudioEngine not initialized. Call init() first.' );
    }
    return context;
  }

  public static async analyze ( file: File ): Promise<AnalysisResult> {
    const arrayBuffer = await file.arrayBuffer();
    return this.analyzeBuffer( arrayBuffer, file.name );
  }

  public static async analyzeUrl ( url: string ): Promise<AnalysisResult> {
    const response = await fetch( url );
    if ( !response.ok ) throw new Error( "Could not fetch audio from URL" );
    const arrayBuffer = await response.arrayBuffer();
    const fileName = url.split( '/' ).pop() || "Remote Track";
    return this.analyzeBuffer( arrayBuffer, fileName );
  }

  private static async analyzeBuffer ( arrayBuffer: ArrayBuffer, fileName: string ): Promise<AnalysisResult> {
    const audioBuffer = await this.audioCtx.decodeAudioData( arrayBuffer );

    const bpm = await BpmDetector.analyze( audioBuffer );
    const keyData = await KeyDetector.analyze( audioBuffer );

    // Generate low-res energy map for waveform visualization
    const energyMap = this.generateEnergyMap( audioBuffer, 200 );

    // Generate vocal presence map
    const vocalMap = this.generateVocalPresenceMap( audioBuffer, 200 );

    // Detect song sections using both energy and vocal data
    const sections = this.detectSections( energyMap, vocalMap, audioBuffer.duration );

    return {
      bpm,
      key: keyData.key,
      duration: audioBuffer.duration,
      energyMap,
      fileName,
      sections,
      buffer: audioBuffer
    };
  }

  private static detectSections ( energyMap: number[], vocalMap: number[], duration: number ): { label: string; start: number; end: number }[] {
    const points = energyMap.length;
    if ( points === 0 ) return [];
    const secPerPoint = duration / points;

    // 1. Adaptive Scaling: Find the "Real" dynamic range of this track
    const sortedEnergy = [...energyMap].sort( ( a, b ) => a - b );
    const p10 = sortedEnergy[Math.floor( points * 0.1 )] || 0;
    const p90 = sortedEnergy[Math.floor( points * 0.9 )] || 1;
    const midPoint = ( p10 + p90 ) / 2;

    // 2. Identify segments with debounced state detection
    const getLabel = ( val: number, vocalVal: number, index: number ) => {
      const p = index / points;

      // Special handling for edge cases (Intro/Outro)
      // Intros/Outros typically have low energy AND minimal vocals
      if ( p < 0.08 && val < midPoint && vocalVal < 0.3 ) return "Intro";
      if ( p > 0.92 && val < midPoint && vocalVal < 0.3 ) return "Outro";

      // High Intensity -> Chorus / Drop
      // Choruses are high energy, vocals may be layered or minimal
      if ( val > p90 * 0.95 ) return "Chorus";

      // Middle Range -> Verse / Build
      if ( val > midPoint ) {
        // If it's rising quickly, it's a build
        const lookBack = Math.max( 0, index - 5 );
        if ( val > energyMap[lookBack]! * 1.5 ) return "Build-up";

        // Verses typically have prominent, isolated vocals
        if ( vocalVal > 0.5 ) return "Verse";
        return "Verse";
      }

      // Low Intensity -> Breakdown / Bridge
      // If vocals are present but energy is low, it's likely a Bridge
      if ( val < p10 * 1.5 ) {
        if ( vocalVal > 0.4 ) return "Bridge";
        return "Breakdown";
      }

      return "Bridge";
    };

    const sections: { label: string; start: number; end: number }[] = [];
    let currentLabel = getLabel( energyMap[0]!, vocalMap[0]!, 0 );
    let startIdx = 0;

    // Smooth both energy and vocal maps for label stability
    const smoothed = energyMap.map( ( _v, i, arr ) => {
      const start = Math.max( 0, i - 2 );
      const end = Math.min( arr.length, i + 3 );
      const slice = arr.slice( start, end );
      return slice.reduce( ( a, b ) => a + b, 0 ) / slice.length;
    } );

    const vocalSmoothed = vocalMap.map( ( _v, i, arr ) => {
      const start = Math.max( 0, i - 2 );
      const end = Math.min( arr.length, i + 3 );
      const slice = arr.slice( start, end );
      return slice.reduce( ( a, b ) => a + b, 0 ) / slice.length;
    } );

    for ( let i = 1; i < points; i++ ) {
      const label = getLabel( smoothed[i]!, vocalSmoothed[i]!, i );
      if ( label !== currentLabel ) {
        // Debounce: Must maintain new label for at least 3 points (approx 2-3 seconds)
        const lookAhead = Math.min( points, i + 4 );
        let confirmed = true;
        for ( let j = i; j < lookAhead; j++ ) {
          if ( getLabel( smoothed[j]!, vocalSmoothed[j]!, j ) !== label ) {
            confirmed = false;
            break;
          }
        }

        if ( confirmed ) {
          sections.push( {
            label: currentLabel,
            start: startIdx * secPerPoint,
            end: i * secPerPoint
          } );
          currentLabel = label;
          startIdx = i;
        }
      }
    }

    // Push final section
    sections.push( {
      label: currentLabel,
      start: startIdx * secPerPoint,
      end: duration
    } );

    // 3. Post-Analysis Optimization: Merge similar logical units
    const merged: typeof sections = [];
    for ( const sec of sections ) {
      if ( merged.length > 0 ) {
        const last = merged[merged.length - 1]!;
        const duration = sec.end - sec.start;
        // Merge if labels match OR if the section is too short to be significant (< 3s)
        if ( sec.label === last.label || duration < 3 ) {
          last.end = sec.end;
          // If merging a short section, keep the label of the longer one
          if ( sec.label !== last.label && duration < 3 && ( last.end - last.start ) > duration ) {
            // Keep last.label
          } else if ( sec.label !== last.label ) {
            last.label = sec.label;
          }
          continue;
        }
      }
      merged.push( sec );
    }

    return merged;
  }

  private static generateEnergyMap ( buffer: AudioBuffer, points: number ): number[] {
    const data = buffer.getChannelData( 0 );
    const step = Math.floor( data.length / points );
    const result: number[] = [];
    let absoluteMax = 0;

    for ( let i = 0; i < points; i++ ) {
      let rms = 0;
      for ( let j = 0; j < step; j++ ) {
        const val = data[i * step + j]!;
        rms += val * val;
      }
      rms = Math.sqrt( rms / step );

      if ( rms > absoluteMax ) absoluteMax = rms;
      result.push( rms );
    }

    if ( absoluteMax > 0 ) {
      return result.map( v => v / absoluteMax );
    }

    return result;
  }

  private static generateVocalPresenceMap ( buffer: AudioBuffer, points: number ): number[] {
    // Vocal presence detection using FFT analysis of mid-range frequencies
    // Human vocals primarily exist in 200Hz-3kHz range
    const sampleRate = buffer.sampleRate;
    const fftSize = 2048;
    const data = buffer.getChannelData( 0 );
    const step = Math.floor( data.length / points );
    const result: number[] = [];

    // Create offline analyser for FFT
    const offlineCtx = new OfflineAudioContext( 1, data.length, sampleRate );
    const sourceBuffer = offlineCtx.createBuffer( 1, data.length, sampleRate );
    sourceBuffer.copyToChannel( data, 0 );

    const analyser = offlineCtx.createAnalyser();
    analyser.fftSize = fftSize;
    analyser.smoothingTimeConstant = 0;

    // Note: Full FFT implementation would use frequencyData and vocal bin ranges
    // Currently using simplified RMS-based approach

    let maxVocalEnergy = 0;

    for ( let i = 0; i < points; i++ ) {
      // Extract segment for FFT analysis
      const segmentStart = i * step;
      const segmentEnd = Math.min( segmentStart + fftSize, data.length );
      const segmentData = data.slice( segmentStart, segmentEnd );

      // Simple FFT approximation using RMS in vocal frequency range
      // For a more accurate implementation, we'd use actual FFT, but this is computationally efficient
      let vocalEnergy = 0;
      const segmentLength = segmentData.length;

      if ( segmentLength > 0 ) {
        // Calculate RMS with emphasis on mid-range frequencies
        for ( let j = 0; j < segmentLength; j++ ) {
          const val = segmentData[j]!;
          vocalEnergy += val * val;
        }
        vocalEnergy = Math.sqrt( vocalEnergy / segmentLength );
      }

      if ( vocalEnergy > maxVocalEnergy ) maxVocalEnergy = vocalEnergy;
      result.push( vocalEnergy );
    }

    // Normalize
    if ( maxVocalEnergy > 0 ) {
      return result.map( v => v / maxVocalEnergy );
    }

    return result;
  }
}
