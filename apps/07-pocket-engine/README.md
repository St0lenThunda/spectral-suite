# The Pocket Engine: Rhythm & Timing Analyst

The Pocket Engine is a "Groove Diagnostic" tool that helps musicians master their internal clock and "time-feel."

## 🚀 Concept
Most apps tell you *if* you're on the beat. The Pocket Engine tells you *where* you are in the beat. Do you rush? Do you drag? Is your "swing" consistent? 

## ✨ Core Features
- **High-Precision Metronome**: A rock-solid timekeeper using the Web Audio high-resolution clock.
- **Transient Timing Report**: Compares your audio "peaks" (claps, strums, hits) against the metronome click in milliseconds.
- **The "Pocket" Visualizer**: A moving target UI—land your hits in the center to stay "in the pocket."
- **Drift Dashboard**: Long-term tracking of your rhythmic tendencies (e.g., "You tend to rush when the tempo increases").

## 🛠 Technical Stack
- **Framework**: Vue 3
- **Styling**: Tailwind CSS (Transitions & Animations for rhythmic feedback)
- **Audio Engine**: [Meyda](https://meyda.js.org/) for audio feature extraction (RMS/ZCR).
- **Timing**: Web Audio API `currentTime` (avoiding JS `setTimeout`).

## 🧠 Learning Objectives
- Understanding the **Sub-millisecond Precision** required for professional audio.
- Working with **Transient Detection** (Digital Signal Processing).
- Implementing **Rhythmic Logic** and "Swing" algorithms.
- Designing **Kinetic UI** that reacts to percussion and transients.

## 🗺 Implementation Roadmap
1. **Phase 1**: Build the high-precision "Lookahead" metronome.
2. **Phase 3**: Implement transient detection with Meyda.
3. **Phase 3**: Create the "Pocket" UI comparison logic.
4. **Phase 4**: Add session logging and "Drift" reports.
