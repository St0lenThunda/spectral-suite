import { ref, readonly } from 'vue';

/**
 * Toast notification object
 */
export interface Toast {
  /** Unique identifier */
  id: string;
  /** Message to display */
  message: string;
  /** Type determines styling */
  type: 'info' | 'success' | 'warning' | 'error';
  /** Optional action button text */
  action?: string;
  /** Optional callback when action is clicked */
  onAction?: () => void;
  /** Duration in ms (0 = manual dismiss only) */
  duration?: number;
}

// --- Global State (Singleton) ---
const toasts = ref<Toast[]>([]);
let toastIdCounter = 0;

/**
 * useToast - Global toast notification system.
 * 
 * WHY THIS EXISTS:
 * Instead of inline banners that cause layout shifts, toasts provide
 * non-intrusive fixed-position notifications that slide in/out smoothly.
 * 
 * @example
 * const { showToast, showError } = useToast();
 * showError('No audio input detected');
 * showToast({ message: 'Settings saved', type: 'success' });
 */
export function useToast() {
  /**
   * Shows a toast notification.
   * 
   * @param options - The toast configuration (message, type, duration, etc.)
   * @returns string - The unique ID of the created toast (useful for manual dismissal)
   */
  const showToast = (options: Omit<Toast, 'id'>) => {
    const id = `toast-${++toastIdCounter}`;
    const toast: Toast = { id, duration: 5000, ...options };
    
    toasts.value.push(toast);
    
    // Auto-dismiss logic:
    // We use setTimeout to remove the toast after `duration` milliseconds.
    // If duration is 0, the toast persists until manually dismissed (good for errors).
    if (toast.duration && toast.duration > 0) {
      setTimeout(() => dismissToast(id), toast.duration);
    }
    
    return id;
  };

  /**
   * Dismiss a specific toast by ID.
   * 
   * @param id - The unique ID of the toast to remove
   */
  const dismissToast = (id: string) => {
    const index = toasts.value.findIndex(t => t.id === id);
    if (index !== -1) {
      toasts.value.splice(index, 1);
    }
  };

  /**
   * Clear all toasts.
   */
  const clearAll = () => {
    toasts.value = [];
  };

  // --- Convenience Methods ---
  
  const showInfo = (message: string, action?: string, onAction?: () => void) =>
    showToast({ message, type: 'info', action, onAction });

  const showSuccess = (message: string) =>
    showToast({ message, type: 'success', duration: 3000 });

  const showWarning = (message: string, action?: string, onAction?: () => void) =>
    showToast({ message, type: 'warning', action, onAction, duration: 8000 });

  const showError = (message: string, action?: string, onAction?: () => void) =>
    showToast({ message, type: 'error', action, onAction, duration: 0 }); // Errors don't auto-dismiss

  return {
    toasts: readonly(toasts),
    showToast,
    dismissToast,
    clearAll,
    showInfo,
    showSuccess,
    showWarning,
    showError,
  };
}
