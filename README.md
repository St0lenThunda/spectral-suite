# 📌 Project Status: Pinned (Jan 15, 2026)

**Last Active Workflow:** Session View Transformation (ChordCapture)

The project is currently in a stable state with a major refactor of the **ChordCapture** module into a unified **"Session View"**. This view integrates the functionality of *Chord Forge* and *Scale Sleuth* into contextual drawers, creating a seamless "Smart Context" experience.

### ✅ Recent Accomplishments
1.  **Rebranding to Session View**:
    -   `ChordCaptureModule` is now the primary interface for harmonic analysis.
    -   Standalone `ChordForge` and `ScaleSleuth` routes are hidden/deprecated in favor of the integrated panels.

2.  **Smart Context Drawers**:
    -   **ContextDrawer Component**: A reusable, responsive drawer (Side Panel on Desktop, Bottom Sheet on Mobile).
    -   **Contextual Integration**:
        -   **Chord Forge**: Accessible via the "Forge" button or by clicking a chord in the ledger. Used for *Editing* voicings.
        -   **Scale Sleuth**: Accessible via the "Analysis" footer. Used for *Harmonic Context*.

3.  **Maximize & Advanced Features**:
    -   Drawers can be maximized to full screen.
    -   **Restored Functionality**:
        -   **Scale Sleuth**: CAGED System visualization (Heat Map colors) and Interval/Degree toggles are fully functional in maximized mode.
        -   **Chord Forge**: Alternate Voicing Algorithm allows generating playable guitar voicings (Rose/Cyan/Emerald themes) in maximized mode.

4.  **Accessible Auto-Capture**:
    -   Implemented a "Magic Hold" feature for users unable to strum and click simultaneously.
    -   Holding a stable chord for **2 seconds** automatically triggers "Freeze/Pause", capturing the chord to the ledger.
    -   Visual progress indicator added to the Pause button.

### 🚧 Next Steps / Known Issues
-   **Mobile Layout**: While `ContextDrawer` handles mobile well, the main "Session View" grid needs further refinement for small screens (overflow handling).
-   **Routing Cleanup**: The router still contains standalone routes for Forge/Sleuth that could be removed or strictly redirected.
-   **Academy Integration**: Spectral Academy was reordered but deep integration with the new "Session View" (e.g., launching a lesson from a detected chord) is a future goal.

---

# Spectral Suite

A modular music analysis suite providing real-time audio processing and visualization tools.

## 🎵 Overview

Spectral Suite is a comprehensive monorepo containing multiple specialized music analysis tools:

- **AuraTune Pro** - Immersive pitch detection and visual performance tool
- **Session View (formerly ChordCapture)** - Real-time harmonic recognition with integrated Editing (Forge) and Analysis (Sleuth)
- **Pocket Engine Pro** - Rhythm and timing diagnostics with polyrhythmic grids
- **Frequency Flow** - Engineering-grade spectral visualization
- **Track Tracer** - Forensic audio analysis (BPM, key, structure)
- **Spectral Academy** - Interactive lessons to learn music theory by doing
- **Tonic** - Unified dashboard for all tools

## 🏗️ Monorepo Structure

```
spectral-suite/
├── apps/                 # Individual applications
│   ├── 01-auratune/
│   ├── 02-chordcapture/ # (Session View)
│   ├── 03-frequencyflow/
│   ├── 04-tracktracer/
│   ├── 07-pocket-engine/
│   ├── 09-scalesleuth/  # (Logic only, UI moved to Panels)
│   ├── tonic/           # Main dashboard app (Unified entry point)
│   └── director/        # Legacy dashboard
├── packages/
│   └── core/            # Shared audio processing library
└── package.json         # Root workspace configuration
```

## ✨ Recent Features

### Toast Notification System
- Non-intrusive fixed-position notifications
- Automatic dismiss with configurable duration
- Quick-fix action buttons for common issues

### Audio Diagnostics
- Real-time input health monitoring
- Detects: suspended context, mic denied, no input, gate blocking
- Pro Audio Mode toggle (disables browser audio processing)

### Performance Optimizations
- **PitchNodePool** - Singleton pitch worklet with reference counting
- **Debounced lifecycle** - Prevents HMR freezes during development
- **Lightweight volume polling** - Direct AnalyserNode reads instead of duplicate worklets

### 🧪 Test Infrastructure (New!)
- **E2E Testing Suite** - Comprehensive Playwright tests for critical user flows ("Golden Paths").
- **Robust Mocking** - "Clean Injection" audio mocking prevents spectral smearing and ensures deterministic tests.
- **State Snapshotting** - "Freeze" workflow verification using DOM state snapshots to validate complex logic without flakiness.

### Core Audio Engine 2.0
- **Slash Chord Support** - True bass detection allows identifying inversions (e.g., `C/E`) and complex voicings.
- **Polyphonic Buffering** - `useChordCapture` now intelligently buffers inputs to support strummed chords vs. arpeggios.
- **Octave-Aware Analysis** - `usePolyPitch` preserves octave data (`C3` vs `C4`) for accurate voicing reconstruction.

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

Run the unified Tonic dashboard:

```bash
# Run Tonic
npm run dev:tonic
```

## 📦 Packages

### @spectralsuite/core

Shared audio processing library containing:
- Audio engine with Web Audio API integration
- `SynthEngine` for tone generation and audio sequencing
- Pitch detection algorithms with reactive noise gate
- Chord recognition and functional analysis
- Scale analysis with modal identification
- Reusable UI components (24-fret Fretboard, InfoPanel, MorphContainer)

## 🛠️ Tech Stack

- **Framework**: Vue 3 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Audio**: Web Audio API, Meyda, Tonal.js
- **Monorepo**: npm workspaces

## 📝 License

MIT
