# FrequencyFlow Pro Suite 🌊

Engineering-grade spectral analysis and visualization suite for deep audio exploration.

## 🎯 Purpose

FrequencyFlow Pro provides professional-level spectral analysis tools for engineers, producers, and audio enthusiasts. Visualize the physics of sound with multiple real-time analyzers running simultaneously, now enhanced with intelligent EQ suggestions and export capabilities.

## ✨ Pro Features

- **📊 Intelligent EQ Suggestions** - Real-time analysis detects muddy low-mids, harsh presence, or lacking air, offering specific cut/boost recommendations.
- **🧗 Peak Hold & Decay** - Trace maximum signal levels over time for precise dynamic analysis.
- **🎵 Dominant Frequency Tracking** - Instantly identifies the loudest frequency component and its corresponding musical note.
- **📉 Multi-View Dashboard** - Simultaneous Oscilloscope, Spectrogram, and Harmonograph displays.
- **🎨 Instrument Range Overlay** - Visualize spectral space occupied by specific instruments (Kick, Snare, Vocals, etc.).
- **💾 Export & Capture** - Save high-res spectral snapshots as PNG or raw analysis data as JSON.

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
