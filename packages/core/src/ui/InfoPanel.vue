<script setup lang="ts">
import { ref } from 'vue';

interface Props {
  title: string;
  isOpen?: boolean;
}

const props = withDefaults( defineProps<Props>(), {
  isOpen: false
} );

const emit = defineEmits( ['close'] );

const show = ref( props.isOpen );

const toggle = () => {
  show.value = !show.value;
  if ( !show.value ) emit( 'close' );
};
</script>

<template>
  <div class="info-panel-container relative">
    <!-- Trigger Button -->
    <button
      @click="toggle"
      class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white transition-all text-xs font-bold uppercase tracking-widest"
    >
      <span class="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[10px]">i</span>
      Instructions
    </button>

    <!-- Overlay/Slideout -->
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="transform translate-x-full opacity-0"
      enter-to-class="transform translate-x-0 opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="transform translate-x-0 opacity-100"
      leave-to-class="transform translate-x-full opacity-0"
    >
      <div
        v-if=" show "
        class="fixed top-0 right-0 bottom-0 w-80 bg-slate-900 border-l border-slate-800 z-[60] shadow-2xl p-8 overflow-y-auto"
      >
        <div class="flex justify-between items-center mb-8">
          <h3 class="text-xs font-black uppercase tracking-[0.2em] text-sky-500">{{ title }}</h3>
          <button
            @click="toggle"
            class="text-slate-500 hover:text-white text-xl"
          >&times;</button>
        </div>

        <div class="prose prose-invert prose-sm">
          <slot></slot>
        </div>

        <div class="mt-12 pt-8 border-t border-slate-800">
          <p class="text-[10px] text-slate-600 font-mono leading-relaxed">
            SPECTRAL SUITE FRAMEWORK v1.0<br />
            MODULAR MUSIC ANALYSIS SUITE
          </p>
        </div>
      </div>
    </Transition>

    <!-- Backdrop -->
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if=" show "
        @click="toggle"
        class="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50"
      ></div>
    </Transition>
  </div>
</template>

<style scoped>
@reference "tailwindcss";

.prose :deep(h4) {
  @apply text-white text-xs font-bold uppercase tracking-widest mt-6 mb-2;
}

.prose :deep(p) {
  @apply text-slate-400 text-sm leading-relaxed mb-4;
}

.prose :deep(ul) {
  @apply space-y-2 mb-6 list-none p-0;
}

.prose :deep(li) {
  @apply text-slate-400 text-sm flex gap-2;
}

.prose :deep(li::before) {
  content: "→";
  @apply text-sky-500 font-bold;
}
</style>
