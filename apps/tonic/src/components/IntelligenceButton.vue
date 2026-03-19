<script setup lang="ts">
import { useToolInfo } from '../composables/useToolInfo';

/**
 * IntelligenceButton
 * 
 * A standardized button for opening the "Intelligence" (Forensic Manual) modal.
 * This should be placed next to the settings button in every module.
 */
const props = defineProps<{
  toolId: string;
  /** Optional text label (e.g., 'Learn & How-To') */
  label?: string;
  /** Optional color class for the icon (e.g., 'text-violet-400') */
  colorClass?: string;
  /** Optional background color class for the container */
  bgClass?: string;
  /** Optional border color class */
  borderClass?: string;
}>();

const { openInfo } = useToolInfo();
</script>

<template>
  <button
    @click="openInfo( props.toolId )"
    class="flex items-center justify-center transition-all active:scale-95 group relative"
    :class="[
      props.label ? 'px-4 py-1.5 rounded-full gap-2' : 'w-10 h-10 rounded-xl',
      bgClass || 'bg-white/5',
      borderClass || 'border border-white/10',
      'hover:bg-white/10 hover:border-white/20'
    ]"
    :title="props.label ? undefined : 'Intelligence: ' + props.toolId"
  >
    <!-- The "Intelligence" Icon -->
    <span
      class="text-lg font-bold select-none"
      :class="[
        colorClass || 'text-blue-500',
        props.label ? 'text-xs' : 'text-lg'
      ]"
    >
      {{ props.label ? '💡' : '?' }}
    </span>

    <span
      v-if=" props.label "
      class="text-[9px] font-black uppercase tracking-widest"
      :class="colorClass || 'text-blue-500'"
    >
      {{ props.label }}
    </span>

    <!-- Tooltip (Only if no label) -->
    <div
      v-if=" !props.label "
      class="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-slate-900 border border-white/10 text-[8px] font-black uppercase tracking-widest text-slate-400 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50"
    >
      Intelligence
    </div>
  </button>
</template>
