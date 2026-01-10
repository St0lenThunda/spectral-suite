# ScaleSleuth Pro Suite 🕵️‍♂️📈

Professional-grade harmonic forensic lab for identifying modes, scale degrees, and tonal centers.

## 🎯 Purpose

ScaleSleuth Pro is a clinical music theory tool designed to bridge the gap between performance and analysis. By tracking note weights and identifying modal relationships, it provides deep insight into the "home" of a melody, helping musicians understand *why* certain notes work and how they relate to parent keys.

## ✨ Pro Features

- **🎹 Weighted Tonic Detection** - Track note frequency (heat map) to mathematically identify the actual tonal center (e.g., C Phrygian vs Ab Major).
- **📐 Scale Degree HUD** - Toggle between note names and intervals (1, 2, b3, #4) to analyze scale function.
- **🔗 Modal Relationship Engine** - Instant identification of parent scales (e.g., "D Dorian is the 2nd mode of C Major").
- **🎸 Advanced Fretboard Map** - Visual mapping of detected notes vs. optimized scale patterns across 15 frets.
- **🎯 Dynamic Ranking** - Scales are ranked using a multi-pass heuristic that considers note set match, interval priority, and weighting.

## 📊 Competitive Edge

| Feature | ScaleSleuth Pro | Basic Detectors | Theory Handbooks |
| :--- | :---: | :---: | :---: |
| **Real-time Map** | **Yes (Fretboard)** | List Only | Static Image |
| **Scale Degrees** | **Yes (1/b3/#4)** | None | Complex Charts |
| **Modal Links** | **Yes (Parent Keys)** | None | Passive Text |
| **Weighting** | **Tonic Heat Map** | Equal Weight | Manual Only |
| **Engine** | **Tonal.js + Forensics** | Pattern Lookups | Memory |

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
