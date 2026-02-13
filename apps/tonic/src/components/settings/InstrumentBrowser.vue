<script setup lang="ts">
/**
 * InstrumentBrowser.vue
 * 
 * A settings panel for browsing, previewing, and saving real instrument samples.
 * Designed to be slotted into the LocalSettingsDrawer as an "Instruments" category.
 * 
 * Flow:
 *   1. User sees a grid of instrument cards (Piano, Guitar, etc.)
 *   2. Clicking "Preview" fetches from CDN and plays a test chord
 *   3. Clicking "Save" persists to IndexedDB for offline use
 *   4. Saved instruments show a ✅ badge and load instantly next time
 *   5. The "Pure Tone" option uses additive synthesis (no download needed)
 */
import { useSampleLibrary } from '../../composables/useSampleLibrary';

const {
  availableInstruments,
  currentInstrumentId,
  isLoading,
  loadingProgress,
  lastError,
  hasSamples,
  previewInstrument,
  saveCurrentInstrument,
  loadSavedInstrument,
  deleteSavedInstrument,
  switchToPure,
  playPreviewNote
} = useSampleLibrary();

/**
 * Handles clicking an instrument card.
 * If already saved → load from IndexedDB (instant).
 * Otherwise → fetch from CDN (requires network).
 * 
 * @param id - The instrument ID to load or preview
 * @param isSaved - Whether the instrument is saved in IndexedDB
 */
const handleInstrumentClick = async ( id: string, isSaved: boolean ) => {
  if ( isSaved ) {
    await loadSavedInstrument( id );
  } else {
    await previewInstrument( id );
  }
};

/**
 * Plays a quick 3-note chord demo so the user can hear the instrument.
 * Uses C major triad at octave 4 (C4, E4, G4).
 */
const playDemoChord = () => {
  // Play C major triad with 50ms stagger for natural feel
  playPreviewNote( 'C4' );
  setTimeout( () => playPreviewNote( 'E4' ), 50 );
  setTimeout( () => playPreviewNote( 'G4' ), 100 );
};
</script>

<template>
  <div class="space-y-4">

    <!-- Pure Tone (Built-in, no download) -->
    <div>
      <h4 class="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1 mb-2">
        Built-In
      </h4>

      <button
        @click="switchToPure()"
        class="w-full p-3 rounded-xl border transition-all text-left group flex items-center gap-3"
        :class="!hasSamples && !currentInstrumentId
          ? 'bg-violet-500/15 border-violet-500/40 ring-1 ring-violet-500/20'
          : 'bg-slate-900/50 border-white/5 hover:bg-slate-800 hover:border-white/10'"
      >
        <!-- Icon -->
        <div
          class="w-8 h-8 rounded-lg flex items-center justify-center text-lg shrink-0"
          :class="!hasSamples && !currentInstrumentId
            ? 'bg-violet-500/20'
            : 'bg-slate-800'"
        >
          ✨
        </div>

        <!-- Label -->
        <div class="flex-1 min-w-0">
          <div
            class="font-bold text-xs"
            :class="!hasSamples && !currentInstrumentId ? 'text-violet-300' : 'text-slate-400 group-hover:text-white'"
          >
            Pure Tone
          </div>
          <div class="text-[10px] text-slate-600 italic">
            Additive synthesis — no download
          </div>
        </div>

        <!-- Active badge -->
        <div
          v-if=" !hasSamples && !currentInstrumentId "
          class="text-[9px] font-black uppercase tracking-widest text-violet-400 bg-violet-500/20 px-2 py-1 rounded-md shrink-0"
        >
          Active
        </div>
      </button>
    </div>

    <!-- Divider -->
    <div class="border-t border-white/5"></div>

    <!-- Real Instruments -->
    <div>
      <h4 class="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1 mb-2">
        Real Instruments
      </h4>
      <p class="text-[10px] text-slate-600 italic px-1 mb-3">
        Preview from CDN, then save locally for offline use.
      </p>

      <!-- Error Banner -->
      <div
        v-if=" lastError "
        class="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs"
      >
        {{ lastError }}
      </div>

      <!-- Loading Progress Bar -->
      <div
        v-if=" isLoading "
        class="mb-4"
      >
        <div class="h-1.5 rounded-full bg-slate-800 overflow-hidden">
          <div
            class="h-full bg-linear-to-r from-sky-500 to-violet-500 rounded-full transition-all duration-300"
            :style="{ width: `${loadingProgress}%` }"
          ></div>
        </div>
        <p class="text-[10px] text-slate-500 mt-1 text-center">
          Fetching samples… {{ loadingProgress }}%
        </p>
      </div>

      <!-- Instrument Cards Grid -->
      <div class="space-y-2">
        <div
          v-for=" inst in availableInstruments "
          :key="inst.id"
          class="p-3 rounded-xl border transition-all group"
          :class="inst.isActive
            ? 'bg-sky-500/15 border-sky-500/40 ring-1 ring-sky-500/20'
            : 'bg-slate-900/50 border-white/5 hover:bg-slate-800 hover:border-white/10'"
        >
          <div class="flex items-center gap-3">
            <!-- Instrument Icon -->
            <div
              class="w-8 h-8 rounded-lg flex items-center justify-center text-lg shrink-0"
              :class="inst.isActive ? 'bg-sky-500/20' : 'bg-slate-800'"
            >
              {{ inst.icon }}
            </div>

            <!-- Name & Status -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span
                  class="font-bold text-xs"
                  :class="inst.isActive ? 'text-sky-300' : 'text-slate-400'"
                >
                  {{ inst.name }}
                </span>
                <span
                  v-if=" inst.isSaved "
                  class="text-[8px] font-bold text-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded"
                >
                  ✅ Saved
                </span>
              </div>
              <div class="text-[9px] text-slate-600 italic truncate">
                {{ inst.attribution }}
              </div>
            </div>

            <!-- Inline Action Buttons -->
            <div class="flex items-center gap-1.5 shrink-0">
              <!-- Preview / Load -->
              <button
                @click="handleInstrumentClick( inst.id, inst.isSaved )"
                :disabled="isLoading"
                class="py-1.5 px-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
                :class="isLoading
                  ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                  : inst.isSaved
                    ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20'
                    : 'bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 border border-sky-500/20'"
              >
                {{ inst.isSaved ? '📂 Load' : '🌐 Preview' }}
              </button>

              <!-- Play Demo (active only) -->
              <button
                v-if=" inst.isActive "
                @click="playDemoChord()"
                class="py-1.5 px-2.5 rounded-lg text-[10px] font-bold bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 border border-violet-500/20 transition-all"
              >
                🎵
              </button>

              <!-- Save (active + not saved) -->
              <button
                v-if=" inst.isActive && !inst.isSaved "
                @click="saveCurrentInstrument()"
                :disabled="isLoading"
                class="py-1.5 px-2.5 rounded-lg text-[10px] font-bold transition-all"
                :class="isLoading
                  ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                  : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20'"
              >
                💾
              </button>

              <!-- Delete (saved only) -->
              <button
                v-if=" inst.isSaved "
                @click="deleteSavedInstrument( inst.id )"
                class="py-1.5 px-2.5 rounded-lg text-[10px] font-bold bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-all"
              >
                🗑️
              </button>
            </div>

            <!-- Active badge -->
            <div
              v-if=" inst.isActive "
              class="text-[9px] font-black uppercase tracking-widest text-sky-400 bg-sky-500/20 px-2 py-1 rounded-md shrink-0"
            >
              Active
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Attribution Notice -->
    <div class="pt-4 border-t border-white/5">
      <p class="text-[9px] text-slate-600 italic text-center">
        Samples provided under CC BY 3.0 license.
        Salamander Grand Piano by Alexander Holm.
      </p>
    </div>
  </div>
</template>
