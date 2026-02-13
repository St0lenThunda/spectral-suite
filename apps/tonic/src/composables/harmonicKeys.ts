/**
 * Harmonic Keys — Provide/Inject Symbols
 *
 * This file defines the "keys" (think of them as labels) that Vue's
 * provide/inject system uses to pass data between ancestor and descendant
 * components WITHOUT having to thread props through every layer.
 *
 * Why provide/inject instead of props?
 * ------------------------------------
 * The Tonnetz preview lives deep inside the Orbit's template. Instead of
 * drilling `selectedKeyIdx`, `selectedType`, and `activeKeys` through
 * 3+ layers of component props, we "provide" them once at the top and
 * any descendant can "inject" them directly.
 *
 * How InjectionKey works:
 * -----------------------
 * `InjectionKey<T>` is a TypeScript generic type from Vue. The `T` tells
 * TypeScript what *shape* the provided value will have. The actual key
 * is just a `Symbol()` — a guaranteed-unique JavaScript value that acts
 * as a dictionary key.
 *
 * @module composables/harmonicKeys
 */

import type { InjectionKey, Ref } from 'vue';

// ─── TYPES ──────────────────────────────────────────────────────────

/**
 * Describes one of the 12 keys in the Circle of Fifths.
 * Each key has its note name, major label, key signature,
 * and all the diatonic chord labels (ii, iii, vi, dim).
 *
 * Used by both the Harmonic Orbit and the Tonnetz to identify keys.
 */
export interface FifthsKeyEntry {
  /** The root note name, e.g. 'C', 'G', 'Db' */
  note: string;

  /** The major chord name, e.g. 'C', 'G', 'Db' */
  major: string;

  /** Key signature label, e.g. '0', '1♯', '3♭' */
  signature: string;

  /** Supertonic (2nd degree) minor chord, e.g. 'Dm' */
  ii: string;

  /** Mediant (3rd degree) minor chord, e.g. 'Em' */
  iii: string;

  /** Submediant (6th degree / relative minor) chord, e.g. 'Am' */
  vi: string;

  /** Leading tone (7th degree) diminished chord, e.g. 'Bdim' */
  dim: string;

  /** Educational fact about this key's character */
  fact: string;
}

/**
 * The shape of the harmonic selection state that gets provided/injected.
 *
 * Any component that `provide()`s this interface makes its current
 * harmonic selection available to all descendants that `inject()` it.
 */
export interface HarmonicSelectionState {
  /** Index (0-11) of the currently selected key, or null if none */
  selectedKeyIdx: Ref<number | null>;

  /** What type of chord is selected within that key */
  selectedType: Ref<'major' | 'minor' | 'dim' | 'ii' | 'iii' | 'vi'>;

  /** The ordered array of 12 keys (changes when toggling Fifths/Fourths) */
  activeKeys: Ref<FifthsKeyEntry[]>;

  /** The note names of the currently playing/selected triad */
  currentTriadNotes: Ref<string[]>;
}

/**
 * The shape of the navigation callback provided by the Orbit module.
 * The mini Tonnetz preview calls this to navigate to the full tool.
 */
export interface HarmonicNavigationState {
  /** Call this to navigate from the mini preview to the full Tonnetz module */
  navigateToTonnetz: () => void;
}

// ─── INJECTION KEYS ─────────────────────────────────────────────────

/**
 * Injection key for the harmonic selection state.
 *
 * Usage:
 *   Provider (parent):   provide( HARMONIC_SELECTION_KEY, { selectedKeyIdx, ... } )
 *   Consumer (child):    const state = inject( HARMONIC_SELECTION_KEY )
 *
 * The `Symbol('...')` ensures this key is globally unique — even if
 * another file accidentally uses the same string, the Symbol won't collide.
 */
export const HARMONIC_SELECTION_KEY: InjectionKey<HarmonicSelectionState> =
  Symbol( 'harmonic-selection' );

/**
 * Injection key for navigation callbacks.
 *
 * Used by the TonnetzPreview to trigger navigation to the full Tonnetz module.
 * The parent Orbit module provides a function that emits the navigation event.
 */
export const HARMONIC_NAVIGATE_KEY: InjectionKey<HarmonicNavigationState> =
  Symbol( 'harmonic-navigate' );
