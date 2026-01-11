<script setup lang="ts">
/**
 * SettingsModal.vue
 * A full-screen overlay that wraps the SettingsView.
 * Allows configuration without leaving the current module context.
 */
import SettingsView from '../../views/SettingsView.vue';

// Define the shape of Tool data we need to pass down
interface Tool {
  id: string;
  name: string;
  description: string;
  icon: string;
}

interface Props {
  show: boolean;
  initialTab?: string;
  tools: Tool[];
  enabledState: Record<string, boolean>;
  enabledCallback: ( id: string ) => void;
}

defineProps<Props>();

const emit = defineEmits<{
  ( e: 'close' ): void
}>();
</script>

<template>
  <transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="opacity-0 translate-y-4 scale-95"
    enter-to-class="opacity-100 translate-y-0 scale-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="opacity-100 translate-y-0 scale-100"
    leave-to-class="opacity-0 translate-y-4 scale-95"
  >
    <div
      v-if=" show "
      class="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6"
    >
      <!-- Backdrop -->
      <div
        class="absolute inset-0 bg-black/60 backdrop-blur-sm"
        @click="$emit( 'close' )"
      ></div>

      <!-- Floating Card Container -->
      <div
        class="relative w-full max-w-2xl bg-slate-900/95 border border-white/10 rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
      >
        <!-- Header / Close Button Area -->
        <div class="absolute top-4 right-4 z-50">
          <button
            @click="$emit( 'close' )"
            class="w-10 h-10 rounded-full bg-slate-800 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center active:scale-95"
            title="Close Settings"
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

        <!-- Scrollable Content -->
        <div class="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8">
          <SettingsView
            :initial-tab="initialTab || 'platform'"
            :tools="tools"
            :enabled-state="enabledState"
            :enabled-callback="enabledCallback"
          />
        </div>
      </div>
    </div>
  </transition>
</template>
