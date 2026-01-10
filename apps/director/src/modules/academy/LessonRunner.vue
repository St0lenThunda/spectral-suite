<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { type Lesson } from './lessons';
import { usePitch, useChordCapture, Note, Chord } from '@spectralsuite/core';

const props = defineProps<{ lesson: Lesson; }>();

const emit = defineEmits<{ ( e: 'complete' ): void; ( e: 'tool-change', tool: string ): void; }>();

const currentStepIndex = ref( 0 );
const currentStep = computed( () => props.lesson.steps[currentStepIndex.value] );

// Intelligence Hooks
const { currentNote, cents } = usePitch();
const { detectedChords, capturedNotes } = useChordCapture();

const isStepComplete = ref( false );

watch( [currentNote, cents, detectedChords], ( [newNote] ) => {
  if ( isStepComplete.value ) return;
  if ( !currentStep.value ) return;
  const criteria = currentStep.value.validationCriteria;

  if ( !criteria ) {
    // No validation needed for this step, just reading
    isStepComplete.value = true;
    return;
  }

  if ( criteria.type === 'pitch' ) {
    // If the tuner says it's the right note (ignoring octave), that's good enough!
    // e.g. 'A2' matches target 'A'
    if ( newNote ) {
      const noteName = newNote.replace( /[0-9]/g, '' );
      if ( noteName === criteria.target ) {
        isStepComplete.value = true;
      }
    }
  }

  if ( criteria.type === 'chord' ) {
    // Strategy 1: exact symbol match (already handled slash chords)
    const match = detectedChords.value.some( ch => {
      const baseSymbol = ch.symbol.split( '/' )[0];
      return baseSymbol === criteria.target || ch.name === criteria.target;
    } );

    if ( match ) {
      isStepComplete.value = true;
      return;
    }

    // Strategy 2: Constituent Note Check (Robust for guitar/noise)
    // If target is "C", we need [C, E, G] in the buffer. Extras allowed.
    if ( typeof criteria.target === 'string' ) {
      try {
        const targetChord = Chord.get( criteria.target );
        const requiredNotes = targetChord.notes.map( n => Note.get( n ).pc ); // ['C', 'E', 'G']

        // Check if ALL required notes are in the captured buffer
        const hasAllNotes = requiredNotes.every( req => capturedNotes.value.includes( req ) );

        if ( hasAllNotes && requiredNotes.length > 0 ) {
          isStepComplete.value = true;
        }
      } catch ( e ) {
        // invalid chord target, ignore
      }
    }
  }
} );

watch( currentStep, ( newStep ) => {
  if ( !newStep ) return;
  isStepComplete.value = !newStep.validationCriteria; // Auto-complete if no validation
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
  <div class="h-full flex flex-col bg-slate-900 border-r border-slate-700 w-full max-w-md shadow-2xl z-10">
    <!-- Header -->
    <div class="p-6 border-b border-slate-800 bg-slate-800/50">
      <div class="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">Spectral Academy</div>
      <h2 class="text-2xl font-black text-white font-outfit">{{ lesson.title }}</h2>
      <div class="flex gap-1 mt-4">
        <div
          v-for=" ( step, i ) in lesson.steps "
          :key="step.id"
          class="h-1 flex-1 rounded-full transition-all duration-300"
          :class="i <= currentStepIndex ? 'bg-emerald-500' : 'bg-slate-700'"
        ></div>
      </div>
    </div>

    <!-- Content -->
    <div
      v-if=" currentStep "
      class="flex-1 p-8 overflow-y-auto"
    >
      <h3 class="text-xl font-bold text-white mb-4">{{ currentStep.title }}</h3>
      <div class="prose prose-invert prose-emerald leading-relaxed text-slate-300">
        <p>{{ currentStep.content }}</p>
      </div>

      <!-- Challenge Status -->
      <div
        v-if=" currentStep.validationCriteria "
        class="mt-8 p-4 rounded-xl border-2 transition-all duration-300"
        :class="isStepComplete ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-700 bg-slate-800/50'"
      >
        <div class="flex items-center gap-3">
          <div
            class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg"
            :class="isStepComplete ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400'"
          >
            {{ isStepComplete ? '✓' : '?' }}
          </div>
          <div>
            <div class="text-sm font-bold text-white">Challenge</div>
            <div class="text-xs text-slate-400">
              {{ isStepComplete ? 'Target Acquired!' : `Find note: ${currentStep.validationCriteria.target}` }}
            </div>
            <!-- Live Feedback -->
            <div
              v-if=" !isStepComplete "
              class="mt-2 text-[10px] font-mono p-1 bg-black/30 rounded text-slate-400"
            >
              <span v-if=" currentNote ">Live: <span class="text-white">{{ currentNote }}</span>
                ({{ cents > 0 ? '+' : '' }}{{ Math.round( cents ) }}¢)</span>
              <span
                v-else
                class="opacity-50"
              >Waiting for input...</span>
            </div>

            <div
              v-if=" !isStepComplete && currentStep.validationCriteria?.type === 'chord' "
              class="mt-2 text-[10px] font-mono p-1 bg-black/30 rounded text-slate-400"
            >
              <span v-if=" detectedChords.length > 0 ">
                Chord: <span class="text-emerald-400 font-bold">{{ detectedChords[0]?.symbol }}</span>
                ({{ detectedChords[0]?.name }})
              </span>
              <span
                v-else
                class="opacity-50"
              >Play notes to detect chord...</span>
            </div>

            <!-- Debug: Captured Notes -->
            <div
              v-if=" !isStepComplete && currentStep.validationCriteria?.type === 'chord' "
              class="mt-2 text-[10px] font-mono text-slate-500"
            >
              Notes: {{ capturedNotes.join( ', ' ) || '(none)' }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="p-6 border-t border-slate-800">
      <button
        @click="nextStep"
        :disabled="!isStepComplete"
        class="w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center gap-2"
        :class="isStepComplete
          ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/20'
          : 'bg-slate-800 text-slate-500 cursor-not-allowed'"
      >
        <span>{{ currentStepIndex === lesson.steps.length - 1 ? 'Finish Lesson' : 'Next Step' }}</span>
        <span v-if=" isStepComplete ">→</span>
      </button>
    </div>
  </div>
</template>
