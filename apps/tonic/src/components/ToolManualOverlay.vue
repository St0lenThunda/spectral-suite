<script setup lang="ts">
import { computed } from 'vue';
import { useToolInfo } from '../composables/useToolInfo';
import { TOOL_MANUALS } from '@spectralsuite/core';

/**
 * ToolManualOverlay
 * 
 * A universal modal component that displays "How-To" manuals for any tool.
 * It uses the centralized data from @spectralsuite/core.
 */

const { isInfoModalOpen, activeToolId, closeInfo } = useToolInfo();

// Get the manual data for the currently active tool
const manual = computed( () => {
  if ( !activeToolId.value ) return null;
  return TOOL_MANUALS[activeToolId.value] || null;
} );

// Helper to get accent color with fallback
const accentColorClass = computed( () => {
  if ( !manual.value ) return 'text-blue-400';
  return `text-${manual.value.accentColor}`;
} );

const accentBgClass = computed( () => {
  if ( !manual.value ) return 'bg-blue-400';
  return `bg-${manual.value.accentColor}`;
} );

const accentBorderClass = computed( () => {
  if ( !manual.value ) return 'border-blue-400';
  return `border-${manual.value.accentColor}`;
} );
</script>

<template>
  <Transition name="overlay">
    <div
      v-if=" isInfoModalOpen && manual "
      class="fixed inset-0 z-200 flex items-center justify-center p-8 backdrop-blur-md bg-slate-950/80"
      @click.self="closeInfo"
    >
      <div
        class="bg-slate-900 border border-white/10 rounded-[3rem] max-w-2xl w-full max-h-[80vh] overflow-y-auto p-12 relative shadow-2xl animate-modal-in"
      >
        <!-- Close Button -->
        <button
          @click="closeInfo"
          class="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors"
          aria-label="Close Manual"
        >
          <span class="text-2xl font-light">✕</span>
        </button>

        <div class="space-y-12">
          <!-- Header -->
          <header>
            <h2 class="text-3xl font-black italic text-white uppercase tracking-tight mb-2">
              {{ manual.title }} <span :class="accentColorClass">{{ manual.subtitle }}</span>
            </h2>
            <p class="text-slate-500 font-mono text-[10px] uppercase tracking-widest">
              Mastering the Science of Sound
            </p>
          </header>

          <!-- Steps Loop -->
          <div class="space-y-10">
            <div
              v-for=" step in manual.steps "
              :key="step.step"
              class="flex gap-8 group"
            >
              <!-- Numbering -->
              <div
                class="flex-none w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-xl font-black italic transition-all group-hover:scale-110"
                :class="accentColorClass"
              >
                {{ step.step }}
              </div>

              <!-- Content -->
              <div class="space-y-4">
                <h4 class="text-white font-black uppercase tracking-widest text-sm">
                  {{ step.title }}
                </h4>

                <!-- The Task -->
                <div
                  class="p-4 rounded-r-xl border-l-2 bg-white/5"
                  :class="[accentBorderClass, `bg-${manual.accentColor}/10`]"
                  style="background-color: rgba(255, 255, 255, 0.02);"
                >
                  <p
                    class="text-[11px] font-bold uppercase leading-relaxed"
                    :class="accentColorClass"
                  >
                    {{ step.task }}
                  </p>
                </div>

                <!-- The Physics -->
                <div class="space-y-2">
                  <span class="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600">
                    The Science / Physics
                  </span>
                  <p class="text-slate-400 text-xs leading-relaxed italic">
                    {{ step.physics }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Final Button -->
          <button
            @click="closeInfo"
            class="w-full py-5 rounded-2xl text-white font-black uppercase tracking-[0.3em] text-[10px] opacity-90 hover:opacity-100 transition-all shadow-xl"
            :class="accentBgClass"
          >
            Got it, Let's Begin
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.z-200 {
  z-index: 200;
}

.animate-modal-in {
  animation: modal-in 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes modal-in {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(20px);
  }

  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.overlay-enter-active,
.overlay-leave-active {
  transition: opacity 0.3s ease;
}

.overlay-enter-from,
.overlay-leave-to {
  opacity: 0;
}
</style>
