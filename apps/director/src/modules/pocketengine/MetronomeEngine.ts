export class MetronomeEngine {
  private context: AudioContext | null = null
  private nextNoteTime: number = 0.0
  private nextPolyNoteTime: number = 0.0
  private currentPulse: number = 0
  private currentPolyPulse: number = 0

  private tempo: number = 120
  private subdivision: number = 1 // 1=quarter, 2=8th, 3=triplet, 4=16th
  private polySubdivision: number = 0 // 3=3 over 4, 5=5 over 4, etc. 0 = disabled

  private muteProbability: number = 0 // 0.0 to 1.0 (Gap Click)
  private progressionIncrement: number = 0
  private progressionInterval: number = 0 // in bars

  // Stealth Training Mode (Pro Phase 3)
  private stealthBarsOn: number = 4
  private stealthBarsOff: number = 2
  private isStealthEnabled: boolean = false


  private scheduleAheadTime: number = 0.1
  private timerID: number | null = null
  private isPlaying: boolean = false

  private beatCallbacks: Array<( pulse: number, time: number, isMainBeat: boolean, isPoly?: boolean ) => void> = []
  private tempoCallbacks: Array<( bpm: number ) => void> = []

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
    this.currentPulse = 0
    this.currentPolyPulse = 0
    this.nextNoteTime = this.context!.currentTime
    this.nextPolyNoteTime = this.context!.currentTime
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

  public setSubdivision ( sub: number ) {
    this.subdivision = Math.max( 1, Math.min( 4, sub ) )
  }

  public getSubdivision (): number {
    return this.subdivision
  }

  public setPolySubdivision ( sub: number ) {
    this.polySubdivision = Math.max( 0, Math.min( 16, sub ) )
  }

  public setMuteProbability ( prob: number ) {
    this.muteProbability = Math.max( 0, Math.min( 1, prob ) )
  }

  public getMuteProbability (): number {
    return this.muteProbability
  }

  public setProgression ( increment: number, interval: number ) {
    this.progressionIncrement = increment
    this.progressionInterval = interval
  }

  public setStealthMode ( barsOn: number, barsOff: number, enabled: boolean ) {
    this.stealthBarsOn = barsOn
    this.stealthBarsOff = barsOff
    this.isStealthEnabled = enabled
  }

  public onTempoChange ( callback: ( bpm: number ) => void ) {
    this.tempoCallbacks.push( callback )
  }

  public onBeat ( callback: ( pulse: number, time: number, isMainBeat: boolean, isPoly?: boolean ) => void ) {
    this.beatCallbacks.push( callback )
  }

  private schedule () {
    // Schedule Main Clock
    while ( this.nextNoteTime < this.context!.currentTime + this.scheduleAheadTime ) {
      this.scheduleNote( this.currentPulse, this.nextNoteTime, false )
      this.nextNote()
    }

    // Schedule Poly Clock
    if ( this.polySubdivision > 0 ) {
      while ( this.nextPolyNoteTime < this.context!.currentTime + this.scheduleAheadTime ) {
        this.scheduleNote( this.currentPolyPulse, this.nextPolyNoteTime, true )
        this.nextPolyNote()
      }
    }

    if ( this.isPlaying ) {
      this.timerID = window.setTimeout( () => this.schedule(), 25 )
    }
  }

  private scheduleNote ( pulseNumber: number, time: number, isPoly: boolean ) {
    const isMainBeat = isPoly ? true : ( pulseNumber % this.subdivision === 0 )
    const isFirstBeatOfBar = isPoly ? ( pulseNumber % this.polySubdivision === 0 ) : ( pulseNumber % ( this.subdivision * 4 ) === 0 )

    // Don't double-trigger the first beat of the bar if it's poly.
    // The main clock handles the "One".
    if ( isPoly && isFirstBeatOfBar ) return

    // Stealth Mode: Calculate if we are in a silent phase
    let isStealthMuted = false
    if ( this.isStealthEnabled && !isPoly ) {
      const pulsesPerBar = this.subdivision * 4
      const currentBar = Math.floor( pulseNumber / pulsesPerBar )
      const cycleLength = this.stealthBarsOn + this.stealthBarsOff
      const positionInCycle = currentBar % cycleLength
      isStealthMuted = positionInCycle >= this.stealthBarsOn
    }

    const isGapped = !isPoly && !isFirstBeatOfBar && Math.random() < this.muteProbability

    if ( !isGapped && !isStealthMuted ) {
      const osc = this.context!.createOscillator()
      const gain = this.context!.createGain()
      osc.connect( gain )
      gain.connect( this.context!.destination )

      if ( isPoly ) {
        osc.frequency.value = 600 // Deeper/Woody sound for poly
        gain.gain.setValueAtTime( 0.2, time )
      } else if ( isFirstBeatOfBar ) {
        osc.frequency.value = 1200
        gain.gain.setValueAtTime( 0.4, time )
      } else if ( isMainBeat ) {
        osc.frequency.value = 900
        gain.gain.setValueAtTime( 0.3, time )
      } else {
        osc.frequency.value = 700
        gain.gain.setValueAtTime( 0.15, time )
      }

      gain.gain.exponentialRampToValueAtTime( 0.01, time + 0.04 )

      osc.start( time )
      osc.stop( time + 0.04 )
    }

    // Notify listeners
    this.beatCallbacks.forEach( cb => cb( pulseNumber, time, isMainBeat, isPoly ) )

    // Check for tempo progression at the start of a bar (main clock only)
    if ( !isPoly && isFirstBeatOfBar && pulseNumber > 0 && this.progressionInterval > 0 ) {
      const barsElapsed = pulseNumber / ( this.subdivision * 4 )
      if ( barsElapsed % this.progressionInterval === 0 ) {
        const newTempo = Math.min( 300, this.tempo + this.progressionIncrement )
        if ( newTempo !== this.tempo ) {
          this.setTempo( newTempo )
          this.tempoCallbacks.forEach( cb => cb( this.tempo ) )
        }
      }
    }
  }

  private nextNote () {
    const secondsPerBeat = 60.0 / this.tempo
    const secondsPerPulse = secondsPerBeat / this.subdivision
    this.nextNoteTime += secondsPerPulse
    this.currentPulse++
  }

  private nextPolyNote () {
    const secondsPerBar = ( 60.0 / this.tempo ) * 4
    const secondsPerPulse = secondsPerBar / this.polySubdivision
    this.nextPolyNoteTime += secondsPerPulse
    this.currentPolyPulse++
  }

  public getCurrentTime (): number {
    return this.context?.currentTime || 0
  }

  public getIsPlaying (): boolean {
    return this.isPlaying
  }
}
