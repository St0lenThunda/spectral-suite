import { Note } from 'tonal';
import { AudioEngine } from './AudioEngine';

export type TonePreset = 'RETRO' | 'PLUCKED' | 'ELECTRIC' | 'STEEL_STRING' | 'OVERDRIVE' | 'DISTORTION';

/**
 * SynthEngine
 * A lightweight, singleton-based synthesizer for generating musical tones.
 * This is used to provide audio feedback for scales and chords across the suite.
 * 
 * It supports multiple "Presets" (Synthesis Strategies):
 * 1. RETRO: Triangle wave (Gameboy/Chiptune style) - Original
 * 2. PLUCKED: Karplus-Strong String Synthesis (Nylon/Mellow Guitar)
 * 3. ELECTRIC: FM Synthesis (Rhodes/Bell style)
 * 4. STEEL_STRING: Karplus-Strong with brighter filtering and longer sustain (Acoustic Guitar)
 * 5. OVERDRIVE: Plucked string with soft-clipping waveshaper (Blues/Rock tone)
 * 6. DISTORTION: Plucked string with heavy clipping and "cabinet" filtering (Metal/Lead tone)
 */
export class SynthEngine {
  private static instance: SynthEngine;
  private context: AudioContext | null = null;
  private gainNode: GainNode | null = null;

  // Default to Retro
  private currentPreset: TonePreset = 'RETRO';

  // Excitation Buffers (Generated once)
  private buffers: { [key: string]: AudioBuffer } = {};

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

    // Use AudioEngine's context if available, otherwise create our own for output-only use
    if ( currentContext ) {
      this.context = currentContext;
    } else if ( !this.context || this.context.state === 'closed' ) {
      // Create a standalone context for output-only (no mic needed for synth playback)
      this.context = new ( window.AudioContext || ( window as any ).webkitAudioContext )();
    }
    if ( !this.context ) return;

    // Create the master gain node.
    // This allows us to control the volume of the entire synth globally.
    this.gainNode = this.context.createGain();
    this.gainNode.gain.value = 1.0;

    // Master Low Pass Filter (Removes digital harshness)
    const masterFilter = this.context.createBiquadFilter();
    masterFilter.type = 'lowpass';
    masterFilter.frequency.value = 3500;
    masterFilter.Q.value = 0.5;

    this.gainNode.connect( masterFilter );
    masterFilter.connect( this.context.destination );

    // Pre-generate colored noise buffers for Karplus-Strong
    if ( !this.buffers['white'] ) {
      const fontSize = this.context.sampleRate * 2.0; // 2 seconds

      // 1. White Noise (Random)
      const whiteBuffer = this.context.createBuffer( 1, fontSize, this.context.sampleRate );
      const whiteData = whiteBuffer.getChannelData( 0 );
      for ( let i = 0; i < fontSize; i++ ) {
        whiteData[i] = Math.random() * 2 - 1;
      }
      this.buffers['white'] = whiteBuffer;

      // 2. Pink Noise (1/f) - Paul Kellet's Refined Method
      // Approx -3dB/octave. Great for steel strings (balanced).
      const pinkBuffer = this.context.createBuffer( 1, fontSize, this.context.sampleRate );
      const pinkData = pinkBuffer.getChannelData( 0 );
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for ( let i = 0; i < fontSize; i++ ) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        let value = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        value *= 0.11; // Compensate for gain
        pinkData[i] = value;
        b6 = white * 0.115926;
      }
      this.buffers['pink'] = pinkBuffer;

      // 3. Brown Noise (1/f^2)
      // Integrate white noise. Deep and warm. Great for Nylon.
      const brownBuffer = this.context.createBuffer( 1, fontSize, this.context.sampleRate );
      const brownData = brownBuffer.getChannelData( 0 );
      let lastOut = 0;
      for ( let i = 0; i < fontSize; i++ ) {
        const white = Math.random() * 2 - 1;
        lastOut = ( lastOut + ( 0.02 * white ) ) / 1.02;
        brownData[i] = lastOut * 3.5; // Compensate to unit gain
      }
      this.buffers['brown'] = brownBuffer;
    }
  }

  /**
   * Plays a single note at the specified frequency.
   */
  public playNote ( frequency: number, durationMs: number = 300, volume: number = 0.25 ) {
    this.init();
    if ( !this.context || !this.gainNode ) {
      console.warn( '[SynthEngine] Context or GainNode missing!' );
      return;
    }

    if ( this.context.state === 'suspended' ) {
      console.log( '[SynthEngine] Resuming context...' );
      this.context.resume();
    }

    const now = this.context.currentTime;
    const duration = durationMs / 1000;

    // Dispatch to the correct voice generator
    this._dispatchVoice( frequency, volume, duration, now );
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
      case 'STEEL_STRING':
        this._playSteelStringVoice( freq, volume, duration, now );
        break;
      case 'OVERDRIVE':
        this._playOverdriveVoice( freq, volume, duration, now );
        break;
      case 'DISTORTION':
        this._playDistortionVoice( freq, volume, duration, now );
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
   * 1. RETRO (Refined)
   * A classic analog "Sawtooth" lead.
   * 
   * "Subtractive" style:
   * We start with a bright Sawtooth wave and filter it down to make it warm and brassy.
   * 
   * @param freq - Pitch in Hz
   * @param volume - Target loudness (0.0 to 1.0)
   * @param duration - How long to play in seconds
   * @param now - Current AudioContext time
   */
  private _playRetroVoice ( freq: number, volume: number, duration: number, now: number ) {
    if ( !this.context || !this.gainNode ) return;
    const osc = this.context.createOscillator();
    const env = this.context.createGain();
    const filter = this.context.createBiquadFilter();

    // Change to Sawtooth for a richer, "vintage" sound
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime( freq, now );

    // Low Pass Filter to remove harsh digital "buzz"
    // We set it relatively low (2000Hz) with some resonance (Q) for character
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime( 2000, now );
    filter.Q.value = 1.0;

    // Routing: Osc -> Filter -> Envelope -> Master
    osc.connect( filter );
    filter.connect( env );
    env.connect( this.gainNode );

    // Slower attack for a "Poly-Synth" feel
    const attack = 0.08;
    const release = 0.15;

    env.gain.setValueAtTime( 0, now );
    env.gain.linearRampToValueAtTime( volume * 0.8, now + attack ); // Slightly lower volume for saw
    env.gain.setValueAtTime( volume * 0.8, now + duration - release );
    env.gain.linearRampToValueAtTime( 0, now + duration );

    osc.start( now );
    osc.stop( now + duration );
  }

  /**
   * 3. ELECTRIC (Refined FM Synthesis)
   * Frequency Modulation (FM) simulates Electric Pianos (DX7 Style).
   * 
   * Changes:
   * - Ratio 1:3 (Carrier:Modulator) creates clearer, bell-like harmonics.
   * - Dynamic Modulation Index ensures consistency across low/high octaves.
   *
   * @param freq - The note frequency
   * @param volume - Output volume
   * @param duration - Note length
   * @param now - AudioContext time
   */
  private _playElectricVoice ( freq: number, volume: number, duration: number, now: number ) {
    if ( !this.context || !this.gainNode ) return;
    const carrier = this.context.createOscillator();
    const modulator = this.context.createOscillator();
    const modGain = this.context.createGain();
    const outGain = this.context.createGain();

    // Ratio 1:3 creates a "glassy" E-Piano tone
    const ratio = 3.0;

    // Modulation Index should be relative to frequency for consistent timbre
    // Index = Frequency * Intensity
    const intensity = 2.0;
    const maxIndex = freq * intensity;

    carrier.type = 'sine';
    carrier.frequency.value = freq;

    modulator.type = 'sine';
    modulator.frequency.value = freq * ratio;

    modulator.connect( modGain );
    modGain.connect( carrier.frequency );

    carrier.connect( outGain );
    outGain.connect( this.gainNode );

    // FM Envelope (The "Bite")
    // High index at start (attack), decaying to low index (sustain)
    modGain.gain.setValueAtTime( 0, now );
    modGain.gain.linearRampToValueAtTime( maxIndex, now + 0.01 ); // Fast attack
    modGain.gain.exponentialRampToValueAtTime( freq * 0.5, now + 0.3 ); // Decay to soft sine

    // Amplitude Envelope
    outGain.gain.setValueAtTime( 0, now );
    outGain.gain.linearRampToValueAtTime( volume * 1.5, now + 0.02 );
    outGain.gain.setValueAtTime( volume * 1.5, now + duration - 0.1 );
    outGain.gain.linearRampToValueAtTime( 0, now + duration );

    carrier.start( now );
    modulator.start( now );
    carrier.stop( now + duration );
    modulator.stop( now + duration );
  }

  /**
   * 4. STEEL_STRING
   * A variation of the Plucked algorithm optimized for metallic acoustic strings.
   * 
   * Changes:
   * - Brighter LowPass filter (allows more harmonics).
   * - Longer feedback (simulates more resonant steel).
   */


  /**
   * 5. OVERDRIVE
   * Simulates a guitar amp being pushed into "Crunch".
   * 
   * We take the Plucked voice and run it through a WaveShaperNode.
   * Soft-clipping rounds off the peaks of the waveform, adding warmth.
   */
  private _playOverdriveVoice ( freq: number, volume: number, duration: number, now: number ) {
    this._playDistortedVoice( freq, volume, duration, now, 3 );
  }

  /**
   * 6. DISTORTION
   * A "High-Gain" guitar tone. 
   * 
   * We use a much steeper clipping curve and a "Cabinet Simulation" filter.
   * Real guitar cabinets don't play high frequencies well, so we cut them 
   * off to avoid "fizzy" digital noise.
   */
  private _playDistortionVoice ( freq: number, volume: number, duration: number, now: number ) {
    this._playDistortedVoice( freq, volume, duration, now, 12 );
  }

  /**
   * Internal helper to handle distorted guitar voices.
   * Uses a WaveShaper for "Distortion" and a BiquadFilter for "Cabinet Simulation".
   */
  private _playDistortedVoice ( freq: number, volume: number, duration: number, now: number, drive: number ) {
    if ( !this.context || !this.gainNode ) return;

    // Create the base sound (The String)
    // RADICAL FIX: Cap feedback at 0.92 to prevent screech
    const pluckOut = this.context.createGain();
    this._createPluckSource( freq, volume, duration, now, 0.92, 1200, pluckOut, 'bright' );

    // Pre-Distortion Filter (KEY FIX)
    // Removing high frequencies *before* clipping prevents the "white noise" fizz.
    const preFilter = this.context.createBiquadFilter();
    preFilter.type = 'lowpass';
    preFilter.frequency.value = 1000;
    preFilter.Q.value = 0.5;

    // 1. Distortion (The Pedals/Pre-amp)
    const shaper = this.context.createWaveShaper();
    shaper.curve = this._makeDistortionCurve( drive * 10 );
    shaper.oversample = '4x'; // Reduces digital aliasing (harshness)

    // 2. Cabinet Sim (The Speaker)
    // Lowered cutoff to 1100Hz to simulate a heavy 4x12 cabinet
    const cabinet1 = this.context.createBiquadFilter();
    cabinet1.type = 'lowpass';
    cabinet1.frequency.value = 1100;
    cabinet1.Q.value = 0.7; // Standard Butterworth-style roll-off

    const cabinet2 = this.context.createBiquadFilter();
    cabinet2.type = 'lowpass';
    cabinet2.frequency.value = 1320; // 1.2x tracking
    cabinet2.Q.value = 0.5;

    // Wiring: Pluck -> PreFilter -> Shaper -> Cab1 -> Cab2 -> Out
    pluckOut.connect( preFilter );
    preFilter.connect( shaper );
    shaper.connect( cabinet1 );
    cabinet1.connect( cabinet2 );
    cabinet2.connect( this.gainNode );

    // Cleanup after duration
    setTimeout( () => {
      pluckOut.disconnect();
      preFilter.disconnect();
      shaper.disconnect();
      cabinet1.disconnect();
      cabinet2.disconnect();
    }, ( duration + 0.2 ) * 1000 );
  }

  /**
   * Helper to generate a Sigmoid curve for the WaveShaper.
   * This math "squashes" any signal that goes too high/low.
   */
  private _makeDistortionCurve ( amount: number ) {
    const k = amount;
    const n_samples = 44100;
    const curve = new Float32Array( n_samples );

    for ( let i = 0; i < n_samples; ++i ) {
      const x = ( i * 2 ) / n_samples - 1;
      // We use a smoother hyperbolic tangent-like curve to avoid harsh "digital" clipping
      // this rounds off the waveform peaks instead of "squaring" them.
      curve[i] = ( ( 3 + k ) * Math.atan( x * k ) ) / ( Math.PI + k * Math.abs( x ) );
    }
    return curve;
  }

  /**
   * Internal reusable implementation of Plucked String (Karplus-Strong).
   * Allows specific voices to override feedback and filtering.
   */
  private _playPluckedVoice (
    freq: number,
    volume: number,
    duration: number,
    now: number,
    feedback: number = 0.88, // RADICAL FIX: 0.98 -> 0.88 (Dead dampening)
    cutoff: number = 600,     // RADICAL FIX: 1800 -> 600 (Remove zing)
    pluckColor: 'warm' | 'bright' = 'warm'
  ) {
    // 1. Create the Pluck Source (The String)
    const stringOut = this.context!.createGain();
    this._createPluckSource( freq, volume, duration, now, feedback, cutoff, stringOut, pluckColor );

    // 2. Body Simulation (The Wood)
    this._createBodyFilters( stringOut, this.gainNode! );

    // Cleanup logic is handled locally by nodes...
    setTimeout( () => {
      stringOut.disconnect();
    }, ( duration + 0.2 ) * 1000 );
  }

  /**
   * 4. STEEL_STRING
   * A variation of the Plucked algorithm optimized for metallic acoustic strings.
   * 
   * Changes:
   * - RADICAL FIX: Feedback 0.92 (Control sustain), Cutoff 1200 (Warm it up).
   */
  private _playSteelStringVoice ( freq: number, volume: number, duration: number, now: number ) {
    this._playPluckedVoice( freq, volume, duration, now, 0.92, 1200, 'bright' );
  }

  /**
   * Creates a chain of filters to simulate the resonant body of a guitar.
   * Enhances ~100Hz (Air cavity) and ~220Hz (Top plate).
   */
  private _createBodyFilters ( input: AudioNode, output: AudioNode ) {
    if ( !this.context ) return;

    const airFilter = this.context.createBiquadFilter();
    airFilter.type = 'peaking';
    airFilter.frequency.value = 110; // "Helmholtz" air resonance
    airFilter.Q.value = 1.0;
    airFilter.gain.value = 5.0; // Moderate boost

    const topFilter = this.context.createBiquadFilter();
    topFilter.type = 'peaking';
    topFilter.frequency.value = 220; // Main top plate resonance
    topFilter.Q.value = 1.2;
    topFilter.gain.value = 3.0;

    input.connect( airFilter );
    airFilter.connect( topFilter );
    topFilter.connect( output );
  }

  /**
   * The actual implementation logic for the plucked string.
   */
  private _createPluckSource (
    freq: number,
    volume: number,
    duration: number,
    now: number,
    feedback: number,
    cutoff: number,
    destination: AudioNode,
    pluckColor: 'warm' | 'bright' = 'bright',
    excitationType: 'white' | 'pink' | 'brown' = 'white'
  ) {
    if ( !this.buffers[excitationType] ) return;

    const source = this.context!.createBufferSource();
    source.buffer = this.buffers[excitationType];
    source.loop = true;

    // Filter the noise burst to simulate pick vs finger
    // This "burst" is the initial transient sound (e.g., the plectrum hitting the string)
    const burstFilter = this.context!.createBiquadFilter();

    if ( pluckColor === 'warm' ) {
      // Finger/Flesh: Dull attack, remove highs so it sounds rounder/thump-like
      burstFilter.type = 'lowpass';
      burstFilter.frequency.value = 2000;
    } else {
      // Pick/Nail: Sharp attack, remove mud (lows) so it sounds crisp
      burstFilter.type = 'highpass';
      burstFilter.frequency.value = 500;
    }

    const inputGain = this.context!.createGain();
    const burstDuration = 0.01;

    const delayNode = this.context!.createDelay();
    delayNode.delayTime.value = 1 / freq;

    const feedbackGain = this.context!.createGain();
    feedbackGain.gain.value = feedback;

    const lowPass = this.context!.createBiquadFilter();
    lowPass.type = 'lowpass';
    lowPass.frequency.value = cutoff;
    lowPass.Q.value = 0;

    const outGain = this.context!.createGain();
    outGain.gain.value = volume * 2.0;

    // Wiring: Source -> BurstFilter -> InputGain -> Karplus Loop
    source.connect( burstFilter );
    burstFilter.connect( inputGain );
    inputGain.connect( delayNode );

    // Karplus Loop
    delayNode.connect( feedbackGain );
    feedbackGain.connect( lowPass );
    lowPass.connect( delayNode );

    // Output
    delayNode.connect( outGain );
    outGain.connect( destination );

    inputGain.gain.setValueAtTime( 0, now );
    inputGain.gain.linearRampToValueAtTime( 1, now + 0.001 );
    inputGain.gain.exponentialRampToValueAtTime( 0.001, now + burstDuration );

    outGain.gain.setValueAtTime( volume * 2.0, now + duration - 0.1 );
    outGain.gain.linearRampToValueAtTime( 0, now + duration );

    source.start( now );
    source.stop( now + duration + 0.1 );
  }
}
