import { ref } from 'vue';

/**
 * Global sensitivity threshold used by detection utilities.
 * Default 0.05 matches the updated noise floor for chord capture.
 * Users can modify this at runtime (e.g., via a settings UI).
 */
export const sensitivityThreshold = ref<number>(0.05);
