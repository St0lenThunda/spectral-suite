import { watch, onMounted, onUnmounted, ref } from 'vue';
import { useInputDiagnostics } from '@spectralsuite/core';
import { useToast } from './useToast';

/**
 * useDiagnosticToasts - Bridges the diagnostics system with toast notifications.
 * 
 * WHY THIS EXISTS:
 * Instead of showing jumpy inline banners, this composable watches for diagnostic
 * issues and shows non-intrusive toast notifications. It only triggers a toast
 * when a NEW issue appears (not on every reactivity update).
 * 
 * USAGE:
 * Call this once in App.vue or a global layout component.
 */
export function useDiagnosticToasts() {
  const { activeIssues, applyQuickFix } = useInputDiagnostics();
  const { showWarning, showError, dismissToast } = useToast();
  
  // Track which issues we've already shown toasts for
  const shownIssueIds = ref<Set<string>>(new Set());
  
  // Map issue IDs to toast IDs so we can dismiss them when fixed
  const issueToToastMap = ref<Map<string, string>>(new Map());

  watch(activeIssues, (newIssues, oldIssues) => {
    const newIssueIds = new Set(newIssues.map(i => i.id));
    const oldIssueIds = new Set((oldIssues || []).map(i => i.id));

    // Find newly appeared issues
    for (const issue of newIssues) {
      if (!shownIssueIds.value.has(issue.id)) {
        // Show toast for this new issue
        const toastFn = issue.severity === 'error' ? showError : showWarning;
        const toastId = toastFn(
          issue.message,
          issue.quickFix ? 'Fix' : undefined,
          issue.quickFix ? () => applyQuickFix(issue.quickFix) : undefined
        );
        
        shownIssueIds.value.add(issue.id);
        issueToToastMap.value.set(issue.id, toastId);
      }
    }

    // Find resolved issues and dismiss their toasts
    for (const oldId of shownIssueIds.value) {
      if (!newIssueIds.has(oldId)) {
        const toastId = issueToToastMap.value.get(oldId);
        if (toastId) {
          dismissToast(toastId);
          issueToToastMap.value.delete(oldId);
        }
        shownIssueIds.value.delete(oldId);
      }
    }
  }, { immediate: false }); // Don't trigger on mount, let user start fresh

  // Clean up on unmount
  onUnmounted(() => {
    shownIssueIds.value.clear();
    issueToToastMap.value.clear();
  });
}
