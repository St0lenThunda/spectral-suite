/**
 * MetronomeEngine - High-precision metronome using Web Audio API
 * Uses lookahead scheduling to ensure accurate timing
 */
export class MetronomeEngine {
  private context: AudioContext | null = null
  private nextNoteTime: number = 0.0
  private currentBeat: number = 0
  private tempo: number = 120
  private scheduleAheadTime: number = 0.1 // Schedule notes 100ms ahead
  private timerID: number | null = null
  private isPlaying: boolean = false
  private beatCallbacks: Array<( beat: number, time: number ) => void> = []

  constructor( initialTempo: number = 120 ) {
    this.tempo = initialTempo
  }

  public init () {
    if ( !this.context ) {
      this.context = new ( window.AudioContext || ( window as any ).webkitAudioContext )()
    }
  }

  public start () {
    if ( this.isPlaying ) return
    if ( !this.context ) this.init()

    this.isPlaying = true
    this.currentBeat = 0
    this.nextNoteTime = this.context!.currentTime
    this.schedule()
  }

  public stop () {
    this.isPlaying = false
    if ( this.timerID ) {
      clearTimeout( this.timerID )
      this.timerID = null
    }
  }

  public setTempo ( bpm: number ) {
    this.tempo = Math.max( 40, Math.min( 300, bpm ) )
  }

  public getTempo (): number {
    return this.tempo
  }

  public onBeat ( callback: ( beat: number, time: number ) => void ) {
    this.beatCallbacks.push( callback )
  }

  private schedule () {
    // Schedule all notes within the lookahead window
    while ( this.nextNoteTime < this.context!.currentTime + this.scheduleAheadTime ) {
      this.scheduleNote( this.currentBeat, this.nextNoteTime )
      this.nextNote()
    }

    // Continue scheduling
    if ( this.isPlaying ) {
      this.timerID = window.setTimeout( () => this.schedule(), 25 )
    }
  }

  private scheduleNote ( beatNumber: number, time: number ) {
    // Create click sound
    const osc = this.context!.createOscillator()
    const gain = this.context!.createGain()

    osc.connect( gain )
    gain.connect( this.context!.destination )

    // First beat of bar is higher pitch
    osc.frequency.value = beatNumber % 4 === 0 ? 1000 : 800

    gain.gain.setValueAtTime( 0.3, time )
    gain.gain.exponentialRampToValueAtTime( 0.01, time + 0.03 )

    osc.start( time )
    osc.stop( time + 0.03 )

    // Notify listeners
    this.beatCallbacks.forEach( cb => cb( beatNumber, time ) )
  }

  private nextNote () {
    const secondsPerBeat = 60.0 / this.tempo
    this.nextNoteTime += secondsPerBeat
    this.currentBeat++
  }

  public getCurrentTime (): number {
    return this.context?.currentTime || 0
  }

  public getIsPlaying (): boolean {
    return this.isPlaying
  }
}
