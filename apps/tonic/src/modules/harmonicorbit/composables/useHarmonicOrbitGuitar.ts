/**
 * Global state manager for the Harmonic Orbit Guitar features.
 * 
 * We keep the complex logic hidden inside here,
 * so the visual components only have to worry about drawing the fretboard pops!
 * Educational pattern: "Manager Hook" 
 * 
 * @module modules/harmonicorbit/composables/useHarmonicOrbitGuitar.ts
 */

import { ref, computed } from 'vue';
import { Chord, Note } from 'tonal';

// Mode toggle: CAGED block shapes vs Voice Leading (nearest neighbor)
const displayMode = ref<'CAGED' | 'VOICE_LED'>('CAGED');

// Which of the 5 overlapping Fretboard Zones is currently active
const activeCagedZone = ref<number>(1);

// The anchor point for Voice Leading calculations
// We set this when the user clicks their FIRST chord in Voice Leading mode.
const anchorFret = ref<number>(3); 

export interface ToggledChord {
  name: string;
  color: string;
}

// Multi-chord toggles
const toggledChords = ref<ToggledChord[]>([]);

export function useHarmonicOrbitGuitar() {
  
  /**
   * Returns the exact FretRange and highlight notes for the Fretboard component
   * 
   * @param chordName The name of the chord to lookup (e.g. 'G', 'Am')
   */
  const getVoicingForChord = (chordName: string) => {
    // Clean up "G Major" -> "G", "Am" -> "Am"
    let cleaned = chordName.replace(/ Major$/i, '').replace(/ Minor$/i, 'm');
    
    // Tonal expects 'm' for minor, 'dim' for diminished
    // Example: Dm is detected correctly. Cdim is detected correctly.
    
    const chordInfo = Chord.get(cleaned);
    
    // The Fretboard component's `highlightNotes` prop takes an array of note names!
    // Example: ['G', 'B', 'D']
    const notesToHighlight = chordInfo.notes.length > 0 ? chordInfo.notes : ['C', 'E', 'G']; 
    
    let fretRange: [number, number];
    
    if (displayMode.value === 'CAGED') {
      // Return a strict overlapping 4-fret block based on the selected Zone
      switch(activeCagedZone.value) {
        case 1: fretRange = [0, 4]; break;   // Open/Low
        case 2: fretRange = [3, 7]; break;   // Low-Mid
        case 3: fretRange = [5, 9]; break;   // Mid
        case 4: fretRange = [7, 11]; break;  // Mid-High
        case 5: fretRange = [9, 13]; break;  // High
        default: fretRange = [0, 4];
      }
    } else {
      // VOICE_LED Mode (Nearest Neighbor)
      // We lock the fretRange strictly around the anchor. This limits the notes 
      // displayed *only* to that narrow 4-fret proximity. Visually enforcing Voice Leading!
      fretRange = [Math.max(0, anchorFret.value - 1), anchorFret.value + 3] as [number, number];
    }
    
    return {
      fretRange,
      highlightNotes: notesToHighlight
    };
  };

  const setAnchorFret = (fret: number) => {
    anchorFret.value = fret;
  };

  const toggleMode = () => {
    displayMode.value = displayMode.value === 'CAGED' ? 'VOICE_LED' : 'CAGED';
  };

  const toggleChord = (chordName: string, color: string) => {
    const idx = toggledChords.value.findIndex(c => c.name === chordName);
    if (idx !== -1) {
      toggledChords.value.splice(idx, 1);
    } else {
      toggledChords.value.push({ name: chordName, color });
    }
  };

  const isChordToggled = (chordName: string) => {
    return toggledChords.value.some(c => c.name === chordName);
  };

  const clearToggledChords = () => {
    toggledChords.value = [];
  };

  const multiVoicing = computed(() => {
    const notes: string[] = [];
    const colorMap: Record<number, string> = {};
    
    for (const chord of toggledChords.value) {
      let cleaned = chord.name.replace(/ Major$/i, '').replace(/ Minor$/i, 'm');
      const chordInfo = Chord.get(cleaned);
      const chordNotes = chordInfo.notes.length > 0 ? chordInfo.notes : ['C', 'E', 'G'];
      
      notes.push(...chordNotes);
      
      for (const note of chordNotes) {
        const chroma = Note.chroma(note);
        if (chroma !== undefined) {
          colorMap[chroma] = chord.color;
        }
      }
    }
    
    let fretRange: [number, number];
    if (displayMode.value === 'CAGED') {
      switch(activeCagedZone.value) {
        case 1: fretRange = [0, 4]; break;
        case 2: fretRange = [3, 7]; break;
        case 3: fretRange = [5, 9]; break;
        case 4: fretRange = [7, 11]; break;
        case 5: fretRange = [9, 13]; break;
        default: fretRange = [0, 4];
      }
    } else {
      fretRange = [Math.max(0, anchorFret.value - 1), anchorFret.value + 3] as [number, number];
    }
    
    return {
      fretRange,
      highlightNotes: Array.from(new Set(notes)),
      highlightColorMap: colorMap
    };
  });

  return {
    displayMode,
    activeCagedZone,
    anchorFret,
    toggledChords,
    multiVoicing,
    getVoicingForChord,
    setAnchorFret,
    toggleMode,
    toggleChord,
    isChordToggled,
    clearToggledChords
  };
}
