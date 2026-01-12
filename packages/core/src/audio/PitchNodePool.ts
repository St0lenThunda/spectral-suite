import { ref } from 'vue';
import processorUrl from './worklets/pitch-processor.ts?worker&url';

/**
 * PitchNodePool - Singleton manager for pitch detection AudioWorkletNode.
 * 
 * WHY THIS EXISTS:
 * AudioWorkletNodes are expensive to create. If every component that needs
 * pitch data creates its own node, we end up with multiple nodes competing
 * for CPU and causing audio glitches/slowdowns.
 * 
 * SOLUTION:
 * Reference counting with debounced cleanup. One node serves all consumers.
 * When the last consumer leaves, we wait 2 seconds before destroying
 * (in case they're just switching tabs via HMR).
 * 
 * @example
 * // In onMounted
 * await PitchNodePool.acquire(context, analyser);
 * 
 * // In onUnmounted
 * PitchNodePool.release();
 */

// --- Global Shared State ---
// These refs are shared across ALL consumers of the pool
export const poolPitch = ref<number | null>(null);
export const poolClarity = ref<number | null>(null);
export const poolVolume = ref<number>(0);

class PitchNodePoolClass {
  private node: AudioWorkletNode | null = null;
  private refCount: number = 0;
  private cleanupTimer: any = null;
  private isModuleLoaded: boolean = false;
  private analyserConnection: AnalyserNode | null = null;

  /**
   * Pre-registers the worklet module without creating a node.
   * Call this during app initialization to eliminate first-mount delay.
   */
  async warmUp(context: AudioContext): Promise<void> {
    if (this.isModuleLoaded) return;
    
    try {
      await context.audioWorklet.addModule(processorUrl);
      this.isModuleLoaded = true;
      console.log('[PitchNodePool] Module pre-registered');
    } catch (e) {
      // Module might already be loaded from a previous attempt
      console.warn('[PitchNodePool] warmUp warning:', e);
      this.isModuleLoaded = true;
    }
  }

  /**
   * Acquires access to the shared pitch node.
   * Creates the node if it doesn't exist. Increments reference count.
   * 
   * @param context - The AudioContext to use
   * @param analyser - The AnalyserNode to connect as input source
   */
  async acquire(context: AudioContext, analyser: AnalyserNode): Promise<void> {
    // Cancel any pending cleanup
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    this.refCount++;

    // Node already exists - just ensure it's connected
    if (this.node) {
      // If source changed, reconnect
      if (this.analyserConnection !== analyser) {
        this.reconnect(context, analyser);
      }
      return;
    }

    // Create new node
    await this.warmUp(context);
    
    this.node = new AudioWorkletNode(context, 'pitch-processor');
    this.node.port.onmessage = (event) => {
      const { pitch, clarity, volume } = event.data;
      poolPitch.value = pitch;
      poolClarity.value = clarity;
      poolVolume.value = volume;
    };

    // Connect to audio graph
    this.reconnect(context, analyser);
    
    console.log('[PitchNodePool] Node created and connected');
  }

  /**
   * Releases a consumer's reference to the pool.
   * If refCount drops to 0, schedules cleanup after grace period.
   */
  release(): void {
    this.refCount = Math.max(0, this.refCount - 1);

    if (this.refCount === 0) {
      // Schedule cleanup with grace period for HMR
      this.cleanupTimer = setTimeout(() => {
        if (this.refCount === 0 && this.node) {
          console.log('[PitchNodePool] Cleaning up idle node');
          this.node.disconnect();
          this.node = null;
          this.analyserConnection = null;
          
          // Reset shared state
          poolPitch.value = null;
          poolClarity.value = null;
          poolVolume.value = 0;
        }
        this.cleanupTimer = null;
      }, 2000); // 2 second grace period
    }
  }

  /**
   * Sends configuration updates to the worklet processor.
   */
  configure(config: { lowPass?: boolean; downsample?: number }): void {
    if (this.node) {
      this.node.port.postMessage({ type: 'config', ...config });
    }
  }

  /**
   * Reconnects the node to a new analyser source.
   */
  private reconnect(context: AudioContext, analyser: AnalyserNode): void {
    if (!this.node) return;

    // Disconnect old source if any
    if (this.analyserConnection) {
      try {
        this.analyserConnection.disconnect(this.node);
      } catch { /* Already disconnected */ }
    }

    // Connect new source
    analyser.connect(this.node);
    this.node.connect(context.destination); // Keep alive
    this.analyserConnection = analyser;
  }

  /**
   * Returns current pool status for debugging.
   */
  getStatus(): { refCount: number; isActive: boolean; isModuleLoaded: boolean } {
    return {
      refCount: this.refCount,
      isActive: this.node !== null,
      isModuleLoaded: this.isModuleLoaded,
    };
  }
}

// Export singleton instance
export const PitchNodePool = new PitchNodePoolClass();
