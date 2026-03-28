<script setup lang="ts">
/**
 * AtlasModule - The "Project Atlas" Source Code Explorer & Tutorial.
 * 
 * This module allows you to explore the Spectral Suite architecture,
 * learn how TypeScript, Vue 3, and Pinia are used, and see the
 * dependencies between different modules.
 */
import { ref, computed, watch } from 'vue';
import { useAudioEngine } from '@spectralsuite/core';

// --- STATE ---
const { isInitialized } = useAudioEngine();
const activeSection = ref( 'intro' );
const selectedModule = ref<string | null>( null );

// --- DYNAMIC DISCOVERY ---
// 1. Metadata Glob (for TOC)
const modules = import.meta.glob('../**/*.vue');
// 2. Raw Source Glob (for analysis)
const rawModules = import.meta.glob('../**/*.vue', { query: '?raw', import: 'default' });

const moduleList = computed( () => {
  return Object.keys( modules )
    .map( path => {
      const parts = path.split( '/' );
      return parts[parts.length - 2]; // Folder name is usually the module name
    } )
    .filter( ( name, index, self ) => name && name !== 'atlas' && self.indexOf( name ) === index );
} );

const currentSource = ref<string | null>( null );
const analyzedImports = ref<{ name: string; why: string }[]>( [] );

/**
 * Split source into line-by-line components for display
 */
const sourceLines = computed( () => {
  if ( !currentSource.value ) return [];
  return currentSource.value.split( '\n' );
} );

/**
 * Analyzes the source code of a module to find and explain imports.
 */
const analyzeModule = async ( name: string ) => {
  // Find the right path in the glob
  const path = Object.keys( rawModules ).find( p => p.includes( `/${name}/` ) );
  if ( !path ) return;

  const loader = rawModules[path];
  if ( loader ) {
    const raw = await (loader() as Promise<string>);
    currentSource.value = raw;

    // Regex to find things imported from '@spectralsuite/core' or 'vue'
    const importRegex = /import\s+{([^}]+)}\s+from\s+['"]([^'"]+)['"]/g;
    const matches = Array.from( raw.matchAll( importRegex ) );
    
    const uniqueImports = new Set<string>();
    matches.forEach( match => {
      const names = match[1]!.split( ',' ).map( n => n.trim().split( ' as ' )[0]!.trim() );
      names.forEach( n => uniqueImports.add( n ) );
    } );

    analyzedImports.value = Array.from( uniqueImports )
      .map( name => ({
        name,
        why: importDictionary[name as keyof typeof importDictionary] || 'A utility used by this module for its specific logic.'
      }) )
      .sort( ( a, _b ) => a.why.includes( 'utility' ) ? 1 : -1 ); // Prioritize known imports
  }
};

watch( selectedModule, ( val ) => {
  if ( val ) analyzeModule( val );
} );

// --- CONTENT SECTIONS ---
const sections = [
  { id: 'intro', label: 'Welcome', icon: '🚀' },
  { id: 'architecture', label: 'Architecture', icon: '🏛️' },
  { id: 'audio', label: 'Audio Engine', icon: '🎙️' },
  { id: 'typescript', label: 'TypeScript Basics', icon: 'TS' },
  { id: 'vue', label: 'Vue 3 & Reactivity', icon: 'V' },
  { id: 'pinia', label: 'Pinia State', icon: '🍍' },
  { id: 'modules', label: 'Module Explorer', icon: '📂' }
];

const importDictionary = {
  'useAudioEngine': 'The master key that starts/stops the Web Audio API context and coordinates global synchronization.',
  'shallowRef': 'A lightweight version of ref() used for large audio buffers (like Float32Array) to prevent browser rendering lag.',
  'onMounted': 'A lifecycle hook that runs when a component is first added to the screen. Perfect for starting audio nodes.',
  'onUnmounted': 'Runs just before a component is destroyed. We use this to stop oscillators and prevent memory leaks.',
  'computed': 'A smart variable that automatically re-calculates itself only when its "dependencies" change (Efficiency champion).',
  'watch': 'A listener that runs code whenever a variable changes. We use it to update audio parameters in real-time.',
  'ref': 'The basic building block of Vue reactivity. Use this for single values like toggles, numbers, or strings.',
  'defineAsyncComponent': 'Lazy-loads modules only when the user clicks them. This keeps the initial app loading lightning fast.',
  'provide': 'Allows a parent component to "broadcast" a value to all its children, no matter how deep they are.',
  'inject': 'Used by a child to "hear" a value broadcasted by a parent via provide().',
  'nextTick': 'A utility that waits until the next screen redraw is finished before running code.',
  'onActivated': 'Used with <KeepAlive>. Runs when a hidden tab is brought back to the foreground.',
  'onDeactivated': 'Used with <KeepAlive>. Runs when a tab is hidden but not destroyed.',
  'storeToRefs': 'A Pinia utility that turns state into reactive refs so they stay synchronized with the UI.',
  'useRhythmStore': 'The global source of truth for Tempo, Subdivision, and the master metronome pulse.',
  'usePlatformStore': 'Handles cross-device persistence, user preferences, and platform-specific logic.',
  'SongDatabase': 'A curated collection of harmonic data from thousands of songs used for recommendation.',
  'RecommendationEngine': 'The brain that calculates which chords or songs feel "similar" based on music theory.',
  'ChordEngine': 'The logic core that identifies complex chords (like Cmin7b5) from raw pitch input.',
  'TonnetzMapper': 'The geometry engine that converts abstract pitch classes into X,Y coordinates on the lattice.'
};

const tutorials = {
  architecture: {
    title: 'System Architecture',
    subtitle: 'Building a modular music exploration engine.',
    content: 'Spectral Suite is designed as a Mono-Repo. The "Core" package handles all music theory math and heavy audio lift, while the "Tonic" app handles the visual presentation and user interaction.',
    examples: [
      { 
        label: 'Mono-Repo Structure', 
        code: 'packages/core/ -> Music Logic\napps/tonic/ -> Visual UI', 
        explanation: 'Separating the math from the visuals allows us to swap the UI entirely without breaking the instrument logic.',
        file: 'packages/core/src/index.ts',
        line: 1
      },
      {
        label: 'Plug-and-Play Tools',
        code: '<TonnetzModule v-if="active" />',
        explanation: 'Every tool is an independent module. This ensures that adding a new visualizer doesn\'t slow down existing ones.',
        file: 'apps/tonic/src/App.vue',
        line: 358
      }
    ]
  },
  audio: {
    title: 'The Audio Engine',
    subtitle: 'Low-latency physics on the web.',
    content: 'We use the Web Audio API for high-fidelity sound. In Spectral Suite, we keep the audio stream "raw" (no echo cancellation or noise suppression) for the most accurate harmonic analysis possible.',
    examples: [
      { 
        label: 'Raw Audio Mode', 
        code: 'echoCancellation: false\nnoiseSuppression: false', 
        explanation: 'Browser processing (VoIP mode) "cleans" audio but removes the faint harmonics we need for chord recognition.',
        file: 'packages/core/src/audio/AudioEngine.ts',
        line: 62
      },
      {
        label: 'Audio Node Graph',
        code: 'source -> gain -> analyser',
        explanation: 'We route audio through a Gain node for global volume before it hits the Analyser for visual spectral data.',
        file: 'packages/core/src/audio/AudioEngine.ts',
        line: 79
      }
    ]
  },
  typescript: {
    title: 'TypeScript: The Guard Rails',
    subtitle: 'Why we use types in a music app.',
    content: 'TypeScript helps us catch bugs before the app even runs. In an audio engine, if you pass a "String" where a "Float" should be, the engine might clip or crash. TS prevents this.',
    examples: [
      { 
        label: 'Interface', 
        code: 'interface TonnetzPoint { x: number; y: number; }', 
        explanation: 'We define the "Shape" of a point so the lattice renderer knows exactly what coordinates are available.',
        file: 'packages/core/src/data/types.ts',
        line: 5
      }
    ]
  },
  vue: {
    title: 'Vue 3: Reactive Harmony',
    subtitle: 'Building responsive interfaces that feel alive.',
    content: 'Vue 3\'s Composition API (ref, computed) allows us to bind the UI directly to the audio state. When the volume changes in the engine, the screen glows instantly.',
    examples: [
      { 
        label: 'Reactivity', 
        code: 'const isPlaying = ref(false);', 
        explanation: 'Changing isPlaying.value automatically updates every Play Button icon in the app.',
        file: 'apps/tonic/src/App.vue',
        line: 61 
      }
    ]
  },
  pinia: {
    title: 'Pinia: The Central Hub',
    subtitle: 'Global state for complex instruments.',
    content: 'Instead of passing props through 10 layers of components, we use Pinia to store global settings like Tempo and Global Gain. Every module "taps into" this master pulse.',
    examples: [
      { 
        label: 'Stores', 
        code: 'const store = useAudioEngineStore();', 
        explanation: 'The Audio Engine status is shared globally across the entire app via this Pinia store.',
        file: 'packages/core/src/audio/useAudioEngine.ts',
        line: 6
      }
    ]
  }
};

</script>

<template>
  <div class="atlas-module h-full flex flex-col bg-spectral-950 text-slate-200">
    <!-- Header -->
    <header class="p-8 border-b border-white/5 bg-black/20 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-black tracking-tighter text-white uppercase italic">Project Atlas</h1>
        <p class="text-[10px] uppercase tracking-[0.4em] text-indigo-400 font-bold mt-1">Source Code Explorer & Technical Manual</p>
      </div>
      
      <div class="flex items-center gap-4">
        <div class="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center gap-2">
          <div :class="['w-2 h-2 rounded-full animate-pulse', isInitialized ? 'bg-emerald-400' : 'bg-slate-500']"></div>
          <span class="text-[9px] font-black uppercase tracking-widest">{{ isInitialized ? 'Engine Live' : 'Engine Idle' }}</span>
        </div>
      </div>
    </header>

    <div class="flex-1 flex overflow-hidden">
      <!-- Sidebar Navigation -->
      <nav class="w-64 border-r border-white/5 bg-black/10 flex flex-col p-4 space-y-2 overflow-y-auto">
        <button
          v-for="section in sections"
          :key="section.id"
          @click="activeSection = section.id; selectedModule = null"
          class="w-full p-3 rounded-xl flex items-center gap-4 transition-all text-left group"
          :class="activeSection === section.id ? 'bg-indigo-500/20 text-white shadow-[0_0_20px_rgba(99,102,241,0.1)]' : 'hover:bg-white/5 text-slate-400'"
        >
          <span class="w-8 h-8 flex items-center justify-center rounded-lg bg-black/20 font-black text-[10px] group-hover:scale-110 transition-transform">
            {{ section.icon }}
          </span>
          <span class="text-[11px] font-bold uppercase tracking-widest">{{ section.label }}</span>
        </button>

        <div class="mt-8 pt-6 border-t border-white/5">
          <span class="text-[8px] font-black uppercase tracking-[0.3em] text-slate-500 px-4">The Modules</span>
          <div class="mt-4 space-y-1">
            <button
              v-for="mod in moduleList"
              :key="mod"
              @click="activeSection = 'modules'; selectedModule = mod ?? null"
              class="w-full px-4 py-2 rounded-lg text-left text-[10px] font-bold uppercase tracking-wider transition-all"
              :class="selectedModule === mod ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'"
            >
              {{ mod }}
            </button>
          </div>
        </div>
      </nav>

      <!-- Content Area -->
      <main class="flex-1 overflow-y-auto p-12 bg-pattern custom-scrollbar">
        <transition name="fade" mode="out-in">
          <div :key="activeSection + (selectedModule || '')" class="max-w-3xl mx-auto">
            
            <!-- SECTION: INTRO -->
            <div v-if="activeSection === 'intro'" class="space-y-8">
              <div class="p-10 rounded-3xl bg-indigo-500/5 border border-indigo-500/10 relative overflow-hidden group">
                <div class="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl transition-all group-hover:bg-indigo-500/20"></div>
                <h2 class="text-4xl font-black text-white tracking-tighter">Learn the Physics of Code.</h2>
                <p class="text-slate-400 mt-4 leading-relaxed text-lg">
                  Spectral Suite is more than just a music app—it's an education in modern architecture. 
                  This "Project Atlas" module breaks down <strong>why</strong> we made certain technical decisions 
                  and <strong>how</strong> the different parts talk to each other.
                </p>
                <div class="mt-8 flex gap-4">
                  <div class="p-4 rounded-2xl bg-black/40 border border-white/5 flex flex-col gap-1">
                    <span class="text-white font-black text-xl leading-none">13</span>
                    <span class="text-[8px] uppercase tracking-widest text-slate-500">Modules</span>
                  </div>
                  <div class="p-4 rounded-2xl bg-black/40 border border-white/5 flex flex-col gap-1">
                    <span class="text-white font-black text-xl leading-none">52</span>
                    <span class="text-[8px] uppercase tracking-widest text-slate-500">Composables</span>
                  </div>
                </div>
              </div>

              <!-- "The Why" Dictionary Quick View -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div v-for="(explanation, key) in importDictionary" :key="key" 
                  class="p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-indigo-500/30 transition-colors group">
                  <h4 class="text-indigo-400 font-black text-[10px] uppercase tracking-widest">{{ key }}</h4>
                  <p class="text-slate-400 text-xs mt-2 leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity">
                    {{ explanation }}
                  </p>
                </div>
              </div>
            </div>

            <!-- SECTION: TUTORIALS -->
            <div v-else-if="tutorials[activeSection as keyof typeof tutorials]" class="space-y-8">
              <header>
                <h2 class="text-4xl font-black text-white tracking-tighter">{{ tutorials[activeSection as keyof typeof tutorials].title }}</h2>
                <p class="text-indigo-400 font-bold uppercase text-[10px] tracking-widest mt-2">
                  {{ tutorials[activeSection as keyof typeof tutorials].subtitle }}
                </p>
              </header>

              <div class="p-8 rounded-3xl bg-black/20 border border-white/5 text-slate-300 leading-relaxed">
                {{ tutorials[activeSection as keyof typeof tutorials].content }}
              </div>

              <div class="space-y-4">
                <h3 class="text-xs font-black uppercase text-slate-500 tracking-[0.3em]">Code Concept</h3>
                <div v-for="example in (tutorials[activeSection as keyof typeof tutorials] as any).examples" :key="example.label"
                  class="p-6 rounded-2xl bg-spectral-900 border border-indigo-500/20 space-y-4">
                  <div class="flex items-center justify-between">
                    <span class="px-2 py-1 bg-indigo-500/20 rounded text-[9px] font-black text-indigo-300 uppercase italic">{{ example.label }}</span>
                    
                    <div v-if="example.file" class="flex items-center gap-2">
                      <span class="text-[8px] font-mono text-slate-500 opacity-50">{{ example.file.split('/').pop() }}</span>
                      <span class="text-[8px] font-bold text-indigo-400 bg-indigo-400/10 px-1.5 py-0.5 rounded leading-none">L:{{ example.line }}</span>
                    </div>
                  </div>
                  <pre class="text-emerald-400 font-mono text-sm bg-black/40 p-4 rounded-xl overflow-x-auto border border-white/5"><code>{{ example.code }}</code></pre>
                  <p class="text-slate-400 text-xs italic">{{ example.explanation }}</p>
                </div>
              </div>
            </div>

            <!-- SECTION: MODULE EXPLORER -->
            <div v-else-if="activeSection === 'modules' && selectedModule" class="space-y-8">
              <header class="flex items-center gap-6">
                <div class="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-black text-2xl">
                  {{ selectedModule.charAt(0).toUpperCase() }}
                </div>
                <div>
                  <h2 class="text-3xl font-black text-white uppercase tracking-tighter">{{ selectedModule }}</h2>
                  <p class="text-slate-500 text-[10px] uppercase tracking-widest font-bold">Module Analysis & Dependency Map</p>
                </div>
              </header>

              <div class="grid grid-cols-1 gap-6">
                <!-- Import Analysis Card -->
                <div class="p-8 rounded-3xl bg-black/40 border border-white/5 backdrop-blur-xl">
                  <h3 class="text-[10px] uppercase tracking-[0.4em] text-indigo-400 font-black mb-6">Import Analysis: The "Why"</h3>
                  
                  <div class="space-y-4">
                    <div v-for="imp in analyzedImports" :key="imp.name" 
                      class="flex flex-col md:flex-row md:items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 group hover:bg-white/10 transition-all">
                      <div class="flex items-center gap-3 min-w-[140px]">
                        <div class="w-2 h-2 rounded-full bg-emerald-500"></div>
                        <span class="font-mono text-sm text-emerald-400">{{ imp.name }}</span>
                      </div>
                      <p class="text-xs text-slate-400 leading-relaxed font-medium">
                        {{ imp.why }}
                      </p>
                    </div>
                  </div>
                </div>

                <!-- Raw Source Card -->
                <div class="p-8 rounded-3xl bg-spectral-900 border border-white/5 overflow-hidden">
                  <div class="flex items-center justify-between mb-6">
                    <h3 class="text-[10px] uppercase tracking-[0.4em] text-slate-500 font-black">Raw Component Source</h3>
                    <span class="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Read Only</span>
                  </div>
                  <div class="relative group">
                    <div class="bg-black/40 rounded-2xl border border-white/5 overflow-hidden flex max-h-[600px]">
                      <!-- Line Numbers gutter -->
                      <div class="w-10 bg-black/20 text-slate-600 font-mono text-[10px] py-6 text-right pr-3 select-none flex flex-col">
                        <span v-for="(_line, idx) in sourceLines" :key="idx" class="leading-relaxed h-4">{{ idx + 1 }}</span>
                      </div>
                      <!-- Code area -->
                      <pre class="flex-1 text-[11px] font-mono text-slate-400/80 p-6 pt-[22px] overflow-auto custom-scrollbar selection:bg-indigo-500/20 leading-relaxed"><code class="block whitespace-pre">{{ currentSource }}</code></pre>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div v-else class="py-20 flex flex-col items-center justify-center opacity-30">
              <div class="w-12 h-12 rounded-full border-2 border-dashed border-slate-600 animate-spin mb-4"></div>
              <p class="text-[10px] font-black uppercase tracking-[0.5em]">Compiling Manual...</p>
            </div>

          </div>
        </transition>
      </main>
    </div>
  </div>
</template>

<style scoped>
.bg-pattern {
  background-image: radial-gradient(circle at 2px 2px, rgba(255, 255, 255, 0.05) 1px, transparent 0);
  background-size: 40px 40px;
}

.fade-enter-active, .fade-leave-active {
  transition: all 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.1);
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 2px;
}
</style>
