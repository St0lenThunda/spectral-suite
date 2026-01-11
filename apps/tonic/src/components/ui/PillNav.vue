<script setup lang="ts">
/**
 * PillNav.vue
 * A generic UI component that creates a "segmented control" or "pill toggle".
 * It features a sliding background animation that morphs between options.
 * 
 * Educational Note: This component uses Vue's "FLIP" animation concept implicitly
 * by calculating the position of the active element and moving the background div 
 * to match it using CSS transforms.
 */
import { computed, ref, watch, nextTick, onMounted } from 'vue';

/**
 * Definition of a single navigation option.
 */
interface Option {
  label: string; // Text to display
  value: string; // Internal ID
  icon?: string; // Optional emoji or icon character
  color?: string; // Optional tailwind color class override
}

// "Props" are how data flows DOWN from a parent component to this child.
// We basically say: "I need a list of options and the currently selected value."
const props = defineProps<{
  options: Option[];
  modelValue: string; // 'modelValue' is the standard name for v-model in Vue 3
}>();

// "Emits" are how data flows UP from this child to the parent.
// When a button is clicked, we tell the parent to update the value.
const emit = defineEmits<{
  ( e: 'update:modelValue', value: string ): void;
}>();

// ref() creates a reactive reference to a value.
// We use generic <HTMLElement | null> because initially the DOM isn't mounted yet.
const navRef = ref<HTMLElement | null>( null );

// The style object for the floating background pill.
// We use reactive style binding to animate its position (transform) and size (width).
const indicatorStyle = ref( {
  width: '0px',
  transform: 'translateX(0px)',
  opacity: '0'
} );

// computed() creates a value that auto-updates whenever its dependencies change.
// Here, activeIndex automatically recalculates if 'props.modelValue' changes.
const activeIndex = computed( () =>
  props.options.findIndex( opt => opt.value === props.modelValue )
);

/**
 * Calculates the position and width of the selected button
 * and moves the background indicator to match it.
 */
const updateIndicator = async () => {
  // await nextTick() waits for Vue to finish updating the DOM.
  // This ensures the buttons are in their final position before we measure them.
  await nextTick();
  if ( !navRef.value ) return;

  const buttons = navRef.value.querySelectorAll( 'button' );
  const activeBtn = buttons[activeIndex.value];

  if ( activeBtn ) {
    // We measure the button's position relative to its parent container.
    const { offsetLeft, offsetWidth } = activeBtn as HTMLElement;

    // Apply those measurements to the floating background pill.
    indicatorStyle.value = {
      width: `${offsetWidth}px`,
      transform: `translateX(${offsetLeft}px)`,
      opacity: '1' // Fade in once positioned
    };
  }
};

// watch() listens for changes to a specific source (props.modelValue)
// and runs a callback (updateIndicator) whenever it changes.
watch( () => props.modelValue, updateIndicator );

onMounted( () => {
  // We wait a tiny bit to ensure the layout engine has fully settled styles
  // (like fonts loading) which might affect button width.
  setTimeout( updateIndicator, 50 );
} );
</script>

<template>
  <div
    ref="navRef"
    class="relative flex items-center bg-black/20 border border-white/5 rounded-full p-2"
  >
    <!-- Background Moving Pill -->
    <div
      class="absolute top-2 bottom-2 bg-indigo-500 rounded-full transition-all duration-300 shadow-lg shadow-indigo-500/25 ease-out"
      :style="indicatorStyle"
    ></div>

    <!-- Nav Items -->
    <button
      v-for=" opt in options "
      :key="opt.value"
      @click="emit( 'update:modelValue', opt.value )"
      class="relative z-10 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-colors duration-300 flex items-center gap-2 outline-none focus:outline-none"
      :class="modelValue === opt.value ? 'text-white' : 'text-slate-500 hover:text-slate-300'"
    >
      <span
        v-if=" opt.icon "
        class="text-sm"
      >{{ opt.icon }}</span>
      {{ opt.label }}
    </button>
  </div>
</template>
