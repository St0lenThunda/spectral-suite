<script setup lang="ts">
/**
 * EngineSettings.vue
 * A reusable settings module for controlling the global SynthEngine and Input Processing.
 * 
 * Design Pattern:
 * This component acts as a "View Controller" for the SynthEngine singleton and Global Input State.
 */
import { ref } from 'vue';
import { SynthEngine, type TonePreset, isLowPassEnabled, downsample, sensitivityThreshold, clarityThreshold } from '@spectralsuite/core';
import PillNav from '../ui/PillNav.vue';

// Access the singleton instance (The "Model")
const synth = SynthEngine.getInstance();

// Create local reactive state initialized with the current engine value.
const currentPreset = ref<TonePreset>( synth.getPreset() );

const presetOptions = [
  { label: 'Retro', value: 'RETRO', icon: '⚡' },
  { label: 'Plucked', value: 'PLUCKED', icon: '🎸' },
  { label: 'Keys', value: 'ELECTRIC', icon: '🎹' }
];

/**
 * Updates the synth engine and plays a preview sound.
 * @param val - The new preset value from the UI
 */
const updatePreset = ( val: string ) => {
  const preset = val as TonePreset;
  currentPreset.value = preset;
  synth.setPreset( preset );
  // Audition the sound (Play C Major Chord) for user feedback
  synth.playChord( ['C4', 'E4', 'G4'], 300 );
};
</script>

<template>
  <div class="w-full bg-white/5 border border-white/5 rounded-[2rem] p-6 backdrop-blur-sm space-y-8">

    <!-- Section 1: Tone Generator -->
    <div>
      <div class="flex items-center gap-3 mb-4">
        <div class="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-lg">🔊</div>
        <div>
          <h3 class="text-white font-bold text-base">Synth Engine</h3>
          <p class="text-xs text-slate-500 uppercase tracking-widest font-mono">Output Tone Generator</p>
        </div>
      </div>
      <PillNav
        :model-value="currentPreset"
        :options="presetOptions"
        @update:model-value="updatePreset"
      />
      <p class="text-xs text-slate-500 mt-3 italic">
        Selects the synthesizer voice used for auditory feedback and chords.
      </p>
    </div>

    <!-- Section 2: Input Processing -->
    <div class="pt-6 border-t border-white/5">
      <div class="flex items-center gap-3 mb-6">
        <div class="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-lg">🎛️</div>
        <div>
          <h3 class="text-white font-bold text-base">Input Processing & Gate</h3>
          <p class="text-xs text-slate-500 uppercase tracking-widest font-mono">Audio Analysis Filters</p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Low Pass Filter Toggle -->
        <button
          @click="isLowPassEnabled = !isLowPassEnabled"
          class="flex flex-col items-start p-4 rounded-xl border transition-all text-left group"
          :class="isLowPassEnabled ? 'bg-sky-500/10 border-sky-500/50' : 'bg-slate-900/50 border-white/5 hover:bg-slate-800'"
        >
          <div class="flex items-center justify-between w-full mb-2">
            <span
              class="text-xs font-black uppercase tracking-widest"
              :class="isLowPassEnabled ? 'text-sky-400' : 'text-slate-500'"
            >Low-Pass Filter</span>
            <div
              class="w-8 h-4 rounded-full relative transition-colors"
              :class="isLowPassEnabled ? 'bg-sky-500' : 'bg-slate-700'"
            >
              <div
                class="absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform"
                :class="isLowPassEnabled ? 'translate-x-4' : 'translate-x-0'"
              ></div>
            </div>
          </div>
          <p class="text-[11px] text-slate-400 leading-relaxed">
            Removes high-frequency background noise. Enabling this improves detection accuracy in noisy environments but
            may reduce clarity for high-pitched instruments.
          </p>
        </button>

        <!-- Bass Mode Toggle -->
        <button
          @click="downsample = downsample === 1 ? 4 : 1"
          class="flex flex-col items-start p-4 rounded-xl border transition-all text-left group"
          :class="downsample > 1 ? 'bg-indigo-500/10 border-indigo-500/50' : 'bg-slate-900/50 border-white/5 hover:bg-slate-800'"
        >
          <div class="flex items-center justify-between w-full mb-2">
            <span
              class="text-xs font-black uppercase tracking-widest"
              :class="downsample > 1 ? 'text-indigo-400' : 'text-slate-500'"
            >Bass / Deep Mode</span>
            <div
              class="w-8 h-4 rounded-full relative transition-colors"
              :class="downsample > 1 ? 'bg-indigo-500' : 'bg-slate-700'"
            >
              <div
                class="absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform"
                :class="downsample > 1 ? 'translate-x-4' : 'translate-x-0'"
              ></div>
            </div>
          </div>
          <p class="text-[11px] text-slate-400 leading-relaxed">
            Optimizes the engine for low frequencies (Bass/Cello). Downsamples input 4x to focus CPU power on the
            sub-100Hz spectrum.
          </p>
        </button>
      </div>

      <!-- Sensitivity Sliders -->
      <div class="mt-6 pt-6 border-t border-white/5 space-y-6">
        <div>
          <div class="flex justify-between items-center mb-2">
            <label class="text-xs font-bold uppercase tracking-widest text-slate-500">Microphone Gate</label>
            <span class="text-xs font-mono text-sky-400">{{ ( sensitivityThreshold * 100 ).toFixed( 0 ) }}%</span>
          </div>
          <input
            type="range"
            min="0.01"
            max="0.2"
            step="0.01"
            v-model.number="sensitivityThreshold"
            class="w-full accent-sky-500 bg-slate-800 h-2 rounded-lg appearance-none cursor-pointer"
          />
          <p class="text-[10px] text-slate-500 mt-1">Minimum volume required to detect signal.</p>
        </div>

        <div>
          <div class="flex justify-between items-center mb-2">
            <label class="text-xs font-bold uppercase tracking-widest text-slate-500">Note Clarity</label>
            <span class="text-xs font-mono text-emerald-400">{{ ( clarityThreshold * 100 ).toFixed( 0 ) }}%</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="0.95"
            step="0.05"
            v-model.number="clarityThreshold"
            class="w-full accent-emerald-500 bg-slate-800 h-2 rounded-lg appearance-none cursor-pointer"
          />
          <p class="text-[10px] text-slate-500 mt-1">Strictness of pitch detection. Lower for sustain, Higher for
            accuracy.</p>
        </div>

      </div>
    </div>
  </div>
</template>
