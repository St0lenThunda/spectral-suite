# Track Tracer

Forensic audio analysis tool for extracting BPM, key, and structural DNA from audio files.

## 🎯 Purpose

Track Tracer is designed for DJs, producers, and music analysts who need to extract detailed information from audio files. Upload a track and get comprehensive analysis including tempo, key, time signature, and structural breakdowns.

## ✨ Features

- **BPM Detection** - Accurate tempo analysis using beat tracking algorithms
- **Key Detection** - Identifies the musical key and scale
- **Time Signature Analysis** - Detects meter (4/4, 3/4, 6/8, etc.)
- **Structure Detection** - Identifies intro, verse, chorus, bridge, outro sections
- **Waveform Display** - Visual representation of the track
- **File Upload** - Supports MP3, WAV, FLAC, and other common formats
- **Export Results** - Save analysis data as JSON

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
