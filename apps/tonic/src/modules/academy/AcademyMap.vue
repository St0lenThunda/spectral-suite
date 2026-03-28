<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { type Lesson, lessons } from './lessons';
import { useAcademyStore } from '../../stores/useAcademyStore';

const academyStore = useAcademyStore();

const emit = defineEmits<{
  (e: 'start-lesson', lesson: Lesson): void;
}>();

// Pan & Zoom State
const pan = ref({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
const scale = ref(0.8);
const isDragging = ref(false);
const dragStart = ref({ x: 0, y: 0 });

// Tooltip State
const hoveredLesson = ref<Lesson | null>(null);
const tooltipPos = ref({ x: 0, y: 0 });

const onLessonHover = (lesson: Lesson | null, e?: MouseEvent) => {
  hoveredLesson.value = lesson;
  if (e) {
    tooltipPos.value = { x: e.clientX + 20, y: e.clientY + 20 };
  }
};
const onLessonMove = (e: MouseEvent) => {
  if (hoveredLesson.value) {
    tooltipPos.value = { x: e.clientX + 20, y: e.clientY + 20 };
  }
};

// Handle Drag Panning
const startDrag = (e: MouseEvent) => {
  isDragging.value = true;
  dragStart.value = { x: e.clientX - pan.value.x, y: e.clientY - pan.value.y };
};

const onDrag = (e: MouseEvent) => {
  if (!isDragging.value) return;
  const newX = e.clientX - dragStart.value.x;
  const newY = e.clientY - dragStart.value.y;
  
  // Keep boundaries so user doesn't get infinitely lost
  const BOUND = 2500 * scale.value;
  pan.value = {
    x: Math.max(window.innerWidth / 2 - BOUND, Math.min(window.innerWidth / 2 + BOUND, newX)),
    y: Math.max(window.innerHeight / 2 - BOUND, Math.min(window.innerHeight / 2 + BOUND, newY))
  };
};

const stopDrag = () => {
  isDragging.value = false;
};

// Handle Scroll Zooming
const onWheel = (e: WheelEvent) => {
  e.preventDefault();
  const zoomFactor = -e.deltaY * 0.001;
  const newScale = Math.min(Math.max(0.15, scale.value + zoomFactor), 4);
  
  // Center zoom on mouse pointer
  const mouseSvgX = (e.clientX - pan.value.x) / scale.value;
  const mouseSvgY = (e.clientY - pan.value.y) / scale.value;
  
  pan.value = {
    x: e.clientX - mouseSvgX * newScale,
    y: e.clientY - mouseSvgY * newScale
  };
  
  scale.value = newScale;
};

// Recenter functionality
const recenterMap = () => {
  pan.value = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  scale.value = 0.8;
};

// SVG Window Resize
onMounted(() => {
  window.addEventListener('mouseup', stopDrag);
  window.addEventListener('mouseleave', stopDrag);
});
onUnmounted(() => {
  window.removeEventListener('mouseup', stopDrag);
  window.removeEventListener('mouseleave', stopDrag);
});

// Build Connections Map
// Returns an array of edges { x1, y1, x2, y2 } for drawing lines
const connections = computed(() => {
  const edges: { x1: number, y1: number, x2: number, y2: number, category: string, lessonId: string, parentId: string }[] = [];
  lessons.forEach(lesson => {
    if (lesson.prerequisites && lesson.prerequisites.length > 0) {
      lesson.prerequisites.forEach(preReqId => {
        const parent = lessons.find(l => l.id === preReqId);
        if (parent) {
          edges.push({
            x1: parent.x,
            y1: parent.y,
            x2: lesson.x,
            y2: lesson.y,
            category: lesson.category,
            lessonId: lesson.id,
            parentId: parent.id
          });
        }
      });
    }
  });
  return edges;
});

// Node styling rules
const getCategoryColor = (category: string) => {
  if (category === 'theory') return '#6366f1'; // Indigo 500
  if (category === 'audio') return '#0ea5e9'; // Sky 500
  if (category === 'rhythm') return '#f43f5e'; // Rose 500
  return '#94a3b8'; // Slate 400
};

const getCategoryGradient = (category: string) => {
  if (category === 'theory') return 'url(#glow-theory)';
  if (category === 'audio') return 'url(#glow-audio)';
  if (category === 'rhythm') return 'url(#glow-rhythm)';
  return 'none';
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
  <div class="relative w-full h-full overflow-hidden bg-spectral-950 cursor-grab active:cursor-grabbing selection:bg-transparent"
       @mousedown="startDrag"
       @mousemove="onDrag"
       @wheel="onWheel"
  >
    <!-- Background Grid / Stars (Optional Polish) -->
    <div class="absolute inset-0 opacity-10 pointer-events-none" style="background-image: radial-gradient(circle, #fff 1px, transparent 1px); background-size: 40px 40px;"></div>

    <svg class="w-full h-full">
      <!-- Defs for glow effects -->
      <defs>
        <radialGradient id="glow-audio" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#0ea5e9" stop-opacity="0.8" />
          <stop offset="100%" stop-color="#0ea5e9" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="glow-theory" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#6366f1" stop-opacity="0.8" />
          <stop offset="100%" stop-color="#6366f1" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="glow-rhythm" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#f43f5e" stop-opacity="0.8" />
          <stop offset="100%" stop-color="#f43f5e" stop-opacity="0" />
        </radialGradient>
      </defs>

      <!-- Pan & Zoom Layer -->
      <g :transform="`translate(${pan.x}, ${pan.y}) scale(${scale})`" class="transition-transform duration-75 ease-out">
        
        <!-- Prerequisite Connector Lines -->
        <g v-for="(edge, i) in connections" :key="'edge-'+i">
          <!-- Outer glow line -->
          <line :x1="edge.x1" :y1="edge.y1" :x2="edge.x2" :y2="edge.y2" 
                :stroke="getCategoryColor(edge.category)" stroke-width="4" stroke-opacity="0.2" stroke-linecap="round" />
          <!-- Inner core line -->
          <line :x1="edge.x1" :y1="edge.y1" :x2="edge.x2" :y2="edge.y2" 
                :stroke="academyStore.isCompleted(edge.lessonId) && academyStore.isCompleted(edge.parentId) ? '#34d399' : (academyStore.isCompleted(edge.parentId) ? '#94a3b8' : '#334155')" 
                stroke-width="2" stroke-dasharray="6,4" stroke-linecap="round" 
                class="transition-colors duration-500" />
        </g>

        <!-- Nodes -->
        <g v-for="lesson in lessons" :key="lesson.id" 
           :transform="`translate(${lesson.x}, ${lesson.y})`"
           :class="['group', academyStore.isUnlocked(lesson.prerequisites) ? 'cursor-pointer' : 'cursor-not-allowed opacity-40 grayscale']"
           @mouseenter="onLessonHover(lesson, $event)"
           @mousemove="onLessonMove($event)"
           @mouseleave="onLessonHover(null)"
           @mousedown.stop
           @click.stop="academyStore.isUnlocked(lesson.prerequisites) && emit('start-lesson', lesson)">
          
          <!-- Large invisible hit area -->
          <circle cx="0" cy="0" r="50" fill="transparent" />

          <!-- Outer Glow (Hover Expansion) -->
          <circle cx="0" cy="0" r="35" :fill="getCategoryGradient(lesson.category)" 
                  class="opacity-0 transition-all duration-500 ease-out"
                  :class="academyStore.isUnlocked(lesson.prerequisites) ? 'group-hover:opacity-100 group-hover:r-[50px]' : ''" />

          <!-- Inner Node Body -->
          <circle cx="0" cy="0" r="24" :fill="getCategoryColor(lesson.category)" class="opacity-20 transition-opacity" 
                  :class="academyStore.isUnlocked(lesson.prerequisites) ? 'group-hover:opacity-40' : ''" />
          
          <!-- Node Outline -->
          <circle cx="0" cy="0" r="20" fill="#0f172a" stroke-width="3" 
                  class="transition-all duration-300"
                  :stroke="academyStore.isCompleted(lesson.id) ? '#34d399' : getCategoryColor(lesson.category)"
                  :class="[
                    academyStore.isUnlocked(lesson.prerequisites) ? 'group-hover:stroke-[4px] group-hover:scale-110' : '',
                    academyStore.isCompleted(lesson.id) ? 'drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]' : ''
                  ]" />
          
          <!-- Status Icon -->
          <text v-if="academyStore.isCompleted(lesson.id)" x="0" y="6" text-anchor="middle" font-size="20" fill="#34d399" font-weight="900" class="pointer-events-none drop-shadow-md">✓</text>
          <text v-else-if="!academyStore.isUnlocked(lesson.prerequisites)" x="0" y="6" text-anchor="middle" font-size="14" fill="#64748b" class="pointer-events-none drop-shadow-md">🔒</text>
          <text v-else x="0" y="6" text-anchor="middle" font-size="16" class="pointer-events-none">{{ getToolIcon(lesson) }}</text>

          <!-- Lesson Title & Difficulty -->
          <g transform="translate(0, 40)" class="transition-all duration-300 group-hover:translate-y-2">
            <!-- Label Background Pill -->
            <rect x="-75" y="-12" width="150" height="24" rx="12" fill="#0f172a" opacity="0.8" />
            <rect x="-75" y="-12" width="150" height="24" rx="12" fill="none" :stroke="getCategoryColor(lesson.category)" stroke-width="1" stroke-opacity="0.5" />
            <!-- Text -->
            <text x="0" y="4" text-anchor="middle" fill="#f8fafc" font-size="10" font-weight="bold" font-family="sans-serif" class="tracking-wider drop-shadow-lg">
              {{ lesson.title.length > 20 ? lesson.title.substring(0, 20) + '...' : lesson.title }}
            </text>
            <text x="0" y="20" text-anchor="middle" :fill="getCategoryColor(lesson.category)" font-size="8" font-family="monospace" class="uppercase tracking-widest opacity-80">
              {{ lesson.difficulty }}
            </text>
          </g>
        </g>
      </g>
    </svg>
    
    <!-- Zoom / Recenter Controls Overlay -->
    <div class="absolute bottom-8 right-8 flex flex-col gap-2 z-40">
      <button @click="recenterMap" 
              class="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700 text-white hover:bg-emerald-500/20 hover:border-emerald-500 hover:text-emerald-400 transition-all flex items-center justify-center"
              title="Recenter Map">
        <span class="text-xs font-black">◎</span>
      </button>
      <button @click="scale = Math.min(4, scale + 0.2)" 
              class="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700 text-white hover:bg-slate-700 transition-all flex items-center justify-center">
        <span class="text-xs font-black">＋</span>
      </button>
      <button @click="scale = Math.max(0.15, scale - 0.2)" 
              class="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700 text-white hover:bg-slate-700 transition-all flex items-center justify-center">
        <span class="text-xs font-black">－</span>
      </button>
    </div>

    <!-- Hover Tooltip -->
    <div v-if="hoveredLesson" 
         class="absolute z-50 pointer-events-none p-4 rounded-xl bg-slate-900/90 border border-white/10 backdrop-blur-md shadow-2xl max-w-xs transition-opacity duration-200"
         :style="`left: ${tooltipPos.x}px; top: ${tooltipPos.y}px`">
      <div class="flex items-center gap-2 mb-2">
        <span class="text-[10px] font-black uppercase tracking-widest" :style="`color: ${getCategoryColor(hoveredLesson.category)}`">
           {{ hoveredLesson.category }}
        </span>
        <span v-if="academyStore.isCompleted(hoveredLesson.id)" class="text-[10px] font-black uppercase tracking-widest text-emerald-400">
           • Completed
        </span>
        <span v-else-if="!academyStore.isUnlocked(hoveredLesson.prerequisites)" class="text-[10px] font-black uppercase tracking-widest text-slate-500">
           • Locked
        </span>
      </div>
      <h3 class="text-white font-bold mb-1">{{ hoveredLesson.title }}</h3>
      <p class="text-slate-400 text-xs leading-relaxed">{{ hoveredLesson.description }}</p>
      
      <div v-if="!academyStore.isUnlocked(hoveredLesson.prerequisites) && hoveredLesson.prerequisites?.length" class="mt-3 pt-3 border-t border-white/5">
        <div class="text-[9px] uppercase tracking-widest text-slate-500 mb-1">Requires:</div>
        <div class="flex flex-col gap-1">
           <div v-for="req in hoveredLesson.prerequisites" :key="req" 
                class="text-xs" :class="academyStore.isCompleted(req) ? 'text-emerald-500/50 line-through' : 'text-slate-300'">
              {{ lessons.find(l => l.id === req)?.title || req }}
           </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Prevent text selection during drag */
svg {
  user-select: none;
}
</style>
