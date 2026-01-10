<script setup lang="ts">
/**
 * MorphContainer
 * A reusable component that handles the Quasar-style morphing transition
 * between a full panel state and a floating action button (FAB) state.
 */

const props = defineProps<{
  isMorphed: boolean;
  expandedClass?: string;
  collapsedClass?: string;
}>();

const emit = defineEmits<{
  (e: 'update:isMorphed', value: boolean): void;
}>();

const toggleMorph = (value: boolean) => {
  emit('update:isMorphed', value);
};
</script>

<template>
  <div
    class="fixed transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] z-[60] overflow-hidden group/morph"
    :class="[
      isMorphed
        ? (collapsedClass || 'w-16 h-16 left-6 bottom-22 rounded-full bg-emerald-600 shadow-2xl shadow-emerald-500/40 cursor-pointer pointer-events-auto')
        : (expandedClass || 'left-0 bottom-16 top-16 w-full max-w-md bg-slate-900 border-r border-white/10 shadow-3xl pointer-events-auto')
    ]"
  >
    <!-- Collapsed State (FAB) -->
    <div
      v-if="isMorphed"
      class="w-full h-full flex items-center justify-center animate-in zoom-in-50 duration-500"
      @click="toggleMorph(false)"
    >
      <slot name="collapsed">
        <!-- Default FAB Content if none provided -->
        <span class="text-2xl transform group-hover/morph:scale-125 transition-transform duration-300">💠</span>
      </slot>
    </div>

    <!-- Expanded State (Panel) -->
    <div
      v-else
      class="h-full flex flex-col"
    >
      <!-- Header / Morph Trigger -->
      <div 
        @click="toggleMorph(true)"
        class="cursor-pointer"
      >
        <slot name="header" />
      </div>

      <!-- Main Content -->
      <div class="flex-1 overflow-hidden">
        <slot />
      </div>

      <!-- Footer -->
      <div v-if="$slots.footer">
        <slot name="footer" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.shadow-3xl {
  box-shadow: 0 50px 100px -20px rgba(0, 0, 0, 0.5);
}
</style>
