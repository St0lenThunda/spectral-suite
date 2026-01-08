# Frequency Flow

Engineering-grade spectral analysis and visualization suite for deep audio exploration.

## 🎯 Purpose

Frequency Flow provides professional-level spectral analysis tools for engineers, producers, and audio enthusiasts. Visualize the physics of sound with multiple real-time analyzers running simultaneously.

## ✨ Features

- **Oscilloscope** - Time-domain waveform visualization
- **Spectrogram** - Frequency-over-time waterfall display
- **Harmonograph** - Lissajous curve pattern visualization
- **Real-time FFT** - Fast Fourier Transform analysis
- **Multi-view dashboard** - See all visualizers at once
- **High-resolution display** - Smooth 60fps rendering

## 🚀 Getting Started

### Installation

```bash
cd apps/03-frequencyflow
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

1. **Initialize audio** - Click "Start Audio" to begin capturing input
2. **Play audio** - Any sound will be visualized in real-time
3. **Observe the displays**:
   - **Oscilloscope**: See the raw waveform shape
   - **Spectrogram**: Track frequency evolution over time
   - **Harmonograph**: Visualize phase relationships and harmonics

## 📊 Visualizers Explained

### Oscilloscope
Shows the amplitude of the audio signal over time. Useful for:
- Waveform analysis
- Detecting clipping
- Identifying wave shapes (sine, square, sawtooth)

### Spectrogram
Displays frequency content over time in a waterfall view. Useful for:
- Finding resonant frequencies
- Analyzing harmonic content
- Identifying overtones and partials

### Harmonograph
Creates beautiful Lissajous patterns based on phase relationships. Useful for:
- Visualizing stereo correlation
- Artistic performance visuals
- Understanding wave interference

## 🛠️ Tech Stack

- Vue 3 + TypeScript
- Vite
- Canvas API for rendering
- `@spectralsuite/core` - Audio engine
- Meyda - Feature extraction
- Web Audio API - Analyser nodes

## 📝 Use Cases

- **Audio engineering** - Analyze mix frequency balance
- **Sound design** - Explore synthesizer output characteristics
- **Music production** - Identify problem frequencies
- **Education** - Teach acoustics and wave physics
- **Performance visuals** - Live reactive art displays

## 🔗 Related Tools

- **Track Tracer** - For forensic audio analysis
- **Pocket Engine** - For rhythm and timing analysis
