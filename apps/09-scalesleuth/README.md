# ScaleSleuth

Deep scale analysis engine for identifying modes and melodic structures.

## 🎯 Purpose

ScaleSleuth is the musician's companion for understanding scales, modes, and melodic relationships. Play notes and watch as the app identifies what scale you're playing, shows it on a fretboard, and suggests related modes.

## ✨ Features

- **Scale Detection** - Identifies scales from played notes
- **Mode Recognition** - Detects Ionian, Dorian, Phrygian, Lydian, Mixolydian, Aeolian, Locrian
- **Interactive Fretboard** - Visual display of scale patterns
- **Note Highlighting** - See which notes belong to the detected scale
- **Scale Suggestions** - Recommends similar or related scales
- **Root Note Detection** - Identifies the tonal center
- **Scale Library** - Browse 100+ documented scales

## 🚀 Getting Started

### Installation

```bash
cd apps/09-scalesleuth
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

1. **Start audio** - Click "Start Audio" and allow microphone access
2. **Play a scale** - Sing or play notes on your instrument
3. **Watch the analysis**:
   - **Detected Scale**: Shows the most likely scale name
   - **Root Note**: Displays the tonal center
   - **Fretboard**: Highlights scale pattern
   - **Confidence**: How sure the algorithm is

## 🎼 Supported Scales

### Common Scales
- Major (Ionian)
- Natural Minor (Aeolian)
- Harmonic Minor
- Melodic Minor
- Major Pentatonic
- Minor Pentatonic
- Blues Scale

### Modal Scales
- Dorian
- Phrygian
- Lydian
- Mixolydian
- Locrian

### Exotic Scales
- Hungarian Minor
- Double Harmonic
- Whole Tone
- Diminished
- Chromatic

## 🎸 Fretboard Features

- **Standard Tuning**: E-A-D-G-B-E display
- **Active Notes**: Bright blue highlighting
- **Scale Notes**: Green highlighting
- **Interactive**: Click to hear note names
- **12-fret display**: Full octave visualization

## 🛠️ Tech Stack

- Vue 3 + TypeScript
- Vite
- Tailwind CSS
- `@spectralsuite/core` - Scale engine & Fretboard component
- Tonal.js - Music theory library

## 📝 Use Cases

- **Improvisation** - Know what scale you're in
- **Composition** - Explore modal possibilities
- **Guitar practice** - Learn scale patterns visually
- **Ear training** - Identify scales by ear
- **Music theory** - Understand modal relationships

## 🔗 Related Tools

- **ChordCapture** - For harmonic analysis
- **AuraTune** - For pitch detection
