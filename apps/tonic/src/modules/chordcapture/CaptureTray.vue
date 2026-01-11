<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  capturedNotes: string[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'clearNotes'): void;
}>();

const hasNotes = computed(() => props.capturedNotes.length > 0);
</script>

<template>
  <div class="w-full rounded-[2rem] bg-black/20 border border-white/5 backdrop-blur-sm overflow-hidden flex flex-col">
    <!-- Header -->
    <div class="p-6 border-b border-white/5 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
        <span class="text-[10px] font-black uppercase tracking-widest text-indigo-300">Capture Tray</span>
      </div>
      <span class="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{{ capturedNotes.length }} Items</span>
    </div>

    <!-- Content -->
    <div class="p-6 min-h-[120px] max-h-[400px] overflow-y-auto custom-scrollbar">
      <template v-if="hasNotes">
        <div class="flex flex-col gap-3">
          <div 
            v-for="(note, index) in capturedNotes" 
            :key="`${note}-${index}`" 
            class="animate-fade-in-up"
          >
            <div class="w-full p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between group hover:bg-white/10 transition-colors">
              <span class="text-xl font-bold font-mono text-white">{{ note }}</span>
              <span class="text-[9px] font-black text-slate-600 uppercase tracking-widest group-hover:text-slate-400 transition-colors">Seq {{ index + 1 }}</span>
            </div>
          </div>
        </div>
      </template>
      
      <div v-else class="h-full flex flex-col items-center justify-center text-center py-8 opacity-40">
        <div class="text-3xl mb-3 grayscale opacity-50">📥</div>
        <p class="text-[9px] font-black uppercase tracking-widest text-slate-500">Waiting for input</p>
      </div>
    </div>

    <!-- Footer / Actions -->
    <div v-if="hasNotes" class="p-4 border-t border-white/5 bg-white/[0.02]">
      <button 
        @click="emit('clearNotes')" 
        class="w-full py-4 rounded-xl bg-red-500/10 border border-red-500/20 text-[10px] font-black uppercase tracking-widest text-red-400 hover:bg-red-500/20 transition-all active:scale-95"
      >
        Reset Sequence
      </button>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background-color: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 9999px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in-up {
  animation: fade-in-up 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
</style>
