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
    name: 'AuraTune',
    whatAmISeeing: 'You are seeing a reactive particle field and live frequency distribution. The colors represent distinct pitch classes (C thru B), while the real-time pitch detector identifies the exact note name of the dominant signal.',
    instructions: '1. Ensure your microphone is active.\n2. Play an instrument or sing into the mic.\n3. Observe the note name readout and watch how the "aura" pulses to your performance.',
    practicalApplication: 'Identify the exact pitch you are singing or playing in real-time while using the visual aura as a high-end backdrop for live performance or studio mood-setting.',
    howItWorks: 'AuraTune combines a Fast Fourier Transform (FFT) for visualization with a sophisticated autocorrelation algorithm (YIN) for precise pitch detection, mapping the results to a high-performance particle engine.'
  },
  scalesleuth: {
    id: 'scalesleuth',
    name: 'ScaleSleuth',
    whatAmISeeing: 'A real-time list of potential musical scales. The engine matches the notes it hears against a database of thousands of world scales, highlighting the most likely candidates.',
    instructions: '1. Play a melody or a series of notes.\n2. ScaleSleuth will lock onto the tonal center.\n3. View the matching modes and suggested related scales.',
    practicalApplication: 'Identify the mode of a song you are listening to, or find exotic scales to spice up your own compositions when you feel stuck in a creative rut.',
    howItWorks: 'The analysis engine extracts "pitch class profiles"—essentially a signature of which notes are present. It then calculates the mathematical distance between your input and known scale structures.'
  },
  chordcapture: {
    id: 'chordcapture',
    name: 'ChordCapture',
    whatAmISeeing: 'A log of harmonic events. As you play chords, the "Capture" engine identifies the voicing and freezes the signature on the screen for review.',
    instructions: '1. Play a chord on your instrument.\n2. The detected chord name will appear in the main display.\n3. Click entries in the log to review past captures.',
    practicalApplication: 'Perfect for transcribing complex jazz harmonies or verifying that you are playing a specific voicing correctly during practice.',
    howItWorks: 'ChordCapture looks for harmonic intervals and stacks. It filters out noise and overtones to find the fundamental triads and extensions using musical set theory.'
  },
  pocketengine: {
    id: 'pocketengine',
    name: 'Pocket Engine',
    whatAmISeeing: 'A timing diagnostic dashboard. The central needle shows your deviation from the absolute "pocket" (the perfect timing of the internal clock).',
    instructions: '1. Start the internal clock.\n2. Tap your keyboard or play a percussive note in time with the pulse.\n3. Watch the graph for "Late" or "Early" trends.',
    practicalApplication: 'Use this for 10 minutes a day to calibrate your internal "clock" and fix rushing or dragging habits in your rhythm section playing.',
    howItWorks: 'It compares the micro-timestamp of your input event against the High-Resolution Time API of the browser, calculating the exact millisecond delta from the beat.'
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
