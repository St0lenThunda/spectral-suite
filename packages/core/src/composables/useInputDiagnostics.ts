import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useAudioEngine } from '../audio/useAudioEngine';
import { usePitch } from '../audio/usePitch';
import { sensitivityThreshold, isRawAudioMode } from '../config/sensitivity';

/**
 * Diagnostic issue object
 */
export interface DiagnosticIssue {
  /** Unique identifier for this issue type */
  id: string;
  /** User-facing message describing the problem */
  message: string;
  /** Severity: 'error' = critical, 'warning' = may affect functionality */
  severity: 'error' | 'warning';
  /** Suggested action text */
  action: string;
  /** Optional: key for a quick fix button */
  quickFix?: 'lowerGate' | 'disableProMode' | 'resumeContext';
}

/**
 * useInputDiagnostics - Composable for real-time audio input health monitoring.
 * 
 * This composable provides reactive state about the audio input health,
 * allowing tools to display contextual warnings and the global settings
 * to show a comprehensive diagnostics dashboard.
 * 
 * @example
 * const { overallHealth, activeIssues, inputLevel } = useInputDiagnostics();
 * // overallHealth: 'good' | 'warning' | 'error'
 * // activeIssues: DiagnosticIssue[]
 * // inputLevel: 0-100 (percentage)
 */
export function useInputDiagnostics() {
  const { isInitialized, getContext } = useAudioEngine();
  const { volume } = usePitch();

  // --- Reactive State ---

  /** Microphone permission status */
  const isMicGranted = ref<boolean | null>(null);

  /** Is the AudioContext currently running (not suspended)? */
  const isContextRunning = computed(() => {
    const ctx = getContext();
    return ctx ? ctx.state === 'running' : false;
  });

  /** Is any audio volume being detected? */
  const isVolumeDetected = computed(() => {
    return volume.value > 0.001;
  });

  /** Input level as a percentage (0-100) for UI display */
  const inputLevel = computed(() => {
    // Volume is typically 0-1 RMS, but can exceed 1 for loud sounds.
    // Clamp to 100% and scale for visual representation.
    return Math.min(100, Math.round(volume.value * 500));
  });

  /** Is the sensitivity gate higher than the current input volume? */
  const isGateTooHigh = computed(() => {
    // Only flag if we ARE getting some audio, but it's below the gate.
    return isVolumeDetected.value && volume.value < sensitivityThreshold.value;
  });

  /** Is Pro Mode (raw audio) enabled? */
  const isProModeActive = computed(() => isRawAudioMode.value);

  // --- Issue Detection ---

  const activeIssues = computed<DiagnosticIssue[]>(() => {
    const issues: DiagnosticIssue[] = [];

    // 1. Context not running (suspended)
    if (isInitialized.value && !isContextRunning.value) {
      issues.push({
        id: 'context-suspended',
        message: 'Audio engine is suspended.',
        severity: 'error',
        action: 'Tap to resume audio.',
        quickFix: 'resumeContext',
      });
    }

    // 2. Mic permission denied (if we checked and it failed)
    if (isMicGranted.value === false) {
      issues.push({
        id: 'mic-denied',
        message: 'Microphone access was denied.',
        severity: 'error',
        action: 'Grant microphone permission in browser settings.',
      });
    }

    // 3. No volume detected at all
    if (isInitialized.value && isContextRunning.value && !isVolumeDetected.value) {
      // Only show after a brief delay to avoid false positives during init
      issues.push({
        id: 'no-input',
        message: 'No audio input detected.',
        severity: 'warning',
        action: isProModeActive.value
          ? 'Pro Mode is on. Speak louder or move closer to the mic.'
          : 'Check that your microphone is connected and not muted.',
      });
    }

    // 4. Gate is too high
    if (isGateTooHigh.value) {
      issues.push({
        id: 'gate-high',
        message: 'Microphone gate is blocking input.',
        severity: 'warning',
        action: 'Lower the Microphone Gate setting.',
        quickFix: 'lowerGate',
      });
    }

    // 5. Pro Mode warning (not an error, just informational when + no volume)
    if (isProModeActive.value && !isVolumeDetected.value) {
      // This is often the cause; add a specific hint
      issues.push({
        id: 'pro-mode-weak',
        message: 'Pro Mode requires a strong signal.',
        severity: 'warning',
        action: 'Switch to Auto Mode for normalized input.',
        quickFix: 'disableProMode',
      });
    }

    return issues;
  });

  // --- Overall Health Summary ---

  const overallHealth = computed<'good' | 'warning' | 'error'>(() => {
    if (activeIssues.value.some(i => i.severity === 'error')) return 'error';
    if (activeIssues.value.length > 0) return 'warning';
    return 'good';
  });

  // --- Quick Fixes ---

  const applyQuickFix = async (fix: DiagnosticIssue['quickFix']) => {
    switch (fix) {
      case 'lowerGate':
        sensitivityThreshold.value = 0.01;
        break;
      case 'disableProMode':
        isRawAudioMode.value = false;
        // Re-init audio with new settings
        await useAudioEngine().init();
        break;
      case 'resumeContext':
        await useAudioEngine().resume();
        break;
    }
  };

  // --- Permission Check ---

  const checkMicPermission = async () => {
    try {
      if (navigator.permissions) {
        const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        isMicGranted.value = result.state === 'granted';
        result.onchange = () => {
          isMicGranted.value = result.state === 'granted';
        };
      } else {
        // Browser doesn't support permissions API, assume granted if init works
        isMicGranted.value = isInitialized.value;
      }
    } catch {
      // Fallback: assume granted if engine is initialized
      isMicGranted.value = isInitialized.value;
    }
  };

  onMounted(() => {
    checkMicPermission();
  });

  return {
    // Status checks
    isMicGranted,
    isContextRunning,
    isVolumeDetected,
    isGateTooHigh,
    isProModeActive,
    inputLevel,

    // Issue management
    activeIssues,
    overallHealth,
    applyQuickFix,
  };
}
