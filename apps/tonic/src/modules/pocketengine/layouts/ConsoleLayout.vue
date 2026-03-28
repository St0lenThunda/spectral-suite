<script setup lang="ts">
/**
 * POCKET ENGINE STUDIO (V3 REFINED)
 * Architectural Pattern: Modular Orchestration with Interaction State
 * 
 * We use this layout to coordinate the 10/80/10 split.
 * 
 * NEW INTERACTION:
 * To make the UI feel "snappy" and professional, we've implemented
 * a click-to-dismiss behavior. If a sidebar tab is open (e.g., Sync or Ladder),
 * clicking anywhere on the central 80% HUD area will automatically close it.
 */
import { ref } from 'vue';
import StudioHUD from '../components/StudioHUD.vue';
import LeftInteractionZone from '../components/LeftInteractionZone.vue';
import RightInteractionZone from '../components/RightInteractionZone.vue';

defineProps<{
  isPlaying: boolean
  tempo: number
  timingOffset: number
  stats: any
  subdivision: number
  polySubdivision: number
  isFlashEnabled: boolean
  isFlashing: boolean
  gapIntensity: number
  isSettingsOpen: boolean
  isLadderEnabled: boolean
  ladderIncrement: number
  ladderInterval: number
  ladderGoal: number
  stealthBarsOn: number
  stealthBarsOff: number
  isStealthEnabled: boolean
  accentPattern: number[]
  currentPulse: number
  grooveHistory: any[]
  pocketPosition: number
  pocketColor: string
  tendency: string
  avgOffset: number
  togglePlay: () => void
  updateTempo: (v: number) => void
  updateSubdivision: (v: number) => void
  updatePolyrhythm: (v: number) => void
  updateGapIntensity: (v: number) => void
  updateLadder: () => void
  updateStealth: () => void
  cycleAccent: (i: number) => void
  applyPattern: (type: 'downbeat' | 'backbeat' | 'jazz') => void
  reset: () => void
  onSettingsToggle: () => void
}>()

const emit = defineEmits(['back', 'update:isFlashEnabled', 'update:ladderIncrement', 'update:ladderInterval', 'update:ladderGoal', 'update:stealthBarsOn', 'update:stealthBarsOff'])

/**
 * UPLIFTED UI STATE
 * We move the 'openTabs' knowledge here so that this orchestrator 
 * can force-close them when the user clicks the central HUD.
 */
const leftTabs = ref({
  transport: true, // Default to open so user sees play button
  subdivision: false,
  rhythm: false
})

const rightTabs = ref({
  accents: false,
  stability: false,
  ladder: false,
  stealth: false
})

/**
 * Dismisses all open side-tabs.
 * Called when the user clicks the central performance area (the HUD).
 */
const closeAllTabs = () => {
  // We reset all boolean flags to false
  Object.keys(leftTabs.value).forEach(k => leftTabs.value[k as keyof typeof leftTabs.value] = false);
  Object.keys(rightTabs.value).forEach(k => rightTabs.value[k as keyof typeof rightTabs.value] = false);
}
</script>

<template>
  <div class="h-full flex flex-col overflow-hidden relative">
    <!-- 
       Header has been moved to the parent PocketEngineModule.vue 
       to ensure consistency across all layouts.
    -->

    <div class="flex-1 flex px-4 pb-4 overflow-hidden relative">
      
      <!-- LEFT MODULE: Interaction state is now passed as a prop -->
      <LeftInteractionZone 
        v-bind="{ isPlaying, tempo, subdivision, polySubdivision, togglePlay, updateTempo, updateSubdivision, updatePolyrhythm }"
        v-model:tabs="leftTabs"
      />

      <!-- CENTER MODULE: The 80% Performance HUD -->
      <!-- Clicking this area will trigger closeAllTabs() -->
      <div 
        @click="closeAllTabs"
        class="w-[80%] flex flex-col relative overflow-hidden cursor-default"
      >
        <StudioHUD 
          v-bind="{ timingOffset, pocketPosition, pocketColor, tendency, stats, grooveHistory, avgOffset, isFlashing }"
          @reset="reset"
        />
      </div>

      <!-- RIGHT MODULE: Interaction state is now passed as a prop -->
      <RightInteractionZone 
        v-bind="{ isFlashEnabled, gapIntensity, isLadderEnabled, ladderIncrement, ladderInterval, ladderGoal, stealthBarsOn, stealthBarsOff, isStealthEnabled, accentPattern }"
        v-model:tabs="rightTabs"
        :update-gap-intensity="updateGapIntensity"
        :update-ladder="updateLadder"
        :update-stealth="updateStealth"
        :cycle-accent="cycleAccent"
        :apply-pattern="applyPattern"
        @update:is-flash-enabled="$emit('update:isFlashEnabled', $event)"
        @update:ladder-increment="$emit('update:ladderIncrement', $event)"
        @update:ladder-interval="$emit('update:ladderInterval', $event)"
        @update:ladder-goal="$emit('update:ladderGoal', $event)"
        @update:stealth-bars-on="$emit('update:stealthBarsOn', $event)"
        @update:stealth-bars-off="$emit('update:stealthBarsOff', $event)"
      />
    </div>

    <!-- 
       LocalSettingsDrawer has been moved to the parent PocketEngineModule.vue 
    -->
  </div>
</template>

<style scoped>
/* Main layout is now purely a structural orchestrator */
</style>
