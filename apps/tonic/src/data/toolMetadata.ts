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
    whatAmISeeing: 'A real-time Harmonic Forensic Lab. You are seeing potential scale matches ranked by accuracy, an interactive 24-fret pattern map with CAGED isolation boxes, and a modal relationship engine showing Roman Numeral degrees.',
    instructions: '1. Play notes to build a profile. Click a suggestion to "Lock" the detective and filter extraneous tones.\n2. Toggle "CAGED Mode" and select a shape (C, A, G, E, D) to isolate specific patterns.\n3. Click "Play Scale" to listen to the sequence with synced Amber highlighting.\n4. Hover notes to flip between letter names and Roman Numeral degrees.',
    practicalApplication: 'Identify complex modes in real-time, bridge the gap between abstract theory and the guitar fretboard using CAGED patterns, and practice scales with high-contrast visual and audio cues.',
    howItWorks: 'ScaleSleuth Pro uses a weighted pitch class profile with a reactive noise gate. It maps matches onto a 24-fret matrix and uses a triangle-wave Synth Engine for visual-audio sequencing.'
  },
  chordcapture: {
    id: 'chordcapture',
    name: 'Session View',
    whatAmISeeing: 'Your central musical workspace. This is "Smart Context": a live audio monitor that intelligently connects to deep-dive analysis tools. Features a "True Freeze" engine, a Chord Ledger, and expandable drawers for "Chord Forge" (Editing) and "Scale Sleuth" (Theory).',
    instructions: '1. Play freely to see live chord detection.\n2. Click the **Pause (||)** button to "Freeze" the current moment—capturing audio, pitch, and chord context.\n3. Open the **Scale Sleuth** drawer to analyze the frozen scale context.\n4. Click **Forge** to edit the detected chord on a virtual fretboard.\n5. Maximize any drawer (↗) for a full-screen deep dive.\n\n**Optimal Guitar Settings:**\n- **Mic Gate:** 5-10%\n- **Clarity:** 30-45%\n- **Pro Mode:** ON',
    practicalApplication: 'The ultimate practice companion. seamless switching between "Jamming" (Live), "Analyzing" (Frozen/Sleuth), and "Composing" (Forge). Perfect for deconstructing complex harmonies without losing your flow.',
    howItWorks: 'Session View uses a "Smart Context" architecture. When you Pause, the entire harmonic state is snapshotted. This frozen context is then propagated to all sub-tools (Forge/Sleuth), allowing identical analysis across different visualizers.'
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
  harmonicorbit: {
    id: 'harmonicorbit',
    name: 'Harmonic Orbit',
    whatAmISeeing: 'An interactive Circle of Fifths "Holographic Theory Map" with 60 clickable chord labels. Three concentric rings: Outer (12 Major keys), Middle (36 Minor chords: ii, iii, vi for each key), Inner (12 Diminished vii° chords). The Key Signature badge shows sharps/flats count. Click any chord TEXT LABEL to explore its family.',
    instructions: '1. Click any chord LABEL (text) on the Orbit to select it.\n2. The Key Family panel shows all 7 diatonic chords with the key signature (♯/♭ count).\n3. Click ii, iii, or vi to see that specific chord selected while staying in the same key family.\n4. Toggle "Degree Family" to show IV/V indicators on neighbor keys.\n5. Each key includes a "Mentor Fact" explaining its character.',
    practicalApplication: 'Master functional harmony by exploring chord relationships visually. See how ii-V-I progressions connect, understand chord substitutions, and learn key signatures at a glance. Perfect for songwriters needing quick chord family references and theory students learning the Circle of Fifths.',
    howItWorks: 'The Orbit renders 60 SVG text labels (12 Major + 36 Minor + 12 Dim) positioned on concentric rings. Only text labels are clickable (paths are decorative). Selection stores the specific chord type (ii/iii/vi) for accurate display. The Key Family is calculated using Circle of Fifths neighbor positions (IV = CCW, V = CW).'
  },
  tonnetz: {
    id: 'tonnetz',
    name: 'Tonnetz Lab',
    whatAmISeeing: 'A hexagonal lattice where every node is a pitch class and every triangle is a triad. Nodes along the horizontal axis are separated by Perfect 5ths, the upper-right diagonal by Major 3rds, and the lower-right diagonal by minor 3rds. Upward-pointing triangles (▲) represent Major triads; downward triangles (▼) represent minor triads. The highlighted triangle is the currently selected chord.',
    instructions: '1. Click any node on the lattice to select that pitch as a triad root.\n2. The right panel shows the selected triad with interval labels (Root, 3rd, 5th).\n3. Use the P (Parallel), L (Leading-tone), and R (Relative) buttons to apply Neo-Riemannian transforms.\n4. Chain transforms (e.g., P → L → R) to explore "parsimonious voice leading" — smooth chord transitions.\n5. Change the center note in Settings to re-center the lattice.',
    practicalApplication: 'Discover how chords connect by moving just one note at a time. Use Neo-Riemannian transforms to find smooth voice-leading paths between distant chords. Essential for film scoring, jazz reharmonization, and understanding chromatic harmony beyond traditional key-based thinking.',
    howItWorks: 'The Tonnetz renders pitch class nodes on a triangular SVG grid. Moving right = +7 semitones (P5), upper-right = +4 semitones (M3), lower-right = +3 semitones (m3). Triangle detection identifies all adjacent 3-node groups as triads. Neo-Riemannian transforms (P, L, R) each move exactly one note by 1-2 semitones, re-selecting the resulting triad with animated transitions.'
  },
  chordforge: {
    id: 'chordforge',
    name: 'Chord Forge',
    whatAmISeeing: 'An interactive 6-string guitar fretboard spanning 15 frets. Tap any fret to place a finger, tap the nut (X/O) to mute or open strings. The detected chord name appears above, updating in real-time as you build shapes.',
    instructions: '1. Tap frets on any string to place fingers.\n2. Tap X at the nut to mute a string, tap O to set it open.\n3. Watch the chord name update automatically above.\n4. Press "Strum" to hear your chord played via synth.\n5. Press "Clear" to reset the fretboard.',
    practicalApplication: 'Experiment with voicings without picking up a guitar. Discover new chord shapes, test inversions, and learn how moving one note changes the chord quality. Perfect for songwriters and theory students.',
    howItWorks: 'Uses Tonal.js Chord.detect() to identify chords from selected pitch classes. Each fret tap calculates the note using semitone transposition from the open string. Audio playback uses SynthEngine with staggered note starts for a strum effect.'
  },
};
