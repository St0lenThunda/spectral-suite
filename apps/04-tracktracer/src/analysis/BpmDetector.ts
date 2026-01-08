export class BpmDetector {
  /**
   * Fast BPM detection using energy peaks
   */
  public static async analyze ( buffer: AudioBuffer ): Promise<number> {
    const data = buffer.getChannelData( 0 ); // Use mono context
    const sampleRate = buffer.sampleRate;

    // 1. Calculate energy in chunks
    const chunkSize = 2048;
    const energy = new Float32Array( Math.ceil( data.length / chunkSize ) );

    for ( let i = 0; i < energy.length; i++ ) {
      let sum = 0;
      for ( let j = 0; j < chunkSize && ( i * chunkSize + j ) < data.length; j++ ) {
        const val = data[i * chunkSize + j]!;
        sum += val * val;
      }
      energy[i] = Math.sqrt( sum / chunkSize );
    }

    // 2. Find peaks (onsets)
    const threshold = 0.15; // Dynamic threshold would be better, but this is a start
    const peaks: number[] = [];

    for ( let i = 1; i < energy.length - 1; i++ ) {
      if ( energy[i]! > threshold && energy[i]! > energy[i - 1]! && energy[i]! > energy[i + 1]! ) {
        peaks.push( i * chunkSize / sampleRate );
      }
    }

    // 3. Analyze intervals between peaks
    if ( peaks.length < 2 ) return 0;

    const intervals: number[] = [];
    for ( let i = 1; i < peaks.length; i++ ) {
      intervals.push( peaks[i]! - peaks[i - 1]! );
    }

    // 4. Cluster intervals to find the "pulse"
    // For MVP, we'll just take the median interval that falls in 60-180 BPM range
    const bpms = intervals
      .map( inv => 60 / inv )
      .filter( bpm => bpm >= 60 && bpm <= 180 );

    if ( bpms.length === 0 ) return 0;

    bpms.sort( ( a, b ) => a - b );
    const medianBpm = bpms[Math.floor( bpms.length / 2 )]!;

    return Math.round( medianBpm );
  }
}
