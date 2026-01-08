# Pocket Engine

Rhythm and timing diagnostic tool to master your internal clock.

## 🎯 Purpose

Pocket Engine helps musicians develop rock-solid timing by providing precision metronome functionality combined with real-time rhythm analysis. Practice staying locked to the beat and measure your timing accuracy.

## ✨ Features

- **Precision Metronome** - Adjustable BPM from 40 to 300
- **Transient Detection** - Real-time beat onset tracking
- **Timing Offset Analysis** - Measures how early or late you play
- **Visual Feedback** - Color-coded timing indicators
- **Subdivision Options** - Quarter notes, eighth notes, triplets, sixteenths
- **Tap Tempo** - Set BPM by tapping
- **Accent Patterns** - Customizable emphasis on specific beats

## 🚀 Getting Started

### Installation

```bash
cd apps/07-pocket-engine
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

1. **Set your tempo** - Use the BPM slider or tap tempo button
2. **Start the metronome** - Click "Start" to hear the click track
3. **Play along** - Your microphone will detect your timing
4. **Watch the feedback**:
   - **Green**: On time (within ±10ms)
   - **Yellow**: Slightly off (±10-30ms)
   - **Red**: Noticeably off (>30ms)
   - **Offset Display**: Shows exact millisecond deviation

## ⏱️ Practice Modes

### Straight Time
Practice maintaining steady tempo in common time signatures:
- 4/4 (most common)
- 3/4 (waltz time)
- 6/8 (compound meter)

### Subdivision Practice
Develop precision with different note values:
- Quarter notes (1, 2, 3, 4)
- Eighth notes (1-and-2-and-3-and-4-and)
- Triplets (1-trip-let, 2-trip-let)
- Sixteenth notes (rapid subdivision)

### Accent Exercises
Program custom emphasis patterns:
- Downbeat emphasis (1 > 2 3 4)
- Backbeat (1 2 > 3 > 4)
- Off-beat accents (1 > 2 3 > 4)

## 🛠️ Tech Stack

- Vue 3 + TypeScript
- Vite
- `@spectralsuite/core` - Audio engine
- Custom transient detection algorithms
- Web Audio API - Precise timing

## 📝 Use Cases

- **Drumming practice** - Lock in your groove
- **Click track training** - Play with a metronome comfortably
- **Timing diagnosis** - Identify rushing or dragging tendencies
- **Band practice** - Visual timing reference for ensemble playing
- **Recording preparation** - Develop studio-ready timing

## 🔗 Related Tools

- **Track Tracer** - Detect BPM of existing tracks
- **AuraTune** - For pitch accuracy training
