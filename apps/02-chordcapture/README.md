# ChordCapture Pro Suite 🎹📜✨

Professional-grade harmonic forensic diarist for transcribing and composing complex progressions.

## 🎯 Purpose

ChordCapture Pro is a clinical tool for musicians and composers to document harmonic ideas in real-time. By bridging chord identification with Roman Numeral analysis and a permanent ledger, it allows you to capture the "magic" of a performance and understand its functional structure instantly.

## ✨ Pro Features

- **🎹 Progression Ledger (The Harmonic Diary)** - Permanently log detected chords into a scrolling sequence. Perfect for capturing song structures as you play them.
- **📐 Functional Roman Numerals** - See chords as I, IV, V, vii° etc., relative to your chosen key center for deep theoretical insight.
- **🎸 24-Fret Pro Board** - Real-time guitar fretboard diagrams for every detected chord across the entire double-octave range.
- **🧠 Harmonic Next-Step Suggestions** - Intelligent suggestions for the next chord based on functional harmony and common cadences (ii-V-I).
- **🎯 Dynamic Sensitivity Gate** - High-precision detection with a reactive noise gate that eliminates ambient interference during recording.

## 📊 Competitive Edge

| Feature | ChordCapture Pro | Basic Detectors |
| :--- | :---: | :---: |
| **Direct Analysis** | **Forensic Tonal.js** | Simple Match |
| **Progression Log** | **Yes (Ledger)** | List Only |
| **Functional ID** | **Yes (Romans)** | None |
| **Voicing Help** | **24-Fret Map** | None |
| **Noise Gate** | **Dynamic Squelch** | Basic |

## 🚀 Getting Started

### Installation

```bash
cd apps/02-chordcapture
npm install
```

### Development

```bash
npm run dev
```

Visit `http://localhost:5173` to use the app.

### Build

```bash
npm run build
npm run preview
```

## 🎵 How to Use

1. **Start the audio engine** - Click "Start Audio" and allow microphone access
2. **Play notes** - Sing or play notes on your instrument
3. **Watch the capture**:
   - **Captured Notes**: Shows all detected notes
   - **Detected Chords**: Displays recognized chord names
   - **Clarity**: Indicates detection confidence
4. **Clear when needed** - Use the "Clear Notes" button to reset

## 🎼 Chord Recognition

ChordCapture recognizes a wide variety of chords:
- **Triads**: Major, Minor, Diminished, Augmented
- **Seventh Chords**: Major 7, Dominant 7, Minor 7, Half-Diminished, Diminished 7
- **Extended Chords**: 9ths, 11ths, 13ths
- **Sus Chords**: Sus2, Sus4

## 🛠️ Tech Stack

- Vue 3 + TypeScript
- Vite
- Tailwind CSS
- `@spectralsuite/core` - Chord recognition engine
- Tonal.js - Music theory library

## 📝 Use Cases

- **Song transcription** - Capture chord progressions from recordings
- **Practice tool** - Learn songs by ear with visual confirmation
- **Composition** - Experiment with chord progressions
- **Music education** - Teach harmonic analysis

## 🔗 Related Tools

- **AuraTune** - For pitch-perfect tuning
- **ScaleSleuth** - For scale and mode identification
