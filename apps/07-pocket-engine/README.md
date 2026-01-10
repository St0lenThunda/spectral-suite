# PocketEngine Pro Suite ⏱️

Professional rhythm and timing diagnostic lab for mastering internal clock precision.

## 🎯 Purpose

PocketEngine Pro helps musicians develop rock-solid timing by providing precision metronome functionality combined with real-time forensic rhythm analysis. Practice staying locked to the beat, diagnose rushing/dragging tendencies, and measure your timing accuracy to the millisecond.

## ✨ Pro Features

- **⚙️ Advanced Training Drawer** - Professional tools hidden in a smooth slide-down interface.
- **🔢 Rhythmic Subdivisions** - Support for 1/4, 1/8, 1/12 (triplets), and 1/16 divisions with polyrhythmic potential.
- **⚡ Visual Flash Mode** - High-contrast optical pulse syncing for silent or visual-first reference.
- **📉 Gap Click Training** - Build internal time by randomly muting clicks for extended periods.
- **🪜 The Ladder** - Automated tempo progression for systematic speed-building.
- **🕵️ Transient Detection** - Real-time audio onset tracking via microphone with forensic accuracy.
- **🎯 Timing Offset Analysis** - Exact millisecond deviation tracking (e.g., +12ms rush, -5ms drag).
- **🎼 Accent Programmer** - Visually sequence custom rhythmic patterns (Backbeats, Swing, Syncopation) with 4 levels of dynamics.
- **🎨 Pocket Visualizer** - Color-coded "Pocket" indicators (Green=Perfect, Yellow=Drift, Red=Off).

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

## 📝 Professional Practice Workflows

PocketEngine Pro isn't just a metronome; it's a timing laboratory. Professionals use it to develop the "internal clock" required for high-stakes performances and studio sessions.

### 1. 🧠 Internal Clock "Gap" Training
Use **Gap Click Training** to remove your dependency on the metronome.
- **Pocket Move:** Program the engine to play for 3 measures and mute for 1. If your first hit after the silence is within ±10ms (Green), your internal clock is stable. Gradually increase the gap to 4 or 8 measures.

### 2. 🛶 "Ahead or Behind" the Beat
Use **Timing Offset Analysis** to master micro-timing for different genres.
- **Pocket Move:** Jazz and Neo-Soul often require playing "behind" the pulse (laid back), while Punk requires playing "ahead" (driving). Use the millisecond display to intentionally target a -10ms drag or a +10ms rush until you can hit those specific offsets consistently.

### 3. 🪜 Speed Laddering
Use **The Ladder** for systematic technique building.
- **Pocket Move:** Set your goal tempo. The Ladder will automatically increase the BPM by 2 every 16 bars. This forces your nervous system to adapt to incremental changes without the mental friction of manually adjusting the slider.

### 4. 🕵️ Forensic transient Check
Use **Transient Detection** with the microphone to audit your physical technique.
- **Pocket Move:** For drummers, use this to see if your kick and snare are landing exactly together. If the engine shows two distinct transients for one beat, your "four-way coordination" needs tightening.

## 🔗 Suite Integration & Signal Chain

PocketEngine serves as the **Rhythmic Foundation** of the Spectral Suite.

### Position: The Pulse Source
In a professional signal chain, Pocket Engine sits at the head. It generates the **Main Timing metadata** that other apps consume:
- **Track Tracer Connection:** Use Pocket Engine to verify the BPM detected by Track Tracer. If a track is drifting, Pocket Engine's offset analyzer will show the exact drift per bar.
- **AuraTune Integration:** Connect rhythmic exercises to pitch training. Use the Subdivision mode to practice scales (from **Scale Sleuth**) at specific 1/8 note or triplet pulses.
- **Tonic Dashboard:** Pocket Engine provides the "Master BPM" across the monorepo, ensuring that visualizers in **Frequency Flow** can sync their refresh rates to the musical tempo for "Beat-synced" visuals.

## 🔗 Related Tools

- **Track Tracer** - Detect BPM of existing tracks
- **AuraTune** - For pitch accuracy training
