import Meyda from 'meyda';
// import type { MeydaAnalyzer } from 'meyda'; // Type not cleanly exported

/**
 * TransientDetector - Detects audio transients (peaks) for timing analysis
 */
export class TransientDetector {
  private analyzer: any | null = null
  private stream: MediaStream | null = null
  private audioContext: AudioContext | null = null
  private threshold: number = 0.3
  private lastTransientTime: number = 0
  private cooldownMs: number = 100 // Prevent multiple detections for single hit
  private transientCallbacks: Array<( time: number, energy: number ) => void> = []

  constructor( threshold: number = 0.3 ) {
    this.threshold = threshold
  }

  public async init () {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia( { audio: true } )
      this.audioContext = new ( window.AudioContext || ( window as any ).webkitAudioContext )()
      const source = this.audioContext.createMediaStreamSource( this.stream )

      this.analyzer = Meyda.createMeydaAnalyzer( {
        audioContext: this.audioContext,
        source: source,
        bufferSize: 512,
        featureExtractors: ['rms', 'energy'],
        callback: ( features: any ) => {
          this.analyzeFrame( features )
        }
      } )
    } catch ( err ) {
      console.error( 'Failed to initialize transient detector:', err )
      throw err
    }
  }

  public start () {
    if ( this.analyzer ) {
      this.analyzer.start()
    }
  }

  public stop () {
    if ( this.analyzer ) {
      this.analyzer.stop()
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
