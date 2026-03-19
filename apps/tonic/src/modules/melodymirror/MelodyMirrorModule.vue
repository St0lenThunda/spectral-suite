<template>
  <div class="h-full flex flex-col">
    <!-- Header/Nav -->
    <header class="flex-none p-6 pb-0 flex justify-between items-end">
      <div>
        <button
          @click="$emit('back')"
          class="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 hover:text-white transition-colors mb-4 flex items-center gap-2"
        >
          <span>←</span> Back to Tonic
        </button>
        <h2 class="text-3xl font-black text-white italic uppercase tracking-tighter">Melody <span
            class="text-emerald-400"
          >Mirror</span></h2>
        <p class="text-slate-500 text-[10px] font-mono uppercase tracking-[0.2em] mt-1">Ear Training & Call/Response</p>
      </div>
      
      <div class="flex items-center gap-3">
        <IntelligenceButton 
          toolId="melodymirror" 
          label="Learn & How-To"
          colorClass="text-emerald-400"
          bgClass="bg-emerald-500/10"
          borderClass="border-emerald-500/20"
        />
      </div>
    </header>

    <!-- Main Content -->
    <div class="flex-1 p-6 min-h-0">
       <MelodyMirrorPanel />
    </div>
  </div>
</template>

<script setup lang="ts">
import MelodyMirrorPanel from '../../components/MelodyMirrorPanel.vue';
import IntelligenceButton from '../../components/IntelligenceButton.vue';

defineEmits<{
  (e: 'back'): void;
}>();
</script>
