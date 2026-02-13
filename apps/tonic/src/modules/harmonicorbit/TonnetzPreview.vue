<script setup lang="ts">
/**
 * TonnetzPreview — Mini Tonnetz Accordion for the Harmonic Orbit
 *
 * This component renders a small, non-interactive Tonnetz lattice inside the
 * Orbit's right panel ("Diatonic Zoom"). It shows the currently selected
 * triad's immediate neighbors, giving the user a visual "teaser" of the
 * Tonnetz without leaving the Orbit.
 *
 * It uses `inject()` to read the Orbit's selection state (which key and
 * chord type are currently selected) so we don't need any props.
 *
 * The "Explore Full Tonnetz →" button emits an event that the parent
 * Orbit module forwards to App.vue to navigate to the standalone tool.
 *
 * @module modules/harmonicorbit/TonnetzPreview
 */

import { ref, inject, computed } from 'vue';
import {
  HARMONIC_SELECTION_KEY,
  HARMONIC_NAVIGATE_KEY
} from '../../composables/harmonicKeys';
import { useHarmonicTheory } from '../../composables/useHarmonicTheory';
import TonnetzLattice from '../../components/TonnetzLattice.vue';

// ─── COMPOSABLES ────────────────────────────────────────────────────

const { pitchClassName, pitchClassIndex } = useHarmonicTheory();

// ─── INJECT SELECTION STATE ─────────────────────────────────────────

/**
 * Inject the harmonic selection state from the parent Orbit module.
 *
 * `inject()` retrieves whatever the nearest ancestor `provide()`d
 * with the same key. If no ancestor provides it, we get `undefined`.
 *
 * The `?` (optional chaining) in the template guards against this case.
 */
const selection = inject( HARMONIC_SELECTION_KEY );
const navigation = inject( HARMONIC_NAVIGATE_KEY );

// ─── ACCORDION STATE ────────────────────────────────────────────────

/**
 * Whether the accordion is expanded or collapsed.
 * Starts collapsed to keep the Orbit panel clean.
 */
const isExpanded = ref( false );

// ─── COMPUTED TRIAD ─────────────────────────────────────────────────

/**
 * Computes the triad pitch class names for the currently selected chord.
 *
 * If a valid selection exists, we build the triad from the selected
 * key's chord based on its type (major, minor, dim, etc.).
 *
 * The triad is computed from the currently active key data rather
 * than being stored separately — single source of truth.
 */
const highlightNotes = computed<string[]>( () => {
  if ( !selection || selection.selectedKeyIdx.value === null ) return [];

  const keys = selection.activeKeys.value;
  const idx = selection.selectedKeyIdx.value;
  const key = keys[idx];
  if ( !key ) return [];

  const type = selection.selectedType.value;

  // Determine the root note based on the selected chord type
  let rootName = '';
  let triadType: 'major' | 'minor' = 'major';

  if ( type === 'major' ) {
    rootName = key.major;
    triadType = 'major';
  } else if ( type === 'ii' ) {
    rootName = key.ii.replace( 'm', '' );
    triadType = 'minor';
  } else if ( type === 'iii' ) {
    rootName = key.iii.replace( 'm', '' );
    triadType = 'minor';
  } else if ( type === 'vi' || type === 'minor' ) {
    rootName = key.vi.replace( 'm', '' );
    triadType = 'minor';
  } else if ( type === 'dim' ) {
    rootName = key.dim.replace( 'dim', '' );
    triadType = 'minor'; // Using minor shape for display simplicity
  }

  if ( !rootName ) return [];

  const rootPc = pitchClassIndex( rootName );

  if ( triadType === 'major' ) {
    return [
      rootName,
      pitchClassName( rootPc + 4 ), // Major 3rd
      pitchClassName( rootPc + 7 )  // Perfect 5th
    ];
  } else {
    return [
      rootName,
      pitchClassName( rootPc + 3 ), // minor 3rd
      pitchClassName( rootPc + 7 )  // Perfect 5th
    ];
  }
} );

/**
 * The center note for the mini lattice — defaults to the root of
 * the selected triad so the triangle is always visible.
 */
const centerNote = computed( () => {
  if ( highlightNotes.value.length > 0 ) return highlightNotes.value[0]!;
  return 'C';
} );
</script>

<template>
  <!--
    Tonnetz Preview Accordion
    Collapsible section with smooth height transition.
  -->
  <div class="mt-4 rounded-2xl border border-violet-500/10 overflow-hidden transition-all duration-400">

    <!-- Accordion Header — always visible -->
    <button
      @click="isExpanded = !isExpanded"
      class="w-full flex items-center justify-between px-5 py-3 bg-violet-500/5 hover:bg-violet-500/10 transition-colors"
    >
      <div class="flex items-center gap-2">
        <span class="text-violet-400 text-sm">🔺</span>
        <span class="text-[10px] font-black text-violet-400 uppercase tracking-widest">
          Tonnetz Preview
        </span>
      </div>

      <!-- Rotating chevron icon -->
      <svg
        class="w-4 h-4 text-violet-400 transition-transform duration-300"
        :class="{ 'rotate-180': isExpanded }"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M19 9l-7 7-7-7"
        />
      </svg>
    </button>

    <!-- Accordion Body — collapsible with smooth height transition -->
    <div
      class="tonnetz-accordion-body"
      :class="{ 'is-expanded': isExpanded }"
    >
      <div class="p-4">
        <!-- Mini Lattice -->
        <div class="rounded-xl overflow-hidden bg-spectral-950/30 border border-white/5">
          <TonnetzLattice
            :width="280"
            :height="180"
            :center-note="centerNote"
            :visible-radius="1"
            :interactive="false"
            :highlight-triad="highlightNotes"
            :show-transform-labels="false"
          />
        </div>

        <!-- "Explore Full Tonnetz" Link -->
        <button
          v-if=" navigation "
          @click="navigation.navigateToTonnetz()"
          class="w-full mt-3 px-4 py-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20
                 text-[10px] font-black text-violet-400 uppercase tracking-widest
                 hover:bg-violet-500/20 hover:border-violet-500/40 transition-all
                 flex items-center justify-center gap-2 group"
        >
          Explore Full Tonnetz
          <span class="group-hover:translate-x-1 transition-transform">→</span>
        </button>

        <!-- Hint -->
        <p class="text-[9px] text-slate-500 text-center mt-2 italic">
          Each triangle = a chord. See the full lattice with Neo-Riemannian transforms.
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
@reference "tailwindcss";

/*
 * Accordion body: smooth height transition.
 *
 * We use max-height + overflow:hidden trick because CSS cannot
 * transition `height: auto`. The max-height is set to 0 when
 * collapsed and a generous 400px when expanded. The transition
 * handles the smooth animation.
 */
.tonnetz-accordion-body {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.4s ease, opacity 0.3s ease;
  opacity: 0;
}

.tonnetz-accordion-body.is-expanded {
  max-height: 400px;
  /* Generous max — actual content is ~250px */
  opacity: 1;
}
</style>
