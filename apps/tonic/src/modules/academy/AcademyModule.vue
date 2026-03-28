<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { type Lesson } from './lessons';
import { useNavLayout } from '../../composables/useNavLayout';

const { showNavs } = useNavLayout();

const emit = defineEmits<{
  ( e: 'tool-request', tool: string ): void;
  ( e: 'start-lesson', lesson: Lesson ): void;
  ( e: 'back' ): void;
}>();

import AcademyMap from './AcademyMap.vue';
import AcademyTree from './AcademyTree.vue';

const viewMode = ref<'map' | 'tree'>('map');
const userOverride = ref(false);

const setViewMode = (mode: 'map' | 'tree') => {
  userOverride.value = true;
  viewMode.value = mode;
};

const checkMobile = () => {
  if (window.innerWidth < 768) {
    // Force tree view on mobile devices, ignoring any previous override
    viewMode.value = 'tree';
  } else {
    // On desktop, default to map unless user explicitly chose tree
    if (!userOverride.value) {
      viewMode.value = 'map';
    }
  }
};

onMounted(() => {
  checkMobile();
  window.addEventListener('resize', checkMobile);
});

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile);
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
  <div class="relative w-full h-[calc(100vh-16rem)] min-h-[600px] rounded-[3rem] overflow-hidden border border-white/5 shadow-2xl bg-spectral-950">

    <!-- Absolute Layer for the Map (Takes up full space) -->
    <div class="absolute inset-0 z-0">
      <AcademyTree v-if="viewMode === 'tree'" @start-lesson="startLesson" />
      <AcademyMap v-else @start-lesson="startLesson" />
    </div>

    <!-- UI Overlay (Header) -->
    <div class="absolute top-0 left-0 right-0 p-6 md:p-8 z-10 pointer-events-none transition-transform duration-500 ease-out will-change-transform"
         :class="showNavs ? 'translate-y-0' : '-translate-y-full'">
      <div class="max-w-7xl mx-auto flex flex-col md:flex-row md:items-start justify-between pointer-events-auto gap-4">
        <div>
          <button
            @click="emit( 'back' )"
            class="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 hover:text-white transition-colors mb-4 flex items-center gap-2 bg-slate-900/50 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/5"
          >
            <span>←</span> Back to Tonic
          </button>
          <h1 class="text-4xl md:text-6xl font-black text-white mb-2 font-outfit uppercase tracking-tighter drop-shadow-2xl">
            Spectral <span class="text-emerald-400">Academy</span>
          </h1>
          <p class="text-lg text-slate-300 font-mono tracking-widest uppercase text-[10px] bg-slate-900/50 inline-block px-3 py-1 rounded backdrop-blur-md border border-white/5">
            // Curriculum {{ viewMode === 'tree' ? 'Path' : 'Constellation Alpha' }}
          </p>
        </div>
        
        <!-- Toggle Button (Desktop Only) -->
        <div class="hidden md:flex bg-slate-900/50 backdrop-blur-md border border-white/5 rounded-full p-1">
           <button @click="setViewMode('tree')" 
                   class="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all"
                   :class="viewMode === 'tree' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'">
             Path
           </button>
           <button @click="setViewMode('map')" 
                   class="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all"
                   :class="viewMode === 'map' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'">
             Map
           </button>
        </div>
      </div>
    </div>
  </div>
</template>
