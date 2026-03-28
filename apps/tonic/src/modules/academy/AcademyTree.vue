<script setup lang="ts">
import { computed } from 'vue';
import { type Lesson, lessons } from './lessons';
import { useAcademyStore } from '../../stores/useAcademyStore';

const emit = defineEmits<{
  (e: 'start-lesson', lesson: Lesson): void;
}>();

const academyStore = useAcademyStore();

// Group lessons logically for a vertical path.
// For a tree, we can just sort by a loose "tier" based on prerequisites, 
// or simply group by category, or just use their raw order in the array.
// For now, let's just render them as a sequential connected path based on the array order,
// but styled like a vertical timeline.
const timelineNodes = computed(() => {
  return lessons.map((lesson, index) => {
    return {
      ...lesson,
      isUnlocked: academyStore.isUnlocked(lesson.prerequisites),
      isCompleted: academyStore.isCompleted(lesson.id),
      // Alternate left/right alignment for a winding path look
      alignment: index % 2 === 0 ? 'left' : 'right'
    };
  });
});

const getCategoryColorClass = (category: string) => {
  if (category === 'theory') return 'bg-indigo-500 text-indigo-100 border-indigo-400';
  if (category === 'audio') return 'bg-sky-500 text-sky-100 border-sky-400';
  if (category === 'rhythm') return 'bg-rose-500 text-rose-100 border-rose-400';
  return 'bg-slate-500 text-slate-100 border-slate-400';
};

const getCategoryTextColor = (category: string) => {
  if (category === 'theory') return 'text-indigo-400';
  if (category === 'audio') return 'text-sky-400';
  if (category === 'rhythm') return 'text-rose-400';
  return 'text-slate-400';
};

const getToolIcon = (lesson: Lesson): string => {
  const tool = lesson.steps?.[0]?.targetTool;
  const map: Record<string, string> = {
    auratune: '✨', frequencyflow: '🌊', chordcapture: '🎙️',
    pocketengine: '⏱️', scalesleuth: '🔍', harmonicorbit: '🪐'
  };
  return map[tool || ''] || '🎵';
};
</script>

<template>
  <div class="w-full h-full overflow-y-auto custom-scrollbar pt-32 pb-40 px-4 md:px-12 bg-spectral-950 relative">
    
    <!-- Background Line (Left on mobile, Center on desktop) -->
    <div class="absolute left-8 md:left-1/2 top-0 bottom-0 w-1 bg-slate-800 md:-translate-x-1/2 rounded-full opacity-50 z-0"></div>

    <div class="max-w-2xl mx-auto flex flex-col gap-8 md:gap-12 relative z-10 w-full pl-12 md:pl-0">
      <div v-for="(node, index) in timelineNodes" :key="node.id" 
           class="flex items-center w-full relative"
           :class="node.alignment === 'left' ? 'md:justify-start justify-end' : 'justify-end'">
        
        <!-- Center Connector (The actual dot on the line) -->
        <div class="absolute top-1/2 -translate-y-1/2 w-8 h-8 rounded-full border-4 border-spectral-950 flex items-center justify-center transition-all duration-300 z-20"
             :class="[
               node.alignment === 'left' 
                 ? '-left-12 md:left-auto md:-right-8 md:translate-x-1/2' 
                 : '-left-12 md:-left-8 md:-translate-x-1/2',
               node.isCompleted ? 'bg-emerald-500 shadow-[0_0_15px_rgba(52,211,153,0.5)]' : (node.isUnlocked ? getCategoryColorClass(node.category).split(' ')[0] : 'bg-slate-700')
             ]">
          <span v-if="node.isCompleted" class="text-white text-xs font-black">✓</span>
          <span v-else-if="!node.isUnlocked" class="text-slate-400 text-xs text-center leading-none mt-px w-full block">🔒</span>
          <span v-else class="text-[10px] leading-none">{{ getToolIcon(node) }}</span>
        </div>

        <!-- Node Card -->
        <button 
          @click="node.isUnlocked && emit('start-lesson', node)"
          class="relative w-full md:w-[calc(50%-2rem)] flex flex-col group text-left transition-all duration-300"
          :class="[
            node.isUnlocked ? 'hover:-translate-y-1' : 'opacity-40 grayscale cursor-not-allowed',
            node.alignment === 'left' ? 'md:items-end md:text-right items-start text-left' : 'items-start text-left'
          ]"
        >
          <!-- Card Content -->
          <div class="bg-slate-900/80 border backdrop-blur-md p-5 rounded-2xl w-full"
               :class="node.isCompleted ? 'border-emerald-500/30' : 'border-white/5'">
            <div class="text-[9px] font-black uppercase tracking-widest mb-1.5" :class="getCategoryTextColor(node.category)">
              {{ node.category }}
            </div>
            <h3 class="text-white font-black text-lg md:text-base mb-2 leading-tight">{{ node.title }}</h3>
            <p class="text-slate-400 text-xs leading-relaxed line-clamp-2 md:line-clamp-none">{{ node.description }}</p>
            
            <div class="mt-4 flex items-center gap-2" :class="node.alignment === 'left' ? 'md:justify-end justify-start' : 'justify-start'">
              <span class="text-[9px] px-2.5 py-1 rounded-full font-mono uppercase tracking-widest border"
                    :class="node.isCompleted ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-white/5 text-slate-500 border-white/10'">
                {{ node.difficulty }}
              </span>
            </div>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}
</style>
