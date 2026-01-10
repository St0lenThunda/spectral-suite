// import Meyda from 'meyda';
import processorUrl from '../audio/worklets/transient-processor.ts?worker&url';

/**
 * TransientDetector - Detects audio transients (peaks) for timing analysis
 */
export class TransientDetector {
  private workletNode: AudioWorkletNode | null = null
  private stream: MediaStream | null = null
  private audioContext: AudioContext | null = null
  private threshold: number = 0.3
  private lastTransientTime: number = 0
  private cooldownMs: number = 100
  private transientCallbacks: Array<( time: number, energy: number ) => void> = []

  constructor( threshold: number = 0.3 ) {
    this.threshold = threshold
  }

  public async init () {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia( { audio: true } )
      this.audioContext = new ( window.AudioContext || ( window as any ).webkitAudioContext )()

      // Load the processor module
      await this.audioContext.audioWorklet.addModule( processorUrl )

      const source = this.audioContext.createMediaStreamSource( this.stream )

      // Create worklet node 'transient-processor' (must match name in registersProcessor)
      this.workletNode = new AudioWorkletNode( this.audioContext, 'transient-processor' )

      // Handle messages from the processor
      this.workletNode.port.onmessage = ( event ) => {
        // expect event.data = { rms: number, energy: number }
        this.analyzeFrame( event.data )
      }

      source.connect( this.workletNode )
      this.workletNode.connect( this.audioContext.destination ) // Keep alive

    } catch ( err ) {
      console.error( 'Failed to initialize transient detector:', err )
      throw err
    }
  }

  public start () {
    if ( this.audioContext && this.audioContext.state === 'suspended' ) {
      this.audioContext.resume()
    }
    // Worklet is always running once connected, we could add a 'bypass' param if needed
  }

  public stop () {
    if ( this.audioContext && this.audioContext.state === 'running' ) {
      this.audioContext.suspend()
    }
  }

  public setThreshold ( threshold: number ) {
    this.threshold = Math.max( 0.1, Math.min( 1.0, threshold ) )
  }

  public onTransient ( callback: ( time: number, energy: number ) => void ) {
    this.transientCallbacks.push( callback )
  }

  private analyzeFrame ( features: any ) {
    const energy = features.energy || 0
    const now = this.audioContext?.currentTime || 0

    // Detect transient based on energy threshold
    if ( energy > this.threshold ) {
      const timeSinceLastTransient = ( now - this.lastTransientTime ) * 1000

      // Only trigger if cooldown has passed
      if ( timeSinceLastTransient > this.cooldownMs ) {
        this.lastTransientTime = now
        this.transientCallbacks.forEach( cb => cb( now, energy ) )
      }
    }
  }

  public cleanup () {
    this.stop()
    if ( this.stream ) {
      this.stream.getTracks().forEach( track => track.stop() )
    }
  }
}
