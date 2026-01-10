export interface ToolMetadata {
  id: string;
  name: string;
  whatAmISeeing: string;
  instructions: string;
  practicalApplication: string;
  howItWorks: string;
}

export const TOOL_METADATA: Record<string, ToolMetadata> = {
  auratune: {
    id: 'auratune',
    name: 'AuraTune Pro',
    whatAmISeeing: 'A high-precision Intonation Lab. You are seeing a dual-system tuner combining a sub-cent Strobe visualizer with an SVG-based Vibrato Diagnostic Graph. The side panel provides real-time "Tone Quality" scoring and historical A4 calibration data.',
    instructions: '1. Click the Gear Icon ⚙️ to open the Advanced Settings Drawer.\n2. Set your Concert A (e.g., 432Hz) and your instrument\'s transposition key.\n3. Enable the "Practice Drone" to tune by ear against a guide tone.\n4. Observe the scrolling graph to analyze your vibrato shape and the strobe ring for sub-cent anchoring.',
    practicalApplication: 'Professional intonation and vocal training. Use it to eliminate "pitch drift" in long notes, calibrate your performance to historical temperaments, and visualize the forensic details of your vibrato width and speed.',
    howItWorks: 'AuraTune Pro utilizes a dual-engine architecture: a YIN-based autocorrelation for fundamental pitch detection and a custom forensic processor for sub-cent variance. The strobe renderer maps frequency deltas to angular velocity, while the stability engine prunes a 5-second circular buffer for real-time statistical charting.'
  },
  scalesleuth: {
    id: 'scalesleuth',
    name: 'ScaleSleuth Pro',
    whatAmISeeing: 'A real-time Harmonic Forensic Lab. You are seeing potential scale matches ranked by accuracy, an interactive fretboard map, and a modal relationship engine that identifies parent scales and interval degrees.',
    instructions: '1. Play a melody or a series of notes.\n2. Use the "Notes/Degrees" toggle to switch between letter names and intervals.\n3. Observe the color-coded "Heat Map" bars: Emerald indicates the most likely Tonic (home note), while Blue indicates supporting tones.\n4. Click a suggested scale to map the full pattern onto the fretboard.',
    practicalApplication: 'Identify complex modes in real-time performance, master modal theory by seeing relationships between parallel keys, and bridge the gap between "ear" and "theory" using interval analysis.',
    howItWorks: 'ScaleSleuth Pro uses a weighted pitch class profile. It calculates the mathematical distance between your input and thousands of scale structures, then performs a second-pass analysis to identify modal origins and relative scale degrees.'
  },
  chordcapture: {
    id: 'chordcapture',
    name: 'ChordCapture Pro',
    whatAmISeeing: 'A Forensic Harmonic Diarist. You are seeing real-time chord identification, a Progression Ledger for logging sequences, and a Roman Numeral analysis engine for functional theory.',
    instructions: '1. Play a series of notes or a chord.\n2. Observe the identified structure and its Roman Numeral (relative to your chosen key).\n3. Click "Capture to Ledger" to permanently log a chord into your harmonic sequence.\n4. Use "Next-Step Suggestions" for creative inspiration and common functional transitions.',
    practicalApplication: 'Transcribing complex songs, documenting harmonic ideas during composition, and mastering functional harmony (understanding I, IV, V relationships) through real-time feedback.',
    howItWorks: 'ChordCapture Pro uses a multi-pass detection engine powered by Tonal.js. It extracts pitch classes, identifies best-fit chord symbols, and performs a secondary functional analysis to calculate Roman Numerals and suggested diatonic next-steps.'
  },
  pocketengine: {
    id: 'pocketengine',
    name: 'Pocket Engine Pro',
    whatAmISeeing: 'A professional-grade timing diagnostic lab. The "Pocket" meter shows your millisecond offset against a high-precision audio clock. The new Polyrhythmic Grid (3:4, 5:4, 7:4) enables complex cross-rhythm training for advanced players.',
    instructions: '1. Start the engine using the morphing Play button.\\n2. Select a rhythmic density (e.g., 1/8 or 1/12 triplets).\\n3. Enable a Polyrhythm (e.g., 3:4) for dual-clock layering.\\n4. Enable "Visual Flash" for high-contrast optical feedback.\\n5. Play a percussive note in time with the pulse and analyze the offset.',
    practicalApplication: 'Train your internal "clock" with polyrhythms like 3 over 4. Use the Gap Click feature to practice maintaining tempo without external cues. Track your Rushing/Dragging tendency with pinpoint accuracy.',
    howItWorks: 'Uses a dual-clock lookahead Web Audio scheduler. The main clock handles base tempo while a parallel poly-clock triggers a secondary pulse. The engine calculates the delta between hardware-synced transient detection and scheduled beat time.'
  },
  frequencyflow: {
    id: 'frequencyflow',
    name: 'Frequency Flow',
    whatAmISeeing: 'A high-resolution Spectral Lab. You are seeing a Magnitude Spectrum (top-left) with Logarithmic scaling, a Peak Note Detector HUD (bottom-right), and a live precision control panel for tuning the analysis engine.',
    instructions: '1. Activate the stream.\n2. Use the "Precision Controls" to adjust FFT resolution and smoothing.\n3. Use "Freeze Signal" to capture a ghost curve for comparing different sounds or EQ settings.',
    practicalApplication: 'Surgical audio diagnostics. Identify "muddy" bass frequencies, pinpoint unwanted resonance with the Note HUD, and A/B compare signals using the ghost capture system.',
    howItWorks: 'This tool interfaces with the Web Audio API AnalyserNode with hardware-accelerated rendering. It features a logarithmic frequency mapper and a peak-threshold note detector for musical forensics.'
  },
  tracktracer: {
    id: 'tracktracer',
    name: 'TrackTracer',
    whatAmISeeing: 'A structural deconstruction of an audio subject. You are looking at a "Sonic Blueprint" that maps intros, verses, and choruses across a high-precision energy timeline with integrated audio playback.',
    instructions: '1. Drop an MP3 or choose a specimen from the Gallery.\n2. Review the detected BPM, Key, and Structural labels.\n3. Click the Blueprint wave to "Seek" and analyze specific timestamps in the subject.',
    practicalApplication: 'Quickly map the arrangement of a track for remixing, verify tempo/key of unknown samples, and perform forensic A/B testing using the provided Specimens Gallery.',
    howItWorks: 'TrackTracer uses an Offline Audio Context for high-speed analysis of global features (tempo/key) and a localized energy-density algorithm to identify arrangement boundaries and section changes.'
  },
};
