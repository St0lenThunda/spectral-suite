export interface LessonStep {
  id: string;
  title: string;
  content: string; // Markdown supported
  targetTool: 'auratune' | 'frequencyflow' | 'chordcapture' | 'pocketengine' | 'scalesleuth' | 'harmonicorbit' | 'dashboard';
  validationCriteria?: {
    type: 'pitch' | 'chord' | 'rhythm' | 'frequency' | 'scale' | 'orbit';
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
  },
  {
    id: 'orbit-101',
    title: 'The Circle of Fifths',
    description: 'Navigate the map of musical keys.',
    category: 'theory',
    difficulty: 'beginner',
    steps: [
      {
        id: 'step-1',
        title: 'Home Base (C Major)',
        content: 'The Circle of Fifths maps all 12 keys. At the very top is **C Major**. It has no sharps or flats. Click the big "C" segment at the top.',
        targetTool: 'harmonicorbit',
        validationCriteria: {
          type: 'orbit',
          target: 'C'
        }
      },
      {
        id: 'step-2',
        title: 'The Fifth (G Major)',
        content: 'Move one step clockwise. This is a "Perfect Fifth" away. Click **G Major**. Notice it has 1 Sharp (#).',
        targetTool: 'harmonicorbit',
        validationCriteria: {
          type: 'orbit',
          target: 'G'
        }
      },
      {
        id: 'step-3',
        title: 'The Fourth (F Major)',
        content: 'Go back to C, then one step counter-clockwise. This is a "Perfect Fourth". Click **F Major**. It has 1 Flat (b).',
        targetTool: 'harmonicorbit',
        validationCriteria: {
          type: 'orbit',
          target: 'F'
        }
      }
    ]
  },
  {
    id: 'orbit-102',
    title: 'Relative Minors',
    description: 'Discover the sad cousins of happy keys.',
    category: 'theory',
    difficulty: 'intermediate',
    steps: [
      {
        id: 'step-1',
        title: 'C Major',
        content: 'Start at **C Major** again. Click it to center the map.',
        targetTool: 'harmonicorbit',
        validationCriteria: {
          type: 'orbit',
          target: 'C'
        }
      },
      {
        id: 'step-2',
        title: 'The Relative Minor (Am)',
        content: 'Look inside the circle, directly under C. You see **Am** (A Minor). They share the exact same notes (all white keys)! Click key "A" on the outer ring to switch to A Major context... wait, actually just click **C** again.',
        targetTool: 'harmonicorbit',
        validationCriteria: {
          type: 'orbit',
          target: 'C'
        }
      },
      {
        id: 'step-3',
        title: 'Finding A Minor',
        content: 'The A Minor scale is just the C Major scale starting on A. To switch to the "A" universe, click the **A** slice on the outer ring (3 steps clockwise).',
        targetTool: 'harmonicorbit',
        validationCriteria: {
          type: 'orbit',
          target: 'A'
        }
      }
    ]
  },
  {
    id: 'orbit-201',
    title: 'Chord Degrees & Functions',
    description: 'Master the seven chord degrees and learn when, why, and how to use them.',
    category: 'theory',
    difficulty: 'advanced',
    steps: [
      {
        id: 'step-1',
        title: 'Roman Numeral System',
        content: 'Each chord has a job in a key. We number them with Roman Numerals (I, ii, iii, IV, V, vi, vii°). **Capital = Major**, **lowercase = minor**, **° = diminished**. Select **C Major** to begin.',
        targetTool: 'harmonicorbit',
        validationCriteria: {
          type: 'orbit',
          target: 'C'
        }
      },
      {
        id: 'step-2',
        title: 'I - Tonic (Home)',
        content: '**The Tonic (I)** is home base. It feels stable and resolved. In C Major, this is **C Major**. **When:** Start/end songs. **Why:** Establishes the key. **How:** Use it to create a sense of arrival and rest.',
        targetTool: 'harmonicorbit',
        validationCriteria: {
          type: 'orbit',
          target: 'G'
        }
      },
      {
        id: 'step-3',
        title: 'IV - Subdominant (Builder)',
        content: '**The Subdominant (IV)** builds tension gently. In C Major, this is **F Major** (one step counter-clockwise). **When:** Pre-chorus, transitions. **Why:** Creates movement away from home. **How:** Common progressions: I-IV-V-I or I-IV-I. Click **F**.',
        targetTool: 'harmonicorbit',
        validationCriteria: {
          type: 'orbit',
          target: 'F'
        }
      },
      {
        id: 'step-4',
        title: 'V - Dominant (Tension)',
        content: '**The Dominant (V)** wants to resolve home. In C Major, this is **G Major** (one step clockwise from C). **When:** Before choruses, endings. **Why:** Creates maximum tension. **How:** Almost always resolves to I (V→I). Try adding a 7th (G7) for more pull! Click **G**.',
        targetTool: 'harmonicorbit',
        validationCriteria: {
          type: 'orbit',
          target: 'G'
        }
      },
      {
        id: 'step-5',
        title: 'vi - Submediant (Deceptive)',
        content: '**The Submediant (vi)** is the "sad cousin" of I. In C Major, this is **A Minor** (three steps clockwise, look at inner ring). **When:** Deceptive cadences (V→vi instead of V→I). **Why:** Surprises the ear. **How:** Try I-V-vi-IV (the "pop chord progression"). Click **A**.',
        targetTool: 'harmonicorbit',
        validationCriteria: {
          type: 'orbit',
          target: 'A'
        }
      },
      {
        id: 'step-6',
        title: 'ii - Supertonic (Pre-Dominant)',
        content: '**The Supertonic (ii)** leads to V beautifully. In C Major, this is **D Minor**. **When:** Before the Dominant. **Why:** Smoother approach to V than IV. **How:** Classic: I-ii-V-I or ii-V-I (jazz favorite). Often voiced as ii7. Select **C** again to see the pattern.',
        targetTool: 'harmonicorbit',
        validationCriteria: {
          type: 'orbit',
          target: 'C'
        }
      },
      {
        id: 'step-7',
        title: 'iii - Mediant (Bridge)',
        content: '**The Mediant (iii)** sits between I and V. In C Major, this is **E Minor**. **When:** Transitions, bridges. **Why:** Shares notes with both I and vi; sounds dreamy. **How:** Less common, but great for: I-iii-IV or vi-iii-IV. Sounds like climbing upward.',
        targetTool: 'harmonicorbit'
      },
      {
        id: 'step-8',
        title: 'vii° - Leading Tone (Rare Tension)',
        content: '**The Leading Tone (vii°)** is diminished and unstable. In C Major, this is **B Diminished**. **When:** Rarely as a full chord. **Why:** Super tense; wants to resolve to I. **How:** Often appears as part of V7 (G7 contains B-D-F). Use sparingly for dramatic effect.',
        targetTool: 'harmonicorbit'
      },
      {
        id: 'step-9',
        title: 'Common Progressions',
        content: '**Practice these classic patterns:**\n\n- **I-IV-V-I** (Rock anthem)\n- **I-V-vi-IV** (Pop ballad)\n- **ii-V-I** (Jazz standard)\n- **I-vi-IV-V** (50s doo-wop)\n- **I-iii-vi-IV** (Dreamy ascent)\n\nNotice how each chord has a gravitational pull toward the next!',
        targetTool: 'harmonicorbit'
      },
      {
        id: 'step-10',
        title: 'Functional Harmony Groups',
        content: '**Chords group by function:**\n\n- **Tonic Family** (I, vi, iii): Stable, home-like\n- **Subdominant Family** (IV, ii): Builds tension, moves away\n- **Dominant Family** (V, vii°): Maximum tension, pulls home\n\n**Pro Tip:** You can substitute chords within the same family! Try vi instead of I for a sadder version of the same progression.',
        targetTool: 'harmonicorbit'
      }
    ]
  }
];
