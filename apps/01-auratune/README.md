# AuraTune

Real-time pitch detection and visualization tool with immersive reactive displays.

## 🎯 Purpose

AuraTune is designed for musicians who want immediate visual feedback on their pitch accuracy. Whether you're practicing vocals, tuning an instrument, or exploring melodic phrasing, AuraTune provides crystal-clear pitch detection with visual performance indicators.

## ✨ Features

- **Real-time pitch detection** - Instant frequency analysis using advanced FFT algorithms
- **Note name display** - Shows the detected note (e.g., A, C#, Bb) with cent deviation
- **Visual tuner** - Color-coded feedback for pitch accuracy
- **Clarity meter** - Signal strength indicator to show detection confidence
- **Cent offset display** - Shows how many cents sharp or flat you are

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
