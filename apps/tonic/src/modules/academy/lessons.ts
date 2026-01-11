export interface LessonStep {
  id: string;
  title: string;
  content: string; // Markdown supported
  targetTool: 'auratune' | 'frequencyflow' | 'chordcapture' | 'pocketengine' | 'scalesleuth' | 'dashboard';
  validationCriteria?: {
    type: 'pitch' | 'chord' | 'rhythm' | 'frequency' | 'scale';
    target: string | number; // e.g. 'C Major'
    tolerance?: number; // e.g. +/- 5 cents
  };
}

export interface Lesson {
  id: string;
  title: string;
  description: string;
  category: 'theory' | 'audio' | 'rhythm';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  steps: LessonStep[];
}

export const lessons: Lesson[] = [
  {
    id: 'pitch-101',
    title: 'The Physics of Pitch',
    description: 'Learn how sound waves work and visualize your voice.',
    category: 'audio',
    difficulty: 'beginner',
    steps: [
      {
        id: 'step-1',
        title: 'Welcome to the Lab',
        content: 'Sound is vibration. The faster the vibration, the higher the "pitch". Use the tuner on the right to see this in real-time. Try humming a low note.',
        targetTool: 'auratune',
      },
      {
        id: 'step-2',
        title: 'Finding A4 (440Hz)',
        content: 'In modern music, we tune to A4 = 440Hz. Try to sing or play an "A" note. Look for the needle to center on "A".',
        targetTool: 'auratune',
        validationCriteria: {
          type: 'pitch',
          target: 'A',
          tolerance: 50
        }
      },
      {
        id: 'step-3',
        title: 'The Octave',
        content: 'If you double the frequency (440Hz -> 880Hz), you get the same note, just higher! This is an "Perfect Octave". Try going higher.',
        targetTool: 'auratune'
      },
      {
        id: 'step-4',
        title: 'Using the Drone',
        content: 'Training your ear requires a reference. Open **Settings > Drone** and enable it. Match your voice to the drone pitch.',
        targetTool: 'auratune'
      },
      {
        id: 'step-5',
        title: 'Visualizing Stability',
        content: 'Vibrato is the natural fluctuation of pitch. Open **Settings > Vibrato Graph** to see a real-time plot of your voice\'s stability.',
        targetTool: 'auratune'
      }
    ]
  },
  {
    id: 'chord-101',
    title: 'Building Chords',
    description: 'Construct Major and Minor triads note by note.',
    category: 'theory',
    difficulty: 'beginner',
    steps: [
      {
        id: 'step-1',
        title: 'The Major Triad',
        content: 'A Major Chord is 3 notes: Root (1), Major Third (3), and Perfect Fifth (5). Play a **C Major** triad (C - E - G).',
        targetTool: 'chordcapture',
        validationCriteria: {
          type: 'chord',
          target: 'C'
        }
      },
      {
        id: 'step-2',
        title: 'The Minor Triad',
        content: 'To make it Minor, lower the 3rd note by a half-step (E -> Eb). Play a **C Minor** triad (C - Eb - G).',
        targetTool: 'chordcapture',
        validationCriteria: {
          type: 'chord',
          target: 'Cm'
        }
      },
      {
        id: 'step-3',
        title: 'The Suspended Chord',
        content: 'Suspended chords float. Replace the 3rd with a 4th (F). Play **Csus4** (C - F - G).',
        targetTool: 'chordcapture',
        validationCriteria: {
          type: 'chord',
          target: 'Csus4'
        }
      }
    ]
  },
  {
    id: 'rhythm-101',
    title: 'Internal Clock Training',
    description: 'Learn to keep perfect time with Pocket Engine.',
    category: 'rhythm',
    difficulty: 'beginner',
    steps: [
      {
        id: 'step-1',
        title: 'Calibrating Your Clock',
        content: 'Rhythm is about consistency. Pocket Engine measures your timing accuracy in milliseconds. Start the engine and try to clap or tap along with the click.',
        targetTool: 'pocketengine'
      },
      {
        id: 'step-2',
        title: 'Finding the Pocket',
        content: 'Hit the beat within +/- 30ms to score a "Perfect" hit. Get **10 Perfect hits** to proceed.',
        targetTool: 'pocketengine',
        validationCriteria: {
          type: 'rhythm',
          target: 10
        }
      },
      {
        id: 'step-3',
        title: 'Stabilization',
        content: 'Now try to maintain it. Get **20 Perfect hits** to prove your internal clock is stable.',
        targetTool: 'pocketengine',
        validationCriteria: {
          type: 'rhythm',
          target: 20
        }
      }
    ]
  },
  {
    id: 'scale-101',
    title: 'Mode Detective',
    description: 'Identify Dorian and Phrygian modes with Scale Sleuth.',
    category: 'theory',
    difficulty: 'intermediate',
    steps: [
      {
        id: 'step-1',
        title: 'The Major Scale',
        content: 'Scales are families of notes. The **C Major Scale** is all white keys: C, D, E, F, G, A, B. Play these notes in any order to be detected.',
        targetTool: 'scalesleuth',
        validationCriteria: {
          type: 'scale',
          target: 'C Major'
        }
      },
      {
        id: 'step-2',
        title: 'The Dorian Mode',
        content: 'Dorian is Major with a flat 3rd and flat 7th. It sounds "jazzy" or "folky". Play white keys starting on D (D, E, F, G, A, B, C). usage: **b3, b7**.',
        targetTool: 'scalesleuth',
        validationCriteria: {
          type: 'scale',
          target: 'D Dorian'
        }
      },
      {
        id: 'step-3',
        title: 'The Phrygian Mode',
        content: 'Phrygian is Minor with a flat 2nd. It sounds "exotic" or "spanish". Play white keys starting on E (E, F, G, A, B, C, D). Usage: **b2, b3, b6, b7**.',
        targetTool: 'scalesleuth',
        validationCriteria: {
          type: 'scale',
          target: 'E Phrygian'
        }
      }
    ]
  },
  {
    id: 'freq-101',
    title: 'Seeing Sound',
    description: 'Visualize harmonics and waveforms with Frequency Flow.',
    category: 'audio',
    difficulty: 'intermediate',
    steps: [
      {
        id: 'step-1',
        title: 'The Fundamental',
        content: 'A pure tone concentrates energy at a single frequency. Try **whistling** or humming a soft "Ooo". Look for a single tall spike in the spectrum.',
        targetTool: 'frequencyflow'
      },
      {
        id: 'step-2',
        title: 'Harmonics (Timbre)',
        content: 'Rich sounds have "Harmonics" - multiples of the fundamental frequency. Sing a bright "Ahhh". Notice the smaller spikes appearing to the right of the main one in a predictable pattern?',
        targetTool: 'frequencyflow'
      },
      {
        id: 'step-3',
        title: 'Noise',
        content: 'Noise is chaotic energy across the frequency spectrum. Make a "Shhh" or "Sssss" sound. Watch how the spectrum fills up with jagged activity like grass growing.',
        targetTool: 'frequencyflow'
      },
      {
        id: 'step-4',
        title: 'Logarithmic vs Linear',
        content: 'Our ears hear pitch logarithmically (octaves double in frequency). Toggle scale to **Log** to see how we naturally perceive spacing, or **Lin** to see the physics.',
        targetTool: 'frequencyflow'
      },
      {
        id: 'step-5',
        title: 'Harmonics Overlay',
        content: 'Click **Harmonics** in the top bar. This projects a guide showing where the overtones SHOULD be for the loudest detected note. Try to line up your voice!',
        targetTool: 'frequencyflow'
      }
    ]
  },
  {
    id: 'pitch-201',
    title: 'Precision Tuning',
    description: 'Master fine intonation control and interval sensing.',
    category: 'audio',
    difficulty: 'advanced',
    steps: [
      {
        id: 'step-1',
        title: 'Cents & Sensibility',
        content: 'A "Cent" is 1/100th of a semitone. Professional tuning requires precision within +/- 5 cents. Watch the "Cents" display on the tuner.',
        targetTool: 'auratune'
      },
      {
        id: 'step-2',
        title: 'Sustain G4',
        content: 'Sustain a steady **G4** (392Hz) for 3 seconds. Keep the needle green.',
        targetTool: 'auratune',
        validationCriteria: {
          type: 'pitch',
          target: 'G'
        }
      },
      {
        id: 'step-3',
        title: 'Major Third Interval',
        content: 'Now find the Major Third above C (E4). Sustain **E4** (329.6Hz) to lock it in.',
        targetTool: 'auratune',
        validationCriteria: {
          type: 'pitch',
          target: 'E'
        }
      }
    ]
  },
  {
    id: 'chord-201',
    title: 'Jazz Harmony',
    description: 'Construct lush 7th chords for jazz voicings.',
    category: 'theory',
    difficulty: 'advanced',
    steps: [
      {
        id: 'step-1',
        title: 'The Major 7th',
        content: 'Add a 7th note (B) to your C Major triad. Play **C Maj7** (C - E - G - B). It sounds dreamy and resolved.',
        targetTool: 'chordcapture',
        validationCriteria: {
          type: 'chord',
          target: 'CMaj7'
        }
      },
      {
        id: 'step-2',
        title: 'The Dominant 7th',
        content: 'Flatten the 7th (B -> Bb). This creates tension. Play **C7** (C - E - G - Bb). (Note: Try G7 if C7 is too low: G-B-D-F). Let\'s try **G7**.',
        targetTool: 'chordcapture',
        validationCriteria: {
          type: 'chord',
          target: 'G7'
        }
      },
      {
        id: 'step-3',
        title: 'The Minor 7th',
        content: 'Smooth and cool. Play a **D Minor 7** (D - F - A - C).',
        targetTool: 'chordcapture',
        validationCriteria: {
          type: 'chord',
          target: 'Dm7'
        }
      }
    ]
  },
  {
    id: 'rhythm-201',
    title: 'Rhythm Proficiency',
    description: 'Build endurance and consistency.',
    category: 'rhythm',
    difficulty: 'intermediate',
    steps: [
      {
        id: 'step-1',
        title: 'Warmup',
        content: 'Get in the groove. Score **5 Perfect hits** to start.',
        targetTool: 'pocketengine',
        validationCriteria: {
          type: 'rhythm',
          target: 5
        }
      },
      {
        id: 'step-2',
        title: 'Endurance Test',
        content: 'Prove your stability. Maintain the pocket for **40 Perfect hits** in a row. Don\'t rush!',
        targetTool: 'pocketengine',
        validationCriteria: {
          type: 'rhythm',
          target: 40
        }
      }
    ]
  },
  {
    id: 'scale-201',
    title: 'Exotic Scales',
    description: 'Explore non-western and advanced mode colors.',
    category: 'theory',
    difficulty: 'advanced',
    steps: [
      {
        id: 'step-1',
        title: 'Harmonic Minor',
        content: 'Aladdin\'s sound. Play A Minor but raise the 7th (G -> G#). Notes: A, B, C, D, E, F, G#.',
        targetTool: 'scalesleuth',
        validationCriteria: {
          type: 'scale',
          target: 'A Harmonic Minor'
        }
      },
      {
        id: 'step-2',
        title: 'Mixolydian Rock',
        content: 'The "Classic Rock" scale. Major with a flat 7th. Play G Mixolydian (all white keys starting on G).',
        targetTool: 'scalesleuth',
        validationCriteria: {
          type: 'scale',
          target: 'G Mixolydian'
        }
      }
    ]
  },
  {
    id: 'freq-201',
    title: 'Spectral Investigation',
    description: 'Analyze complex sound identifiers.',
    category: 'audio',
    difficulty: 'advanced',
    steps: [
      {
        id: 'step-1',
        title: 'White Noise',
        content: 'Make a "Shhh" sound. Notice how the spectrum flattens out like "grass"? That is equal energy across frequencies.',
        targetTool: 'frequencyflow'
      },
      {
        id: 'step-2',
        title: 'Vowel Formants',
        content: 'Sing "Eeee" then slide to "Oooo". Watch the humps (formants) in the spectrum move. These shapes define vowels!',
        targetTool: 'frequencyflow'
      }
    ]
  }
];
