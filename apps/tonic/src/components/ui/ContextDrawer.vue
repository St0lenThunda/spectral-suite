<script setup lang="ts">
/**
 * ContextDrawer
 * 
 * A responsive drawer component that behaves as:
 * - A Bottom Sheet on Mobile (< lg)
 * - A Side Panel on Desktop (>= lg)
 */
import { computed, ref } from 'vue';

const props = withDefaults( defineProps<{
  isOpen: boolean;
  /** Title shown in the header */
  title?: string;
  /** Desktop placement: 'left' or 'right'. Mobile is always 'bottom'. */
  side?: 'left' | 'right';
}>(), {
  side: 'right'
} );

const emit = defineEmits<{
  ( e: 'close' ): void;
}>();

// Desktop positioning classes
const positionClasses = computed( () => {
  return props.side === 'left'
    ? 'lg:left-0 lg:right-auto lg:rounded-r-[2rem] lg:rounded-l-none'
    : 'lg:right-0 lg:left-auto lg:rounded-l-[2rem] lg:rounded-r-none';
} );

const isMaximized = ref( false );
const containerClasses = computed( () => {
  if ( isMaximized.value ) {
    // Full Screen Override
    return 'inset-0 w-full h-full rounded-none border-0';
  }
  // Default Mobile/Desktop Mix
  return `
        bottom-0 left-0 right-0 h-[75vh] w-full rounded-t-[2rem] border-t
        lg:top-0 lg:bottom-0 lg:h-full lg:w-[480px] lg:border-y-0 lg:border-x
        ${positionClasses.value}
    `;
} );

const transitionName = computed( () => {
  // We can use different transitions based on side logic if needed, 
  // but a generic slide works well if configured in CSS.
  return props.side === 'left' ? 'slide-left' : 'slide-right';
} );
</script>

<template>
  <div class="context-drawer z-50">
    <!-- Backdrop -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if=" isOpen "
          class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[55]"
          @click="emit( 'close' )"
        ></div>
      </Transition>

      <!-- Drawer Panel -->
      <Transition :name="transitionName">
        <div
          v-if=" isOpen "
          class="fixed z-[60] bg-slate-900/90 border-white/10 backdrop-blur-xl shadow-2xl flex flex-col transition-all duration-300"
          :class="containerClasses"
        >
          <!-- Drag Handle (Mobile Only) -->
          <div class="w-full flex justify-center pt-3 pb-1 lg:hidden">
            <div class="w-12 h-1.5 rounded-full bg-white/20"></div>
          </div>

          <!-- Header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0">
            <h2 class="text-sm font-black uppercase tracking-widest text-white">
              {{ title }}
            </h2>
            <div class="flex items-center gap-2">
              <!-- Maximize/Restore Toggle -->
              <button
                @click="isMaximized = !isMaximized"
                class="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                :title="isMaximized ? 'Restore Down' : 'Maximize'"
              >
                <span v-if=" isMaximized ">↙</span>
                <span v-else>↗</span>
              </button>
              <button
                @click="emit( 'close' )"
                class="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          <!-- Scrollable Content -->
          <div class="flex-1 overflow-y-auto custom-scrollbar p-0">
            <slot :is-maximized="isMaximized"></slot>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.1);
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}

/* Animations */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Slide Right (Desktop Default) & Mobile Up Hybrid */
.slide-right-enter-active,
.slide-right-leave-active,
.slide-left-enter-active,
.slide-left-leave-active {
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

/* Mobile: Always slide up from bottom */
.slide-right-enter-from,
.slide-left-enter-from,
.slide-right-leave-to,
.slide-left-leave-to {
  transform: translateY(100%);
}

@media (min-width: 1024px) {

  /* Desktop Right: Slide from right */
  .slide-right-enter-from,
  .slide-right-leave-to {
    transform: translateX(100%);
  }

  /* Desktop Left: Slide from left */
  .slide-left-enter-from,
  .slide-left-leave-to {
    transform: translateX(-100%);
  }
}
</style>
