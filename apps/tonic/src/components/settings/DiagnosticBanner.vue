<script setup lang="ts">
/**
 * DiagnosticBanner.vue
 * A compact, passive warning banner for use in audio tool modules.
 *
 * Shows contextual issues detected by the useInputDiagnostics composable.
 * Collapses to nothing when there are no issues.
 */
import { useInputDiagnostics } from '@spectralsuite/core';

const { activeIssues, overallHealth, applyQuickFix } = useInputDiagnostics();
</script>

<template>
  <Transition name="slide-fade">
    <div
      v-if="activeIssues.length > 0"
      class="mb-6 p-4 rounded-2xl border flex items-center justify-between gap-4"
      :class="{
        'bg-rose-500/10 border-rose-500/30': overallHealth === 'error',
        'bg-amber-500/10 border-amber-500/30': overallHealth === 'warning',
      }"
    >
      <div class="flex items-center gap-3">
        <div
          class="w-2 h-2 rounded-full animate-pulse"
          :class="{
            'bg-rose-500': overallHealth === 'error',
            'bg-amber-500': overallHealth === 'warning',
          }"
        ></div>
        <div>
          <p
            class="text-xs font-bold"
            :class="{
              'text-rose-400': overallHealth === 'error',
              'text-amber-400': overallHealth === 'warning',
            }"
          >{{ activeIssues[0]?.message }}</p>
          <p class="text-[10px] text-slate-400 mt-0.5">{{ activeIssues[0]?.action }}</p>
        </div>
      </div>
      <button
        v-if="activeIssues[0]?.quickFix"
        @click="applyQuickFix(activeIssues[0]?.quickFix!)"
        class="shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
        :class="{
          'bg-rose-500 hover:bg-rose-400 text-white': overallHealth === 'error',
          'bg-amber-500 hover:bg-amber-400 text-black': overallHealth === 'warning',
        }"
      >
        Fix
      </button>
    </div>
  </Transition>
</template>

<style scoped>
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s ease;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
