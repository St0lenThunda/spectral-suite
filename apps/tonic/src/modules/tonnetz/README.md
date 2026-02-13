# Tonnetz Module

An **interactive Neo-Riemannian Tonnetz lattice** for exploring harmonic relationships through geometry.

## 🎯 What It Does

The Tonnetz ("tone network") maps pitch classes onto a triangular grid where:
- **Horizontal axis** = Perfect 5ths (C → G → D → ...)
- **Diagonal up-right** = Major 3rds (C → E → G# → ...)
- **Diagonal down-right** = minor 3rds (C → Eb → Gb → ...)

Every **triangle** formed by 3 nodes IS a triad:
- ▲ Upward triangles = **Major** triads
- ▼ Downward triangles = **minor** triads

## 🎹 Key Features

- **Interactive lattice** — click any node to build a triad
- **Neo-Riemannian transforms** — P (Parallel), L (Leading-tone), R (Relative)
- **Audio playback** — hear the selected triad with strum effect
- **Animated transitions** — smooth morphing between transforms
- **Recentering** — lattice re-centers on the selected note
- **Mini preview** — a compact version lives inside the Harmonic Orbit panel

## 🔧 Technical Implementation

- **Framework**: Vue 3 Composition API
- **Rendering**: Pure SVG with computed node positions
- **Shared Component**: `TonnetzLattice.vue` (used by both mini and full)
- **State**: provide/inject for cross-component selection state
- **Audio**: Tonal.js + SynthEngine for triad playback
- **Animations**: CSS transitions, stroke-dashoffset draw-on, keyframe pulses

---

*Part of the Spectral Suite by St0lenThunda*
