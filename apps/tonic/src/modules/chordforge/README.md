# Chord Forge Module

An **interactive guitar fretboard** for building chords by tapping notes.

## 🎯 What It Does

Chord Forge lets you visually construct chords on a virtual fretboard:
- Tap frets to place fingers
- Toggle mute (X) / open (O) at the nut
- Real-time chord detection via Tonal.js
- Strum button plays your chord

## 🎸 Features

| Feature | Description |
|---------|-------------|
| 6-string × 15-fret grid | Standard guitar range |
| Tap-to-select | Click any fret to place a finger |
| Mute/Open toggles | X/O at nut for each string |
| Chord detection | Uses `Chord.detect()` from Tonal.js |
| Audio playback | Staggered note timing for strum effect |
| Note labels | Pitch class shown inside selected dots |

## 📐 Geometry

- **ViewBox**: 800 × 200
- **Nut width**: 40px
- **String spacing**: 30px
- **Fret markers**: 3, 5, 7, 9, 12, 15

## 🔧 Technical Stack

- **Framework**: Vue 3 Composition API
- **Rendering**: Pure SVG
- **Chord Logic**: Tonal.js `Chord.detect()`
- **Audio**: SynthEngine (standalone context)
- **Styling**: Tailwind CSS

## 🚀 Usage

```vue
<template>
  <ChordForgeModule @back="handleBack" />
</template>

<script setup>
import ChordForgeModule from './modules/chordforge/ChordForgeModule.vue';
</script>
```

---

*Part of the Spectral Suite by St0lenThunda*
