# ChordCapture

Real-time harmonic recognition engine that captures and analyzes chord progressions as you play.

## 🎯 Purpose

ChordCapture helps musicians understand and document chord progressions by detecting and analyzing the notes you play in real-time. Perfect for transcription, learning songs by ear, or developing harmonic awareness.

## ✨ Features

- **Note sequence capture** - Records notes as you play them
- **Chord recognition** - Automatically identifies chords (major, minor, diminished, augmented, 7ths, etc.)
- **Multi-voice detection** - Captures polyphonic input (multiple notes simultaneously)
- **Chord history** - Tracks the progression of detected chords
- **Clear function** - Reset and start fresh anytime
- **Visual feedback** - Color-coded note display with clarity indicators

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
