<script setup lang="ts">
defineProps<{
  isPlaying: boolean
  playColor?: string
  stopColor?: string
}>()

defineEmits(['click'])
</script>

<template>
  <button
    @click="$emit('click')"
    class="w-32 h-32 transition-all duration-500 shadow-2xl flex items-center justify-center group shrink-0 overflow-hidden relative"
    :class="[
      isPlaying
        ? (stopColor || 'bg-rose-500 shadow-rose-500/20') + ' rounded-2xl scale-95'
        : (playColor || 'bg-emerald-500 shadow-emerald-500/20') + ' rounded-full'
    ]"
  >
    <Transition name="icon-morph">
      <div
        :key="isPlaying ? 'stop' : 'play'"
        class="absolute inset-0 flex items-center justify-center text-4xl transform transition-transform group-active:scale-90"
      >
        {{ isPlaying ? '⏹' : '▶' }}
      </div>
    </Transition>
  </button>
</template>

<style scoped>
/* Icon Morph Transition */
.icon-morph-enter-active,
.icon-morph-leave-active {
  transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.icon-morph-enter-from {
  opacity: 0;
  transform: scale(0.3) rotate(-90deg);
}

.icon-morph-leave-to {
  opacity: 0;
  transform: scale(0.3) rotate(90deg);
}
</style>
