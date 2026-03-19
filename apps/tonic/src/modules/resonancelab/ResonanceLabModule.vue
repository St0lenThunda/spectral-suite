<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useAudioEngine, useResonance, getNoteFromFreq, useGlobalEngine, LAB_MANUAL } from '@spectralsuite/core';
import LocalSettingsDrawer from '../../components/settings/LocalSettingsDrawer.vue';
import EngineSettings from '../../components/settings/EngineSettings.vue';
import SettingsToggle from '../../components/settings/SettingsToggle.vue';
import IntelligenceButton from '../../components/IntelligenceButton.vue';

/**
* ResonanceLabModule - A forensic tool for physical resonance analysis.
*
* Physics Concepts:
* 1. Resonance: The tendency of a system to vibrate with increasing amplitude at some frequencies.
* 2. Stroboscopic Effect: Using light pulses to "freeze" fast-moving objects in time.
* 3. Sympathetic Resonance: When a speaker vibration causes a physical object to move.
*
* @module modules/resonancelab/ResonanceLabModule.vue
*/

const { getAnalyser, isInitialized, init, activate, deactivate } = useAudioEngine();
const resonance = useResonance();

const isSettingsOpen = ref( false );
const drawerCategories = [
    {
        id: 'Engine', label: 'Engine', description: 'Audio Input & Device Selection', showIndicator:
            useGlobalEngine().isGlobalEngineActive.value
    }
];

// UI State
const isDiscovering = ref( false );
const showStrobeOverlay = ref( false );
const fineTune = ref( 0 ); // Hz offset for "beating" effects

// Local Animation
let animId: number | null = null;

/**
* The "Discovery" loop.
* While active, we continuously scan for the strongest frequency peak.
*/
const discoveryLoop = () => {
    const analyser = getAnalyser();
    if ( analyser && isDiscovering.value ) {
        resonance.analyzePeak( analyser );
    }
    animId = requestAnimationFrame( discoveryLoop );
};

const toggleDiscovery = () => {
    isDiscovering.value = !isDiscovering.value;
    if ( isDiscovering.value ) {
        discoveryLoop();
    } else if ( animId ) {
        cancelAnimationFrame( animId );
    }
};

const toggleMirror = () => {
    if ( resonance.isMirroring.value ) {
        resonance.stopMirror();
    } else {
        resonance.startMirror();
    }
};

/**
* Stroboscopic Visual Sync.
* We listen for the 'resonance-strobe' event fired by the ResonanceManager.
*/
const handleStrobeEvent = () => {
    showStrobeOverlay.value = true;
    setTimeout( () => {
        showStrobeOverlay.value = false;
    }, 20 ); // Very short flash (20ms)
};

onMounted( async () => {
    activate();

    // Ensure engine is ready for analysis
    if ( !isInitialized.value ) {
        try {
            await init();
        } catch ( e ) {
            console.error( 'Failed to init audio for Resonance Lab', e );
        }
    }

    window.addEventListener( 'resonance-strobe', handleStrobeEvent );
} );

onUnmounted( () => {
    if ( animId ) cancelAnimationFrame( animId );
    resonance.stopMirror();
    resonance.toggleStrobe( false );
    window.removeEventListener( 'resonance-strobe', handleStrobeEvent );
    deactivate();
} );

// Watch for fine-tune changes to update the live mirror
watch( [fineTune, resonance.targetFrequency], () => {
    // If we are mirroring, we could update the frequency in real-time
    // For now, simple stop/start or internal manager logic would update it
} );
</script>

<template>
    <div class="resonance-lab p-8 space-y-8 max-w-5xl mx-auto">
        <!-- Strobe Overlay (Visual Pulse) -->
        <div
            v-if=" showStrobeOverlay && resonance.isStrobing.value "
            class="fixed inset-0 pointer-events-none z-100 bg-white/10 mix-blend-screen transition-opacity duration-75"
        ></div>

        <header class="flex justify-between items-start">
            <div class="flex flex-col">
                <div class="flex items-center gap-4">
                    <h1 class="text-4xl font-black italic text-white uppercase tracking-tighter">
                        Resonance <span class="text-emerald-400">Lab</span>
                    </h1>
                    <div class="h-px w-32 bg-linear-to-r from-emerald-500/50 to-transparent"></div>
                    <IntelligenceButton
                        toolId="resonancelab"
                        label="Learn & How-To"
                        colorClass="text-emerald-400"
                        bgClass="bg-emerald-500/10"
                        borderClass="border-emerald-500/20"
                    />
                </div>
                <p class="text-slate-500 text-[10px] font-mono uppercase tracking-[0.2em] mt-1">
                    Discover and mirror physical frequency nodes.
                </p>
            </div>
            <div class="flex items-center gap-3">
                <SettingsToggle
                    :is-open="isSettingsOpen"
                    @click="isSettingsOpen = !isSettingsOpen"
                />
            </div>
        </header>

        <LocalSettingsDrawer
            :is-open="isSettingsOpen"
            :categories="drawerCategories"
            @close="isSettingsOpen = false"
        >
            <template #Engine>
                <EngineSettings />
            </template>
        </LocalSettingsDrawer>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <!-- Phase 1: Discovery -->
            <section class="bg-slate-800/40 rounded-[2.5rem] p-8 border border-white/5 backdrop-blur-xl space-y-6">
                <div class="flex justify-between items-center">
                    <h2 class="text-[11px] font-black uppercase tracking-[0.4em] text-emerald-400">01. Discovery</h2>
                    <div
                        class="w-3 h-3 rounded-full animate-pulse"
                        :class="isDiscovering ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-slate-700'"
                    ></div>
                </div>

                <div class="text-center py-8 relative">
                    <!-- Signal Pulse Aura -->
                    <div
                        v-if=" resonance.isSignalDetected.value && isDiscovering "
                        class="absolute inset-x-0 top-1/2 -translate-y-1/2 h-32 bg-emerald-500/5 blur-3xl animate-pulse rounded-full"
                    >
                    </div>

                    <div
                        class="text-7xl font-black text-white tracking-tighter mb-2 relative z-10 flex items-baseline justify-center gap-2">
                        {{ resonance.targetFrequency.value }}<span class="text-xl text-slate-500">Hz</span>
                    </div>

                    <!-- Locked State Badge -->
                    <div
                        v-if=" !isDiscovering && resonance.targetFrequency.value > 0 "
                        class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-[9px] font-black uppercase text-emerald-400 mb-4 animate-in fade-in zoom-in-95"
                    >
                        <span>🔒</span> Frequency Locked
                    </div>

                    <p
                        class="text-[10px] font-mono uppercase tracking-widest relative z-10"
                        :class="resonance.isSignalDetected.value ? 'text-emerald-500' : 'text-slate-500'"
                    >
                        {{ resonance.isSignalDetected.value ? 'Signal Detected' : ( isDiscovering ? 'Listening...' : 'Ready' ) }}
                    </p>
                    <p class="text-[10px] font-mono text-slate-500 uppercase tracking-widest mt-1">
                        Note: {{ getNoteFromFreq( resonance.targetFrequency.value ) }}
                    </p>

                    <!-- NEW: Signal Level Meter -->
                    <div class="mt-6 flex flex-col items-center gap-2">
                        <span class="text-[8px] font-black uppercase tracking-[0.3em] text-slate-600">Signal Gain</span>
                        <div class="w-32 h-1 bg-slate-900 rounded-full overflow-hidden border border-white/5">
                            <div
                                class="h-full transition-all duration-75"
                                :class="resonance.isSignalDetected.value ? 'bg-emerald-500' : 'bg-slate-700'"
                                :style="{ width: ( resonance.signalLevel.value / 255 ) * 100 + '%' }"
                            ></div>
                        </div>
                    </div>
                </div>

                <button
                    @click="toggleDiscovery"
                    class="w-full py-5 rounded-2xl border font-black uppercase tracking-[0.3em] text-[10px] transition-all active:scale-95 shadow-lg"
                    :class="[
                        isDiscovering
                            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-emerald-500/20'
                            : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                    ]"
                >
                    <span v-if=" isDiscovering ">Listening... (Tap to Lock)</span>
                    <span v-else-if=" resonance.targetFrequency.value > 0 ">Recalibrate (Listen Again)</span>
                    <span v-else>Tap to Discover</span>
                </button>
                <p class="text-[9px] text-slate-600 text-center italic">
                    Tap your object near the mic to find its fundamental frequency.
                </p>
            </section>

            <!-- Phase 2: Mirroring -->
            <section class="bg-slate-800/40 rounded-[2.5rem] p-8 border border-white/5 backdrop-blur-xl space-y-6">
                <h2 class="text-[11px] font-black uppercase tracking-[0.4em] text-sky-400">02. Harmonic Mirror</h2>

                <div class="space-y-6">
                    <div class="flex items-center justify-between">
                        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</span>
                        <span
                            class="text-[10px] font-black uppercase"
                            :class="resonance.isMirroring.value ? 'text-sky-400' : 'text-slate-600'"
                        >
                            {{ resonance.isMirroring.value ? 'Active Projection' : 'Idle' }}
                        </span>
                    </div>

                    <div class="space-y-3">
                        <label
                            class="flex justify-between text-[9px] text-slate-400 uppercase tracking-[0.2em] font-bold"
                        >
                            Fine Tune (Beating)
                            <span class="text-sky-400 font-mono">{{ fineTune }} Hz</span>
                        </label>
                        <input
                            type="range"
                            v-model.number="fineTune"
                            min="-5"
                            max="5"
                            step="0.1"
                            class="w-full h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-sky-400"
                        >
                    </div>

                    <button
                        @click="toggleMirror"
                        class="w-full py-6 rounded-3xl border font-black uppercase tracking-[0.3em] text-[12px] transition-all flex items-center justify-center gap-4 active:scale-95 shadow-xl"
                        :class="resonance.isMirroring.value ? 'bg-sky-500 text-white border-white/20' : 'bg-slate-900 border-sky-500/30 text-sky-400 hover:bg-sky-500/10'"
                    >
                        <span class="text-xl">{{ resonance.isMirroring.value ? '🔊' : '🔈' }}</span>
                        {{ resonance.isMirroring.value ? 'Stop Projection' : 'Start Mirror' }}
                    </button>
                </div>
            </section>

            <!-- Phase 3: Analysis (Strobe) -->
            <section class="md:col-span-2 bg-slate-800/40 rounded-[2.5rem] p-8 border border-white/5 backdrop-blur-xl">
                <div class="flex flex-col md:flex-row justify-between gap-8">
                    <div class="flex-1 space-y-6">
                        <h2 class="text-[11px] font-black uppercase tracking-[0.4em] text-rose-400">03. Stroboscopic
                            Analysis</h2>
                        <p class="text-slate-500 text-[11px] leading-relaxed">
                            Sync the app's pulse to the object's frequency to "freeze" the vibration visually.
                            Adjust the speed slightly to see the motion in slow-motion.
                        </p>

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <button
                                @click="resonance.toggleStrobe( !resonance.isStrobing.value )"
                                class="py-5 rounded-2xl border font-black uppercase tracking-[0.3em] text-[10px] transition-all flex items-center justify-center gap-3"
                                :class="resonance.isStrobing.value ? 'bg-rose-500/20 border-rose-500/50 text-rose-400' : 'bg-white/5 border-white/10 text-slate-400'"
                            >
                                <span class="text-lg">✨</span>
                                {{ resonance.isStrobing.value ? 'Strobe Off' : 'Enable Strobe' }}
                            </button>
                            <button
                                @click="resonance.useAudioPulse.value = !resonance.useAudioPulse.value"
                                class="py-5 rounded-2xl border font-black uppercase tracking-[0.3em] text-[10px] transition-all flex items-center justify-center gap-3"
                                :class="resonance.useAudioPulse.value ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' : 'bg-white/5 border-white/10 text-slate-400'"
                            >
                                <span class="text-lg">💓</span>
                                Audio Pulse: {{ resonance.useAudioPulse.value ? 'ON' : 'OFF' }}
                            </button>
                        </div>
                    </div>

                    <div class="w-full md:w-64 space-y-6 bg-slate-900/50 p-6 rounded-3xl border border-white/5 italic">
                        <label
                            class="flex justify-between text-[9px] text-slate-500 uppercase tracking-[0.2em] font-bold"
                        >
                            Strobe Freq
                            <span class="text-rose-400 font-mono">{{ resonance.strobeFrequency.value }} Hz</span>
                        </label>
                        <input
                            type="range"
                            v-model.number="resonance.strobeFrequency.value"
                            @input="resonance.toggleStrobe( resonance.isStrobing.value )"
                            min="1"
                            max="60"
                            step="1"
                            class="w-full h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-rose-400"
                        >
                        <div class="flex justify-between items-center pt-2">
                            <button
                                @click="resonance.strobeFrequency.value = resonance.targetFrequency.value"
                                class="text-[8px] uppercase font-black text-rose-500/50 hover:text-rose-400 transition-colors"
                            >
                                Lock to Target
                            </button>
                            <span class="text-[8px] font-mono text-slate-600">Max Screen Rate: 60Hz</span>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Intelligence Panel: Scientific Insights -->
            <section
                v-if=" resonance.insight.value "
                class="md:col-span-2 bg-emerald-500/5 border border-emerald-500/20 rounded-[2.5rem] p-8 backdrop-blur-xl flex flex-col md:flex-row gap-8 items-center"
            >
                <div
                    class="flex-none w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center text-2xl">
                    🧠
                </div>
                <div class="flex-1 space-y-2">
                    <h3 class="text-emerald-400 font-black uppercase tracking-widest text-xs">
                        {{ resonance.insight.value.title }}
                    </h3>
                    <p class="text-slate-300 text-sm leading-relaxed">{{ resonance.insight.value.description }}</p>
                    <div
                        v-if=" resonance.insight.value.warning "
                        class="mt-4 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[10px] font-bold uppercase tracking-widest leading-relaxed"
                    >
                        ⚠️ {{ resonance.insight.value.warning }}
                    </div>
                </div>
            </section>
        </div>

    </div>
</template>

<style scoped>
/* Hidden slider track for a cleaner premium look */
input[type="range"]::-webkit-slider-runnable-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 999px;
}

input[type="range"]::-webkit-slider-thumb {
    margin-top: -4px;
}
</style>
