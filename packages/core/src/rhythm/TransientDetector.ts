import processorUrl from '../audio/worklets/transient-processor.ts?worker&url';
import { AudioEngine } from '../audio/AudioEngine';

/**
 * TransientDetector - Detects audio transients (peaks) for timing analysis
 * 
 * The threshold is compared against RMS (0-1 range).
 * With AGC enabled, typical voice/instrument RMS is 0.05-0.2.
 */
export class TransientDetector {
  private workletNode: AudioWorkletNode | null = null
  private threshold: number = 0.1 // Lowered from 0.3 for better sensitivity
  private lastTransientTime: number = 0
  private cooldownMs: number = 50
  private transientCallbacks: Array<( time: number, energy: number ) => void> = []

  constructor( threshold: number = 0.1 ) {
    this.threshold = threshold
  }

  public async init () {
    try {
      const engine = AudioEngine.getInstance();

      // Ensure engine is initialized
      if ( !engine.getContext() ) {
        await engine.init();
        // Sync the global reactive state
        const { isInitialized: globalInit } = await import( '../audio/useAudioEngine' );
        globalInit.value = true;
      }

      const context = engine.getContext();
      const stream = engine.getStream();

      if ( !context || !stream ) {
        throw new Error( 'AudioEngine failed to provide context or stream' );
      }

      // Load the processor module
      // Note: addModule can be called multiple times safely, browser handles deduplication usually,
      // but to be safe/clean we could check if defined. 
      // However, we don't have a registry of loaded modules. 
      // Trying to add it again is generally harmless but might throw if network fails.
      try {
        await context.audioWorklet.addModule( processorUrl )
      } catch ( e ) {
        // It might already be loaded or failed. 
        console.warn( 'TransientDetector addModule warning (might be already loaded):', e );
      }

      // Create worklet node 'transient-processor' (must match name in registersProcessor)
      this.workletNode = new AudioWorkletNode( context, 'transient-processor' )

      // Handle messages from the processor
      this.workletNode.port.onmessage = ( event ) => {
        // expect event.data = { rms: number, energy: number }
        this.analyzeFrame( event.data )
      }

      // Create a new source for this detector to avoid interfering with Engine's graph
      const source = context.createMediaStreamSource( stream )
      source.connect( this.workletNode )
      this.workletNode.connect( context.destination ) // Keep alive

    } catch ( err ) {
      console.error( 'Failed to initialize transient detector:', err )
      throw err
    }
  }

  public start () {
    AudioEngine.getInstance().resume();
  }

  public stop () {
    // We do NOT suspend the context because other nodes might be using it.
    // Ideally we disconnect our node or mute it.
    // For now, we rely on the app to manage global suspend/resume or ignore callbacks.
  }

  public setThreshold ( threshold: number ) {
    this.threshold = Math.max( 0.1, Math.min( 1.0, threshold ) )
  }

  public onTransient ( callback: ( time: number, energy: number ) => void ) {
    this.transientCallbacks.push( callback )
  }

  private analyzeFrame ( features: any ) {
    const energy = features.energy || 0
    // Use the exact time from the audio hardware buffer
    const context = AudioEngine.getInstance().getContext();
    const now = features.time ?? ( context?.currentTime || 0 )

    // Detect transient based on energy threshold
    if ( energy > this.threshold ) {
      const timeSinceLastTransient = ( now - this.lastTransientTime ) * 1000

      // Only trigger if cooldown has passed
      // Lowered to 50ms (default) to support 16th notes up to 300 BPM
      if ( timeSinceLastTransient > this.cooldownMs ) {
        this.lastTransientTime = now
        this.transientCallbacks.forEach( cb => cb( now, energy ) )
      }
    }
  }

  public cleanup () {
    if ( this.workletNode ) {
      this.workletNode.disconnect();
      this.workletNode = null;
    }
    // Do not close context or stop tracks as they are owned by AudioEngine
  }

  public clearCallbacks () {
    this.transientCallbacks = [];
  }
}
