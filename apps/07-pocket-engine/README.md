# Pocket Engine

Rhythm and timing diagnostic tool to master your internal clock.

## 🎯 Purpose

Pocket Engine helps musicians develop rock-solid timing by providing precision metronome functionality combined with real-time rhythm analysis. Practice staying locked to the beat and measure your timing accuracy.

## ✨ Features

- **Advanced Configuration** - Smooth slidedown drawer for professional training tools
- **Rhythmic Subdivisions** - Support for 1/4, 1/8, 1/12 (triplets), and 1/16 divisions
- **Visual "Flash" Mode** - High-contrast optical pulse syncing for better visual feedback
- **Stability Training** - Gap Click mode to build internal time by randomly muting clicks
- **The Ladder** - Automated tempo progression for systematic speed-building
- **Transient Detection** - Real-time audio onset tracking via microphone
- **Timing Offset Analysis** - Forensic millisecond deviation tracking
- **Visual Feedback** - Color-coded "Pocket" indicators (Rush vs. Drag)
- **Morphing UI** - Dynamic transition between playback states

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
- **1/4** (Quarter notes): The root pulse (1, 2, 3, 4)
- **1/8** (Eighth notes): 2 pulses per beat (1-and, 2-and)
- **1/12** (Triplets): 3 pulses per beat (1-trip-let, 2-trip-let)
- **1/16** (Sixteenth notes): 4 pulses per beat (rapid rhythmic density)

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
