<script setup lang="ts">
import { lessons, type Lesson } from './lessons';

const emit = defineEmits<{
  ( e: 'tool-request', tool: string ): void;
  ( e: 'start-lesson', lesson: Lesson ): void;
}>();

function startLesson ( lesson: Lesson ) {
  emit( 'start-lesson', lesson );
  // Initialize with tool from first step
  const firstStep = lesson.steps && lesson.steps[0];
  if ( firstStep ) {
    emit( 'tool-request', firstStep.targetTool );
  }
}
</script>

<template>
  <div class="h-full w-full">

    <!-- Lesson Catalog -->
    <div class="h-full p-8 overflow-y-auto">
      <div class="max-w-4xl mx-auto">
        <div class="mb-12">
          <h1 class="text-4xl md:text-5xl font-black text-white mb-4 font-outfit uppercase tracking-tighter">
            Spectral <span class="text-emerald-400">Academy</span>
          </h1>
          <p class="text-xl text-slate-400">
            Master the science of sound through active experimentation.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div
            v-for=" lesson in lessons "
            :key="lesson.id"
            @click="startLesson( lesson )"
            class="group bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-emerald-500/50 rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-500/10 hover:-translate-y-1"
          >
            <div class="flex justify-between items-start mb-4">
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
        </div>
      </div>
    </div>
  </div>
</template>
