<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { type Lesson } from './lessons';
import { usePitch, useChordCapture, useRhythmStore, useScaleSleuth, Note, Chord, useAudioEngine } from '@spectralsuite/core';
import { TOOL_METADATA } from '../../data/toolMetadata';
import MorphContainer from '../../components/MorphContainer.vue';

// Audio engine lifecycle for pitch detection
const { activate, deactivate } = useAudioEngine();
onMounted( () => activate() );
onUnmounted( () => deactivate() );

const props = defineProps<{
  lesson: Lesson;
  currentModule: string;
}>();

const emit = defineEmits<{ ( e: 'complete' ): void; ( e: 'tool-change', tool: string ): void; ( e: 'quit' ): void; }>();

const currentStepIndex = ref( 0 );
const currentStep = computed( () => props.lesson.steps[currentStepIndex.value] );
const isMorphed = ref( false );

// Intelligence Hooks
const { currentNote, cents } = usePitch();
const { detectedChords, capturedNotes } = useChordCapture();
const { potentialScales, clearNotes: clearScale } = useScaleSleuth();

const rhythmStore = useRhythmStore();
const { stats: rhythmStats } = rhythmStore;
const { resetStats: resetRhythm } = rhythmStore;

const isStepComplete = ref( false );

const currentToolInfo = computed( () => {
  if ( !currentStep.value ) return null;
  return TOOL_METADATA[currentStep.value.targetTool];
} );

const isOverlayVisible = computed( () => {
  if ( !currentStep.value ) return false;
  // Always show if no specific tool is targeted (unlikely given types) OR if we are on the correct tool
  return props.currentModule === currentStep.value.targetTool;
} );

watch( [currentNote, cents, detectedChords, () => rhythmStats.perfect], ( [newNote] ) => {
  if ( isStepComplete.value ) return;
  if ( !currentStep.value ) return;
  const criteria = currentStep.value.validationCriteria;

  if ( !criteria ) {
    isStepComplete.value = true;
    return;
  }

  if ( criteria.type === 'pitch' ) {
    if ( newNote && typeof newNote === 'string' ) {
      const noteName = newNote.replace( /[0-9]/g, '' );
      if ( noteName === criteria.target ) {
        isStepComplete.value = true;
      }
    }
  }

  if ( criteria.type === 'chord' ) {
    const match = detectedChords.value.some( ch => {
      const baseSymbol = ch.symbol.split( '/' )[0];
      return baseSymbol === criteria.target || ch.name === criteria.target;
    } );

    if ( match ) {
      isStepComplete.value = true;
      return;
    }

    if ( typeof criteria.target === 'string' ) {
      try {
        const targetChord = Chord.get( criteria.target );
        const requiredNotes = targetChord.notes.map( n => Note.get( n ).pc );
        const hasAllNotes = requiredNotes.every( req => capturedNotes.value.includes( req ) );
        if ( hasAllNotes && requiredNotes.length > 0 ) {
          isStepComplete.value = true;
        }
      } catch ( e ) {
        // invalid chord target
      }
    }
  }

  if ( criteria.type === 'rhythm' ) {
    const requiredHits = Number( criteria.target );
    if ( rhythmStats.perfect >= requiredHits ) {
      isStepComplete.value = true;
    }
  }

  if ( criteria.type === 'scale' ) {
    const match = potentialScales.value.some( s => s.name === criteria.target );
    if ( match ) isStepComplete.value = true;
  }
} );

watch( currentStep, ( newStep ) => {
  if ( !newStep ) return;
  if ( newStep.validationCriteria?.type === 'rhythm' ) resetRhythm();
  if ( newStep.validationCriteria?.type === 'scale' ) clearScale();
  isStepComplete.value = !newStep.validationCriteria;
  emit( 'tool-change', newStep.targetTool );
}, { immediate: true } );

function nextStep () {
  if ( currentStepIndex.value < props.lesson.steps.length - 1 ) {
    currentStepIndex.value++;
    isStepComplete.value = false;
  } else { emit( 'complete' ); }
}
</script>

<template>
  <MorphContainer
    v-model:isMorphed="isMorphed"
    v-show="isOverlayVisible"
  >
    <!-- FAB Morph -->
    <template #collapsed>
      <div class="relative">
        <span class="text-2xl transform group-hover/runner:scale-125 transition-transform duration-300">🎓</span>
        <div class="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full animate-pulse border-2 border-emerald-600">
        </div>
      </div>
    </template>

    <!-- Header -->
    <template #header>
      <div
        class="p-3 border-b border-white/5 bg-white/5 hover:bg-white/10 transition-colors relative group/header"
        title="Minimize Lesson"
      >
        <div class="flex items-center justify-between pointer-events-none">
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-1">
              <div class="text-[9px] font-black text-emerald-400 uppercase tracking-[0.3em] opacity-80">Spectral Academy
              </div>
              <span
                class="text-[8px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-black uppercase tracking-widest border border-emerald-500/20"
              >
                {{ currentToolInfo?.name || 'Lab' }}
              </span>
            </div>
            <h2 class="text-lg font-black text-white font-outfit leading-none">{{ lesson.title }}</h2>
          </div>

          <div class="flex items-center gap-3 pointer-events-auto">
            <button
              @click.stop="emit( 'quit' )"
              class="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-slate-500 hover:bg-rose-500/20 hover:text-rose-400 transition-all transform hover:scale-110 group/quit"
              title="Quit Lesson"
            >
              <span class="text-[10px] font-black">✕</span>
            </button>
            <div
              class="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-slate-500 group-hover/header:bg-white/10 group-hover/header:text-white transition-all transform hover:scale-110"
            >
              <span class="text-[10px]">−</span>
            </div>
          </div>
        </div>
        <div class="flex gap-1 mt-3">
          <div
            v-for=" ( step, i ) in lesson.steps "
            :key="step.id"
            class="h-1 flex-1 rounded-full transition-all duration-500"
            :class="[i < currentStepIndex ? 'bg-emerald-500' : i === currentStepIndex ? 'bg-emerald-400 animate-pulse' : 'bg-white/10']"
          ></div>
        </div>
      </div>
    </template>

    <!-- Content -->
    <div
      v-if=" currentStep "
      class="h-full p-8 overflow-y-auto custom-scrollbar"
    >
      <h3 class="text-xl font-bold text-white mb-4">{{ currentStep.title }}</h3>
      <div class="prose prose-invert prose-emerald leading-relaxed text-slate-300">
        <p>{{ currentStep.content }}</p>
      </div>

      <div
        v-if=" currentStep.validationCriteria "
        class="mt-8 p-4 rounded-xl border-2 transition-all duration-300"
        :class="isStepComplete ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-700 bg-slate-800/50'"
      >
        <div class="flex items-center gap-3">
          <div
            class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg"
            :class="isStepComplete ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400'"
          >{{ isStepComplete ? '✓' : '?' }}</div>
          <div class="flex-1">
            <div class="text-sm font-bold text-white">Challenge</div>
            <div class="text-xs text-slate-400">
              {{ isStepComplete ? 'Target Acquired!' : `Find: ${currentStep.validationCriteria.target}` }}
            </div>

            <div
              v-if=" !isStepComplete "
              class="mt-3 flex flex-col gap-2"
            >
              <!-- Live Pitch Feedback -->
              <div
                v-if=" currentStep.validationCriteria.type === 'pitch' || currentStep.validationCriteria.type === 'chord' "
                class="text-[10px] font-mono p-2 bg-black/30 rounded text-slate-400"
              >
                <div
                  v-if=" currentNote "
                  class="flex justify-between items-center"
                >
                  <span>Live: <span class="text-white">{{ currentNote }}</span></span>
                  <span class="text-[8px]">{{ cents > 0 ? '+' : '' }}{{ Math.round( cents ) }}¢</span>
                </div>
                <span
                  v-else
                  class="opacity-50"
                >Waiting for input...</span>
              </div>

              <!-- Chord Roman Numeral Feedback -->
              <div
                v-if=" currentStep.validationCriteria.type === 'chord' && detectedChords.length > 0 "
                class="p-2 bg-indigo-500/10 rounded border border-indigo-500/20 flex items-center justify-between"
              >
                <span class="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Detected</span>
                <div class="flex items-baseline gap-2">
                  <span class="text-sm font-black text-white">{{ detectedChords[0]?.symbol }}</span>
                  <span class="text-[10px] font-black text-indigo-400 italic">{{ detectedChords[0]?.roman }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Rhythm Feedback -->
      <div
        v-if=" !isStepComplete && currentStep?.validationCriteria?.type === 'rhythm' "
        class="mt-8 p-4 rounded-xl border-2 border-slate-700 bg-slate-800/50"
      >
        <div class="flex items-center gap-3">
          <div class="text-3xl">🥁</div>
          <div>
            <div class="text-sm font-bold text-white">Rhythm Challenge</div>
            <div class="text-xs text-slate-400">Get <span
                class="text-white font-bold">{{ currentStep?.validationCriteria?.target }}</span> perfect hits in a row.
            </div>
            <div class="mt-2 text-[10px] font-mono p-1 bg-black/30 rounded text-slate-400">
              Current: <span class="text-emerald-400 font-bold">{{ rhythmStats.perfect }}</span> /
              {{ currentStep?.validationCriteria?.target }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <template #footer>
      <div class="p-4 border-t border-white/5 bg-white/5">
        <button
          @click="nextStep"
          :disabled="!isStepComplete"
          class="w-full h-8 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all duration-500 border relative overflow-hidden group/btn"
          :class="isStepComplete ? 'bg-emerald-500 border-emerald-400 text-white shadow-xl shadow-emerald-500/20 hover:scale-[1.02] active:scale-95' : 'bg-white/5 border-white/5 text-slate-600 cursor-not-allowed'"
        >
          <span
            class="relative z-10">{{ currentStepIndex === lesson.steps.length - 1 ? 'Archive Lesson (Finish)' : 'Sequence Next Step →' }}</span>
        </button>
      </div>
    </template>
  </MorphContainer>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.1);
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {

  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: .5;
  }
}
</style>
