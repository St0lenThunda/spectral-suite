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

## 📝 Professional Engineering Workflows

FrequencyFlow Pro is designed to bridge the gap between "mixing by ear" and "verifying by physics." Here is how a professional engineer integrates it into their toolset:

### 1. 🎯 Precision Spectral Slotting
Use the **Instrument Range Overlay** to prevent frequency masking between competing elements like Kick and Bass.
- **Engineering Move:** Identify the primary "thump" of the kick drum (e.g., 60Hz) and use a high-Q notch on the bass track at that exact frequency to create "space" without losing the bass's foundation.

### 2. 🛡️ Dynamic Range Protection
Use **Peak Hold & Decay** to monitor the relationship between transients and average signal levels.
- **Engineering Move:** When setting a Master Limiter, monitor the gap between the peak hold and the RMS level. If the peaks are excessively high, apply serial compression before the limiter to achieve a louder, more stable master without digital clipping.

### 3. 🕸️ Phase & Stereo Correlation
Use the **Harmonograph** (Lissajous patterns) to audit your stereo image and mono compatibility.
- **Engineering Move:** If the pattern flattens into a horizontal line, your signal is out-of-phase and will vanish on mono systems (phones, clubs). Aim for a balanced, vertical/circular distribution for a healthy stereo image.

### 4. 🔦 Resonant Frequency Hunting
Use the **Spectrogram waterfall view** to find persistent acoustic resonances in rooms or instruments.
- **Engineering Move:** A ringing snare or a room mode will appear as a bright, steady vertical line on the spectrogram. Find the exact frequency (e.g., 1.2kHz) and apply a surgical cut to remove the "honk" or "ring" with minimal impact on the overall tone.

### 5. 🧬 Forensic Fingerprinting
Use **Export & Capture (JSON)** to create a spectral standard for your studio.
- **Engineering Move:** Export the spectral data of a professional reference track and compare its JSON values against your own mix to identify specific imbalances in the low-end or high-shelf regions.

## 🔗 Related Tools

- **Track Tracer** - For forensic audio analysis
- **Pocket Engine** - For rhythm and timing analysis
