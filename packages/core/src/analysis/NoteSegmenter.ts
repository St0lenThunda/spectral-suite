import { ref, watch, type Ref } from 'vue';

export interface NoteEvent {
  note: string;
  frequency: number;
  startTime: number;
  endTime?: number;
  duration?: number;
}

export interface SegmenterConfig {
  clarityThreshold?: number; // Minimum clarity to start a note
  minDurationMs?: number;   // Minimum duration to be considered a note (debouncing)
  pitchTolerance?: number;  // Cents change to trigger a new note
}

/**
 * NoteSegmenter - Fuses Pitch and Clarity streams into discrete Note Events.
 * 
 * WHY THIS EXISTS:
 * Raw pitch detection streams are noisy and continuous. To build a game or transcription tool,
 * we need to know exactly when a note STARTED and STOPPED. This class handles that logic,
 * including debouncing, hysteresis, and pitch-change detection (legato).
 */
export class NoteSegmenter {
  private _isActive = ref( false );
  private config: Required<SegmenterConfig>;

  // State
  private currentEvent: NoteEvent | null = null;
  private onNoteStartCallbacks: Set<( event: NoteEvent ) => void> = new Set();
  private onNoteEndCallbacks: Set<( event: NoteEvent ) => void> = new Set();

  private pitch: Ref<number | null>;
  private clarity: Ref<number | null>;
  private noteName: Ref<string | null>;

  constructor(
    pitch: Ref<number | null>,
    clarity: Ref<number | null>,
    noteName: Ref<string | null>,
    config: SegmenterConfig = {}
  ) {
    this.pitch = pitch;
    this.clarity = clarity;
    this.noteName = noteName;

    this.config = {
      clarityThreshold: config.clarityThreshold ?? 0.85,
      minDurationMs: config.minDurationMs ?? 50,
      pitchTolerance: config.pitchTolerance ?? 50 // 50 cents = quarter tone
    };

    this.startWatchers();
  }

  private startWatchers () {
    watch( [this.pitch, this.clarity], ( [newPitch, newClarity] ) => {
      if ( !this._isActive.value ) return;
      this.processFrame( newPitch, newClarity ?? 0 );
    } );
  }

  private processFrame ( pitch: number | null, clarity: number ) {
    const now = performance.now();

    // 1. Check for Note OFF (Signal Lost)
    if ( !pitch || clarity < this.config.clarityThreshold ) {
      if ( this.currentEvent ) {
        this.finalizeNote( now );
      }
      return;
    }

    // 2. Check for Note ON (Signal Gained)
    if ( !this.currentEvent ) {
      this.startNote( now, pitch );
      return;
    }

    // 3. Check for Legato Change (Pitch Changed significantly while signal held)
    if ( this.currentEvent ) {
      const centsDiff = 1200 * Math.log2( pitch / this.currentEvent.frequency );
      if ( Math.abs( centsDiff ) > this.config.pitchTolerance ) {
        // Legato transition: End current, immediate start new
        this.finalizeNote( now );
        this.startNote( now, pitch );
      }
    }
  }

  private startNote ( time: number, frequency: number ) {
    // Determine note name immediately if available (from usePitch)
    const name = this.noteName.value ?? '';

    this.currentEvent = {
      note: name,
      frequency,
      startTime: time
    };

    this.onNoteStartCallbacks.forEach( cb => cb( this.currentEvent! ) );
  }

  private finalizeNote ( time: number ) {
    if ( !this.currentEvent ) return;

    const duration = time - this.currentEvent.startTime;

    // Filter out short blips
    if ( duration >= this.config.minDurationMs ) {
      this.currentEvent.endTime = time;
      this.currentEvent.duration = duration;
      const finalEvent = { ...this.currentEvent }; // Clone for callback
      this.onNoteEndCallbacks.forEach( cb => cb( finalEvent ) );
    }

    this.currentEvent = null;
  }

  // --- Public API ---

  public onNoteStart ( cb: ( event: NoteEvent ) => void ) {
    this.onNoteStartCallbacks.add( cb );
  }

  public onNoteEnd ( cb: ( event: NoteEvent ) => void ) {
    this.onNoteEndCallbacks.add( cb );
  }

  public start () {
    this._isActive.value = true;
  }

  public stop () {
    this._isActive.value = false;
    if ( this.currentEvent ) {
      this.finalizeNote( performance.now() );
    }
  }
}
