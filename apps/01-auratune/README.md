# AuraTune Pro Suite 🌀

Professional-grade intonation diagnostic lab and high-precision tuning suite.

## 🎯 Purpose

AuraTune Pro is a forensic intonation tool designed for professional musicians, vocalists, and educators. It goes beyond simple pitch detection by providing real-time visual diagnostics for stability, vibrato, and harmonic richness, allowing for sub-cent tuning precision and specialized practice workflows.

## ✨ Pro Features

- **🌀 Sub-Cent Strobe Visualizer** - A high-speed Canvas-based strobe ring that tracks micro-deviations. Clockwise rotation indicates sharp, counter-clockwise indicates flat.
- **📈 Vibrato & Stability Graph** - Real-time SVG charting of pitch variance over the last 5 seconds. Perfect for analyzing the speed and width of your vibrato.
- **⚙️ Advanced Calibration** - Adjust your reference A4 from 390Hz to 490Hz. Supporting historical performance (415Hz) and scientific (432Hz) standards.
- **🎺 Instrument Transposition** - Instant key shifting for Bb, Eb, and F instruments. See the notes in your instrument's native key.
- **💎 Practice Drone Generator** - Play against a continuous guide tone (triangle/sine) to master relative intonation and ear training.
- **🧠 Tone Quality Scoring** - Real-time analysis of harmonic richness and signal clarity, providing a percentage score for your "purity" of tone.

## 📊 Competitive Edge

| Feature | AuraTune Pro | Standard Apps | Mechanical Strobes |
| :--- | :---: | :---: | :---: |
| **Precision** | **0.1 Cents** | ~1 Cent | 0.1 Cents |
| **Diagnostics** | **Vibrato + Stability** | Basic Cent Dial | None |
| **Visuals** | **High-Speed Strobe** | Needle | Rotating Disc |
| **Training** | **Practice Drone** | None | None |
| **Tone Profiling** | **Harmonic Score** | None | None |

## 🚀 Getting Started

### Installation

```bash
cd apps/01-auratune
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

1. **Allow microphone access** - Click the "Start Audio" button and grant microphone permissions
2. **Play or sing a note** - The app will detect the pitch in real-time
3. **Read the display**:
   - **Note name**: Current detected note
   - **Frequency**: Exact Hz measurement
   - **Cents**: How far off from perfect pitch (-50 to +50)
   - **Clarity**: Signal strength (higher is better)

## 🛠️ Tech Stack

- Vue 3 + TypeScript
- Vite
- Tailwind CSS
- `@spectralsuite/core` - Shared audio engine
- Web Audio API

## 📝 Use Cases

- **Vocal training** - Practice hitting specific pitches accurately
- **Instrument tuning** - Quickly tune string instruments
- **Ear training** - Develop pitch recognition skills
- **Performance** - Use as a live visual performance tool

## 🔗 Related Tools

- **ScaleSleuth** - For identifying scales and modes
- **ChordCapture** - For recognizing chord progressions
