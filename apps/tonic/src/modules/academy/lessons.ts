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
    description: 'COMING SOON: Identify Dorian vs. Phrygian modes with Scale Sleuth.',
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
        title: 'The Minor Scale',
        content: 'Now let\'s darken the mood. Play a **C Minor Scale** (C, D, Eb, F, G, Ab, Bb). You need at least 5 distinct notes to trigger detection.',
        targetTool: 'scalesleuth',
        validationCriteria: {
          type: 'scale',
          target: 'C Minor'
        }
      },
      {
        id: 'step-3',
        title: 'Relative Minor',
        content: 'The **A Minor Scale** uses the exact same notes as C Major, but focuses on A. Play A, B, C, D, E, F, G.',
        targetTool: 'scalesleuth',
        validationCriteria: {
          type: 'scale',
          target: 'A Minor'
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
      }
    ]
  }
];
