# TrackTracer Pro 🧪

Forensic audio analysis lab for extracting structural DNA, key, and tempo from any audio source.

## 🎯 Purpose

TrackTracer Pro is the ultimate forensic tool for DJs and producers. Beyond simple file analysis, it now offers real-time listening capabilities to analyze audio from your environment, making it perfect for identifying tracks on the fly.

## ✨ Pro Features

- **🎤 Listen Mode** - Real-time analysis using microphone input with audio visualization
- **📊 12-Bar Visualizer** - Frequency-reactive bars and level metering
- **🎼 Camelot Wheel** - Harmonic mixing compatibility guide
- **⚡ Energy Profiling** - Classification of track energy (Chill, High Energy, etc.)
- **🧠 AI Observations** - Dynamic expert analysis of track characteristics
- **⏱️ BPM & Key Detection** - High-precision tempo and harmonic analysis
- **📂 Multi-Format Support** - Upload MP3, WAV, FLAC, or use verified specimens
- **💾 Export Results** - Save analysis data as JSON

## 🚀 Getting Started

### Installation

```bash
cd apps/04-tracktracer
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

1. **Upload a track** - Drag & drop or click to select an audio file
2. **Wait for analysis** - Processing time varies by track length (usually 5-30 seconds)
3. **Review results**:
   - **BPM**: Beats per minute (tempo)
   - **Key**: Musical key (e.g., A minor, D major)
   - **Time Signature**: Meter of the track
   - **Structure**: Song sections with timestamps
4. **Export data** - Download analysis results for later use

## 🔍 Analysis Algorithms

### BPM Detection
Uses onset detection and autocorrelation to find the most likely tempo. Handles:
- Variable tempo tracks
- Complex time signatures
- Half-time and double-time variations

### Key Detection
Analyzes chromatic content using the Krumhansl-Schmuckler key-finding algorithm:
- 24 major and minor keys
- Accounts for modulation
- Provides confidence scores

### Structure Analysis
Identifies song sections based on:
- Spectral similarity
- Onset density changes
- Energy fluctuations

## 🛠️ Tech Stack

- Vue 3 + TypeScript
- Vite
- `@spectralsuite/core` - Audio processing
- Meyda - Feature extraction
- Custom BPM & key detection algorithms
- Web Audio API

## 📝 Use Cases

- **DJ preparation** - Analyze tracks for mixing
- **Music cataloging** - Build searchable databases
- **Remix production** - Find tempo and key for mashups
- **Musicology research** - Study structural patterns
- **Playlist curation** - Group tracks by compatible keys

## 🔗 Related Tools

- **Frequency Flow** - For visual spectral analysis
- **Pocket Engine** - For rhythm practice and click tracks
