<script setup lang="ts">
/**
 * EngineSettings.vue
 * A reusable settings module for controlling the global SynthEngine and Input Processing.
 * 
 * Design Pattern:
 * This component acts as a "View Controller" for the SynthEngine singleton and Global Input State.
 */
import { ref } from 'vue';
import { usePlatformStore, SynthEngine, type TonePreset, useAudioEngine } from '@spectralsuite/core';
import PillNav from '../ui/PillNav.vue';

const platform = usePlatformStore();
const {
  init: reinitAudio,
  availableDevices,
  selectedDeviceId,
  availableOutputDevices,
  selectedOutputId,
  selectDevice,
  selectOutputDevice,
  playGlobalTestTone,
  updateDeviceList,
  getAnalyser
} = useAudioEngine();

const inputLevel = ref( 0 );
let animationFrame: number = 0;

const updateMeter = () => {
  const analyser = getAnalyser();
  if ( analyser ) {
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array( bufferLength );
    analyser.getByteTimeDomainData( dataArray );

    let sum = 0;
    for ( let i = 0; i < bufferLength; i++ ) {
      const value = ( ( dataArray[i] ?? 128 ) - 128 ) / 128; // Normalize -1 to 1
      sum += value * value;
    }
    const rms = Math.sqrt( sum / bufferLength );
    // Smooth release, fast attack
    inputLevel.value = Math.max( rms, inputLevel.value * 0.9 );
  }
  animationFrame = requestAnimationFrame( updateMeter );
};

// Refresh device list on mount
import { onMounted } from 'vue';
onMounted( () => {
  updateDeviceList();
  updateMeter();
} );

import { onUnmounted } from 'vue';
onUnmounted( () => {
  cancelAnimationFrame( animationFrame );
} );

// Access the singleton instance (The "Model")
const synth = SynthEngine.getInstance();

// Create local reactive state initialized with the current engine value.
const currentPreset = ref<TonePreset>( synth.getPreset() );

const presetOptions = [
  { label: 'Nylon', value: 'PLUCKED', icon: '🎸' },
  { label: 'Electric', value: 'ELECTRIC', icon: '⚡' },
  { label: 'Retro', value: 'RETRO', icon: '👾' },
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

// Expose Dev flag to template
const isDev = import.meta.env.DEV;
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
      <!-- New System Audio Section -->
      <div class="flex items-center gap-3 mb-6">
        <div class="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-lg">🎛️</div>
        <div>
          <h3 class="text-white font-bold text-base">System Audio I/O</h3>
          <p class="text-xs text-slate-500 uppercase tracking-widest font-mono">Microphone & Speakers</p>
        </div>
      </div>

      <div class="space-y-4 mb-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Microphone Selector -->
          <div v-if=" availableDevices.length > 0 ">
            <label class="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Input (Mic)</label>
            <div class="relative">
              <select
                :value="selectedDeviceId"
                @change="( e ) => selectDevice( ( e.target as HTMLSelectElement ).value )"
                class="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white appearance-none hover:border-emerald-500/50 focus:border-emerald-500 focus:outline-none transition-all truncate pr-8"
                aria-label="Microphone Selection"
              >
                <option
                  v-for=" device in availableDevices "
                  :key="device.deviceId"
                  :value="device.deviceId"
                >
                  {{ device.label || `Microphone ${device.deviceId.slice( 0, 5 )}...` }}
                </option>
              </select>
              <div class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none text-[10px]">▼
              </div>
            </div>
          </div>

          <!-- Output Selector -->
          <div v-if=" availableOutputDevices.length > 0 ">
            <label class="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Output
              (Speakers)</label>
            <div class="relative">
              <select
                :value="selectedOutputId"
                @change="( e ) => selectOutputDevice( ( e.target as HTMLSelectElement ).value )"
                class="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white appearance-none hover:border-emerald-500/50 focus:border-emerald-500 focus:outline-none transition-all truncate pr-8"
                aria-label="Speaker Selection"
              >
                <option
                  v-for=" device in availableOutputDevices "
                  :key="device.deviceId"
                  :value="device.deviceId"
                >
                  {{ device.label || `Speaker ${device.deviceId.slice( 0, 5 )}...` }}
                </option>
              </select>
              <div class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none text-[10px]">▼
              </div>
            </div>
          </div>
        </div>

        <!-- Global Test Tone -->
        <div class="flex gap-4">
          <button
            @click="playGlobalTestTone"
            class="flex-1 py-3 rounded-xl bg-slate-800 border border-white/5 hover:bg-emerald-500/20 hover:border-emerald-500/50 text-slate-400 hover:text-emerald-400 font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
          >
            <span>🔊</span> Test Output (Beep)
          </button>

          <!-- Input Meter -->
          <div
            class="flex-1 bg-slate-900 rounded-xl border border-white/10 p-1 relative overflow-hidden flex flex-col justify-center"
          >
            <div
              class="absolute inset-0 bg-emerald-500/20 transition-transform duration-75 ease-out origin-left"
              :style="{ transform: `scaleX(${Math.min( inputLevel * 5, 1 )})` }"
            ></div>
            <div
              class="relative z-10 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center flex justify-between px-3"
            >
              <span>Input Signal</span>
              <span
                :class="inputLevel > 0.01 ? 'text-emerald-400' : 'text-slate-600'">{{ ( inputLevel * 100 ).toFixed( 0 ) }}%</span>
            </div>
          </div>
        </div>

      </div>

    </div> <!-- Close System Audio Section -->

    <!-- Processing Chain Section -->
    <div class="pt-6 border-t border-white/5">
      <h4 class="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Processing Chain</h4>


      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Low Pass Filter Toggle -->
        <button
          @click="platform.isLowPassEnabled = !platform.isLowPassEnabled"
          class="flex flex-col items-start p-4 rounded-xl border transition-all text-left group"
          :class="platform.isLowPassEnabled ? 'bg-sky-500/10 border-sky-500/50' : 'bg-slate-900/50 border-white/5 hover:bg-slate-800'"
        >
          <div class="flex items-center justify-between w-full mb-2">
            <span
              class="text-xs font-black uppercase tracking-widest"
              :class="platform.isLowPassEnabled ? 'text-sky-400' : 'text-slate-500'"
            >Low-Pass Filter</span>
            <div
              class="w-8 h-4 rounded-full relative transition-colors"
              :class="platform.isLowPassEnabled ? 'bg-sky-500' : 'bg-slate-700'"
            >
              <div
                class="absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform"
                :class="platform.isLowPassEnabled ? 'translate-x-4' : 'translate-x-0'"
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
          @click="platform.downsample = platform.downsample === 1 ? 4 : 1"
          class="flex flex-col items-start p-4 rounded-xl border transition-all text-left group"
          :class="platform.downsample > 1 ? 'bg-indigo-500/10 border-indigo-500/50' : 'bg-slate-900/50 border-white/5 hover:bg-slate-800'"
        >
          <div class="flex items-center justify-between w-full mb-2">
            <span
              class="text-xs font-black uppercase tracking-widest"
              :class="platform.downsample > 1 ? 'text-indigo-400' : 'text-slate-500'"
            >Bass / Deep Mode</span>
            <div
              class="w-8 h-4 rounded-full relative transition-colors"
              :class="platform.downsample > 1 ? 'bg-indigo-500' : 'bg-slate-700'"
            >
              <div
                class="absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform"
                :class="platform.downsample > 1 ? 'translate-x-4' : 'translate-x-0'"
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
            <span class="text-xs font-mono text-sky-400">{{ ( platform.sensitivity * 100 ).toFixed( 0 ) }}%</span>
          </div>
          <input
            type="range"
            min="0.00"
            max="0.5"
            step="0.01"
            v-model.number="platform.sensitivity"
            class="w-full accent-sky-500 bg-slate-800 h-2 rounded-lg appearance-none cursor-pointer"
            aria-label="Microphone Sensitivity Gate"
          />
          <!-- 
            Range: 0.00 (Always on) to 0.50 (Very Strict)
            We allow up to 50% because in loud rooms, the noise floor can be huge.
          -->

          <p class="text-[10px] text-slate-500 mt-1">Minimum volume required to detect signal.</p>
        </div>

        <div>
          <div class="flex justify-between items-center mb-2">
            <label class="text-xs font-bold uppercase tracking-widest text-slate-500">Note Clarity</label>
            <span class="text-xs font-mono text-emerald-400">{{ ( platform.clarity * 100 ).toFixed( 0 ) }}%</span>
          </div>
          <input
            type="range"
            min="0.2"
            max="1.0"
            step="0.05"
            v-model.number="platform.clarity"
            class="w-full accent-emerald-500 bg-slate-800 h-2 rounded-lg appearance-none cursor-pointer"
            aria-label="Note Detection Clarity"
          />
          <!-- 
            Range: 0.20 (Relaxed) to 1.00 (Perfect) 
            Guitar chords are naturally "messy" (low clarity).
            We allow 0.20 to let complex/buzzing chords pass through.
          -->

          <p class="text-[10px] text-slate-500 mt-1">Strictness of pitch detection. Lower for sustain, Higher for
            accuracy.</p>
        </div>

      </div>

      <!-- Pro Audio Mode Section -->
      <div class="mt-6 pt-6 border-t border-white/5">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-lg">⚡</div>
          <div>
            <h3 class="text-white font-bold text-base">Audio Quality Mode</h3>
            <p class="text-xs text-slate-500 uppercase tracking-widest font-mono">Browser Processing Control</p>
          </div>
        </div>

        <button
          @click="platform.isRawAudioMode = !platform.isRawAudioMode; reinitAudio()"
          class="w-full flex flex-col items-start p-4 rounded-xl border transition-all text-left group"
          :class="platform.isRawAudioMode ? 'bg-amber-500/10 border-amber-500/50' : 'bg-slate-900/50 border-white/5 hover:bg-slate-800'"
        >
          <div class="flex items-center justify-between w-full mb-2">
            <span
              class="text-xs font-black uppercase tracking-widest"
              :class="platform.isRawAudioMode ? 'text-amber-400' : 'text-slate-500'"
            >{{ platform.isRawAudioMode ? 'Pro Mode (Raw)' : 'Auto Mode (AGC)' }}</span>
            <div
              class="w-8 h-4 rounded-full relative transition-colors"
              :class="platform.isRawAudioMode ? 'bg-amber-500' : 'bg-slate-700'"
            >
              <div
                class="absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform"
                :class="platform.isRawAudioMode ? 'translate-x-4' : 'translate-x-0'"
              ></div>
            </div>
          </div>
          <p class="text-[11px] text-slate-400 leading-relaxed">
            <template v-if=" platform.isRawAudioMode ">
              <span class="text-amber-400 font-bold">Pro Mode:</span> Disables browser processing (AGC, noise
              suppression). Purer signal for spectral analysis but may require higher input gain or closer mic.
            </template>
            <template v-else>
              <span class="text-emerald-400 font-bold">Auto Mode:</span> Browser normalizes input volume automatically.
              Easier to use but waveforms may show "pumping" artifacts.
            </template>
          </p>
        </button>

        <!-- Developer Documentation Link (Dev Only) -->
        <a
          v-if=" isDev "
          href="/docs/index.html"
          target="_blank"
          class="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-slate-900/50 hover:bg-slate-800 transition-all mt-4 group"
        >
          <div class="flex items-center gap-3">
            <span class="text-lg">📚</span>
            <div>
              <h4 class="text-xs font-bold text-white uppercase tracking-widest">JSDoc Reference</h4>
              <p class="text-[10px] text-slate-500">View generated code documentation</p>
            </div>
          </div>
          <span class="text-slate-500 group-hover:text-indigo-400 transition-colors">↗</span>
        </a>


        <p
          v-if=" platform.isRawAudioMode "
          class="text-[10px] text-amber-400/80 mt-2 flex items-center gap-1"
        >
          <span>⚠️</span> If tools aren't detecting input, try speaking louder or moving closer to the mic.
        </p>
      </div>
    </div>
  </div>
</template>
