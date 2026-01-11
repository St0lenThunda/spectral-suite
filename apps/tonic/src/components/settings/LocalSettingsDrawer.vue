<script setup lang="ts">
import { ref, watch } from 'vue';

interface Category {
  id: string;
  label: string;
  description: string;
  showIndicator?: boolean;
}

const props = defineProps<{
  isOpen: boolean;
  categories: Category[];
}>();

const emit = defineEmits<{
  ( e: 'close' ): void;
}>();

const activeCategory = ref<string | null>( null );

// Reset category when drawer closes
watch( () => props.isOpen, ( newVal ) => {
  if ( !newVal ) {
    setTimeout( () => {
      activeCategory.value = null;
    }, 500 ); // Wait for transition
  }
} );
</script>

<template>
  <Transition name="drawer">
    <div
      v-if=" isOpen "
      class="glass-card mb-8 p-8 rounded-[2rem] overflow-hidden"
    >
      <div class="relative">
        <!-- Level 1: Category Pills -->
        <Transition
          name="morph-swell"
          mode="out-in"
        >
          <div
            v-if=" !activeCategory "
            class="flex flex-wrap items-start content-start gap-4"
          >
            <button
              v-for=" cat in categories "
              :key="cat.id"
              @click="activeCategory = cat.id"
              class="group relative px-6 py-4 rounded-2xl bg-slate-800 border border-slate-700 hover:border-slate-500 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 text-left"
            >
              <div
                class="text-xs font-black uppercase tracking-widest text-slate-400 group-hover:text-white mb-1 transition-colors"
              >
                {{ cat.label }}
              </div>
              <div class="text-[11px] text-slate-600 group-hover:text-slate-500 italic">
                {{ cat.description }}
              </div>
              <!-- Active Indicator Dots -->
              <div
                v-if=" cat.showIndicator "
                class="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-sky-500 shadow-lg shadow-sky-500/50"
              ></div>
            </button>

            <!-- Close Button -->
            <button
              @click="emit( 'close' )"
              class="absolute top-0 right-0 p-2 text-slate-500 hover:text-white transition-colors rounded-full hover:bg-white/10"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-6 w-6"
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

          <!-- Level 2: Expanded Content -->
          <div
            v-else
            class="bg-slate-800 rounded-2xl border border-slate-700 flex flex-col overflow-hidden shadow-2xl h-[500px]"
          >
            <div class="flex-1 flex flex-col animate-content-swell">
              <!-- Header -->
              <div class="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-black/20">
                <h3 class="text-xs font-black uppercase tracking-[0.2em] text-white">
                  {{categories.find( c => c.id === activeCategory )?.label || activeCategory}}</h3>
                <button
                  @click="activeCategory = null"
                  class="text-[11px] font-bold text-slate-500 hover:text-white uppercase tracking-wider px-3 py-1.5 rounded-lg hover:bg-white/5 transition-all"
                >Done</button>
              </div>

              <!-- Scrollable Content -->
              <div class="p-6 overflow-y-auto custom-scrollbar flex-1">
                <slot :name="activeCategory"></slot>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.glass-card {
  backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  background-color: rgba(255, 255, 255, 0.02);
  transition: all 0.3s ease;
}

.drawer-enter-active,
.drawer-leave-active {
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  max-height: 600px;
  margin-bottom: 2rem;
  opacity: 1;
}

.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
  max-height: 0;
  margin-bottom: 0;
  transform: translateY(-10px);
}

.morph-swell-enter-active,
.morph-swell-leave-active {
  transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.morph-swell-enter-from,
.morph-swell-leave-to {
  opacity: 0;
  transform: scale(0.85);
}

.animate-content-swell {
  animation: content-fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards 0.2s;
  opacity: 0;
  transform: translateY(10px);
}

@keyframes content-fade-in {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Custom Scrollbar for internal content */
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

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}
</style>
