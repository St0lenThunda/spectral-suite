import { Note } from 'tonal';
import { AudioEngine } from './AudioEngine';

/**
 * SynthEngine
 * A lightweight, singleton-based synthesizer for generating musical tones.
 * This is used to provide audio feedback for scales and chords across the suite.
 * 
 * It uses the Web Audio API to create a triangle-wave oscillator, which has
 * a "reedy" or "retro" sound that is clear and easy to hear over ambient noise.
 */
export class SynthEngine {
  private static instance: SynthEngine;
  private context: AudioContext | null = null;
  private gainNode: GainNode | null = null;

  // Private constructor ensures only one instance is created (Singleton pattern)
  private constructor() { }

  /**
   * Retrieves the singleton instance of the SynthEngine.
   * If it doesn't exist, it creates one.
   * 
   * @returns SynthEngine - The globally shared synth engine
   */
  public static getInstance (): SynthEngine {
    if ( !SynthEngine.instance ) {
      SynthEngine.instance = new SynthEngine();
    }
    return SynthEngine.instance;
  }

  /**
   * Initializes the audio context and global gain node.
   * We wait to initialize until the first user interaction to comply with
   * browser autoplay policies (which block audio that starts automatically).
   */
  private init () {
    if ( this.context ) return; // Already initialized!

    const audioEngine = AudioEngine.getInstance();
    this.context = audioEngine.getContext();
    if ( !this.context ) return;

    // The GainNode acts like a master volume control for the synth
    this.gainNode = this.context.createGain();
    this.gainNode.connect( this.context.destination );

    // We set master gain to 1.0 (100% volume)
    this.gainNode.gain.value = 1.0;
  }

  /**
   * Plays a single note at the specified frequency.
   * This builds an ADSR-like envelope (Attack, Decay, Sustain, Release)
   * to ensure the note doesn't "click" when it starts or stops abruptly.
   * 
   * @param frequency - The pitch of the note in Hertz (Hz)
   * @param durationMs - How long the note should play in milliseconds
   */
  public playNote ( frequency: number, durationMs: number = 300 ) {
    this.init();
    if ( !this.context || !this.gainNode ) return;

    // Browsers often "suspend" the AudioContext if no sound has played.
    // We explicitly resume it here to ensure the note triggers reliably.
    if ( this.context.state === 'suspended' ) {
      this.context.resume();
    }

    // Create a new oscillator for this specific note
    const osc = this.context.createOscillator();

    // Create a local gain node for the note's volume envelope
    const noteGain = this.context.createGain();

    // Triangle waves have a softer harmonic profile than square/saw waves.
    osc.type = 'triangle';
    osc.frequency.setValueAtTime( frequency, this.context.currentTime );

    // Chain: Oscillator -> Note Volume Envelope -> Master Gain -> Speakers
    osc.connect( noteGain );
    noteGain.connect( this.gainNode );

    const now = this.context.currentTime;

    // Envelope Timing:
    // Attack: 0.05s (50ms) fade-in to avoid sharp transients
    const attack = 0.05; 

    // Release: 0.1s (100ms) fade-out to make the note sound natural
    const release = 0.1;

    const duration = durationMs / 1000; // Convert MS to seconds

    // Set up the volume envelope:
    // 1. Start at 0 volume immediately
    noteGain.gain.setValueAtTime( 0, now );

    // 2. Quickly fade up to 0.2 (20% volume) - we use 0.2 to avoid clipping multiple notes
    noteGain.gain.linearRampToValueAtTime( 0.2, now + attack );

    // 3. Hold that volume until the end minus release time
    noteGain.gain.setValueAtTime( 0.2, now + duration - release );

    // 4. Fade back to 0 volume at the very end
    noteGain.gain.linearRampToValueAtTime( 0, now + duration );

    // Start generating sound and schedule it to stop
    osc.start( now );
    osc.stop( now + duration );
  }

  /**
   * Plays a collection of notes simultaneously to form a chord.
   * To prevent "clipping" (digital distortion) when multiple sounds 
   * combine, we scale the volume of each individual note by 1/N.
   * 
   * @param notes - Array of note names (e.g., ['C4', 'E4', 'G4'])
   * @param durationMs - How long the chord should play
   */
  public playChord ( notes: string[], durationMs: number = 500 ) {
    this.init();
    if ( !this.context || !this.gainNode || notes.length === 0 ) return;

    if ( this.context.state === 'suspended' ) {
      this.context.resume();
    }

    const now = this.context.currentTime;
    const duration = durationMs / 1000;
    const attack = 0.05;
    const release = 0.1;

    // We scale volume by the number of notes to keep the total output level safe.
    // If we have 3 notes, each gets 1/3 of the targeted volume.
    const noteVolume = 0.3 / notes.length;

    notes.forEach( noteName => {
      // Note.freq() converts a name like "C4" into a frequency like 261.63Hz
      const freq = Note.freq( noteName );
      if ( freq === null ) return;

      const osc = this.context!.createOscillator();
      const noteGain = this.context!.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime( freq, now );

      osc.connect( noteGain );
      noteGain.connect( this.gainNode! );

      // Envelope Application
      noteGain.gain.setValueAtTime( 0, now );
      noteGain.gain.linearRampToValueAtTime( noteVolume, now + attack );
      noteGain.gain.setValueAtTime( noteVolume, now + duration - release );
      noteGain.gain.linearRampToValueAtTime( 0, now + duration );

      osc.start( now );
      osc.stop( now + duration );
    } );
  }
}
