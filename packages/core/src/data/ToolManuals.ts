/**
 * ToolManuals.ts
 * 
 * Centralized repository for all educational "How-To" manuals
 * for the Spectral Suite tools.
 */

export interface ManualStep {
  step: number;
  title: string;
  task: string;
  physics: string;
}

export interface ToolManual {
  id: string;
  title: string;
  subtitle: string;
  accentColor: string;
  steps: ManualStep[];
}

export const TOOL_MANUALS: Record<string, ToolManual> = {
  auratune: {
    id: "auratune",
    title: "Aura",
    subtitle: "Tune",
    accentColor: "indigo-400",
    steps: [
      {
        step: 1,
        title: "Calibration",
        task: "Sing or play a steady note into the microphone.",
        physics: "We use Autocorrelation to find repeating patterns in the waveform. This identifies the 'Pitch' or fundamental frequency of your voice."
      },
      {
        step: 2,
        title: "The Aura",
        task: "Watch the 'Aura' rings pulse as you change volume.",
        physics: "The aura size represents 'Amplitude' (Energy). The smoother the ring, the more stable your pitch control."
      },
      {
        step: 3,
        title: "History Map",
        task: "Observe the line graph below the aura.",
        physics: "This plots your pitch over time in 'Cents'. It reveals subtle vibrato and pitch drift that human ears often miss."
      }
    ]
  },
  chordcapture: {
    id: "chordcapture",
    title: "Chord",
    subtitle: "Capture",
    accentColor: "violet-400",
    steps: [
      {
        step: 1,
        title: "Harmonic Input",
        task: "Strum a chord on a guitar or play keys near the mic.",
        physics: "The app performs Polyphonic Pitch Detection, meaning it identifies multiple simultaneous frequencies instead of just one."
      },
      {
        step: 2,
        title: "Voicing Analysis",
        task: "Check the virtual fretboard for detected note positions.",
        physics: "Every chord has a 'Voicing'—the specific order and octave of its notes. This defines the 'Flavor' or character of the sound."
      },
      {
        step: 3,
        title: "Transcription",
        task: "Click a detected chord to save it to your session.",
        physics: "We map raw frequency peaks to the Chromatic Scale, converting physical physics into musical notation."
      }
    ]
  },
  chordforge: {
    id: "chordforge",
    title: "Chord",
    subtitle: "Forge",
    accentColor: "fuchsia-400",
    steps: [
      {
        step: 1,
        title: "Structural Design",
        task: "Select a 'Recipe' (Suffix) to change the chord's DNA.",
        physics: "Chords are built on mathematical intervals. Adding a '7th' or '9th' adds specific tension frequencies that crave resolution."
      },
      {
        step: 2,
        title: "Harmonic Energy",
        task: "Toggle 'Extensions' to hear how the sound expands.",
        physics: "Higher extensions (11, 13) occupy higher frequency bands, making the sound feel 'shimmering' or more complex."
      },
      {
        step: 3,
        title: "The Inversion",
        task: "Change the 'Bass' note to hear a different perspective.",
        physics: "Inversions change which note has the most energy. Moving the root to the middle changes the sonic stability of the chord."
      }
    ]
  },
  frequencyflow: {
    id: "frequencyflow",
    title: "Frequency",
    subtitle: "Flow",
    accentColor: "sky-400",
    steps: [
      {
        step: 1,
        title: "Spectral View",
        task: "Look at the main magnitude spectrum while playing audio.",
        physics: "This is a Fast Fourier Transform (FFT). It breaks a complex sound wave into its individual sine wave components."
      },
      {
        step: 2,
        title: "The Waterfall",
        task: "Observe the colors scrolling down behind the graph.",
        physics: "History is represented by color and time. Bright 'hot' colors mean more energy was present at that frequency in the past."
      },
      {
        step: 3,
        title: "Note Detection",
        task: "Watch the 'Peak Note' HUD identify dominant frequencies.",
        physics: "The highest spike usually corresponds to the fundamental frequency. We calculate the peak to find the nearest musical note."
      }
    ]
  },
  harmonicorbit: {
    id: "harmonicorbit",
    title: "Harmonic",
    subtitle: "Orbit",
    accentColor: "amber-400",
    steps: [
      {
        step: 1,
        title: "Gravitational Pull",
        task: "Play a note and watch it pull the rings toward the center.",
        physics: "The center represents 'Harmonic Center'. Moving away from the center increases musical 'Dissonance' or tension."
      },
      {
        step: 2,
        title: "The Orbit",
        task: "Select different chord types to see their orbital geometry.",
        physics: "Musical relationships are geometric. Perfect 5ths and Major 3rds form clean, symmetrical shapes in harmonic space."
      },
      {
        step: 3,
        title: "Syncopation",
        task: "Adjust the speed to see how the orbits respond.",
        physics: "This maps 'Rhythmic Density' to visual velocity. Faster orbits represent more energetic, complex harmonic movements."
      }
    ]
  },
  pocketengine: {
    id: "pocketengine",
    title: "Pocket",
    subtitle: "Engine",
    accentColor: "emerald-400",
    steps: [
      {
        step: 1,
        title: "The Grid",
        task: "Tap the grid to place rhythmic triggers.",
        physics: "Rhythm is the division of time. Each column represents a specific fraction of a musical measure (usually 1/16th)."
      },
      {
        step: 2,
        title: "Micro-Timing",
        task: "Adjust 'Swing' to hear the feel of the beat change.",
        physics: "Swing shifts every second 'even' note slightly late. This avoids mechanical perfection and creates a 'human' groove."
      },
      {
        step: 3,
        title: "Probability",
        task: "Lower the 'Chance' slider on a specific step.",
        physics: "This adds entropy to the system. The engine uses a random number generator to decide if the note fires, creating evolution."
      }
    ]
  },
  resonancelab: {
    id: "resonancelab",
    title: "Resonance",
    subtitle: "Lab",
    accentColor: "emerald-400",
    steps: [
      {
        step: 1,
        title: "Discovery Phase",
        task: "Tap the object repeatedly near your microphone while 'Listening' is active.",
        physics: "We are capturing the 'Impulse Response'. The object naturally wants to vibrate at certain frequencies based on its shape and material."
      },
      {
        step: 2,
        title: "Harmonic Mirroring",
        task: "Press 'Start Mirror' to project the detected frequency back at the object.",
        physics: "This is 'Sympathetic Resonance'. External energy is being injected at the exact same rate the object naturally oscillates."
      },
      {
        step: 3,
        title: "Fine-Tuning (Beats)",
        task: "Slowly move the 'Fine Tune' slider up or down by 0.1Hz.",
        physics: "When two frequencies are slightly different, they create 'Beats' (constructive and destructive interference). This allows you to see the vibration cycle in slow-motion."
      },
      {
        step: 4,
        title: "Stroboscopic Analysis",
        task: "Turn on the 'Strobe' and lock it to the target frequency.",
        physics: "By pulsing the light (or audio) at the same rate as the vibration, we can 'freeze' the object's movement in time, making it appear stationary while it is actually moving fast."
      }
    ]
  },
  scalesleuth: {
    id: "scalesleuth",
    title: "Scale",
    subtitle: "Sleuth",
    accentColor: "indigo-400",
    steps: [
      {
        step: 1,
        title: "Fingerprinting",
        task: "Play a series of notes or a melody line.",
        physics: "The app collects all detected notes into a 'Pitch Class Set'—a list of unique notes regardless of their octave."
      },
      {
        step: 2,
        title: "Pattern Matching",
        task: "Look at the 'Confidence Score' for various scales.",
        physics: "We compare your notes against thousands of known scales. The higher the math overlap, the more likely you are in that Scale."
      },
      {
        step: 3,
        title: "Key Center",
        task: "Observe how the 'Root Note' changes as you play.",
        physics: "The 'Tonic' is the frequency that feels like home. The algorithm weighs the frequency and duration of notes to find this center."
      }
    ]
  },
  tracktracer: {
    id: "tracktracer",
    title: "Track",
    subtitle: "Tracer",
    accentColor: "blue-400",
    steps: [
      {
        step: 1,
        title: "Blueprint Analysis",
        task: "Upload an audio file or record a live signal.",
        physics: "We perform a forensic scan of the entire audio timeline, identifying energy peaks and rhythmic cycles."
      },
      {
        step: 2,
        title: "Segment Recognition",
        task: "Review the 'Sections' to see where Chorus or Verse starts.",
        physics: "Abrupt changes in spectral energy or rhythmic patterns signal a structural change in the music's physics."
      },
      {
        step: 3,
        title: "BPM Detection",
        task: "Verify the detected tempo in the HUD.",
        physics: "We use an autocorrelation of the low-frequency bands (Where the kick drum lives) to find the primary periodic pulse."
      }
    ]
  },
  bendtrainer: {
    id: "bendtrainer",
    title: "Pitch",
    subtitle: "Stairway",
    accentColor: "amber-400",
    steps: [
      {
        step: 1,
        title: "Set Your Anchor",
        task: "Tap a fret on the fretboard to pick the note you'll bend from.",
        physics: "We lock onto the exact frequency of the selected fret. This becomes the 'anchor' — all bend distances are measured relative to this fixed reference pitch."
      },
      {
        step: 2,
        title: "Choose Your Target",
        task: "Select ½, Full, 1½, or 2 step bend targets from the sidebar.",
        physics: "A 'Full' step bend = 200 cents = 2 semitones. Each semitone represents the frequency distance of one physical guitar fret."
      },
      {
        step: 3,
        title: "Climb the Staircase",
        task: "Bend your string and watch the cursor climb. Amber = on target. Hold it steady!",
        physics: "We calculate 1200 × log₂(current_pitch / start_pitch) to get the bend distance in cents. The cursor moves continuously without snapping, revealing your raw micro-pitch accuracy."
      },
      {
        step: 4,
        title: "The Blues Zone",
        task: "Try bending slightly flat to hit the cyan ¼-bend markers.",
        physics: "Blues bends (microtones) land exactly halfway between standard semitones (e.g. 50, 150 cents). This adds immense vocal-like expression that traditional piano keys physically cannot recreate."
      }
    ]
  }
};
