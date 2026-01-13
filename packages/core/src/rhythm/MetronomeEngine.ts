/**
 * MetronomeEngine.ts
 * 
 * The Heartbeat of PocketEngine.
 * 
 * WHY THIS CLASS EXISTS:
 * This class is responsible for precise time-keeping. In web development, standard functions
 * like `setInterval` or `setTimeout` are NOT accurate enough for music. They drift (get late)
 * by a few milliseconds every tick.
 * 
 * HOW WE SOLVE IT (The "Physics"):
 * We use the "Lookahead Scheduler" technique (popularized by Chris Wilson).
 * 1. We start a loose timer (setInterval) that runs often (e.g. every 25ms).
 * 2. In that timer, we check "What notes need to play in the next 100ms?".
 * 3. We schedule those notes in the AudioContext.
 * 
 * The AudioContext hardware clock is extremely precise. By scheduling future notes *ahead* of time,
 * we ensure rock-solid timing even if the JavaScript thread (UI) lags.
 */

export class MetronomeEngine {
  // The AudioContext is the browser's audio engine processing graph.
  // We initialize it lazily (only when needed) because browsers block audio until user interaction.
  private context: AudioContext | null = null

  // WHEN the next note is scheduled to play (in AudioContext time)
  private nextNoteTime: number = 0.0

  // Same as above, but for the secondary Polyrhythm layer (the "against" beat)
  private nextPolyNoteTime: number = 0.0

  // Counters for which beat number we are on
  private currentPulse: number = 0
  private currentPolyPulse: number = 0

  // --- Musical State ---
  private tempo: number = 120

  // Subdivision: How we divide the beat. 
  // 1 = Quarter notes (1 per beat)
  // 2 = Eighth notes (2 per beat)
  // 4 = Sixteenth notes (4 per beat)
  private subdivision: number = 1

  // Polyrhythm: A secondary rhythm playing "over" the main beat.
  // e.g., 3 = Three even notes per bar (Triplets over the measure)
  private polySubdivision: number = 0 // 0 = disabled

  // --- Advanced Training Features ---

  // Mute Probability (Gap Click): Randomly silencing notes to test inner clock.
  // 0.0 = Never mute, 1.0 = Always mute.
  private muteProbability: number = 0

  // Progression: Automatically speeding up over time.
  private progressionIncrement: number = 0 // How much to increase BPM
  private progressionInterval: number = 0 // How often (in bars)
  private progressionGoal: number = 300   // Cap for the auto-increase

  // Stealth Mode: Muting specifically for N bars, then unmuting.
  // Example: 4 bars ON (click), 2 bars OFF (silence). Tests ability to hold tempo.
  private stealthBarsOn: number = 4
  private stealthBarsOff: number = 2
  private isStealthEnabled: boolean = false


  // Accent Pattern: Defines the rhythm's "identity" (e.g., Downbeat vs Backbeat).
  // 0 = Muted, 1 = Weak, 2 = Normal, 3 = Strong Accent.
  // Default is a standard 4-beat pattern with a strong downbeat on "One".
  private accentPattern: number[] = [3, 2, 2, 2]


  // --- Infrastructure State ---

  // How far ahead to schedule audio (in seconds).
  // 0.1s = 100ms. If we look too far ahead, tempo changes feel laggy. 
  // If we look too short, we might glitch if the CPU is busy.
  private scheduleAheadTime: number = 0.1

  // ID of the setInterval loop (so we can stop it later)
  private timerID: number | null = null
  private isPlaying: boolean = false

  // Callbacks: Arrays of functions to run when events happen.
  // This is the "Observer Pattern". The UI subscribes to these to update visuals.
  private beatCallbacks: Array<( pulse: number, time: number, isMainBeat: boolean, isPoly?: boolean ) => void> = []
  private tempoCallbacks: Array<( bpm: number ) => void> = []

  constructor( initialTempo: number = 120, sharedContext?: AudioContext ) {
    this.tempo = initialTempo
    if ( sharedContext ) {
      this.context = sharedContext
    }
  }

  /**
   * Initializes the AudioContext. 
   * @param sharedContext - Optional external context to use instead of creating one.
   */
  public init ( sharedContext?: AudioContext ) {
    if ( sharedContext ) {
      this.context = sharedContext
      return
    }

    if ( !this.context ) {
      // Cross-browser compatibility (some older browsers use webkit prefix)
      this.context = new ( window.AudioContext || ( window as any ).webkitAudioContext )()
    }
  }

  /**
   * Starts the metronome engine.
   */
  public start () {
    if ( this.isPlaying ) return
    if ( !this.context ) this.init()

    this.isPlaying = true

    // Reset counters so we start on "One"
    this.currentPulse = 0
    this.currentPolyPulse = 0

    // Sync start time to now.
    // context!.currentTime tells TypeScript "I promise context is not null"
    this.nextNoteTime = this.context!.currentTime
    this.nextPolyNoteTime = this.context!.currentTime

    // Kick off the scheduling loop
    this.schedule()
  }

  /**
   * Stops the engine and clears the scheduling loop.
   */
  public stop () {
    this.isPlaying = false
    if ( this.timerID ) {
      clearTimeout( this.timerID )
      this.timerID = null
    }
  }

  /**
   * Cleans up all event listeners and stops the engine.
   * Call this when the component unmounts.
   */
  public dispose () {
    this.stop()
    this.beatCallbacks = []
    this.tempoCallbacks = []

    // NOTE: We do NOT close the context here if it's shared.
    // If we created it, we should close it, but usually this is used
    // within a store that manages its own lifecycle.
    this.context = null
  }

  // --- Getters and Setters ---
  // We use methods instead of direct property access to validate inputs (e.g. min/max values).

  public setTempo ( bpm: number ) {
    // Clamp tempo between 40 and 300 BPM for sanity
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

  /**
   * Sets the accent pattern for the metronome.
   * This determines the "voice" of each beat in a sequence.
   * 
   * @param pattern - Array of numbers (0-3) representing accent levels
   */
  public setAccentPattern ( pattern: number[] ) {
    this.accentPattern = pattern
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

  public setProgression ( increment: number, interval: number, goal: number = 300 ) {
    this.progressionIncrement = increment
    this.progressionInterval = interval
    this.progressionGoal = Math.max( 40, Math.min( 300, goal ) )
  }

  public setStealthMode ( barsOn: number, barsOff: number, enabled: boolean ) {
    this.stealthBarsOn = barsOn
    this.stealthBarsOff = barsOff
    this.isStealthEnabled = enabled
  }

  // --- Subscription Methods ---

  /**
   * Register a function to be called when the tempo changes automatically.
   */
  public onTempoChange ( callback: ( bpm: number ) => void ) {
    this.tempoCallbacks.push( callback )
  }

  /**
   * Register a function to be called on every beat (for visuals).
   */
  public onBeat ( callback: ( pulse: number, time: number, isMainBeat: boolean, isPoly?: boolean ) => void ) {
    this.beatCallbacks.push( callback )
  }

  // --- Core Logic ---

  /**
   * The "Brain" of the scheduler.
   * This runs recursively via setTimeout.
   * It looks ahead into the future and schedules any notes that fall within our window.
   */
  private schedule () {
    // Schedule Main Clock
    // While the next note to play is within our lookahead window (current time + 0.1s)...
    while ( this.nextNoteTime < this.context!.currentTime + this.scheduleAheadTime ) {
      // 1. Tell AudioContext to play sound at that specific time
      this.scheduleNote( this.currentPulse, this.nextNoteTime, false )
      // 2. Advance the time pointer to the next beat
      this.nextNote()
    }

    // Schedule Poly Clock (if enabled)
    if ( this.polySubdivision > 0 ) {
      while ( this.nextPolyNoteTime < this.context!.currentTime + this.scheduleAheadTime ) {
        this.scheduleNote( this.currentPolyPulse, this.nextPolyNoteTime, true )
        this.nextPolyNote()
      }
    }

    // If still playing, run this function again in 15ms (higher resolution for fast tempos)
    if ( this.isPlaying ) {
      this.timerID = window.setTimeout( () => this.schedule(), 15 )
    }
  }

  /**
   * Actually creates the sound oscillator and schedules it.
   */
  private scheduleNote ( pulseNumber: number, time: number, isPoly: boolean ) {


    // Is this a main downbeat? (e.g., Beat 1, 2, 3, 4)
    const isMainBeat = isPoly ? true : ( pulseNumber % this.subdivision === 0 )

    // Is this the "One" (Start of the measure)?
    // Assuming 4/4 time for now. (subdivision * 4 = total pulses in a bar)
    const isFirstBeatOfBar = isPoly ? ( pulseNumber % this.polySubdivision === 0 ) : ( pulseNumber % ( this.subdivision * 4 ) === 0 )

    // Logic: If Polyrhythm is enabled, it usually aligns on the "One" with the main beat.
    // To avoid phasing/clipping, we silence the Poly beat on the One and let the Main beat handle it.
    if ( isPoly && isFirstBeatOfBar ) return

    // --- Stealth Mode Logic ---
    let isStealthMuted = false
    if ( this.isStealthEnabled && !isPoly ) {
      // Calculate which bar we are in
      const pulsesPerBar = this.subdivision * 4
      const currentBar = Math.floor( pulseNumber / pulsesPerBar )

      // Calculate cycle position (On + Off)
      const cycleLength = this.stealthBarsOn + this.stealthBarsOff
      const positionInCycle = currentBar % cycleLength

      // Mute if we are in the "Off" phase
      isStealthMuted = positionInCycle >= this.stealthBarsOn
    }

    // --- Gap Click Logic ---
    // Only mute sub-beats or weak beats randomly, preserving the "One" usually? 
    // The current logic mutes ANY beat except the First, based on probability.
    const isGapped = !isPoly && !isFirstBeatOfBar && Math.random() < this.muteProbability

    // --- Accent Pattern Logic ---
    // We determine the "Voice" level based on the current pulse's position in the pattern.
    // If the pattern is missing or empty, we fallback to Level 2 (Normal).
    const patternIndex = this.accentPattern.length > 0 ? ( pulseNumber % this.accentPattern.length ) : 0
    const voiceLevel = isPoly ? 2 : ( this.accentPattern[patternIndex] ?? 2 )

    // If not muted by any logic, PLAY SOUND
    if ( !isGapped && !isStealthMuted && voiceLevel > 0 ) {
      const osc = this.context!.createOscillator()
      const gain = this.context!.createGain()
      osc.connect( gain )
      gain.connect( this.context!.destination )

      /**
       * Sound Design:
       * We use frequency and volume to differentiate rhythmic importance.
       * Level 3 (Strong): 1200Hz - High clarity for the anchor pulse.
       * Level 2 (Normal): 900Hz  - Standard eighth notes or beats.
       * Level 1 (Weak):   700Hz  - Lower volume "ghost" notes for syncopation.
       */
      if ( isPoly ) {
        osc.frequency.value = 600 // Deeper/Woody sound for poly layer
        gain.gain.setValueAtTime( 0.2, time )
      } else {
        switch ( voiceLevel ) {
          case 3: // Strong Accent
            osc.frequency.value = 1200
            gain.gain.setValueAtTime( 0.4, time )
            break
          case 2: // Normal Beat
            osc.frequency.value = 900
            gain.gain.setValueAtTime( 0.3, time )
            break
          default: // Level 1: Weak/Ghost beat
            osc.frequency.value = 700
            gain.gain.setValueAtTime( 0.15, time )
            break
        }
      }

      // Envelope: Fast Attack, Fast Decay (Snappy "Click" sound)
      // Shortened to 25ms to avoid overlapping/muddiness at high speeds
      gain.gain.exponentialRampToValueAtTime( 0.01, time + 0.025 )

      osc.start( time )
      osc.stop( time + 0.025 )
    }

    // Notify the UI (so the LEDs can blink)
    this.beatCallbacks.forEach( cb => cb( pulseNumber, time, isMainBeat, isPoly ) )

    // --- Auto-Progression Logic ---
    // Check if we need to speed up (only on the first beat of a bar)
    if ( !isPoly && isFirstBeatOfBar && pulseNumber > 0 && this.progressionInterval > 0 ) {
      const pulsesPerBar = this.subdivision * 4
      const barsElapsed = pulseNumber / pulsesPerBar

      if ( barsElapsed % this.progressionInterval === 0 ) {
        const newTempo = Math.min( this.progressionGoal, this.tempo + this.progressionIncrement )
        if ( newTempo !== this.tempo ) {
          this.setTempo( newTempo )
          // Notify UI that tempo changed
          this.tempoCallbacks.forEach( cb => cb( this.tempo ) )
        }
      }
    }
  }

  /**
   * Calculates the time for the NEXT Main note.
   */
  private nextNote () {
    const secondsPerBeat = 60.0 / this.tempo
    const secondsPerPulse = secondsPerBeat / this.subdivision
    this.nextNoteTime += secondsPerPulse
    this.currentPulse++
  }

  /**
   * Calculates the time for the NEXT Poly note.
   */
  private nextPolyNote () {
    // A "Bar" is 4 beats. 
    const secondsPerBar = ( 60.0 / this.tempo ) * 4
    // We divide the entire Bar duration by the Poly Subdivision (e.g. 5)
    // This creates 5 evenly spaced notes across the bar.
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
