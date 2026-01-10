<script setup lang="ts">
/**
 * MorphContainer
 * 
 * This is a shared UI component that manages a "Morphing" transition.
 * It allows a small UI element (like a Floating Action Button) to expand
 * smoothly into a large panel (like a sidebar or a lesson runner).
 * 
 * This pattern is useful for keeping the interface clean while providing
 * quick access to deep functionality without a page reload.
 */

/**
 * Prop Definitions
 * 
 * @param isMorphed - Boolean state: true = FAB (collapsed), false = Panel (expanded)
 * @param expandedClass - Custom CSS classes for the expanded state
 * @param collapsedClass - Custom CSS classes for the collapsed state
 */
defineProps<{
  isMorphed: boolean;
  expandedClass?: string;
  collapsedClass?: string;
}>();

/**
 * Event Definitions
 * We use 'update:isMorphed' to support Vue's v-model two-way binding.
 */
const emit = defineEmits<{
  (e: 'update:isMorphed', value: boolean): void;
}>();

/**
 * Toggles the morph state.
 * When the user clicks the FAB or the Panel header, we emit the new state
 * back to the parent component.
 */
const toggleMorph = (value: boolean) => {
  emit('update:isMorphed', value);
};
</script>

<template>
  <!-- 
    The Outer Container:
    We use 'fixed' positioning so the element floats above all other content.
    The 'ease-[cubic-bezier(...)]' is a "bouncy" animation curve that makes
     the expansion feel organic and premium rather than mechanical.
  -->
  <div
    class="fixed transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] z-[60] overflow-hidden group/morph"
    :class="[
      isMorphed
        ? (collapsedClass || 'w-16 h-16 left-6 bottom-22 rounded-full bg-emerald-600 shadow-2xl shadow-emerald-500/40 cursor-pointer pointer-events-auto')
        : (expandedClass || 'left-0 bottom-16 top-16 w-full max-w-md bg-slate-900 border-r border-white/10 shadow-3xl pointer-events-auto')
    ]"
  >
    <!-- 
      Collapsed State (FAB):
      Shown when isMorphed is true. We use 'animate-in' from Tailwind
      to provide a smooth entry when the panel collapses back into the button.
    -->
    <div
      v-if="isMorphed"
      class="w-full h-full flex items-center justify-center animate-in zoom-in-50 duration-500"
      @click="toggleMorph(false)"
    >
      <slot name="collapsed">
        <!-- Default FAB Content: A diamond icon that scales up on hover -->
        <span class="text-2xl transform group-hover/morph:scale-125 transition-transform duration-300">💠</span>
      </slot>
    </div>

    <!-- 
      Expanded State (Panel):
      Shown when isMorphed is false.
    -->
    <div
      v-else
      class="h-full flex flex-col"
    >
      <!-- 
        Header / Morph Trigger:
        Clicking the header collapses the panel back into the FAB.
      -->
      <div 
        @click="toggleMorph(true)"
        class="cursor-pointer"
      >
        <slot name="header" />
      </div>

      <!-- Main Content Area with its own scroll behavior -->
      <div class="flex-1 overflow-hidden">
        <slot />
      </div>

      <!-- Optional Footer slot for action buttons -->
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
