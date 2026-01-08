<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useToolInfo } from '../composables/useToolInfo';
import { TOOL_METADATA } from '../data/toolMetadata';

const { isInfoModalOpen, activeToolId, closeInfo } = useToolInfo();

const activeTab = ref( 'visuals' );

const metadata = computed( () => {
  if ( !activeToolId.value ) return null;
  return TOOL_METADATA[activeToolId.value];
} );

const tabs = [
  { id: 'visuals', label: 'What am I seeing' },
  { id: 'instructions', label: 'Instructions' },
  { id: 'application', label: 'Practical Application' },
  { id: 'theory', label: 'How it works' },
];

const handleKeydown = ( e: KeyboardEvent ) => {
  if ( e.key === 'Escape' && isInfoModalOpen.value ) {
    closeInfo();
  }
};

onMounted( () => window.addEventListener( 'keydown', handleKeydown ) );
onUnmounted( () => window.removeEventListener( 'keydown', handleKeydown ) );
</script>

<template>
  <Transition name="fade">
    <div
      v-if=" isInfoModalOpen && metadata "
      class="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-8"
    >
      <!-- Backdrop -->
      <div
        class="absolute inset-0 bg-black/60 backdrop-blur-xl transition-opacity"
        @click="closeInfo"
      ></div>

      <!-- Modal Card -->
      <div
        class="relative w-full max-w-2xl bg-[#0a0c10] border border-white/10 rounded-[3rem] shadow-2xl shadow-black/80 overflow-hidden flex flex-col max-h-[90vh]"
        @click.stop
      >
        <!-- Header -->
        <header class="p-8 pb-4 flex justify-between items-start">
          <div>
            <div class="flex items-center gap-3 mb-1">
              <span class="text-blue-500 font-mono text-[10px] uppercase tracking-[0.4em]">Forensic Manual</span>
              <div class="h-px w-8 bg-blue-500/30"></div>
            </div>
            <h2 class="text-3xl font-black text-white italic tracking-tighter uppercase whitespace-nowrap">
              {{ metadata.name }} <span class="text-blue-500 underline decoration-indigo-500/50">Intelligence</span>
            </h2>
          </div>
          <button
            @click="closeInfo"
            class="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all"
          >
            ✕
          </button>
        </header>

        <!-- Tabs Navigation -->
        <nav class="flex px-8 border-b border-white/5 gap-6">
          <button
            v-for=" tab in tabs "
            :key="tab.id"
            @click="activeTab = tab.id"
            class="pb-4 text-[10px] font-black uppercase tracking-widest transition-all relative"
            :class="activeTab === tab.id ? 'text-blue-500' : 'text-slate-500 hover:text-slate-300'"
          >
            {{ tab.label }}
            <div
              v-if=" activeTab === tab.id "
              class="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
            ></div>
          </button>
        </nav>

        <!-- Content Area -->
        <div class="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <Transition
            name="slide-fade"
            mode="out-in"
          >
            <div
              :key="activeTab"
              class="space-y-6"
            >
              <div
                v-if=" activeTab === 'visuals' "
                class="animate-in fade-in slide-in-from-bottom-4"
              >
                <p class="text-lg text-slate-300 leading-relaxed font-medium italic">
                  "{{ metadata.whatAmISeeing }}"
                </p>
              </div>

              <div
                v-if=" activeTab === 'instructions' "
                class="space-y-4 animate-in fade-in slide-in-from-bottom-4"
              >
                <div class="p-6 rounded-3xl bg-blue-500/5 border border-blue-500/10">
                  <div class="flex items-center gap-3 mb-4">
                    <div class="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                    <span class="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">Deployment
                      Protocol</span>
                  </div>
                  <pre class="whitespace-pre-wrap font-sans text-slate-400 leading-loose">{{ metadata.instructions }}
                  </pre>
                </div>
              </div>

              <div
                v-if=" activeTab === 'application' "
                class="animate-in fade-in slide-in-from-bottom-4"
              >
                <div class="flex gap-4 items-start">
                  <div class="text-3xl text-blue-500/50">🎯</div>
                  <p class="text-slate-400 leading-relaxed italic border-l-2 border-white/5 pl-4">
                    {{ metadata.practicalApplication }}
                  </p>
                </div>
              </div>

              <div
                v-if=" activeTab === 'theory' "
                class="animate-in fade-in slide-in-from-bottom-4"
              >
                <div class="p-8 rounded-3xl bg-indigo-500/5 border border-indigo-500/10 font-mono">
                  <h4 class="text-indigo-400 text-[10px] font-bold uppercase mb-4 tracking-[0.3em]">//
                    LOGICAL_ENGINEERING_DATA</h4>
                  <p class="text-xs text-slate-400 leading-relaxed">
                    {{ metadata.howItWorks }}
                  </p>
                  <div class="mt-6 flex gap-2">
                    <span
                      class="px-2 py-1 bg-indigo-500/10 rounded text-[9px] text-indigo-400 border border-indigo-500/20"
                    >FFT_ACTIVE</span>
                    <span
                      class="px-2 py-1 bg-indigo-500/10 rounded text-[9px] text-indigo-400 border border-indigo-500/20"
                    >BUFFER_OPTIMIZED</span>
                    <span
                      class="px-2 py-1 bg-indigo-500/10 rounded text-[9px] text-indigo-400 border border-indigo-500/20"
                    >REAL_TIME</span>
                  </div>
                </div>
              </div>
            </div>
          </Transition>
        </div>

        <!-- Footer -->
        <footer class="p-6 bg-white/[0.02] border-t border-white/5 flex justify-between items-center">
          <span class="text-[8px] font-mono text-slate-700 uppercase tracking-[0.5em]">SPECTRAL SUITE FORENSIC DATABASE
            v1.02</span>
          <button
            @click="closeInfo"
            class="px-6 py-2 rounded-full bg-blue-600/10 border border-blue-500/20 text-blue-500 text-[9px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all transform active:scale-95"
          >
            Acknowledged
          </button>
        </footer>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.2s cubic-bezier(1, 0.5, 0.8, 1);
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateY(10px);
  opacity: 0;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}
</style>
