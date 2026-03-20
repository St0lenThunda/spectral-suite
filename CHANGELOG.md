# Changelog

All notable changes to this project will be documented in this file.

## [1.2.0] - 2026-03-20

### 🧱 Stability & Architecture (Migrated from TODO)
- **Global Audio Refactor**: Removed deprecated `useGlobalEngine` and standardized on `isInitialized` across all modules.
- **Vue 3 Routing Fix**: Resolved `null.component` crash by removing `<KeepAlive>` and fixing `defineAsyncComponent` lifecycle conflicts.
- **Optimized Module Loading**: Restored `LoadingSpinner` with proper 200ms delay for async chunks.
- **Render Deployment Support**: Resolved TypeScript strictness (SAB vs ArrayBuffer) and Vite monorepo type conflicts.
- **Lock-Free DSP Communication**: Migrated `FrequencyFlow` and `TransientDetector` to SharedArrayBuffer logic for stall-free UI.
- **Input Gain**: Digital gain boost for quiet microphones (Implemented in `useRhythmStore` / `EngineSettings`).

### 🛠️ Fixes
- resolve TypeScript build errors for Render deployment (HarmonicDNA, TonnetzLattice, FrequencyFlow)
- fix module loading stability and streamline audio initialization
- remove unused variable declarations causing TS errors
- debounce suspend and no-input detection to stabilize UI
- restore missing closing tags and script setup sections in Vue components

### 🚀 Features
- **Bend Trainer**: Implement pitch staircase UI and core physics engine
- **Resonance Lab**: New module with standardized tool manual system
- **Performance Engine**: Implement elite performance architecture with SharedArrayBuffers
- **Tool Manuals**: Standardized IntelligenceButton and global overlay system

---

## [1.1.0] - 2026-02-14

### 🚀 Features
- **3D Spectrogram**: New visualizer with adjustable perspective and hue
- **Tonnetz Lab**: AI-driven chord suggestions and similar song matching using IndexedDB vector database
- **Interactive Tonnetz**: Clickable triangle hit areas for direct triad selection
- **Hybrid Tone System**: Integrated real instrument samples for high-quality audio

### 🛠️ Fixes
- resolve typescript errors blocking deployment
- improve tool information display with markdown and images

---

## [1.0.0] - 2026-01-19

### 🚀 Features
- **Melody Mirror**: Interactive ear training game
- **Chord Theory Academy**: Comprehensive lessons with markdown rendering
- **Harmonic Orbit**: 60-segment Circle of Fifths theory tool
- **ChordForge**: Wavetable synthesis implementation with preset system
- **Session View**: Auto-capture and advanced context tools
- **Global Settings**: Centralized audio sensitivity, clarity, and platform persistence
- **Audio Health**: Real-time diagnostic monitoring and toast notification system

### 🛠️ Fixes
- bypass YouTube bot detection in Forensic Proxy
- implement PitchNodePool singleton for performance
- resolve HMR race conditions in AudioContext state transitions
- implement strict CORS and proxy evasions for Track Tracer

### 🧱 Architecture
- **Vite 6**: Upgraded sub-applications to Vite 6
- **Pinia**: Centralized state management for platform and rhythm
- **Educational Mode**: Strict JSDoc enforcement and "Physics/Math" explanations in code

---

## [0.1.0] - 2026-01-11

### 🚀 Inception
- Initial monorepo structure (tonic, core, docs, forensic-proxy)
- Core pitch detection and FFT analysis engines
- Track Tracer and AuraTune initial implementations
- Forensic Proxy Python backend for audio metadata retrieval
