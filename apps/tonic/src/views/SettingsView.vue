<script setup lang="ts">
/**
 * SettingsView.vue
 * The main configuration page for the application.
 * 
 * Architecture Note:
 * This view accepts "Tools" as props rather than importing them directly.
 * This is a pattern called "Inversion of Control" or "Pure Component design",
 * making this view easier to test and reuse because it doesn't know *where* the data comes from.
 */
import { ref } from 'vue';
import PillNav from '../components/ui/PillNav.vue';
import EngineSettings from '../components/settings/EngineSettings.vue';

// Props to accept tools data passed from App.vue
// We do this to avoid tightly coupling with App.vue state if not using a Store
interface Tool {
  id: string;
  name: string;
  description: string;
  icon: string;
}

/**
 * Props Definition
 * Explicitly typed interface to ensure parent components (App.vue)
 * pass exactly what we need.
 */
interface SettingsProps {
  tools: Tool[];
  enabledCallback: ( id: string ) => void;
  enabledState: Record<string, boolean>;
  initialTab?: string;
}

const props = defineProps<SettingsProps>();

// Local state for the tab switcher (Platform vs Engine)
const activeTab = ref( props.initialTab || 'platform' );

const navOptions = [
  { label: 'Platform Modules', value: 'platform', icon: '🧩' },
  { label: 'Engine Options', value: 'engine', icon: '⚙️' }
];

const toggleTool = ( id: string ) => {
  // Callback pattern: We don't change the state ourselves; 
  // we ask the "owner" of the state (App.vue) to do it.
  props.enabledCallback( id );
};
</script>

<template>
  <div class="animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-3xl mx-auto w-full">
    <header class="mb-12 flex flex-col items-center text-center">
      <h2 class="text-3xl font-black tracking-tighter text-white mb-2 uppercase">System Config</h2>
      <p class="text-slate-500 font-mono text-[10px] uppercase tracking-widest mb-8">Modular Registry & Audio Kernel</p>

      <!-- Top Level Navigation -->
      <PillNav
        v-model="activeTab"
        :options="navOptions"
      />
    </header>

    <!-- TAB 1: Platform Modules -->
    <div
      v-if=" activeTab === 'platform' "
      class="space-y-6 animate-fade-in"
    >
      <div class="bg-white/5 border border-white/5 rounded-[3rem] p-10 backdrop-blur-xl">
        <h3 class="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400 mb-8">Installed Modules</h3>

        <div class="space-y-4">
          <div
            v-for=" tool in tools "
            :key="tool.id"
            class="flex items-center justify-between p-6 rounded-3xl bg-black/20 border border-white/5 hover:bg-white/5 transition-colors group"
          >
            <div class="flex items-center gap-4">
              <div
                class="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform"
              >{{ tool.icon }}</div>
              <div>
                <h4 class="font-bold text-white leading-none mb-1">{{ tool.name }}</h4>
                <p class="text-[10px] text-slate-500 font-mono uppercase tracking-wider">{{ tool.description }}</p>
              </div>
            </div>

            <button
              @click="toggleTool( tool.id )"
              class="w-14 h-8 rounded-full transition-all flex items-center p-1 relative"
              :class="enabledState[tool.id] ? 'bg-indigo-500' : 'bg-slate-800'"
            >
              <div
                class="w-6 h-6 bg-white rounded-full shadow-lg transform transition-transform"
                :class="enabledState[tool.id] ? 'translate-x-6' : 'translate-x-0'"
              ></div>
            </button>
          </div>
        </div>

        <div class="mt-8 pt-8 border-t border-white/5 text-center">
          <p class="text-[10px] text-slate-600 font-mono leading-relaxed uppercase tracking-widest">
            Plug-and-play architecture active. <br>
            Add folders to <code class="text-indigo-500">apps/</code> to register new tools.
          </p>
        </div>
      </div>
    </div>

    <!-- TAB 2: Engine Options -->
    <div
      v-if=" activeTab === 'engine' "
      class="space-y-6 animate-fade-in"
    >
      <!-- Reusable Engine Settings Module -->
      <EngineSettings />

      <!-- Placeholder for future engine settings -->
      <div
        class="w-full bg-white/5 border border-white/5 rounded-[2rem] p-6 backdrop-blur-sm opacity-50 cursor-not-allowed"
      >
        <div class="flex items-center gap-3 mb-4">
          <div class="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-lg">🎤</div>
          <div>
            <h3 class="text-white font-bold text-sm">Input Processor</h3>
            <p class="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Noise Gate & Gain</p>
          </div>
        </div>
        <div class="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
          <div class="h-full w-2/3 bg-emerald-500/30"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
</style>
