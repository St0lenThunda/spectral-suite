<script setup lang="ts">
/**
 * DiagnosticBanner.vue
 * A compact, passive warning banner for use in audio tool modules.
 *
 * Shows contextual issues detected by the useInputDiagnostics composable.
 * Collapses to nothing when there are no issues.
 *
 * Users can dismiss the banner with the × button.
 * If the issue changes (e.g. fixed then broken again), the banner reappears.
 */
import { ref, watch } from 'vue';
import { useInputDiagnostics } from '@spectralsuite/core';

const { activeIssues, overallHealth, applyQuickFix } = useInputDiagnostics();

/**
 * Tracks whether the user dismissed the current banner.
 * Resets to false whenever the set of active issues changes,
 * so new problems will always show.
 */
const isDismissed = ref( false );

/**
 * Watch for changes in the issue list.
 * If issues change (e.g. new issue appears, or issue resolves then recurs),
 * we reset the dismissed state so the user sees the new status.
 */
watch(
  () => activeIssues.value.map( i => i.id ).join( ',' ),
  () => { isDismissed.value = false; }
);
</script>

<template>
  <Transition name="slide-fade">
    <div
      v-if=" activeIssues.length > 0 && !isDismissed "
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
      <div class="flex items-center gap-2 shrink-0">
        <button
          v-if=" activeIssues[0]?.quickFix "
          @click="applyQuickFix( activeIssues[0]?.quickFix! )"
          class="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
          :class="{
            'bg-rose-500 hover:bg-rose-400 text-white': overallHealth === 'error',
            'bg-amber-500 hover:bg-amber-400 text-black': overallHealth === 'warning',
          }"
        >
          Fix
        </button>
        <!-- Dismiss button: hides the banner until the issue set changes -->
        <button
          @click="isDismissed = true"
          class="w-6 h-6 rounded-full flex items-center justify-center transition-all hover:bg-white/10"
          :class="{
            'text-rose-400': overallHealth === 'error',
            'text-amber-400': overallHealth === 'warning',
          }"
          title="Dismiss"
        >
          <span class="text-sm font-bold">×</span>
        </button>
      </div>
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
