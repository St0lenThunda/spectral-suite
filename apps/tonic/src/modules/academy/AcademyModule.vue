<script setup lang="ts">
import { computed, ref } from 'vue';
import { lessons, type Lesson } from './lessons';

const emit = defineEmits<{
  ( e: 'tool-request', tool: string ): void;
  ( e: 'start-lesson', lesson: Lesson ): void;
  ( e: 'back' ): void;
}>();

type SortMode = 'recommended' | 'difficulty' | 'title' | 'tool';
const currentSort = ref<SortMode>('recommended');

const difficultyOrder = { 'beginner': 1, 'intermediate': 2, 'advanced': 3 };

/**
 * Tool metadata containing icons and colors for each tool module.
 * This is used to display the tool icon on each lesson card.
 */
const TOOL_ICONS: Record<string, { icon: string; color: string }> = {
  auratune: { icon: '✨', color: 'from-sky-500 to-blue-600' },
  chordcapture: { icon: '🎙️', color: 'from-indigo-500 to-purple-600' },
  pocketengine: { icon: '⏱️', color: 'from-rose-500 to-orange-600' },
  frequencyflow: { icon: '🌊', color: 'from-cyan-500 to-blue-600' },
  tracktracer: { icon: '🧪', color: 'from-blue-600 to-cyan-500' },
  harmonicorbit: { icon: '🎡', color: 'from-indigo-600 to-sky-500' },
  scalesleuth: { icon: '🔍', color: 'from-violet-500 to-purple-600' },
  chordforge: { icon: '🎸', color: 'from-amber-500 to-orange-600' },
  melodymirror: { icon: '👂', color: 'from-emerald-500 to-teal-600' },
  dashboard: { icon: '🏠', color: 'from-slate-500 to-gray-600' }
};

/**
 * Gets the primary tool used in a lesson.
 * This is determined by looking at the first step's targetTool.
 */
function getLessonTool(lesson: Lesson): string {
  return lesson.steps?.[0]?.targetTool || '';
}

/**
 * Gets the icon emoji for a given tool.
 * Returns a default icon if the tool is not found.
 */
function getToolIcon(toolId: string): string {
  return TOOL_ICONS[toolId]?.icon || '🎵';
}

const sortedLessons = computed(() => {
  const list = [...lessons];
  if (currentSort.value === 'difficulty') {
    return list.sort((a, b) => difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty]);
  }
  if (currentSort.value === 'title') {
    return list.sort((a, b) => a.title.localeCompare(b.title));
  }
  if (currentSort.value === 'tool') {
    return list.sort((a, b) => getLessonTool(a).localeCompare(getLessonTool(b)));
  }
  return list;
});

function startLesson ( lesson: Lesson ) {
  emit( 'start-lesson', lesson );
  // Initialize with tool from first step
  const firstStep = lesson.steps && lesson.steps[0];
  if ( firstStep ) {
    emit( 'tool-request', firstStep.targetTool );
  }
}
</script>

<style scoped>
.list-move, /* apply transition to moving elements */
.list-enter-active,
.list-leave-active {
  transition: all 0.5s cubic-bezier(0.55, 0, 0.1, 1);
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

/* ensure leaving items are taken out of layout flow so that moving
   items can be calculated correctly. */
.list-leave-active {
  position: absolute; 
}
</style>

<template>
  <div class="h-full w-full">

    <!-- Lesson Catalog -->
    <div class="h-full p-8 overflow-y-auto">
      <div class="max-w-4xl mx-auto">
        <div class="flex justify-between items-end mb-8">
          <div>
            <button
              @click="emit( 'back' )"
              class="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 hover:text-white transition-colors mb-6 flex items-center gap-2"
            >
              <span>←</span> Back to Tonic
            </button>
            <h1 class="text-4xl md:text-5xl font-black text-white mb-4 font-outfit uppercase tracking-tighter">
              Spectral <span class="text-emerald-400">Academy</span>
            </h1>
            <p class="text-xl text-slate-400">
              Master the science of sound through active experimentation.
            </p>
          </div>

          <!-- Sort Controls -->
          <div class="flex flex-col items-end gap-2">
            <span class="text-xs font-bold uppercase tracking-wider text-slate-500">Sort By</span>
            <div class="flex bg-slate-800/80 rounded-lg p-1 border border-slate-700/50 backdrop-blur-sm">
              <button
                v-for=" sort in ['recommended', 'difficulty', 'title', 'tool'] "
                :key="sort"
                @click="currentSort = sort as any"
                class="px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all"
                :class="currentSort === sort ? 'bg-emerald-500 text-slate-900 shadow-lg shadow-emerald-500/25' : 'text-slate-400 hover:text-white hover:bg-slate-700'"
              >
                {{ sort }}
              </button>
            </div>
          </div>
        </div>

        <TransitionGroup
          name="list"
          tag="div"
          class="grid grid-cols-1 md:grid-cols-2 gap-6 relative"
        >
          <div
            v-for=" lesson in sortedLessons "
            :key="lesson.id"
            @click="startLesson( lesson )"
            class="group bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-emerald-500/50 rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-500/10 hover:-translate-y-1"
          >
            <div class="flex justify-between items-start mb-4">
              <div class="flex items-center gap-2">
                <span class="text-2xl">{{ getToolIcon(getLessonTool(lesson)) }}</span>
                <span
                  class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                  :class="{
                    'bg-indigo-500/20 text-indigo-400': lesson.category === 'theory',
                    'bg-rose-500/20 text-rose-400': lesson.category === 'audio',
                    'bg-amber-500/20 text-amber-400': lesson.category === 'rhythm'
                  }"
                >
                  {{ lesson.category }}
                </span>
              </div>
              <span class="text-xs text-slate-500 font-mono">{{ lesson.difficulty }}</span>
            </div>

            <h3 class="text-2xl font-bold text-white mb-2 group-hover:text-emerald-400 transition-colors">
              {{ lesson.title }}
            </h3>
            <p class="text-slate-400 leading-relaxed">{{ lesson.description }}</p>

            <div
              class="mt-6 flex items-center gap-2 text-emerald-500 font-bold text-sm opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0"
            >
              Start Lesson <span>→</span>
            </div>
          </div>
        </TransitionGroup>
      </div>
    </div>
  </div>
</template>
