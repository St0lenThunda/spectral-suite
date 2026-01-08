# FrequencyFlow: Engineer’s Swiss Army Knife

FrequencyFlow is a visualization-heavy diagnostic tool for musicians and audio engineers who want to "see" their sound.

## 🚀 Concept
Focus on the physics of sound. This app provides multiple high-speed visualizers to analyze the waveform, frequency spectrum, and harmonic content of any input source.

## ✨ Core Features
- **Virtual Oscilloscope**: View the raw electromagnetic waveform of your sound in real-time.
- **Spectrogram (Waterfall)**: A rolling 2D map showing frequency intensity over time (perfect for catching feedback).
- **Harmonograph**: A XY-mode visualizer that creates geometric patterns based on interval ratios (e.g., Octaves, Fifths).
- **Peak Detailer**: Drills down into specific frequencies to find unwanted "muddiness" or "harshness."

## 🛠 Technical Stack
- **Framework**: Vue 3
- **Styling**: Tailwind CSS (Custom CSS Variables for dynamic coloring)
- **Rendering**: HTML5 Canvas & `requestAnimationFrame` for 60FPS performance.
- **Audio Hub**: Web Audio API `AnalyserNode`.

## 🧠 Learning Objectives
- High-performance **Canvas Graphics** in a reactive framework.
- Deep dive into **FFT (Fast Fourier Transform)** and Buffer Management.
- Optimizing **CPU/GPU Usage** for browser-based audio processing.
- Creating "Console-grade" UI with a dark-mode tech aesthetic.

## 🗺 Implementation Roadmap
1. **Phase 1**: Implement the AnalyserNode and data-fetching loop.
2. **Phase 2**: Build the 2D Oscilloscope using Canvas.
3. **Phase 3**: Create the Spectrogram with custom color palettes.
4. **Phase 4**: Design the "Engineer Dashboard" layout with Tailwind Grid.
