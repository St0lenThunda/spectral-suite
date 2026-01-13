<script setup lang="ts">
/**
 * ToastContainer.vue
 * 
 * Global toast notification container. Place this once at the app root level.
 * Toasts appear in a fixed position (bottom-right) and slide in/out smoothly.
 */
import { useToast } from '../composables/useToast';

const { toasts, dismissToast } = useToast();

const typeStyles = {
  info: 'bg-sky-500/90 border-sky-400/50 text-white',
  success: 'bg-emerald-500/90 border-emerald-400/50 text-white',
  warning: 'bg-amber-500/90 border-amber-400/50 text-black',
  error: 'bg-rose-500/90 border-rose-400/50 text-white',
};

const typeIcons = {
  info: 'ℹ️',
  success: '✓',
  warning: '⚠️',
  error: '✕',
};
</script>

<template>
  <!-- Fixed container in bottom-right corner -->
  <div class="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm pointer-events-none">
    <TransitionGroup name="toast">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="pointer-events-auto rounded-xl border backdrop-blur-md shadow-2xl overflow-hidden"
        :class="typeStyles[toast.type]"
      >
        <div class="flex items-start gap-3 p-4">
          <!-- Icon -->
          <div class="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold shrink-0">
            {{ typeIcons[toast.type] }}
          </div>
          
          <!-- Content -->
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium leading-snug">{{ toast.message }}</p>
            
            <!-- Action Button -->
            <button
              v-if="toast.action"
              @click="toast.onAction?.()"
              class="mt-2 text-xs font-black uppercase tracking-widest underline underline-offset-2 hover:no-underline transition-all"
            >
              {{ toast.action }}
            </button>
          </div>
          
          <!-- Dismiss Button -->
          <button
            @click="dismissToast(toast.id)"
            class="w-5 h-5 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-[10px] shrink-0 transition-all"
          >
            ✕
          </button>
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

.toast-move {
  transition: transform 0.3s ease;
}
</style>
