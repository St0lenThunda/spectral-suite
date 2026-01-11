import { Note } from 'tonal';
import { AudioEngine } from './AudioEngine';

export type TonePreset = 'RETRO' | 'PLUCKED' | 'ELECTRIC';

/**
 * SynthEngine
 * A lightweight, singleton-based synthesizer for generating musical tones.
 * This is used to provide audio feedback for scales and chords across the suite.
 * 
 * It supports multiple "Presets" (Synthesis Strategies):
 * 1. RETRO: Triangle wave (Gameboy/Chiptune style) - Original
 * 2. PLUCKED: Karplus-Strong String Synthesis (Guitar/Harp)
 * 3. ELECTRIC: FM Synthesis (Rhodes/Bell style)
 */
export class SynthEngine {
  private static instance: SynthEngine;
  private context: AudioContext | null = null;
  private gainNode: GainNode | null = null;

  // Default to Retro
  private currentPreset: TonePreset = 'RETRO';

  // Noise buffer for Karplus-Strong (Generated once)
  private noiseBuffer: AudioBuffer | null = null;

  // Private constructor ensures only one instance is created (Singleton pattern).
  // This prevents multiple synth engines from fighting for audio hardware resources.
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

  public getPreset (): TonePreset {
    return this.currentPreset;
  }

  public setPreset ( preset: TonePreset ) {
    this.currentPreset = preset;
    console.log( '[SynthEngine] Preset changed to:', preset );
  }

  /**
   * Initializes the audio context and global gain node.
   */
  private init () {
    const audioEngine = AudioEngine.getInstance();
    const currentContext = audioEngine.getContext();

    // Check if context requires sync.
    // We only want to initialize if the context is valid and active.
    if ( this.context && this.context === currentContext && this.context.state !== 'closed' ) {
      return;
    }

    this.context = currentContext;
    if ( !this.context ) return;

    // Create the master gain node.
    // This allows us to control the volume of the entire synth globally.
    this.gainNode = this.context.createGain();
    this.gainNode.connect( this.context.destination );
    this.gainNode.gain.value = 1.0;

    // Pre-generate white noise for Karplus-Strong if needed.
    // Why? Generating 2 seconds of random numbers every time a note plays is VERY slow.
    // Optimization: We do it once here and reuse the buffer.
    if ( !this.noiseBuffer ) {
      const fontSize = this.context.sampleRate * 2.0; // 2 seconds of audio buffer
      const buffer = this.context.createBuffer( 1, fontSize, this.context.sampleRate );
      const data = buffer.getChannelData( 0 );

      // Fill the buffer with static (random noise between -1.0 and 1.0)
      for ( let i = 0; i < fontSize; i++ ) {
        data[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buffer;
    }
  }

  /**
   * Plays a single note at the specified frequency.
   */
  public playNote ( frequency: number, durationMs: number = 300 ) {
    this.init();
    if ( !this.context || !this.gainNode ) return;

    if ( this.context.state === 'suspended' ) {
      this.context.resume();
    }

    const now = this.context.currentTime;
    const duration = durationMs / 1000;

    // Dispatch to the correct voice generator (Volume 0.2 for single notes)
    this._dispatchVoice( frequency, 0.2, duration, now );
  }

  /**
   * Plays a collection of notes simultaneously to form a chord.
   */
  public playChord ( notes: string[], durationMs: number = 500 ) {
    this.init();
    if ( !this.context || !this.gainNode || notes.length === 0 ) return;

    if ( this.context.state === 'suspended' ) {
      this.context.resume();
    }

    const now = this.context.currentTime;
    const duration = durationMs / 1000;

    // Scale volume to prevent clipping
    const noteVolume = 0.3 / notes.length;

    notes.forEach( noteName => {
      // Robust Frequency Resolution
      let freq = Note.freq( noteName );
      if ( !freq ) {
        // Fallback for Pitch Classes (e.g. "C" -> "C4")
        freq = Note.freq( noteName + '4' );
      }

      if ( freq ) {
        this._dispatchVoice( freq, noteVolume, duration, now );
      }
    } );
  }

  /**
   * Internal dispatcher to route frequency/volume data to the selected synthesis algorithm.
   */
  private _dispatchVoice ( freq: number, volume: number, duration: number, now: number ) {
    switch ( this.currentPreset ) {
      case 'PLUCKED':
        this._playPluckedVoice( freq, volume, duration, now );
        break;
      case 'ELECTRIC':
        this._playElectricVoice( freq, volume, duration, now );
        break;
      case 'RETRO':
      default:
        this._playRetroVoice( freq, volume, duration, now );
        break;
    }
  }

  // --- VOICE ALGORITHMS ---

  /**
   * 1. RETRO (Original)
   * A simple Triangle wave with an ADSR envelope.
   * 
   * "Subtractive" style (though simple): We start with a rich waveform (Triangle)
   * and shape its volume over time.
   * 
   * @param freq - Pitch in Hz
   * @param volume - Target loudness (0.0 to 1.0)
   * @param duration - How long to play in seconds
   * @param now - Current AudioContext time
   */
  private _playRetroVoice ( freq: number, volume: number, duration: number, now: number ) {
    // Oscillator is the source of sound (the vibrating string/air)
    const osc = this.context!.createOscillator();
    // GainNode is the volume knob (the envelope)
    const env = this.context!.createGain();

    // Triangle waves sound "flutey" or "gameboy-like".
    // They have odd harmonics that drop off quickly in volume.
    osc.type = 'triangle';
    osc.frequency.setValueAtTime( freq, now );

    osc.connect( env );
    env.connect( this.gainNode! );

    // ADSR Envelope (Attack, Decay, Sustain, Release)
    // We manually simulate the "shape" of a musical note.
    const attack = 0.05; // 50ms fade in (removes "click" at start)
    const release = 0.1; // 100ms fade out (natural ending)

    // automation points to draw the volume curve
    env.gain.setValueAtTime( 0, now );
    env.gain.linearRampToValueAtTime( volume, now + attack ); // Fade In
    env.gain.setValueAtTime( volume, now + duration - release ); // Sustain
    env.gain.linearRampToValueAtTime( 0, now + duration ); // Fade Out

    osc.start( now );
    osc.stop( now + duration );
  }

  /**
   * 2. PLUCKED (Karplus-Strong Algorithm)
   * Physically models a plucked string using a delay loop.
   * 
   * The Physics:
   * 1. A short burst of noise (the "pick" striking the string) travels down the string.
   * 2. It hits the bridge and reflects back (Delay Loop).
   * 3. The string material absorbs high frequencies every cycle (LowPass Filter).
   * 4. This repeating, filtering loop turns noise into a pitched tone.
   * 
   * @param freq - The pitch of the string
   * @param volume - Loudness
   * @param duration - Length of the note
   * @param now - Current time
   */
  private _playPluckedVoice ( freq: number, volume: number, duration: number, now: number ) {
    if ( !this.noiseBuffer ) return;

    // 1. Exciter (The Pick): A buffer source playing our pre-generated white noise
    const source = this.context!.createBufferSource();
    source.buffer = this.noiseBuffer;
    source.loop = true;

    // Create a very short "pluck" envelope for the noise.
    // This GainNode determines how "hard" the string was plucked.
    const inputGain = this.context!.createGain();

    // The "Excitation Pulse".
    // 10ms (0.01s) is a standard duration for a plectrum performing a pluck.
    // Longer bursts sound like a bow or a scrap; shorter sounds like a tap.
    const burstDuration = 0.01;

    // 2. String Loop (The Physics Model)
    // The delay node simulates the time it takes for the wave to travel down the string and back.
    const delayNode = this.context!.createDelay();

    // Delay Time Formula: Time = 1 / Frequency.
    // Example: A 440Hz 'A' note repeats 440 times a second.
    // So distinct pulses must be 1/440th of a second apart.
    delayNode.delayTime.value = 1 / freq;

    const feedbackGain = this.context!.createGain();
    // Feedback simulates energy loss. 
    // 0.99 means the string keeps 99% of its energy each cycle. 
    // Lower values (0.9) sound like a "Banjo" (fast decay).
    // Higher values (0.999) sound like a "Piano" (long sustain).
    feedbackGain.gain.value = 0.99;

    const lowPass = this.context!.createBiquadFilter();
    lowPass.type = 'lowpass';
    // Cutoff simulates the "brightness" of the string material.
    // Nylon strings dampen highs quickly (lower cutoff); Steel strings ring longer (higher cutoff).
    // 2000Hz is a good balanced value for a generic acoustic guitar.
    lowPass.frequency.value = 2000;
    lowPass.Q.value = 0; // No resonance peak, we want pure damping.

    // Master Volume for this voice
    const outGain = this.context!.createGain();
    // Physical models can be quiet, so we boost the volume (x2.0) to match the other synths.
    outGain.gain.value = volume * 2.0;

    // Wiring The Loop:
    // Noise -> InputGain -> Delay -> Output
    source.connect( inputGain );
    inputGain.connect( delayNode );

    // The Feedback Loop: Delay -> Feedback -> Filter -> Back into Delay
    delayNode.connect( feedbackGain );
    feedbackGain.connect( lowPass );
    lowPass.connect( delayNode );

    // Output: Tapping the delay line to hear the sound
    delayNode.connect( outGain );
    outGain.connect( this.gainNode! );

    // Shaping the "Pick" (Input Envelope)
    inputGain.gain.setValueAtTime( 0, now );
    inputGain.gain.linearRampToValueAtTime( 1, now + 0.001 ); // Instant attack
    // Fast decay to silence. We only need the initial impulse to start the loop.
    inputGain.gain.exponentialRampToValueAtTime( 0.001, now + burstDuration );

    // Output Safety Envelope
    // Even though the physics decay naturally, we force a silence at the end 
    // to prevent any low-level feedback loops from running forever.
    outGain.gain.setValueAtTime( volume * 2.0, now + duration - 0.1 );
    outGain.gain.linearRampToValueAtTime( 0, now + duration );

    source.start( now );
    // Stop the noise source a bit later to catch any tail
    source.stop( now + duration + 0.1 );
  }

  /**
   * 3. ELECTRIC (FM Synthesis)
   * Frequency Modulation (FM) simulates complex bell-like tones.
   * 
   * How it works:
   * We have two oscillators.
   * - Carrier: The main pitch we hear.
   * - Modulator: Vibrates the CARRIER'S pitch very fast.
   * 
   * If the Modulator is fast enough, we don't hear "vibrato"—we hear a new "timbre" (tone color).
   * This is how the famous Yamaha DX7 electric piano worked!
   * 
   * @param freq - The note frequency
   * @param volume - Output volume
   * @param duration - Note length
   * @param now - AudioContext time
   */
  private _playElectricVoice ( freq: number, volume: number, duration: number, now: number ) {
    const carrier = this.context!.createOscillator();
    const modulator = this.context!.createOscillator();

    // This gain controls "How much" the modulator affects the carrier.
    // More gain = brighter, harsher metal sound.
    // Less gain = softer, duller sine wave.
    const modGain = this.context!.createGain();
    const outGain = this.context!.createGain();

    // The C:M Ratio (Carrier to Modulator Ratio).
    // Ratio 1:1 = Wood/Flute.
    // Ratio 1:2 = Hollow square wave.
    // Ratio 1:14 = Bells/Glockenspiel.
    // A Ratio of 2.0 (plus slight detuning usually) creates a classic "Rhodes" electric piano tone.
    const ratio = 2.0;

    carrier.type = 'sine';
    carrier.frequency.value = freq;

    modulator.type = 'sine';
    // The modulator runs at a harmonic multiple of the carrier
    modulator.frequency.value = freq * ratio;

    // Wiring:
    // Modulator -> ModGain -> Carrier's Frequency Parameter
    modulator.connect( modGain );
    modGain.connect( carrier.frequency );

    // Carrier -> Out -> Speakers
    carrier.connect( outGain );
    outGain.connect( this.gainNode! );

    // 1. Modulation Envelope (The "Timber" Envelope)
    // We start with high modulation (bright "tine" hit) and fade to low modulation (warm tone).
    // This mimics how a real tine vibrates strongly at first, then settles into a hum.
    const modulationIndex = 300; // 300Hz deviation
    modGain.gain.setValueAtTime( 0, now );
    modGain.gain.linearRampToValueAtTime( modulationIndex, now + 0.02 ); // Fast attack
    modGain.gain.exponentialRampToValueAtTime( 1, now + 0.5 ); // Decay to almost pure sine

    // 2. Amplitude Envelope (The "Volume" Envelope)
    outGain.gain.setValueAtTime( 0, now );
    outGain.gain.linearRampToValueAtTime( volume * 1.5, now + 0.02 );
    outGain.gain.setValueAtTime( volume * 1.5, now + duration - 0.1 );
    outGain.gain.linearRampToValueAtTime( 0, now + duration );

    carrier.start( now );
    modulator.start( now );

    carrier.stop( now + duration );
    modulator.stop( now + duration );
  }
}
