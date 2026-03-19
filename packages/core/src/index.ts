/// <reference path="./env.d.ts" />
export * from './audio/AudioEngine';
export * from './config/sensitivity';
export * from './config/useGlobalEngine';
export * from './audio/useAudioEngine';
export * from './audio/SynthEngine';
export * from './audio/SampleManager';
export * from './audio/SpectralAnalysis';
export * from './audio/ResonanceManager';
export * from './audio/ResonanceInsights';
export * from './audio/usePitch';
export * from './composables/useAudioRecorder';
export * from './composables/useInputDiagnostics';
export * from './stores/useHarmonicOrbit';
export * from './stores/rhythm';
export * from './stores/platform';
export * from './analysis/TrackAnalyzer';
export * from './analysis/BpmDetector';
export * from './analysis/KeyDetector';
export * from './analysis/NoteSegmenter';
export * from './theory/ScaleEngine';
export * from './theory/useScaleSleuth';
export * from './theory/ChordEngine';
export * from './theory/useChordCapture';
export { default as Fretboard } from './ui/Fretboard.vue';
export { default as InfoPanel } from './ui/InfoPanel.vue';
export { default as PlayButton } from './ui/PlayButton.vue';
export * from './visualizers/MagnitudeSpectrum';
export * from './visualizers/Spectrogram3D';

export * from './storage/StorageService'
export * from './rhythm/MetronomeEngine'
export * from './rhythm/TransientDetector'
export { Note, Interval, Chord } from 'tonal';

// Data & Recommendations
export * from './data/types';
export * from './data/SongDatabase';
export * from './data/TonnetzMapper';
export * from './data/RecommendationEngine';
export * from './data/HarmonicPathRecorder';
export * from './data/SpotifyService';
export * from './data/ToolManuals';
