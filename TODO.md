# Spectral Suite: Cross-Platform TODO 🚀

## 🖥️ Tauri Setup (Desktop: Windows + macOS)

### Prerequisites
- [ ] Install Rust toolchain: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
- [ ] Install Tauri CLI: `npm install -g @tauri-apps/cli`
- [ ] (macOS) Install Xcode Command Line Tools: `xcode-select --install`
- [ ] (Windows) Install Visual Studio Build Tools + WebView2

### Integration
- [ ] Initialize Tauri in Director: `cd apps/director && npm init tauri-app`
- [ ] Configure `tauri.conf.json`:
  - Set `build.distDir` to `../dist`
  - Set `build.devPath` to `http://localhost:5173`
  - Configure app name, identifier, icons
- [ ] Update `package.json` scripts:
  - `"tauri": "tauri"`
  - `"tauri:dev": "tauri dev"`
  - `"tauri:build": "tauri build"`
- [ ] Test dev mode: `npm run tauri:dev`
- [ ] Test production build: `npm run tauri:build`

### Platform Builds
- [ ] Build Windows `.msi` installer
- [ ] Build macOS `.dmg` / `.app`
- [ ] (Optional) Build Linux `.AppImage` / `.deb`
- [ ] Set up code signing (Windows + macOS)
- [ ] Configure auto-updates

---

## 📱 Capacitor Setup (Mobile: iOS + Android)

### Prerequisites
- [ ] (iOS) Install Xcode + iOS Simulator
- [ ] (Android) Install Android Studio + SDK
- [ ] Install Capacitor CLI: `npm install @capacitor/core @capacitor/cli`

### Integration
- [ ] Initialize Capacitor: `cd apps/director && npx cap init "Spectral Suite" com.spectralsuite.app`
- [ ] Add iOS platform: `npx cap add ios`
- [ ] Add Android platform: `npx cap add android`
- [ ] Configure `capacitor.config.ts`:
  - Set `webDir` to `dist`
  - Configure app metadata

### Native Plugins
- [ ] Install microphone plugin: `npm install @capacitor-community/audio`
- [ ] Configure iOS `Info.plist` for mic permissions
- [ ] Configure Android `AndroidManifest.xml` for mic permissions
- [ ] Test audio capture on both platforms

### Build & Test
- [ ] Build web assets: `npm run build`
- [ ] Sync to native: `npx cap sync`
- [ ] Open iOS project: `npx cap open ios`
- [ ] Open Android project: `npx cap open android`
- [ ] Test on simulators/emulators
- [ ] Test on physical devices

### Distribution
- [ ] Set up App Store Connect (iOS)
- [ ] Set up Google Play Console (Android)
- [ ] Configure app icons and splash screens
- [ ] Submit for TestFlight / Beta testing
- [ ] Prepare store listings (screenshots, descriptions)

---

## 💰 Monetization Integration

- [ ] Set up RevenueCat account
- [ ] Install RevenueCat SDK: `npm install @revenuecat/purchases-capacitor`
- [ ] Configure in-app products (Pro subscription)
- [ ] Implement paywall UI
- [ ] Test purchase flow on iOS/Android

---

## 🏗️ Core Architectural Enhancements (Future Capabilities)

### 1. `AudioBufferEngine` (Recording & Looping)
- [ ] Implement circular buffering in `AudioWorklet`.
- [ ] Create `useRecorder` composable for capture/playback.
- **Enables**: Looping, Backing Tracks, Instant Replay analysis.

### 2. `UniversalMidiBridge` (I/O Expansion)
- [ ] Create an Event Bus to normalize internal events to standard MIDI.
- [ ] Implement `useMidi` composable to listen/send to external devices.
- **Enables**: Controlling external synths, MIDI keyboard input, DAW integration.

### 3. `TimbreClassifier` (Sound ID)
- [ ] Implement MFCC (Mel-Frequency Cepstral Coefficients) analysis in core.
- [ ] Create classifier logic to ID instruments (Guitar vs Voice vs Noise).
- **Enables**: Smart Noise Gate ("Only listen when Guitar plays"), Tone advice.

### 4. `SignalFlowGraph` (Modular Routing)
- [ ] Refactor `AudioEngine` to use a node-based graph system.
- [ ] Create UI for dynamic signal routing (Patch Bay).
- **Enables**: Pedalboard-style app creation, complex FX chains, flexible routing.

### 5. `CloudSyncManager` (Persistence)
- [ ] Design JSON schema for User Data (Presets, Calibration, History).
- [ ] Implement Supabase/Firebase adapter for cloud storage.
- **Enables**: Cross-device sync, Leaderboards, Persistent settings backup.

---

## 📋 Priority Order

1. **Tauri (Desktop)** - Lower friction, faster to ship
2. **Capacitor (Mobile)** - Higher effort, bigger market
3. **Core Architecture** - Ongoing enhancements to support new features
4. **Monetization** - After platforms are stable

## 🎧 Audio Engine Enhancements

### Input Processor (DSP)
- [ ] **Noise Gate**: Mute signal below variable threshold (Clean up silence)
- [ ] **Input Gain**: Digital gain boost for quiet microphones
- [ ] **Compressor**: Dynamic range cleaner (Even out volume)
