# Harmonic Orbit Module

An **interactive Circle of Fifths visualization** for exploring music theory relationships.

## 🎯 What It Does

The Harmonic Orbit is a **60-segment holographic theory map** that visualizes the relationships between all 12 major keys and their diatonic chord families.

### Three Concentric Rings:

| Ring | Segments | Content |
|------|----------|---------|
| **Outer** (Major) | 12 | All 12 Major keys (C, G, D, A, E, B, Gb, Db, Ab, Eb, Bb, F) |
| **Middle** (Minor) | 36 | Three minor chords per key: ii, iii, vi |
| **Inner** (Dim) | 12 | The vii° chord for each key |

## 🎹 Key Features

- **Text-only clicking** - Only chord labels are clickable (paths are decorative)
- **Individual chord selection** - Click ii, iii, or vi separately
- **Key Signature Badge** - Shows ♯/♭ count (e.g., "2♯ Sharps")
- **Key Family Panel** - Shows all 7 diatonic chords
- **Degree Indicators** - IV/V appear on neighbor keys when enabled
- **Audio Playback** - Hear the triad for any selected chord
- **Mentor Facts** - Educational tips for each key

## 📐 Geometry

| Element | Radius | Details |
|---------|--------|---------|
| Major Ring | 260-340px | 12 × 30° segments |
| Minor Ring | 165-260px | 36 × 10° segments |
| Dim Ring | 90-165px | 12 × 30° segments |
| Center | 0-85px | Decorative glow |

## 🎓 Educational Features

### Key Signatures
Each key displays its signature count:
- C = ♮ Natural (0)
- G = 1♯, D = 2♯, A = 3♯, E = 4♯, B = 5♯
- F = 1♭, Bb = 2♭, Eb = 3♭, Ab = 4♭, Db = 5♭, Gb = 6♭

### Mentor Facts
Each key has a unique fact explaining its character and common uses.

### Degree Family System
- **I** = Tonic (Home)
- **ii** = Supertonic (Minor)
- **iii** = Mediant (Minor)
- **IV** = Subdominant - displayed on CCW neighbor
- **V** = Dominant - displayed on CW neighbor
- **vi** = Relative Minor
- **vii°** = Leading Tone (Diminished)

## 🎨 Color Coding

| Chord Type | Color |
|------------|-------|
| I (Tonic) | Indigo |
| ii | Emerald |
| iii | Orange |
| IV | Cyan |
| V | Blue |
| vi | Rose |
| vii° | Fuchsia |

## 🔧 Technical Implementation

- **Framework**: Vue 3 Composition API
- **Rendering**: Pure SVG with computed paths
- **Selection State**: Tracks specific type (major/ii/iii/vi/dim)
- **Audio**: Tonal.js for chord calculations
- **Styling**: Tailwind CSS with dynamic colors
- **Click Strategy**: `pointer-events-none` on paths, clickable text only

## 🚀 Usage

```vue
<template>
  <HarmonicOrbitModule @back="handleBack" />
</template>

<script setup>
import HarmonicOrbitModule from './modules/harmonicorbit/HarmonicOrbitModule.vue';
</script>
```

---

*Part of the Spectral Suite by St0lenThunda*
