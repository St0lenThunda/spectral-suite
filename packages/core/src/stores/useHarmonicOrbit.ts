import { ref, computed } from 'vue';

// The 12 Keys in Circle of Fifths order
export const FIFTHS_KEYS = [
  { note: 'C', major: 'C', signature: '0', ii: 'Dm', iii: 'Em', vi: 'Am', dim: 'Bdim', fact: 'The "Home Base" of music! C Major has no sharps or flats, so it uses only the white keys on a piano. This makes it perfect for beginners and the foundation of all music theory.' },
  { note: 'G', major: 'G', signature: '1♯', ii: 'Am', iii: 'Bm', vi: 'Em', dim: 'F#dim', fact: 'The "Guitarist\'s Friend." G Major has just one sharp (F#), making it one of the easiest keys to play on guitar. Many folk and rock songs are written in G!' },
  { note: 'D', major: 'D', signature: '2♯', ii: 'Em', iii: 'F#m', vi: 'Bm', dim: 'C#dim', fact: 'The "Heroic Key." D Major sounds bright and triumphant! Many famous movie themes and national anthems are in D because it sounds strong, brave, and victorious.' },
  { note: 'A', major: 'A', signature: '3♯', ii: 'Bm', iii: 'C#m', vi: 'F#m', dim: 'G#dim', fact: 'The "Golden Key." A Major sounds very warm and is great for singing along with. It\'s a favorite for pop, country, and classic rock songs.' },
  { note: 'E', major: 'E', signature: '4♯', ii: 'F#m', iii: 'G#m', vi: 'C#m', dim: 'D#dim', fact: 'Super powerful! E Major makes guitars sound huge because the lowest string is an E. Many rock and blues songs love this key for its raw energy.' },
  { note: 'B', major: 'B', signature: '5♯', ii: 'C#m', iii: 'D#m', vi: 'G#m', dim: 'A#dim', fact: 'The "Black Key Specialist." B Major uses 5 sharps, so you\'ll be playing lots of black keys! It has a bright, shimmering quality.' },
  { note: 'Gb', major: 'Gb', signature: '6♭', ii: 'Abm', iii: 'Bbm', vi: 'Ebm', dim: 'Fdim', fact: 'The "Perfect Balance." Gb/F# Major is exactly halfway around our musical clock. It uses 6 flats (or 6 sharps), creating a perfectly symmetrical key.' },
  { note: 'Db', major: 'Db', signature: '5♭', ii: 'Ebm', iii: 'Fm', vi: 'Bbm', dim: 'Cdim', fact: 'Velvet-smooth! Db Major is famous for being very soft, sweet, and dreamy. Composers use it for romantic and introspective pieces.' },
  { note: 'Ab', major: 'Ab', signature: '4♭', ii: 'Bbm', iii: 'Cm', vi: 'Fm', dim: 'Gdim', fact: 'The "Rich and Royal" key. Ab Major feels very deep and colorful, like a sunset. Jazz musicians love its sophisticated, mellow sound.' },
  { note: 'Eb', major: 'Eb', signature: '3♭', ii: 'Fm', iii: 'Gm', vi: 'Cm', dim: 'Ddim', fact: 'The "Regal Trumpet" key. Eb Major sounds very grand and is often used for brass instruments. Symphony composers use it for noble, majestic themes.' },
  { note: 'Bb', major: 'Bb', signature: '2♭', ii: 'Cm', iii: 'Dm', vi: 'Gm', dim: 'Adim', fact: 'Smooth and Jazzy. Bb Major is perfect for brass instruments like trumpets and saxophones. It\'s the most common key in jazz and blues music.' },
  { note: 'F', major: 'F', signature: '1♭', ii: 'Gm', iii: 'Am', vi: 'Dm', dim: 'Edim', fact: 'Simple and Sweet. F Major has only one flat (Bb), so it\'s one of the easiest keys to learn! It sounds pastoral and pleasant.' }
];

const selectedKeyIdx = ref<number | null>( null );
const selectedType = ref<'major' | 'minor' | 'dim' | 'ii' | 'iii' | 'vi'>( 'major' );
const isFifthsMode = ref( true );

export function useHarmonicOrbit() {
  
  const activeKeys = computed( () => {
    return isFifthsMode.value ? FIFTHS_KEYS : [...FIFTHS_KEYS].reverse();
  } );

  const selectedKey = computed(() => {
    if (selectedKeyIdx.value === null) return null;
    return activeKeys.value[selectedKeyIdx.value] || null;
  });

  const setSelectedKeyIdx = (idx: number | null) => {
    selectedKeyIdx.value = idx;
  };

  const setSelectedType = (type: 'major' | 'minor' | 'dim' | 'ii' | 'iii' | 'vi') => {
    selectedType.value = type;
  };

  const toggleMode = () => {
    isFifthsMode.value = !isFifthsMode.value;
  };

  return {
    selectedKeyIdx,
    selectedType,
    isFifthsMode,
    activeKeys,
    selectedKey,
    setSelectedKeyIdx,
    setSelectedType,
    toggleMode
  };
}
