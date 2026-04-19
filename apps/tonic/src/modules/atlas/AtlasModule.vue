<script setup lang="ts">
/**
 * AtlasModule - The "Project Atlas" Source Code Explorer & Tutorial.
 *
 * This module is a living, interactive technical manual for Spectral Suite.
 * It lets you explore the architecture, search for concepts, test your
 * knowledge with a quiz, and inspect the raw source code of any module.
 *
 * Phase 1 additions:
 *  - Live Stats: dynamic counts derived from the actual codebase via import.meta.glob
 *  - Concept Search Bar: instant search across the importDictionary and tutorials
 *  - Module Dependency Quiz: a scored quiz to test your understanding of the core concepts
 */
import { ref, computed, watch } from 'vue';
import { useAudioEngine } from '@spectralsuite/core';

// --- AUDIO ENGINE STATUS ---
// We import this purely to show the "Engine Live / Engine Idle" indicator in the header.
const { isInitialized } = useAudioEngine();

// --- SECTION NAVIGATION ---
// `activeSection` tracks which sidebar item is currently selected.
const activeSection = ref( 'intro' );

// `selectedModule` tracks which module in the "Module Explorer" list is open.
const selectedModule = ref<string | null>( null );

// ============================================================
// FEATURE 1: LIVE STATS
// Instead of hardcoding "13 modules" and "52 composables", we
// scan the actual codebase using import.meta.glob and compute
// the real numbers. This means the stats stay accurate forever,
// no matter how many new modules we add.
// ============================================================

/**
 * Glob 1: Scans all .vue files so we can count module folders.
 * `import.meta.glob` is a Vite feature that resolves at build-time.
 * The result is an object like { '../atlas/AtlasModule.vue': fn, ... }
 */
const allVueFileGlob = import.meta.glob( '../**/*.vue' );

/**
 * Glob 2: Same glob but also loads raw file content for source inspection.
 * The `{ query: '?raw', import: 'default' }` options tell Vite to return
 * the file's text content as a plain string, not a component.
 */
const rawModules = import.meta.glob( '../**/*.vue', { query: '?raw', import: 'default' } );

/**
 * Glob 3: Scans all TypeScript files so we can count composables.
 * Composables are files that start with the word "use" (e.g., useAudioEngine.ts).
 */
const allTsFileGlob = import.meta.glob( '../**/*.ts' );

/**
 * Derives the unique list of module folder names from the .vue glob.
 * For a path like '../harmonicorbit/HarmonicOrbitModule.vue',
 * we extract the folder name 'harmonicorbit'.
 *
 * The `filter` at the end removes the 'atlas' module itself from the list
 * so Atlas doesn't list itself as an inspectable module.
 */
const moduleList = computed( () => {
  return Object.keys( allVueFileGlob )
    .map( path => {
      const parts = path.split( '/' );
      // The second-to-last segment is the folder name
      return parts[parts.length - 2];
    } )
    // The `filter` removes duplicates (a folder with multiple .vue files
    // would appear multiple times) and also removes the 'atlas' folder.
    .filter( ( name, index, self ) => name && name !== 'atlas' && self.indexOf( name ) === index );
} );

/**
 * Live count of unique module folders. Used in the stats dashboard.
 */
const moduleCount = computed( () => moduleList.value.length );

/**
 * Live count of all .vue files discovered in the codebase.
 */
const vueFileCount = computed( () => Object.keys( allVueFileGlob ).length );

/**
 * Live count of composable files (TypeScript files starting with "use").
 * We check the last segment of the path (the filename) for the "use" prefix.
 */
const composableCount = computed( () =>
  Object.keys( allTsFileGlob ).filter( p => {
    const filename = p.split( '/' ).pop() ?? '';
    return filename.startsWith( 'use' );
  } ).length
);

// ============================================================
// FEATURE 2: CONCEPT SEARCH BAR
// A live search that scans across the importDictionary and tutorials.
// As the user types, `searchResults` re-computes automatically
// because `searchQuery` is a reactive `ref()`.
// ============================================================

/**
 * The text the user has typed into the search input.
 * It's a ref() so the UI and computed() properties stay in sync.
 */
const searchQuery = ref( '' );

/**
 * Searches across two data sources simultaneously:
 * 1. The `importDictionary` (for concept keywords like "ref", "computed")
 * 2. The `tutorials` object (for topic text like "Audio Engine")
 *
 * Returns an array of result objects, each describing where the match was found.
 */
const searchResults = computed( () => {
  // `.trim()` removes leading/trailing whitespace before we compare.
  const q = searchQuery.value.toLowerCase().trim();

  // If the query is empty or too short, don't show any results.
  if ( !q || q.length < 2 ) return [];

  const results: { label: string; section: string; match: string; type: string }[] = [];

  // --- Search 1: importDictionary ---
  // We loop through every key/value pair in the dictionary.
  // `Object.entries()` gives us an array of [key, value] pairs.
  for ( const [key, why] of Object.entries( importDictionary ) ) {
    if ( key.toLowerCase().includes( q ) || why.toLowerCase().includes( q ) ) {
      results.push( { label: key, section: 'intro', match: why, type: 'concept' } );
    }
  }

  // --- Search 2: tutorials ---
  for ( const [id, tut] of Object.entries( tutorials ) ) {
    if ( tut.title.toLowerCase().includes( q ) || tut.content.toLowerCase().includes( q ) ) {
      // We only show the first 90 characters of the content as a preview.
      results.push( { label: tut.title, section: id, match: tut.content.slice( 0, 90 ) + '…', type: 'tutorial' } );
    }
  }

  return results;
} );

/**
 * Called when the user clicks a search result.
 * Navigates to the correct section and clears the search query.
 */
const navigateToResult = ( section: string ) => {
  activeSection.value = section;
  selectedModule.value = null;
  searchQuery.value = '';
};

// ============================================================
// FEATURE 3: MODULE DEPENDENCY QUIZ
// A scored, interactive quiz that tests understanding of the
// core concepts defined in `importDictionary`.
// Each question uses a simple state machine:
//   unanswered → answered (correct/incorrect) → advance
// ============================================================

/**
 * A single quiz question's data structure.
 * Each question has a prompt, 4 options, the index of the correct option,
 * and an explanation to show after the user answers.
 */
interface QuizQuestion {
  question: string;
  options: string[];
  correct: number; // Index into `options` array (0-based)
  explanation: string;
}

/**
 * The question bank. All questions are derived from concepts already in
 * the importDictionary, so the quiz reinforces what's already taught.
 */
const quizBank: QuizQuestion[] = [
  {
    question: 'Which Vue primitive automatically re-calculates its value only when its dependencies change?',
    options: ['ref()', 'watch()', 'computed()', 'nextTick()'],
    correct: 2,
    explanation: 'computed() is lazy — it only re-runs its function when the specific refs it reads have changed. This makes it more efficient than watch() for calculating derived values.'
  },
  {
    question: 'You want to run some code the moment your component first appears on screen. Which lifecycle hook do you use?',
    options: ['onUnmounted()', 'onActivated()', 'onMounted()', 'onDeactivated()'],
    correct: 2,
    explanation: 'onMounted() fires once the component\'s HTML has been added to the DOM. It\'s the perfect place to start audio nodes or fetch data.'
  },
  {
    question: 'An oscillator node keeps playing audio even after the user navigates away. Which hook should have been used to stop it?',
    options: ['onMounted()', 'onUnmounted()', 'watch()', 'provide()'],
    correct: 1,
    explanation: 'onUnmounted() runs just before Vue removes the component. It\'s our last chance to `.stop()` oscillators and prevent audio memory leaks.'
  },
  {
    question: 'Why do we use `shallowRef` for large audio buffers (Float32Array) instead of a regular `ref`?',
    options: [
      'shallowRef is faster to type',
      'shallowRef skips deep reactivity tracking, preventing browser rendering lag on huge arrays',
      'ref() doesn\'t support typed arrays',
      'shallowRef automatically converts arrays to numbers'
    ],
    correct: 1,
    explanation: 'Vue\'s ref() recursively makes every property of an object reactive, which is expensive for a 2048-element Float32Array. shallowRef only watches the top-level reference, so replacing the buffer is reactive but iterating it isn\'t.'
  },
  {
    question: 'How does a deeply nested child component access a value without having props drilled through 10 parent components?',
    options: ['It reads from localStorage', 'It uses inject() to receive a value provided by an ancestor', 'It uses watch() on the parent', 'It calls useAudioEngine() directly'],
    correct: 1,
    explanation: 'provide() lets a parent "broadcast" a value down the component tree. Any child, no matter how deep, can call inject() to receive it. This avoids messy "prop drilling".'
  },
  {
    question: 'What is the purpose of `storeToRefs` when using a Pinia store?',
    options: [
      'It converts refs into a Pinia store',
      'It turns Pinia state into reactive refs so the UI updates automatically when state changes',
      'It saves the store to localStorage',
      'It deletes a store when the component unmounts'
    ],
    correct: 1,
    explanation: 'If you destructure a Pinia store directly (e.g., `const { tempo } = useRhythmStore()`), you lose reactivity. `storeToRefs` wraps each state property in a ref, so the template keeps updating.'
  },
  {
    question: 'Why does Spectral Suite disable `echoCancellation` and `noiseSuppression` on the microphone?',
    options: [
      'To make the app louder',
      'Because browser VoIP processing removes faint harmonics needed for chord recognition',
      'To save CPU resources',
      'Those settings don\'t exist on the Web Audio API'
    ],
    correct: 1,
    explanation: 'Browser "enhancement" modes are designed for voice calls — they aggressively remove the subtle overtones that define a chord\'s colour. We need the raw, unprocessed signal to identify intervals accurately.'
  },
  {
    question: 'Which Vite feature does Atlas use to discover all module files dynamically at build time?',
    options: ['require()', 'import.meta.glob()', 'fs.readdir()', 'fetch()'],
    correct: 1,
    explanation: 'import.meta.glob() is a Vite-only build tool that resolves a glob pattern and returns a map of matching file paths to lazy loader functions. It runs at compile time, so the server never needs to scan the filesystem at runtime.'
  }
];

/** Which question (0-indexed) is currently shown. */
const quizIndex = ref( 0 );

/**
 * The option index the user selected for the current question.
 * `null` means the user hasn't answered yet.
 */
const selectedAnswer = ref<number | null>( null );

/** Total correct answers so far in this session. */
const score = ref( 0 );

/**
 * True when the user has answered all questions.
 * This computed property automatically becomes true when quizIndex
 * advances past the last question.
 */
const quizComplete = computed( () => quizIndex.value >= quizBank.length );

/** The current question object, or null if the quiz is finished. */
const currentQuestion = computed( () => quizBank[quizIndex.value] ?? null );

/**
 * Whether the user's selected answer was correct.
 * We read `currentQuestion` directly since quizIndex hasn't advanced yet.
 */
const isCorrect = computed( () =>
  selectedAnswer.value !== null &&
  currentQuestion.value !== null &&
  selectedAnswer.value === currentQuestion.value.correct
);

/**
 * Called when the user clicks one of the answer options.
 * We only register the first click (if already answered, do nothing).
 *
 * @param index - The 0-based index of the option they clicked.
 */
const submitAnswer = ( index: number ) => {
  // Guard: don't allow changing the answer after submitting
  if ( selectedAnswer.value !== null ) return;

  selectedAnswer.value = index;

  // If correct, increment the score counter
  if ( currentQuestion.value && index === currentQuestion.value.correct ) {
    score.value++;
  }
};

/**
 * Advances the quiz to the next question and resets the answer state.
 */
const nextQuestion = () => {
  selectedAnswer.value = null;
  // Advancing the index will cause `currentQuestion` and `quizComplete` to re-compute.
  quizIndex.value++;
};

/** Resets the entire quiz back to question 1 with score 0. */
const resetQuiz = () => {
  quizIndex.value = 0;
  selectedAnswer.value = null;
  score.value = 0;
};

// ============================================================
// MODULE EXPLORER
// Loads and analyzes the raw source code of a selected module.
// ============================================================

const currentSource = ref<string | null>( null );
const analyzedImports = ref<{ name: string; why: string }[]>( [] );

/**
 * Splits source code into an array of individual lines for the line-number gutter.
 */
const sourceLines = computed( () => {
  if ( !currentSource.value ) return [];
  return currentSource.value.split( '\n' );
} );

/**
 * Analyzes the source code of a module to find and explain imports.
 *
 * @param name - The module folder name (e.g., 'harmonicorbit')
 */
const analyzeModule = async ( name: string ) => {
  // Find the matching path from our rawModules glob
  const path = Object.keys( rawModules ).find( p => p.includes( `/${name}/` ) );
  if ( !path ) return;

  const loader = rawModules[path];
  if ( loader ) {
    const raw = await (loader() as Promise<string>);
    currentSource.value = raw;

    // This regex captures everything inside { ... } in an import statement.
    // For example: `import { ref, computed } from 'vue'` → captures " ref, computed "
    const importRegex = /import\s+{([^}]+)}\s+from\s+['"]([^'"]+)['"]/g;
    const matches = Array.from( raw.matchAll( importRegex ) );

    const uniqueImports = new Set<string>();
    matches.forEach( match => {
      // Split by comma, trim whitespace, and handle "import X as Y" aliases
      const names = match[1]!.split( ',' ).map( n => n.trim().split( ' as ' )[0]!.trim() );
      names.forEach( n => uniqueImports.add( n ) );
    } );

    analyzedImports.value = Array.from( uniqueImports )
      .map( name => ({
        name,
        why: importDictionary[name as keyof typeof importDictionary] || 'A utility used by this module for its specific logic.'
      }) )
      // Known imports (those in our dictionary) are shown first
      .sort( ( a, _b ) => a.why.includes( 'utility' ) ? 1 : -1 );
  }
};

// `watch` runs `analyzeModule` automatically whenever `selectedModule` changes.
watch( selectedModule, ( val ) => {
  if ( val ) analyzeModule( val );
} );

// --- CONTENT SECTIONS ---
// This array drives the sidebar navigation. Adding a new entry here
// is all it takes to create a new section in the UI.
const sections = [
  { id: 'intro',        label: 'Welcome',       icon: '🚀' },
  { id: 'architecture', label: 'Architecture',   icon: '🏛️' },
  { id: 'audio',        label: 'Audio Engine',   icon: '🎙️' },
  { id: 'typescript',   label: 'TypeScript',     icon: 'TS' },
  { id: 'vue',          label: 'Vue 3',          icon: 'V'  },
  { id: 'pinia',        label: 'Pinia State',    icon: '🍍' },
  { id: 'quiz',         label: 'Quiz',           icon: '🧠' },
  { id: 'modules',      label: 'Module Explorer', icon: '📂' }
];

/**
 * The importDictionary maps commonly used function/composable names to plain-English
 * explanations of WHY they exist. This is the heart of Atlas's educational content.
 */
const importDictionary = {
  'useAudioEngine':        'The master key that starts/stops the Web Audio API context and coordinates global synchronization.',
  'shallowRef':            'A lightweight version of ref() used for large audio buffers (like Float32Array) to prevent browser rendering lag.',
  'onMounted':             'A lifecycle hook that runs when a component is first added to the screen. Perfect for starting audio nodes.',
  'onUnmounted':           'Runs just before a component is destroyed. We use this to stop oscillators and prevent memory leaks.',
  'computed':              'A smart variable that automatically re-calculates itself only when its "dependencies" change (Efficiency champion).',
  'watch':                 'A listener that runs code whenever a variable changes. We use it to update audio parameters in real-time.',
  'ref':                   'The basic building block of Vue reactivity. Use this for single values like toggles, numbers, or strings.',
  'defineAsyncComponent': 'Lazy-loads modules only when the user clicks them. This keeps the initial app loading lightning fast.',
  'provide':               'Allows a parent component to "broadcast" a value to all its children, no matter how deep they are.',
  'inject':                'Used by a child to "hear" a value broadcasted by a parent via provide().',
  'nextTick':              'A utility that waits until the next screen redraw is finished before running code.',
  'onActivated':           'Used with <KeepAlive>. Runs when a hidden tab is brought back to the foreground.',
  'onDeactivated':         'Used with <KeepAlive>. Runs when a tab is hidden but not destroyed.',
  'storeToRefs':           'A Pinia utility that turns state into reactive refs so they stay synchronized with the UI.',
  'useRhythmStore':        'The global source of truth for Tempo, Subdivision, and the master metronome pulse.',
  'usePlatformStore':      'Handles cross-device persistence, user preferences, and platform-specific logic.',
  'SongDatabase':          'A curated collection of harmonic data from thousands of songs used for recommendation.',
  'RecommendationEngine':  'The brain that calculates which chords or songs feel "similar" based on music theory.',
  'ChordEngine':           'The logic core that identifies complex chords (like Cmin7b5) from raw pitch input.',
  'TonnetzMapper':         'The geometry engine that converts abstract pitch classes into X,Y coordinates on the lattice.'
};

const tutorials = {
  architecture: {
    title: 'System Architecture',
    subtitle: 'Building a modular music exploration engine.',
    content: 'Spectral Suite is designed as a Mono-Repo. The "Core" package handles all music theory math and heavy audio lift, while the "Tonic" app handles the visual presentation and user interaction.',
    examples: [
      {
        label: 'Mono-Repo Structure',
        code: 'packages/core/ -> Music Logic\napps/tonic/ -> Visual UI',
        explanation: 'Separating the math from the visuals allows us to swap the UI entirely without breaking the instrument logic.',
        file: 'packages/core/src/index.ts',
        line: 1
      },
      {
        label: 'Plug-and-Play Tools',
        code: '<TonnetzModule v-if="active" />',
        explanation: 'Every tool is an independent module. This ensures that adding a new visualizer doesn\'t slow down existing ones.',
        file: 'apps/tonic/src/App.vue',
        line: 358
      }
    ]
  },
  audio: {
    title: 'The Audio Engine',
    subtitle: 'Low-latency physics on the web.',
    content: 'We use the Web Audio API for high-fidelity sound. In Spectral Suite, we keep the audio stream "raw" (no echo cancellation or noise suppression) for the most accurate harmonic analysis possible.',
    examples: [
      {
        label: 'Raw Audio Mode',
        code: 'echoCancellation: false\nnoiseSuppression: false',
        explanation: 'Browser processing (VoIP mode) "cleans" audio but removes the faint harmonics we need for chord recognition.',
        file: 'packages/core/src/audio/AudioEngine.ts',
        line: 62
      },
      {
        label: 'Audio Node Graph',
        code: 'source -> gain -> analyser',
        explanation: 'We route audio through a Gain node for global volume before it hits the Analyser for visual spectral data.',
        file: 'packages/core/src/audio/AudioEngine.ts',
        line: 79
      }
    ]
  },
  typescript: {
    title: 'TypeScript: The Guard Rails',
    subtitle: 'Why we use types in a music app.',
    content: 'TypeScript helps us catch bugs before the app even runs. In an audio engine, if you pass a "String" where a "Float" should be, the engine might clip or crash. TypeScript prevents this by checking every value\'s type at compile time — before your code ever runs in the browser.',
    examples: [
      {
        label: 'Interface — Designing a Data Shape',
        code: `export interface StairStep {
  cents: number;      // How far above root (in cents)
  label: string;      // Display label e.g. "Full Bend"
  isTarget: boolean;  // Is this the goal step?
  isBluesZone: boolean; // ¼-tone bend territory
}`,
        explanation: 'An interface is a "blueprint" for an object. It tells TypeScript exactly which properties are allowed and what type each one must be. If BendTrainer ever returned {cents: "hello"}, TS would catch it instantly.',
        file: 'packages/core/src/theory/useBendTrainer.ts',
        line: 22
      },
      {
        label: 'Generic Ref — Typed Reactive Values',
        code: `// The <number | null> inside the angle brackets is a "Generic".
// It tells TypeScript what TYPE the ref can hold.
// null means "no pitch detected yet".
const pitch = ref<number | null>(null);
const currentNote = ref<string | null>(null);`,
        explanation: 'Generics let you parameterize a type. ref<number | null> means "this ref holds either a number OR null". If you ever tried to set pitch.value = "A4", TypeScript would throw an error immediately.',
        file: 'packages/core/src/audio/usePitch.ts',
        line: 46
      },
      {
        label: 'Interface with Optional Props (the ? operator)',
        code: `export interface PitchConfig {
  smoothing?: number;         // ? means optional
  averagingWindowMs?: number; // ? means optional
  dynamicsResetThreshold?: number;
}

// Calling it with or without config both work:
usePitch()                           // ✅ No config
usePitch({ smoothing: 3 })          // ✅ Partial config`,
        explanation: 'The ? after a property name makes it optional. This lets us call usePitch() with zero arguments or with only the settings we care about — without TypeScript complaining about "missing" fields.',
        file: 'packages/core/src/audio/usePitch.ts',
        line: 25
      },
      {
        label: 'Union Types — Either/Or Values',
        code: `// A union type uses the | (pipe) character.
// It means "this value can be one of these specific options".
type BendState = 'idle' | 'bending' | 'onTarget';

// ContextDrawer's side prop uses a union type:
// side can ONLY be 'left' or 'right' — nothing else.
side?: 'left' | 'right';`,
        explanation: 'Union types are like a multiple-choice constraint. TypeScript will refuse to compile if you pass side="top" to ContextDrawer. This prevents entire categories of runtime bugs.',
        file: 'apps/tonic/src/components/ui/ContextDrawer.vue',
        line: 16
      },
      {
        label: 'defineEmits with TypeScript Generics',
        code: `// The <{ ... }> block defines the exact shape of every
// event this component is allowed to emit.
const emit = defineEmits<{
  ( e: 'complete' ): void;
  ( e: 'tool-change', tool: string ): void;
  ( e: 'quit' ): void;
}>();

// Now TypeScript checks our emits at the call site:
emit('complete');           // ✅ valid
emit('tool-change', 'auratune'); // ✅ valid
// emit('explode');         // ❌ TypeScript error!`,
        explanation: 'Typed emits mean that if you rename an event or forget to pass a required argument, TypeScript catches it immediately. This is especially important as apps grow and components are reused.',
        file: 'apps/tonic/src/modules/academy/LessonRunner.vue',
        line: 19
      },
      {
        label: 'Type Guards — Narrowing at Runtime',
        code: `// This filter uses a "type predicate" (p): p is number
// to tell TypeScript that after the filter, the array
// contains ONLY numbers — never null.
const validPitches = medianBuffer.filter(
  (p): p is number => p !== null
);

// TypeScript now knows validPitches is number[], not (number | null)[]
const sorted = [...validPitches].sort((a, b) => a - b);`,
        explanation: 'Type guards narrow a broad type (number | null) to a specific one at runtime. Without the (p): p is number predicate, TypeScript would still think the filtered array might contain nulls and would refuse to let us call .sort().',
        file: 'packages/core/src/audio/usePitch.ts',
        line: 193
      },
      {
        label: 'Constants — Named, Documented Magic Numbers',
        code: `// ❌ Without constants — what do these numbers mean?
const force = (target - pos) * 0.08;
velocity *= 0.82;

// ✅ With constants — self-documenting physics
// SCREAMING_SNAKE_CASE signals: "this never changes"
const SPRING_TENSION = 0.08; // How hard it pulls (snappier = higher)
const SPRING_FRICTION = 0.82; // How fast it slows (1.0 = never stops)

const force = (target - pos) * SPRING_TENSION;
velocity *= SPRING_FRICTION;`,
        explanation: 'Constants serve two jobs: (1) give meaning to numbers that would otherwise be cryptic, and (2) make it easy to tune values in one place. SCREAMING_SNAKE_CASE is a universal convention that shouts "I am never reassigned" — helping collaborators understand the code at a glance.',
        file: 'apps/tonic/src/modules/auratune/AuraTuneModule.vue',
        line: 93
      },
      {
        label: 'InjectionKey — Typed provide/inject Tokens',
        code: `import type { InjectionKey, Ref } from 'vue';

// Step 1: Define the SHAPE of what will be provided.
interface HarmonicSelectionState {
  selectedKeyIdx: Ref<number | null>;
  activeKeys: Ref<FifthsKeyEntry[]>;
}

// Step 2: Create a TYPED key (a Symbol — guaranteed unique).
// InjectionKey<T> tells TypeScript what T to expect on inject().
export const HARMONIC_SELECTION_KEY: InjectionKey<HarmonicSelectionState> =
  Symbol('harmonic-selection');`,
        explanation: 'An InjectionKey is a Vue + TypeScript pattern that makes provide/inject type-safe. Without it, inject() returns `unknown` and you lose all type checking. With it, TypeScript knows EXACTLY what shape the injected value will have — no casting needed.',
        file: 'apps/tonic/src/composables/harmonicKeys.ts',
        line: 103
      }
    ]
  },
  vue: {
    title: 'Vue 3: Reactive Harmony',
    subtitle: 'Building responsive interfaces that feel alive.',
    content: 'Vue 3\'s Composition API makes state management feel natural. Instead of scattered event callbacks, you declare reactive data with ref() and computed(), and Vue automatically keeps your UI in sync — like a live wire between your logic and your screen.',
    examples: [
      {
        label: 'ref() — The Basic Reactive Variable',
        code: `// ref() wraps a plain value in a reactive container.
// When you change .value, Vue re-renders the UI automatically.
const isSettingsOpen = ref(false);

// In the template, Vue "unwraps" it — no .value needed:
// <div v-if="isSettingsOpen">...</div>

// In script, you always use .value:
isSettingsOpen.value = true; // Triggers re-render`,
        explanation: 'ref() is Vue\'s simplest reactive primitive. "Reactive" means the UI is always a live reflection of the data. You never manually update DOM elements — you just change the value and Vue handles everything.',
        file: 'apps/tonic/src/modules/auratune/AuraTuneModule.vue',
        line: 46
      },
      {
        label: 'computed() — Derived State (Automatic Caching)',
        code: `// computed() creates a value that derives from other refs.
// Vue caches the result and ONLY re-calculates when
// the refs it reads actually change.
const toneQuality = computed(() => {
  if (!clarity.value) return 0;
  return Math.round(clarity.value * 100);
});

// The template reads it like any other value:
// <span>{{ toneQuality }}%</span>`,
        explanation: 'computed() is like a spreadsheet formula. If clarity.value doesn\'t change at all between renders, Vue skips the recalculation entirely. This is much more efficient than recalculating inside the template on every frame.',
        file: 'apps/tonic/src/modules/auratune/AuraTuneModule.vue',
        line: 208
      },
      {
        label: 'watch() — Reacting to Changes',
        code: `// watch() runs a function as a SIDE EFFECT whenever
// the watched ref changes. It does NOT return a value.
// Perfect for: starting audio, fetching data, stopping oscillators.

watch(isInitialized, (newVal) => {
  // 'newVal' is what isInitialized just became
  if (newVal) activate(); // Start audio engine
});

// Watch multiple values at once with an array:
watch([isDroneActive, droneVolume, currentNote], () => {
  // runs when ANY of the three change
});`,
        explanation: 'watch() is for running code in response to a change, not for calculating a value. A common mistake is trying to use watch where computed would be better. Rule: if you\'re returning a value, use computed. If you\'re running a side effect (audio, DOM, network), use watch.',
        file: 'apps/tonic/src/modules/auratune/AuraTuneModule.vue',
        line: 42
      },
      {
        label: 'Lifecycle Hooks — onMounted / onUnmounted',
        code: `// onMounted() runs ONCE after Vue adds this component to the page.
// Perfect for starting audio processing.
onMounted(() => {
  activate();      // Start microphone
  startAnimation(); // Start requestAnimationFrame loop
});

// onUnmounted() runs ONCE just before Vue removes this component.
// This is our LAST CHANCE to clean up resources!
onUnmounted(() => {
  deactivate();                    // Release microphone
  cancelAnimationFrame(animationId); // Stop animation loop
});`,
        explanation: 'Every component has a lifecycle: Created → Mounted → Updated → Unmounted. onMounted and onUnmounted are the most important hooks for audio apps because oscillators and animation loops keep running even after the component disappears. Forgetting onUnmounted causes audio "ghost" bugs.',
        file: 'apps/tonic/src/modules/auratune/AuraTuneModule.vue',
        line: 25
      },
      {
        label: 'KeepAlive Hooks — onActivated / onDeactivated',
        code: `// Vue's <KeepAlive> wrapper prevents a component from being destroyed
// when the user switches tabs. Instead, it is "paused" (deactivated).
// These hooks fire when the user switches between cached modules.

onActivated(() => {
  activate();       // User came back to this tool
  startAnimation(); // Resume the 60fps render loop
});

onDeactivated(() => {
  deactivate();                    // User left — stop audio
  cancelAnimationFrame(animationId); // Save CPU
});`,
        explanation: 'Without KeepAlive hooks, switching tabs would mean destroying and recreating the entire audio context. With them, we can "pause" the module — the component stays alive in memory but its heavy work is temporarily stopped.',
        file: 'apps/tonic/src/modules/auratune/AuraTuneModule.vue',
        line: 33
      },
      {
        label: 'defineProps with withDefaults()',
        code: `// defineProps defines what data a PARENT must/can pass in.
// withDefaults() sets fallback values for optional props.
const props = withDefaults(defineProps<{
  isOpen: boolean;
  title?: string;        // ? = optional
  side?: 'left' | 'right'; // Union type — only these two values
}>(), {
  side: 'right'  // If parent doesn't pass 'side', default to 'right'
});

// Parent usage:
// <ContextDrawer :is-open="true" title="Settings" />`,
        explanation: 'Props flow data DOWN from parent to child. defineProps declares what your component accepts. withDefaults fills in sensible defaults so callers don\'t have to specify every single prop every single time.',
        file: 'apps/tonic/src/components/ui/ContextDrawer.vue',
        line: 11
      },
      {
        label: 'Template Slots — Plug-and-Play Content Holes',
        code: `// In the child component (LocalSettingsDrawer.vue):
// <slot /> creates a "hole" where parent content goes.

// In the parent component (AuraTuneModule.vue):
// Named slots let you inject content into specific "holes".
<LocalSettingsDrawer :is-open="isSettingsOpen">
  <template #General>
    <!-- This HTML is injected into the #General slot -->
    <SettingsToggle ... />
  </template>

  <template #Tuning>
    <!-- This HTML is injected into the #Tuning slot -->
    <input type="range" v-model="concertA" />
  </template>
</LocalSettingsDrawer>`,
        explanation: 'Slots are Vue\'s content injection system. The drawer component does not know or care what content goes inside it — it just provides named "holes". Each module fills those holes with its own settings. This is how one drawer component powers every single module in the app.',
        file: 'apps/tonic/src/modules/auratune/AuraTuneModule.vue',
        line: 329
      },
      {
        label: 'provide() — Broadcasting State Down the Tree',
        code: `// In HarmonicOrbitModule.vue (the PARENT / Provider)
import { provide } from 'vue';
import { HARMONIC_SELECTION_KEY } from '../../composables/harmonicKeys';

// Call provide() at the top of the parent component.
// The key is our typed Symbol. The value matches the interface.
provide(HARMONIC_SELECTION_KEY, {
  selectedKeyIdx,  // Ref<number | null>
  activeKeys,      // Ref<FifthsKeyEntry[]>
  currentTriadNotes // Ref<string[]>
});

// Now ANY descendant component can inject this,
// no matter how many layers deep it is.`,
        explanation: 'provide() "broadcasts" reactive state from a parent component. It\'s the solution to prop drilling — instead of passing selectedKeyIdx through 4 levels of component props, the Orbit module provides it once and the deeply-nested TonnetzPreview injects it directly.',
        file: 'apps/tonic/src/modules/harmonicorbit/HarmonicOrbitModule.vue',
        line: 310
      },
      {
        label: 'inject() — Receiving Provided State in a Child',
        code: `// In TonnetzPreview.vue (the CHILD / Consumer)
import { inject } from 'vue';
import { HARMONIC_SELECTION_KEY } from '../../composables/harmonicKeys';

// inject() reaches UP the component tree to find the nearest
// ancestor that called provide() with the same key.
// TypeScript knows the exact shape because of InjectionKey<T>.
const selection = inject(HARMONIC_SELECTION_KEY);

// Guard against cases where no parent provides the key:
if (!selection) return; // Graceful fallback

// Now we have full type-safe access to the parent's state:
const idx = selection.selectedKeyIdx.value; // number | null`,
        explanation: 'inject() is the "receiver" side of provide(). Notice TonnetzPreview imports NO data as props — it has zero prop declarations. It gets everything from inject(). This keeps the component tree clean and means you can move TonnetzPreview anywhere in the app without changing any parent components.',
        file: 'apps/tonic/src/modules/harmonicorbit/TonnetzPreview.vue',
        line: 41
      }
    ]
  },
  pinia: {
    title: 'Pinia: The Central Hub',
    subtitle: 'Global state for complex instruments.',
    content: 'Instead of passing props through 10 layers of components, we use Pinia to store global settings like Tempo and Global Gain. Every module "taps into" this master pulse.',
    examples: [
      {
        label: 'Stores',
        code: 'const store = useAudioEngineStore();',
        explanation: 'The Audio Engine status is shared globally across the entire app via this Pinia store.',
        file: 'packages/core/src/audio/useAudioEngine.ts',
        line: 6
      }
    ]
  }
};
</script>

<template>
  <div class="atlas-module h-full flex flex-col bg-spectral-950 text-slate-200">

    <!-- ===== HEADER ===== -->
    <header class="p-8 border-b border-white/5 bg-black/20 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-black tracking-tighter text-white uppercase italic">Project Atlas</h1>
        <p class="text-[10px] uppercase tracking-[0.4em] text-indigo-400 font-bold mt-1">Source Code Explorer & Technical Manual</p>
      </div>

      <div class="flex items-center gap-4">
        <div class="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center gap-2">
          <div :class="['w-2 h-2 rounded-full animate-pulse', isInitialized ? 'bg-emerald-400' : 'bg-slate-500']"></div>
          <span class="text-[9px] font-black uppercase tracking-widest">{{ isInitialized ? 'Engine Live' : 'Engine Idle' }}</span>
        </div>
      </div>
    </header>

    <div class="flex-1 flex overflow-hidden">

      <!-- ===== SIDEBAR ===== -->
      <nav class="w-64 border-r border-white/5 bg-black/10 flex flex-col p-4 space-y-2 overflow-y-auto">

        <!-- FEATURE 2: Search Bar -->
        <!-- The `v-model` directive is a shorthand that binds the input's value
             to `searchQuery` AND listens for the 'input' event to update it.
             This is what makes the search "live". -->
        <div class="relative mb-2">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search concepts..."
            class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-300 placeholder-slate-600 outline-none focus:border-indigo-500/50 focus:bg-white/8 transition-all"
          />
          <!-- Search icon -->
          <span class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 text-[10px]">⌕</span>

          <!-- Search Results Dropdown -->
          <!-- `v-if` hides the dropdown entirely when there are no results.
               This avoids showing an empty box when the search is blank. -->
          <div
            v-if="searchResults.length > 0"
            class="absolute top-full left-0 right-0 mt-1 z-10 bg-spectral-900 border border-indigo-500/20 rounded-xl overflow-hidden shadow-2xl shadow-black/50"
          >
            <button
              v-for="result in searchResults"
              :key="result.label + result.section"
              @click="navigateToResult(result.section)"
              class="w-full p-3 text-left hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
            >
              <!-- Type badge: 'concept' or 'tutorial' -->
              <div class="flex items-center gap-2 mb-1">
                <span
                  :class="[
                    'text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded',
                    result.type === 'concept'
                      ? 'bg-indigo-500/20 text-indigo-400'
                      : 'bg-amber-500/20 text-amber-400'
                  ]"
                >{{ result.type }}</span>
                <span class="text-[11px] font-bold text-slate-300">{{ result.label }}</span>
              </div>
              <p class="text-[9px] text-slate-500 leading-relaxed line-clamp-2">{{ result.match }}</p>
            </button>
          </div>
        </div>

        <!-- Section Navigation Buttons -->
        <button
          v-for="section in sections"
          :key="section.id"
          @click="activeSection = section.id; selectedModule = null"
          class="w-full p-3 rounded-xl flex items-center gap-4 transition-all text-left group"
          :class="activeSection === section.id ? 'bg-indigo-500/20 text-white shadow-[0_0_20px_rgba(99,102,241,0.1)]' : 'hover:bg-white/5 text-slate-400'"
        >
          <span class="w-8 h-8 flex items-center justify-center rounded-lg bg-black/20 font-black text-[10px] group-hover:scale-110 transition-transform">
            {{ section.icon }}
          </span>
          <span class="text-[11px] font-bold uppercase tracking-widest">{{ section.label }}</span>

          <!-- Score badge shown next to the Quiz section button -->
          <span
            v-if="section.id === 'quiz' && quizComplete"
            class="ml-auto text-[9px] font-black px-2 py-0.5 rounded-full"
            :class="score >= 6 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'"
          >
            {{ score }}/{{ quizBank.length }}
          </span>
        </button>

        <!-- Module List -->
        <div class="mt-8 pt-6 border-t border-white/5">
          <span class="text-[8px] font-black uppercase tracking-[0.3em] text-slate-500 px-4">The Modules</span>
          <div class="mt-4 space-y-1">
            <button
              v-for="mod in moduleList"
              :key="mod"
              @click="activeSection = 'modules'; selectedModule = mod ?? null"
              class="w-full px-4 py-2 rounded-lg text-left text-[10px] font-bold uppercase tracking-wider transition-all"
              :class="selectedModule === mod ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'"
            >
              {{ mod }}
            </button>
          </div>
        </div>
      </nav>

      <!-- ===== MAIN CONTENT AREA ===== -->
      <main class="flex-1 overflow-y-auto p-12 bg-pattern custom-scrollbar">
        <transition name="fade" mode="out-in">
          <div :key="activeSection + (selectedModule || '')" class="max-w-3xl mx-auto">

            <!-- ================================================ -->
            <!-- SECTION: INTRO — with Live Stats                  -->
            <!-- ================================================ -->
            <div v-if="activeSection === 'intro'" class="space-y-8">
              <div class="p-10 rounded-3xl bg-indigo-500/5 border border-indigo-500/10 relative overflow-hidden group">
                <div class="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl transition-all group-hover:bg-indigo-500/20"></div>
                <h2 class="text-4xl font-black text-white tracking-tighter">Learn the Physics of Code.</h2>
                <p class="text-slate-400 mt-4 leading-relaxed text-lg">
                  Spectral Suite is more than just a music app—it's an education in modern architecture.
                  This "Project Atlas" module breaks down <strong>why</strong> we made certain technical decisions
                  and <strong>how</strong> the different parts talk to each other.
                </p>

                <!-- LIVE STATS — computed dynamically from the codebase glob -->
                <div class="mt-8 flex gap-4 flex-wrap">
                  <!-- Stat 1: Module Count -->
                  <div class="p-4 rounded-2xl bg-black/40 border border-white/5 flex flex-col gap-1">
                    <span class="text-white font-black text-xl leading-none count-up">{{ moduleCount }}</span>
                    <span class="text-[8px] uppercase tracking-widest text-slate-500">Modules</span>
                  </div>
                  <!-- Stat 2: Composable Count -->
                  <div class="p-4 rounded-2xl bg-black/40 border border-white/5 flex flex-col gap-1">
                    <span class="text-white font-black text-xl leading-none count-up">{{ composableCount }}</span>
                    <span class="text-[8px] uppercase tracking-widest text-slate-500">Composables</span>
                  </div>
                  <!-- Stat 3: Total Vue File Count (new!) -->
                  <div class="p-4 rounded-2xl bg-black/40 border border-indigo-500/20 flex flex-col gap-1">
                    <span class="text-indigo-400 font-black text-xl leading-none count-up">{{ vueFileCount }}</span>
                    <span class="text-[8px] uppercase tracking-widest text-slate-500">Vue Files</span>
                  </div>
                </div>
              </div>

              <!-- Import Dictionary Grid -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div v-for="(explanation, key) in importDictionary" :key="key"
                  class="p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-indigo-500/30 transition-colors group">
                  <h4 class="text-indigo-400 font-black text-[10px] uppercase tracking-widest">{{ key }}</h4>
                  <p class="text-slate-400 text-xs mt-2 leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity">
                    {{ explanation }}
                  </p>
                </div>
              </div>
            </div>

            <!-- ================================================ -->
            <!-- SECTION: TUTORIALS (architecture, audio, ts, vue, pinia) -->
            <!-- ================================================ -->
            <div v-else-if="tutorials[activeSection as keyof typeof tutorials]" class="space-y-8">
              <header>
                <h2 class="text-4xl font-black text-white tracking-tighter">{{ tutorials[activeSection as keyof typeof tutorials].title }}</h2>
                <p class="text-indigo-400 font-bold uppercase text-[10px] tracking-widest mt-2">
                  {{ tutorials[activeSection as keyof typeof tutorials].subtitle }}
                </p>
              </header>

              <div class="p-8 rounded-3xl bg-black/20 border border-white/5 text-slate-300 leading-relaxed">
                {{ tutorials[activeSection as keyof typeof tutorials].content }}
              </div>

              <div class="space-y-4">
                <h3 class="text-xs font-black uppercase text-slate-500 tracking-[0.3em]">Code Concept</h3>
                <div v-for="example in (tutorials[activeSection as keyof typeof tutorials] as any).examples" :key="example.label"
                  class="p-6 rounded-2xl bg-spectral-900 border border-indigo-500/20 space-y-4">
                  <div class="flex items-center justify-between">
                    <span class="px-2 py-1 bg-indigo-500/20 rounded text-[9px] font-black text-indigo-300 uppercase italic">{{ example.label }}</span>
                    <div v-if="example.file" class="flex items-center gap-2">
                      <span class="text-[8px] font-mono text-slate-500 opacity-50">{{ example.file.split('/').pop() }}</span>
                      <span class="text-[8px] font-bold text-indigo-400 bg-indigo-400/10 px-1.5 py-0.5 rounded leading-none">L:{{ example.line }}</span>
                    </div>
                  </div>
                  <pre class="text-emerald-400 font-mono text-sm bg-black/40 p-4 rounded-xl overflow-x-auto border border-white/5"><code>{{ example.code }}</code></pre>
                  <p class="text-slate-400 text-xs italic">{{ example.explanation }}</p>
                </div>
              </div>
            </div>

            <!-- ================================================ -->
            <!-- SECTION: QUIZ                                     -->
            <!-- ================================================ -->
            <div v-else-if="activeSection === 'quiz'" class="space-y-8">
              <header>
                <h2 class="text-4xl font-black text-white tracking-tighter">Knowledge Check</h2>
                <p class="text-indigo-400 font-bold uppercase text-[10px] tracking-widest mt-2">
                  Test your understanding of the core building blocks
                </p>
              </header>

              <!-- Progress bar -->
              <!-- We compute the fill percentage by dividing answered questions by total. -->
              <div class="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  class="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500 ease-out"
                  :style="{ width: `${(quizIndex / quizBank.length) * 100}%` }"
                ></div>
              </div>
              <div class="flex justify-between text-[9px] font-bold uppercase tracking-widest text-slate-500 -mt-6">
                <span>Question {{ Math.min(quizIndex + 1, quizBank.length) }} of {{ quizBank.length }}</span>
                <span>Score: {{ score }}</span>
              </div>

              <!-- ---- QUIZ COMPLETE CARD ---- -->
              <div v-if="quizComplete" class="p-10 rounded-3xl border text-center space-y-6"
                :class="score >= 6 ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-amber-500/10 border-amber-500/30'"
              >
                <div class="text-6xl">{{ score >= 6 ? '🎉' : '📖' }}</div>
                <h3 class="text-3xl font-black text-white">
                  {{ score >= 6 ? 'Excellent Work!' : 'Keep Learning!' }}
                </h3>
                <p class="text-slate-400 leading-relaxed">
                  You scored <strong class="text-white">{{ score }} out of {{ quizBank.length }}</strong>.
                  <span v-if="score >= 6"> You have a solid grasp of the Spectral Suite architecture.</span>
                  <span v-else> Review the Architecture and Audio Engine sections, then try again!</span>
                </p>
                <button
                  @click="resetQuiz"
                  class="px-8 py-3 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-bold text-sm hover:bg-indigo-500/30 transition-all"
                >
                  Try Again →
                </button>
              </div>

              <!-- ---- ACTIVE QUESTION CARD ---- -->
              <div v-else-if="currentQuestion" class="space-y-6">
                <div class="p-8 rounded-3xl bg-black/30 border border-white/10">
                  <p class="text-lg font-bold text-white leading-relaxed">{{ currentQuestion.question }}</p>
                </div>

                <!-- Answer Options -->
                <!-- Each button applies a different class based on the quiz state:
                     - Before answering: neutral hover style
                     - After answering correct choice: green
                     - After answering wrong choice: red (only on the one they picked)
                     - After answering: show the correct answer in green too -->
                <div class="space-y-3">
                  <button
                    v-for="(option, idx) in currentQuestion.options"
                    :key="idx"
                    @click="submitAnswer(idx)"
                    :disabled="selectedAnswer !== null"
                    class="w-full p-4 rounded-2xl border text-left text-sm font-medium transition-all duration-300"
                    :class="[
                      selectedAnswer === null
                        ? 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:border-indigo-500/30 cursor-pointer'
                        : idx === currentQuestion.correct
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                          : selectedAnswer === idx
                            ? 'bg-red-500/20 border-red-500/40 text-red-300'
                            : 'bg-white/3 border-white/5 text-slate-500 cursor-not-allowed'
                    ]"
                  >
                    <span class="font-black text-[10px] mr-3 opacity-50">{{ ['A', 'B', 'C', 'D'][idx] }}</span>
                    {{ option }}
                  </button>
                </div>

                <!-- Explanation + Next Button (shown after answering) -->
                <transition name="fade">
                  <div v-if="selectedAnswer !== null" class="space-y-4">
                    <div
                      class="p-6 rounded-2xl border"
                      :class="isCorrect ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-slate-800/50 border-white/10'"
                    >
                      <p class="text-[10px] font-black uppercase tracking-widest mb-2"
                        :class="isCorrect ? 'text-emerald-400' : 'text-amber-400'"
                      >
                        {{ isCorrect ? '✓ Correct!' : '✗ Not quite…' }}
                      </p>
                      <p class="text-slate-300 text-sm leading-relaxed">{{ currentQuestion.explanation }}</p>
                    </div>

                    <div class="flex justify-end">
                      <button
                        @click="nextQuestion"
                        class="px-6 py-2.5 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-bold text-sm hover:bg-indigo-500/30 transition-all"
                      >
                        {{ quizIndex + 1 < quizBank.length ? 'Next Question →' : 'See Results →' }}
                      </button>
                    </div>
                  </div>
                </transition>
              </div>
            </div>

            <!-- ================================================ -->
            <!-- SECTION: MODULE EXPLORER                          -->
            <!-- ================================================ -->
            <div v-else-if="activeSection === 'modules' && selectedModule" class="space-y-8">
              <header class="flex items-center gap-6">
                <div class="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-black text-2xl">
                  {{ selectedModule.charAt(0).toUpperCase() }}
                </div>
                <div>
                  <h2 class="text-3xl font-black text-white uppercase tracking-tighter">{{ selectedModule }}</h2>
                  <p class="text-slate-500 text-[10px] uppercase tracking-widest font-bold">Module Analysis & Dependency Map</p>
                </div>
              </header>

              <div class="grid grid-cols-1 gap-6">
                <!-- Import Analysis Card -->
                <div class="p-8 rounded-3xl bg-black/40 border border-white/5 backdrop-blur-xl">
                  <h3 class="text-[10px] uppercase tracking-[0.4em] text-indigo-400 font-black mb-6">Import Analysis: The "Why"</h3>
                  <div class="space-y-4">
                    <div v-for="imp in analyzedImports" :key="imp.name"
                      class="flex flex-col md:flex-row md:items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 group hover:bg-white/10 transition-all">
                      <div class="flex items-center gap-3 min-w-[140px]">
                        <div class="w-2 h-2 rounded-full bg-emerald-500"></div>
                        <span class="font-mono text-sm text-emerald-400">{{ imp.name }}</span>
                      </div>
                      <p class="text-xs text-slate-400 leading-relaxed font-medium">{{ imp.why }}</p>
                    </div>
                  </div>
                </div>

                <!-- Raw Source Card -->
                <div class="p-8 rounded-3xl bg-spectral-900 border border-white/5 overflow-hidden">
                  <div class="flex items-center justify-between mb-6">
                    <h3 class="text-[10px] uppercase tracking-[0.4em] text-slate-500 font-black">Raw Component Source</h3>
                    <span class="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Read Only</span>
                  </div>
                  <div class="relative group">
                    <div class="bg-black/40 rounded-2xl border border-white/5 overflow-hidden flex max-h-[600px]">
                      <!-- Line Numbers gutter -->
                      <div class="w-10 bg-black/20 text-slate-600 font-mono text-[10px] py-6 text-right pr-3 select-none flex flex-col">
                        <span v-for="(_line, idx) in sourceLines" :key="idx" class="leading-relaxed h-4">{{ idx + 1 }}</span>
                      </div>
                      <!-- Code area -->
                      <pre class="flex-1 text-[11px] font-mono text-slate-400/80 p-6 pt-[22px] overflow-auto custom-scrollbar selection:bg-indigo-500/20 leading-relaxed"><code class="block whitespace-pre">{{ currentSource }}</code></pre>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- ---- Modules section landing (no module selected) ---- -->
            <div v-else-if="activeSection === 'modules'" class="py-20 flex flex-col items-center justify-center opacity-30">
              <div class="w-12 h-12 rounded-full border-2 border-dashed border-slate-600 animate-spin mb-4"></div>
              <p class="text-[10px] font-black uppercase tracking-[0.5em]">Select a module from the sidebar</p>
            </div>

            <!-- ---- Fallback spinner ---- -->
            <div v-else class="py-20 flex flex-col items-center justify-center opacity-30">
              <div class="w-12 h-12 rounded-full border-2 border-dashed border-slate-600 animate-spin mb-4"></div>
              <p class="text-[10px] font-black uppercase tracking-[0.5em]">Compiling Manual…</p>
            </div>

          </div>
        </transition>
      </main>
    </div>
  </div>
</template>

<style scoped>
.bg-pattern {
  background-image: radial-gradient(circle at 2px 2px, rgba(255, 255, 255, 0.05) 1px, transparent 0);
  background-size: 40px 40px;
}

/* Fade transition used for section changes and the quiz explanation reveal */
.fade-enter-active, .fade-leave-active {
  transition: all 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

/* Custom scrollbar for the source code viewer */
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.1);
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 2px;
}

/*
 * Count-up animation for the live stats numbers.
 * The numbers fade in with a slight upward slide to feel "alive".
 */
@keyframes countUp {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.count-up {
  animation: countUp 0.6s ease-out both;
}
</style>
