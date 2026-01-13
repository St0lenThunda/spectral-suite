# @spectralsuite/core

Shared audio processing library for the Spectral Suite monorepo.

## 🎯 Purpose

The core package provides shared audio processing functionality, reusable UI components, and music theory utilities used by all Spectral Suite tools. It eliminates code duplication and ensures consistent behavior across the entire suite.

## 📦 What's Included

### Audio Engine (`/audio`)
- **AudioEngine** - Web Audio API wrapper with microphone input
- **SynthEngine** - Triangle-wave synthesizer for tone generation and sequencing
- **useAudioEngine** - Vue composable for audio initialization with `activate()`/`deactivate()` lifecycle
- **usePitch** - Real-time pitch detection composable (uses PitchNodePool singleton)
- **PitchNodePool** - Singleton manager for pitch worklet nodes with reference counting

### Diagnostics (`/composables`)
- **useInputDiagnostics** - Real-time audio input health monitoring
- **useGlobalEngine** - Centralized engine state aggregation (plug-and-play pattern)

### Configuration (`/config`)
- **sensitivityThreshold** - Global microphone gate setting
- **clarityThreshold** - Pitch detection confidence threshold
- **isRawAudioMode** - Pro Audio Mode toggle (disables AGC/noise suppression)

### Music Theory (`/theory`)
- **ChordEngine** - Chord recognition and analysis
- **ScaleEngine** - Scale detection and pattern matching
- **useChordCapture** - Composable for chord recognition
- **useScaleSleuth** - Composable for scale analysis

### UI Components (`/ui`)
- **Fretboard.vue** - Professional 24-fret guitar display with CAGED and playback support
- **MorphContainer.vue** - Premium shared container for smooth UI state transitions
- **InfoPanel.vue** - Slideout documentation panel
- **PlayButton.vue** - Animated play/pause button

## 🚀 Usage

### In Your App

```typescript
import { useAudioEngine, usePitch, Fretboard } from '@spectralsuite/core'
```

### Audio Engine Example

```vue
<script setup>
import { useAudioEngine } from '@spectralsuite/core'

const { init, isInitialized, error, inputGain, setGain } = useAudioEngine()

// Initialize with user gesture
const handleStart = async () => {
  await init()
}
</script>
```

### Pitch Detection Example

```vue
<script setup>
import { usePitch, useAudioEngine } from '@spectralsuite/core'

const { init } = useAudioEngine()
const { pitch, clarity, currentNote, cents } = usePitch()
</script>

<template>
  <div>
    <button @click="init">Start</button>
    <div>Note: {{ currentNote }}</div>
    <div>Frequency: {{ pitch }} Hz</div>
    <div>Cents: {{ cents }}</div>
  </div>
</template>
```

### Chord Recognition Example

```vue
<script setup>
import { useChordCapture } from '@spectralsuite/core'

const { 
  pitch, 
  capturedNotes, 
  detectedChords, 
  clearNotes 
} = useChordCapture()
</script>

<template>
  <div>
    <div>Notes: {{ capturedNotes }}</div>
    <div>Chords: {{ detectedChords }}</div>
    <button @click="clearNotes">Clear</button>
  </div>
</template>
```

### Fretboard Component Example

```vue
<script setup>
import { Fretboard } from '@spectralsuite/core'
import { ref } from 'vue'

const activeNotes = ref(['E', 'G', 'B'])
const scaleNotes = ref(['C', 'D', 'E', 'F', 'G', 'A', 'B'])
</script>

<template>
  <Fretboard 
    :activeNotes="activeNotes"
    :highlightNotes="scaleNotes"
    :numFrets="24"
    :playbackNote="'C'"
  />
</template>
```

## 🏗️ Architecture

### Audio Pipeline

```
Microphone Input
      ↓
 AudioEngine (Web Audio API)
      ↓
  AnalyserNode
      ↓
FFT Analysis (frequency data)
      ↓
Pitch Detection / Chord Recognition / Scale Analysis
      ↓
Vue Composables (reactive state)
      ↓
UI Components
```

### Reactive Design

All composables use Vue 3's Composition API with reactive refs:
- Real-time updates without manual subscriptions
- Automatic cleanup on component unmount
- TypeScript support throughout

## 🛠️ Tech Stack

- **Vue 3** - Composition API & reactive system
- **TypeScript** - Type safety
- **Web Audio API** - Low-level audio processing
- **Meyda** - Feature extraction library
- **Tonal.js** - Music theory utilities

## 📝 API Reference

### useAudioEngine()

```typescript
interface AudioEngine {
  init: () => Promise<void>
  isInitialized: Ref<boolean>
  error: Ref<string | null>
  inputGain: Ref<number>
  setGain: (value: number) => void
  getAnalyser: () => AnalyserNode | null
}
```

### usePitch()

```typescript
interface PitchDetection {
  pitch: Ref<number>        // Frequency in Hz
  clarity: Ref<number>      // Detection confidence (0-1)
  currentNote: Ref<string>  // Note name (e.g., "A", "C#")
  cents: Ref<number>        // Deviation from perfect pitch
}
```

### useChordCapture()

```typescript
interface ChordCapture {
  pitch: Ref<number>
  clarity: Ref<number>
  currentNote: Ref<string>
  capturedNotes: Ref<string[]>
  detectedChords: Ref<string[]>
  clearNotes: () => void
}
```

### useScaleSleuth()

```typescript
interface ScaleSleuth {
  pitch: Ref<number>
  clarity: Ref<number>
  currentNote: Ref<string>
  detectedNotes: Ref<string[]>
  matchingScales: Ref<ScaleMatch[]>
  clearNotes: () => void
}
```

### useInputDiagnostics()

Real-time audio health monitoring with quick-fix suggestions.

```typescript
interface InputDiagnostics {
  activeIssues: Ref<DiagnosticIssue[]>  // Current problems
  isContextRunning: Ref<boolean>         // AudioContext state
  isMicGranted: Ref<boolean | null>      // Permission status
  volume: Ref<number>                    // Current input level
  applyQuickFix: (fix: string) => void   // Execute fix action
}
```

### Audio Lifecycle

Modules should call `activate()`/`deactivate()` to manage the AudioContext:

```typescript
import { useAudioEngine } from '@spectralsuite/core'

const { activate, deactivate } = useAudioEngine()

onMounted(() => activate())
onUnmounted(() => deactivate())
```

## 🔧 Development

### Building the Package

```bash
cd packages/core
npm run build
```

### Type Checking

```bash
npm run type-check
```

### Used By

All Spectral Suite apps depend on `@spectralsuite/core`:
- AuraTune
- ChordCapture
- FrequencyFlow
- TrackTracer
- Pocket Engine
- ScaleSleuth
- Director

## 📄 License

MIT - Part of the Spectral Suite monorepo
