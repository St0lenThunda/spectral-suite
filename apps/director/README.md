# Director

Unified dashboard for the Spectral Suite - Your command center for all music analysis tools.

## 🎯 Purpose

Director is the central hub that brings together all Spectral Suite tools in one beautiful, unified interface. Switch between tools seamlessly, configure your workspace, and access detailed tool documentation—all from a single dashboard.

## ✨ Features

- **Modular Tool System** - Enable/disable tools as needed
- **Unified Audio Engine** - Shared audio processing across all tools
- **Tool Registry** - Automatic discovery of installed tools
- **Input Gain Control** - Global volume adjustment with visual meter
- **Settings Management** - Persistent tool configuration
- **Info Modals** - In-depth tool documentation
- **Plug-and-Play Architecture** - Add new tools by dropping folders in `apps/`

## 🚀 Getting Started

### Installation

```bash
cd apps/director
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

### Dashboard View
- **Tool Cards**: Click any enabled tool to launch it
- **Settings Gear**: Configure which tools appear
- **Status Bar**: Monitor input gain and audio engine status

### Tool Modules
All tools share a consistent interface:
1. Info button (ℹ️) - Opens detailed documentation
2. Back button - Returns to dashboard
3. Audio controls - Start/stop audio engine

### Settings
- **Toggle Tools**: Enable or disable specific modules
- **Save Preferences**: Settings persist in localStorage
- **Module Count**: See how many tools are active

## 🔧 Available Tools

1. **AuraTune** ✨ - Real-time pitch detection
2. **ScaleSleuth** 🔍 - Scale and mode identification
3. **ChordCapture** 🎹 - Chord recognition
4. **Pocket Engine** ⏱️ - Rhythm and timing
5. **Frequency Flow** 🌊 - Spectral visualization
6. **Track Tracer** 🧪 - Audio file analysis

## 🏗️ Architecture

### Shared Audio Engine
All tools use the same `@spectralsuite/core` audio engine:
- Single microphone permission request
- Shared gain control
- Optimized buffer management
- Global initialization state

### Persistent Settings
Tool preferences are saved using `localStorage`:
```javascript
'spectral-suite-enabled-tools': {
  auratune: true,
  scalesleuth: true,
  ...
}
```

### Modular Design
Add new tools by:
1. Creating a folder in `apps/`
2. Adding module to `director/src/modules/`
3. Registering in tool metadata
4. Tool appears automatically in Director

## 🛠️ Tech Stack

- Vue 3 + TypeScript
- Vite
- Tailwind CSS
- `@spectralsuite/core` - Shared audio library
- Pinia - State management (if needed)

## 📝 Use Cases

- **All-in-one workspace** - Access every tool from one place
- **Custom workflows** - Enable only the tools you need
- **Learning platform** - Explore different analysis techniques
- **Live performance** - Quick tool switching for shows
- **Studio production** - Comprehensive analysis suite

## 🎨 UI Features

- **Dark theme** - Easy on the eyes during long sessions
- **Glassmorphism** - Modern, translucent design
- **Smooth transitions** - Polished animations between views
- **Responsive layout** - Works on desktop and tablet
- **Quick switcher dots** - Fast navigation between active tools

## 🔗 Extending Director

Want to add your own tool? Follow the plug-and-play pattern:

1. Create your app in `apps/your-tool/`
2. Add a module wrapper in `director/src/modules/your-tool/`
3. Register in `toolMetadata.ts`
4. It will appear automatically!

---

**Director** is your gateway to the Spectral Suite. Launch it once, access everything.
