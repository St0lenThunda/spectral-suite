import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { Note, Scale } from 'tonal';
import { usePitch } from '@spectralsuite/core'; // Using alias
import { NoteSegmenter, type NoteEvent } from '@spectralsuite/core';
import { useToast } from '../composables/useToast';
import { useAudioEngine, SynthEngine } from '@spectralsuite/core';

export type GameState = 'idle' | 'listening' | 'playing' | 'success' | 'fail' | 'game-over';

export interface MelodyNote {
  note: string;
  duration: number; // in beats (relative) or ms? Let's use steps for now.
}

// Export a factory function to allow dependency injection for testing
export function createMelodyMirrorStore (
  injectedUsePitch = usePitch,
  injectedUseToast = useToast,
  injectedUseAudioEngine = useAudioEngine,
  injectedNoteSegmenter = NoteSegmenter,
  injectedSynthEngine = SynthEngine.getInstance()
) {
  return defineStore( 'melody-mirror', () => {
    // Dependencies
    const { pitch, clarity, currentNote } = injectedUsePitch();
    const { showSuccess, showError, showInfo } = injectedUseToast();
    const { activate, deactivate } = injectedUseAudioEngine();

    // State
    const gameState = ref<GameState>( 'idle' );
    const level = ref( 1 );
    const score = ref( 0 );
    const lives = ref( 3 );

    const targetMelody = ref<MelodyNote[]>( [] );
    const playedNotes = ref<NoteEvent[]>( [] );

    // Settings
    const keyCenter = ref( 'C' );
    const scaleType = ref( 'major' );

    // Engine
    let segmenter: InstanceType<typeof NoteSegmenter> | null = null;


    // --- Actions ---

    const startGame = async () => {
      activate(); // Ensure audio is ready
      score.value = 0;
      lives.value = 3;
      level.value = 1;
      gameState.value = 'idle';

      // Initialize Segmenter
      segmenter = new injectedNoteSegmenter( pitch, clarity, currentNote, {
        minDurationMs: 100, // Debounce fast runs
        clarityThreshold: 0.85
      } );

      segmenter.onNoteStart( ( event ) => {
        if ( gameState.value === 'playing' ) {
          handleInputNote( event );
        }
      } );

      startLevel();
    };

    const startLevel = async () => {
      playedNotes.value = [];
      gameState.value = 'listening';
      generateMelody();

      // Play the melody for the user
      await playMelody( targetMelody.value );

      gameState.value = 'playing';
      segmenter?.start();
      showInfo( 'Your turn! Play it back.' );
    };

    const generateMelody = () => {
      // Difficulty scaling
      const noteCount = Math.min( 3 + Math.floor( level.value / 2 ), 8 );
      const scaleNotes = Scale.get( `${keyCenter.value} ${scaleType.value}` ).notes;

      const newMelody: MelodyNote[] = [];
      for ( let i = 0; i < noteCount; i++ ) {
        // Pick random note from scale
        const randomNote = scaleNotes[Math.floor( Math.random() * scaleNotes.length )] + '4'; // Force octave 4 for simplicity now
        newMelody.push( { note: randomNote, duration: 500 } );
      }
      targetMelody.value = newMelody;
    };

    const playMelody = async ( melody: MelodyNote[] ) => {
      console.log( 'Playing melody:', melody );

      const NOTE_DURATION = 500;
      const GAP_DURATION = 100;

      for ( const note of melody ) {
        // Play audio
        const freq = Note.freq( note.note );
        if ( freq ) {
          injectedSynthEngine.playNote( freq, NOTE_DURATION, 0.5 );
        }

        // Highlight active note (handled by UI watching an index or similar if we exposed it, 
        // but for now just wait)
        // TODO: ideally we expose 'playingIndex' state to UI

        await new Promise( resolve => setTimeout( resolve, NOTE_DURATION + GAP_DURATION ) );
      }
    };

    const handleInputNote = ( event: NoteEvent ) => {
      playedNotes.value.push( event );

      const currentIndex = playedNotes.value.length - 1;
      const expected = targetMelody.value[currentIndex];

      // Check correctness (Pitch only for now, ignoring rhythm)
      if ( !expected ) {
        // Played too many notes?
        failLevel( 'Too many notes!' );
        return;
      }

      // Fuzzy Match Note Name (ignore octave for easier gameplay?)
      const eventPc = Note.pitchClass( event.note );
      const expectedPc = Note.pitchClass( expected.note );

      if ( eventPc !== expectedPc ) {
        failLevel( `Wrong note! Expected ${expectedPc}, got ${eventPc}` );
        return;
      }

      // Check Completion
      if ( playedNotes.value.length === targetMelody.value.length ) {
        completeLevel();
      }
    };

    const completeLevel = () => {
      gameState.value = 'success';
      score.value += 100 * level.value;
      showSuccess( 'Correct!' );
      segmenter?.stop();
      setTimeout( () => {
        level.value++;
        startLevel();
      }, 1500 );
    };

    const failLevel = ( reason: string ) => {
      gameState.value = 'fail';
      lives.value--;
      showError( reason );
      segmenter?.stop();

      if ( lives.value <= 0 ) {
        showError( 'Game Over!' );
        gameState.value = 'game-over';
        deactivate();
      } else {
        setTimeout( () => {
          // Replay same level
          playedNotes.value = [];
          gameState.value = 'listening';
          playMelody( targetMelody.value ).then( () => {
            gameState.value = 'playing';
            segmenter?.start();
          } );
        }, 1500 );
      }
    };

    const stopGame = () => {
      segmenter?.stop();
      deactivate();
      gameState.value = 'idle';
    };

    const currentTarget = computed( () => {
      if ( gameState.value !== 'playing' ) return null;
      return targetMelody.value[playedNotes.value.length] || null;
    } );

    const replayTargetMelody = async () => {
      if ( gameState.value !== 'playing' && gameState.value !== 'listening' ) return;
      await playMelody( targetMelody.value );
    };

    return {
      gameState,
      level,
      score,
      lives,
      targetMelody,
      playedNotes,
      currentTarget,
      startGame,
      stopGame,
      replayTargetMelody
    };
  } );
}

// Default export uses the real dependencies
export const useMelodyMirror = createMelodyMirrorStore();
