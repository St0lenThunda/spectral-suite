export * from './audio/AudioEngine';
export * from './audio/useAudioEngine';
export * from './audio/SynthEngine';
export * from './audio/SpectralAnalysis';
export * from './audio/usePitch';
export * from './composables/useAudioRecorder';
export * from './stores/rhythm';
export * from './analysis/TrackAnalyzer';
export * from './analysis/BpmDetector';
export * from './analysis/KeyDetector';
export * from './theory/ScaleEngine';
export * from './theory/useScaleSleuth';
export * from './theory/ChordEngine';
export * from './theory/useChordCapture';
export { default as Fretboard } from './ui/Fretboard.vue';
export { default as InfoPanel } from './ui/InfoPanel.vue';
export { default as PlayButton } from './ui/PlayButton.vue';
export * from './visualizers/MagnitudeSpectrum';

export * from './storage/StorageService'
export * from './rhythm/MetronomeEngine'
export * from './rhythm/TransientDetector'
export { Note, Interval, Chord } from 'tonal';
