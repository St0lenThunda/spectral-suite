
// Instrument Frequency Ranges
export const INSTRUMENT_RANGES = [
  { name: 'Sub Bass', start: 20, end: 60, color: 'rgba(139, 92, 246, 0.3)' },
  { name: 'Bass', start: 60, end: 250, color: 'rgba(99, 102, 241, 0.2)' },
  { name: 'Low Mids', start: 250, end: 500, color: 'rgba(34, 197, 94, 0.15)' },
  { name: 'Mids', start: 500, end: 2000, color: 'rgba(234, 179, 8, 0.15)' },
  { name: 'Presence', start: 2000, end: 4000, color: 'rgba(249, 115, 22, 0.15)' },
  { name: 'Brilliance', start: 4000, end: 8000, color: 'rgba(236, 72, 153, 0.12)' },
  { name: 'Air', start: 8000, end: 20000, color: 'rgba(14, 165, 233, 0.1)' },
];

export interface EQSuggestion {
    freq: string;
    action: string;
    reason: string;
}

export const generateEqSuggestions = ( data: Uint8Array, nyquist: number ): EQSuggestion[] => {
  const suggestions: EQSuggestion[] = [];
  const binHz = nyquist / data.length;

  // Check for muddy low-mids (200-500Hz)
  const muddyStart = Math.floor( 200 / binHz );
  const muddyEnd = Math.floor( 500 / binHz );
  let muddyAvg = 0;
  for ( let i = muddyStart; i < muddyEnd; i++ ) muddyAvg += data[i] ?? 0;
  muddyAvg /= ( muddyEnd - muddyStart );
  if ( muddyAvg > 180 ) {
    suggestions.push( { freq: '300Hz', action: 'Cut 2-4dB', reason: 'Muddy low-mids detected' } );
  }

  // Check for harsh presence (2-4kHz)
  const harshStart = Math.floor( 2000 / binHz );
  const harshEnd = Math.floor( 4000 / binHz );
  let harshAvg = 0;
  for ( let i = harshStart; i < harshEnd; i++ ) harshAvg += data[i] ?? 0;
  harshAvg /= ( harshEnd - harshStart );
  if ( harshAvg > 200 ) {
    suggestions.push( { freq: '3kHz', action: 'Cut 1-3dB', reason: 'Harsh presence' } );
  }

  // Check for lacking air (10k+)
  const airStart = Math.floor( 10000 / binHz );
  let airAvg = 0;
  for ( let i = airStart; i < data.length; i++ ) airAvg += data[i] ?? 0;
  airAvg /= ( data.length - airStart );
  if ( airAvg < 30 ) {
    suggestions.push( { freq: '12kHz', action: 'Boost 2-3dB', reason: 'Lacking air/sparkle' } );
  }

  return suggestions.slice( 0, 3 );
};

export const getNoteFromFreq = ( freq: number ): string => {
  if ( freq <= 20 ) return "-";
  const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const h = Math.round( 12 * Math.log2( freq / 440 ) + 69 );
  if ( h < 0 ) return "-";
  const octave = Math.floor( h / 12 ) - 1;
  const n = ( ( h % 12 ) + 12 ) % 12;
  return ( notes[n] ?? "" ) + octave;
}
