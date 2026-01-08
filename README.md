# Spectral Suite

A modular music analysis suite providing real-time audio processing and visualization tools.

## 🎵 Overview

Spectral Suite is a comprehensive monorepo containing multiple specialized music analysis tools:

- **AuraTune** - Immersive pitch detection and visual performance tool
- **ScaleSleuth** - Deep scale analysis and mode identification
- **ChordCapture** - Real-time harmonic recognition
- **Pocket Engine** - Rhythm and timing diagnostics
- **Frequency Flow** - Engineering-grade spectral visualization
- **Track Tracer** - Forensic audio analysis (BPM, key, structure)
- **Director** - Unified dashboard for all tools

## 🏗️ Monorepo Structure

```
spectral-suite/
├── apps/                 # Individual applications
│   ├── 01-auratune/
│   ├── 02-chordcapture/
│   ├── 03-frequencyflow/
│   ├── 04-tracktracer/
│   ├── 07-pocket-engine/
│   ├── 09-scalesleuth/
│   └── director/        # Main dashboard app
├── packages/
│   └── core/            # Shared audio processing library
└── package.json         # Root workspace configuration
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm 8+

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/spectral-suite.git
cd spectral-suite

# Install dependencies for all packages
npm install
```

### Development

Run individual apps:

```bash
# Run the director dashboard
cd apps/director
npm run dev

# Run a standalone tool
cd apps/01-auratune
npm run dev
```

Build for production:

```bash
# Build a specific app
cd apps/director
npm run build

# Preview production build
npm run preview
```

## 📦 Packages

### @spectralsuite/core

Shared audio processing library containing:
- Audio engine with Web Audio API integration
- Pitch detection algorithms
- Chord recognition
- Scale analysis
- Reusable UI components (Fretboard, InfoPanel)

## 🛠️ Tech Stack

- **Framework**: Vue 3 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Audio**: Web Audio API, Meyda, Tonal.js
- **Monorepo**: npm workspaces

## 📝 License

MIT

## 🤝 Contributing

Contributions welcome! This is a modular, plug-and-play architecture - add new tools by creating folders in `apps/`.
