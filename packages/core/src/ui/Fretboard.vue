<script setup lang="ts">
interface Props {
  activeNotes?: string[];
  highlightNotes?: string[];
  numFrets?: number;
}

const props = withDefaults( defineProps<Props>(), {
  activeNotes: () => [],
  highlightNotes: () => [],
  numFrets: 12
} );

// High E to Low E (top to bottom visually)
const strings = ['E', 'B', 'G', 'D', 'A', 'E'];
const noteOrder = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

// Fret markers (traditional positions)
const fretMarkers = [3, 5, 7, 9, 12];
const doubleDotFrets = [12];

const getNoteAt = ( stringRoot: string, fret: number ): string => {
  const rootIndex = noteOrder.indexOf( stringRoot );
  if ( rootIndex === -1 ) return '';
  return noteOrder[( rootIndex + fret ) % 12]!;
};

const isNoteActive = ( note: string ) => props.activeNotes.includes( note );
const isNoteHighlighted = ( note: string ) => props.highlightNotes.includes( note );
</script>

<template>
  <div class="bg-slate-900 p-8 rounded-2xl border border-slate-700 overflow-x-auto">
    <!-- Fret numbers row -->
    <div class="flex mb-3 ml-2">
      <div
        class="text-center text-sm text-slate-300 font-mono font-bold"
        style="width: 64px;"
      ></div>
      <div
        v-for=" fret in numFrets "
        :key="'fret-num-' + fret"
        class="text-center text-sm font-mono font-bold"
        :class="[3, 5, 9, 12].includes( fret ) ? 'text-slate-400' : 'text-transparent'"
        style="width: 54px;"
      >
        {{ fret }}
      </div>
    </div>

    <!-- Fretboard -->
    <div
      class="relative inline-block bg-slate-800 rounded-lg p-4 border-2 border-slate-700"
      :style="{ width: ( numFrets * 54 + 80 ) + 'px', minHeight: '300px' }"
    >

      <!-- Nut (left edge) - VERY VISIBLE -->
      <div
        class="absolute top-4 bottom-4 bg-slate-100 rounded-sm z-30"
        style="left: 8px; width: 4px; box-shadow: 0 0 10px rgba(255,255,255,0.5);"
      ></div>

      <!-- Fret wires (vertical) - VERY VISIBLE -->
      <div
        v-for=" fret in numFrets "
        :key="'fret-wire-' + fret"
        class="absolute top-4 bottom-4 bg-slate-300 z-20"
        :style="{
          left: ( 16 + fret * 54 ) + 'px',
          width: '3px',
          boxShadow: '0 0 5px rgba(255,255,255,0.3)'
        }"
      ></div>

      <!-- Fret marker dots -->
      <div class="absolute inset-0 flex items-center pointer-events-none z-10">
        <div
          v-for=" fret in numFrets "
          :key="'marker-' + fret"
          class="absolute flex items-center justify-center"
          :style="{ left: ( -24 + fret * 54 ) + 'px', width: '54px' }"
        >
          <!-- Single dot -->
          <div v-if=" fretMarkers.includes( fret ) && !doubleDotFrets.includes( fret ) ">
            <div class="w-5 h-5 rounded-full bg-slate-500 shadow-inner"></div>
          </div>
          <!-- Double dots -->
          <div
            v-if=" doubleDotFrets.includes( fret ) "
            class="flex flex-col gap-24"
          >
            <div class="w-5 h-5 rounded-full bg-slate-500 shadow-inner"></div>
            <div class="w-5 h-5 rounded-full bg-slate-500 shadow-inner"></div>
          </div>
        </div>
      </div>

      <!-- Strings (horizontal) - VERY VISIBLE -->
      <div class="relative space-y-8 py-6">
        <div
          v-for=" ( stringRoot, sIdx ) in strings "
          :key="'string-' + sIdx"
          class="relative flex items-center h-6"
        >
          <!-- String label - IN ITS OWN COLUMN ALIGNED WITH NUT -->
          <div
            class="absolute text-base font-mono font-bold text-slate-200"
            style="left: -56px; width: 48px; text-align: center;"
          >
            {{ stringRoot }}
          </div>

          <!-- String line (horizontal) - SOLID, THICK, HIGH CONTRAST -->
          <div
            class="absolute bg-slate-300 rounded-full z-10"
            :style="{
              left: 0,
              right: 0,
              height: ( 2 + ( 5 - sIdx ) * 0.6 ) + 'px',
              top: '50%',
              transform: 'translateY(-50%)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.5)'
            }"
          ></div>

          <!-- Note positions along this string -->
          <div class="relative flex w-full z-20">
            <!-- Open note position (at nut) -->
            <div class="w-16 flex items-center justify-center">
              <div
                class="rounded-full flex items-center justify-center text-xs font-black transition-all duration-200 cursor-pointer"
                :class="[
                  isNoteActive( getNoteAt( stringRoot, 0 ) )
                    ? 'w-8 h-8 bg-sky-500 text-white shadow-[0_0_20px_rgba(56,189,248,1)] border-2 border-sky-200'
                    : isNoteHighlighted( getNoteAt( stringRoot, 0 ) )
                      ? 'w-7 h-7 bg-emerald-600 text-white border-2 border-emerald-400 hover:scale-110'
                      : 'w-5 h-5 opacity-0 hover:opacity-50 hover:bg-slate-500'
                ]"
              >
                <span
                  v-if=" isNoteActive( getNoteAt( stringRoot, 0 ) ) || isNoteHighlighted( getNoteAt( stringRoot, 0 ) ) "
                >
                  {{ getNoteAt( stringRoot, 0 ) }}
                </span>
              </div>
            </div>

            <!-- Fretted positions -->
            <div
              v-for=" fret in numFrets "
              :key="'note-' + sIdx + '-' + fret"
              class="flex items-center justify-center"
              style="width: 54px;"
            >
              <div
                class="rounded-full flex items-center justify-center text-xs font-black transition-all duration-200 cursor-pointer"
                :class="[
                  isNoteActive( getNoteAt( stringRoot, fret ) )
                    ? 'w-8 h-8 bg-sky-500 text-white shadow-[0_0_20px_rgba(56,189,248,1)] border-2 border-sky-200'
                    : isNoteHighlighted( getNoteAt( stringRoot, fret ) )
                      ? 'w-7 h-7 bg-emerald-600 text-white border-2 border-emerald-400 hover:scale-110'
                      : 'w-5 h-5 opacity-0 hover:opacity-50 hover:bg-slate-500'
                ]"
              >
                <span
                  v-if=" isNoteActive( getNoteAt( stringRoot, fret ) ) || isNoteHighlighted( getNoteAt( stringRoot, fret ) ) "
                >
                  {{ getNoteAt( stringRoot, fret ) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Legend -->
    <div class="mt-6 flex items-center justify-center gap-8 text-sm">
      <div class="flex items-center gap-2">
        <div class="w-6 h-6 rounded-full bg-sky-500 border-2 border-sky-200 shadow-lg"></div>
        <span class="text-slate-300 font-mono">Played Notes</span>
      </div>
      <div class="flex items-center gap-2">
        <div class="w-6 h-6 rounded-full bg-emerald-600 border-2 border-emerald-400 shadow-lg"></div>
        <span class="text-slate-300 font-mono">Scale Notes</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
div::-webkit-scrollbar {
  height: 8px;
}

div::-webkit-scrollbar-track {
  background: #1e293b;
  border-radius: 10px;
}

div::-webkit-scrollbar-thumb {
  background: #475569;
  border-radius: 10px;
}

div::-webkit-scrollbar-thumb:hover {
  background: #64748b;
}
</style>
