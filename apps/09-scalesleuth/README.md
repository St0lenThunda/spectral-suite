# ScaleSleuth Pro Suite 🕵️‍♂️📈

Professional-grade harmonic forensic lab for identifying modes, scale degrees, and tonal centers.

## 🎯 Purpose

ScaleSleuth Pro is a clinical music theory tool designed to bridge the gap between performance and analysis. By tracking note weights and identifying modal relationships, it provides deep insight into the "home" of a melody, helping musicians understand *why* certain notes work and how they relate to parent keys.

## ✨ Pro Features

- **🎹 Weighted Tonic Detection** - Track note frequency (heat map) to mathematically identify the actual tonal center.
- **🔒 Scale Lock-in** - Clicking a suggested scale "freezes" the detective, filters extraneous notes, and focuses the UI on the selection.
- **📐 Scale Degree HUD** - 3D flipping note bubbles that show Roman Numeral degrees (I, bII, III, etc.) on hover.
- **🎸 CAGED Position Map** - Visualize standard C-A-G-E-D guitar boxes across the entire fretboard.
- **🔊 Scale Playback** - Listen to the scale using a high-fidelity triangle-wave synth with synced visual highlighting.
- **🎯 24-Fret Pro Board** - Pixel-perfect geometry with second-octave markers and open-string indicators.

## 📊 Competitive Edge

| Feature | ScaleSleuth Pro | Basic Detectors |
| :--- | :---: | :---: |
| **Real-time Map** | **Yes (24-Fret)** | List Only |
| **Scale Degrees** | **Yes (Roman Numerals)** | None |
| **CAGED Boxes** | **Yes (C-A-G-E-D)** | None |
| **Playback** | **Yes (Synced Synth)** | None |
| **Noise Gate** | **Dynamic Squelch** | Basic Threshold |

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
- **Active Notes**: Sky blue glow highlighting
- **Scale Notes**: Emerald green highlighting
- **Playback Highlighting**: High-contrast Amber pulse
- **24-fret display**: Full double-octave visualization with pro markers
- **CAGED Overlay**: Interactive fret range masking

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
