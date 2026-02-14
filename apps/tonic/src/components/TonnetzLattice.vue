<script setup lang="ts">
/**
 * TonnetzLattice — Shared SVG Tonnetz Renderer
 *
 * Draws a hexagonal Tonnetz lattice where:
 *   - Moving RIGHT  = +7 semitones (Perfect 5th)
 *   - Moving UP-RIGHT = +4 semitones (Major 3rd)
 *   - Moving DOWN-RIGHT = +3 semitones (minor 3rd)
 *
 * Triangles formed by 3 adjacent nodes represent triads:
 *   - Upward-pointing triangles (▲) = Major triads (root + M3 + P5)
 *   - Downward-pointing triangles (▼) = Minor triads (root + m3 + P5)
 *
 * This component is used at two sizes:
 *   - Mini (280×180, visibleRadius=1) inside the Orbit's right panel
 *   - Full (600×400, visibleRadius=3) in the standalone Tonnetz module
 *
 * @module components/TonnetzLattice
 */

import { computed, ref, watch, nextTick, onMounted } from 'vue';
import { useHarmonicTheory } from '../composables/useHarmonicTheory';
import type { TonnetzPoint } from '@spectralsuite/core';

const { pitchClassName, pitchClassIndex } = useHarmonicTheory();

// ─── PROPS ──────────────────────────────────────────────────────────

const props = withDefaults( defineProps<{
  /** SVG viewport width in pixels */
  width?: number;

  /** SVG viewport height in pixels */
  height?: number;

  /** The pitch class name at the center of the lattice (e.g. 'C') */
  centerNote?: string;

  /**
   * How many rings of neighbors to show around the center.
   * 1 = immediate neighbors only (mini preview)
   * 2-3 = full lattice (standalone tool)
   */
  visibleRadius?: number;

  /** Whether nodes are clickable. False = passive display (mini preview) */
  interactive?: boolean;

  /** Pitch class names to highlight as a triad triangle (e.g. ['C', 'E', 'G']) */
  highlightTriad?: string[];

  /** Pitch class names to highlight as suggestions (e.g. ['G', 'F', 'Am']) */
  suggestedNotes?: string[];

  /** Show P, L, R Neo-Riemannian transform labels on triangle edges */
  showTransformLabels?: boolean;

  /** The harmonic path to visualize on the lattice */
  path?: TonnetzPoint[];

  /** Optional comparison path (e.g., from a matched song) */
  comparisonPath?: TonnetzPoint[];
}>(), {
  width: 600,
  height: 400,
  centerNote: 'C',
  visibleRadius: 2,
  interactive: true,
  highlightTriad: () => [],
  suggestedNotes: () => [],
  showTransformLabels: false,
  path: () => [],
  comparisonPath: () => []
} );

// ─── EMITS ──────────────────────────────────────────────────────────

const emit = defineEmits<{
  /** Fired when a node is clicked (only when interactive=true) */
  ( e: 'select-note', note: string ): void;

  /** Fired when a triad triangle is clicked (only when interactive=true) */
  ( e: 'select-triad', notes: string[], type: 'major' | 'minor' ): void;
}>();

// ─── LATTICE GEOMETRY ───────────────────────────────────────────────

/**
 * Spacing between nodes on the lattice grid.
 *
 * The Tonnetz is a triangular lattice, meaning nodes are arranged in
 * rows. Each row is offset horizontally by half the column spacing.
 * Think of it like a honeycomb pattern.
 *
 * COL_SPACING = horizontal distance between adjacent nodes in the same row
 * ROW_SPACING = vertical distance between rows
 */
const COL_SPACING = 70;

/**
 * Row spacing uses the equilateral triangle height formula:
 *   height = side × sin(60°) = side × (√3 / 2) ≈ side × 0.866
 *
 * This ensures the lattice forms perfect equilateral triangles,
 * which is what makes the Tonnetz work musically.
 */
const ROW_SPACING = COL_SPACING * Math.sin( Math.PI / 3 ); // ≈ 60.62

// ─── ANIMATION STATE ────────────────────────────────────────────────

/**
 * The currently hovered node name for hover animation effects.
 * null = no node is hovered.
 */
const hoveredNode = ref<string | null>( null );

/**
 * Tracks the node name that was most recently selected,
 * used to trigger the "pop" selection animation.
 */
const selectedAnimNode = ref<string | null>( null );

/**
 * Counter that increments on each selection to trigger
 * CSS animation restarts (Vue keys off this value).
 */
const animationKey = ref( 0 );

// ─── NODE GENERATION ────────────────────────────────────────────────

/**
 * Represents a single node on the Tonnetz lattice.
 *
 * Each node has a pitch class name, an (x, y) position for SVG,
 * and its row/column indices for triangle detection.
 */
interface TonnetzNode {
  /** Pitch class name, e.g. 'C', 'E', 'Ab' */
  name: string;

  /** SVG X coordinate (center of the node circle) */
  x: number;

  /** SVG Y coordinate (center of the node circle) */
  y: number;

  /** Row index in the lattice grid (0 = top) */
  row: number;

  /** Column index in the lattice grid (0 = left) */
  col: number;

  /** Pitch class index (0-11) for music theory calculations */
  pc: number;
}

/**
 * Generates all visible nodes on the Tonnetz lattice.
 *
 * The lattice axes work like this:
 *   - Each ROW shift changes pitch by +3 semitones (minor 3rd going down)
 *   - Each COLUMN shift changes pitch by +7 semitones (perfect 5th going right)
 *   - The combination of row+col creates the major 3rd axis diagonally
 *
 * We generate a grid centered on `centerNote` and extend `visibleRadius`
 * rows/columns in each direction.
 */
const nodes = computed<TonnetzNode[]>( () => {
  const result: TonnetzNode[] = [];
  const centerPc = pitchClassIndex( props.centerNote );

  // Center of the SVG viewport
  const cx = props.width / 2;
  const cy = props.height / 2;

  const radius = props.visibleRadius;

  // Generate a grid of nodes around the center
  for ( let row = -radius; row <= radius; row++ ) {
    for ( let col = -radius; col <= radius; col++ ) {
      /**
       * Calculate the pitch class at this grid position.
       *
       * The magic formula: centerPc + (col × 7) + (row × 3)
       *   - col × 7: each column right = up a Perfect 5th (7 semitones)
       *   - row × 3: each row down = up a minor 3rd (3 semitones)
       *
       * Combined, the diagonal (col+1, row-1) = +7 -3 = +4 semitones = Major 3rd
       * This is what makes the Tonnetz encode three interval axes simultaneously!
       */
      const pc = ( ( centerPc + col * 7 + row * 3 ) % 12 + 12 ) % 12;

      /**
       * Position calculation:
       * - X: column position + half-column offset for odd rows (honeycomb stagger)
       * - Y: row position
       *
       * The `row * 0.5` offset in X creates the triangular grid pattern
       * (each row is shifted half a column width from the previous one)
       */
      const x = cx + ( col * COL_SPACING ) + ( row * COL_SPACING * 0.5 );
      const y = cy + ( row * ROW_SPACING );

      result.push( {
        name: pitchClassName( pc ),
        x,
        y,
        row: row + radius,  // Normalize to 0-based
        col: col + radius,  // Normalize to 0-based
        pc
      } );
    }
  }

  return result;
} );

// ─── TRIANGLE DETECTION ─────────────────────────────────────────────

/**
 * Represents a triangle formed by 3 adjacent nodes on the Tonnetz.
 *
 * Musically, each triangle IS a triad:
 *   - Upward triangles (▲) = Major triads
 *   - Downward triangles (▼) = Minor triads
 */
interface TonnetzTriangle {
  /** The three pitch class names forming this triad */
  notes: string[];

  /** SVG coordinates of the three vertices */
  points: Array<{ x: number; y: number }>;

  /** Whether this is a major (up) or minor (down) triangle */
  type: 'major' | 'minor';

  /** Whether this triangle matches the highlighted triad */
  isHighlighted: boolean;
}

/**
 * Generates all visible triangles from the node grid.
 *
 * On a triangular lattice, every set of 3 mutually adjacent nodes
 * forms a triangle. There are two orientations:
 *
 *   ▲ (Upward): node, node+1 in same row, node below-right
 *      → root (bottom-left), major 3rd (top), perfect 5th (bottom-right)
 *      → This spells a MAJOR triad
 *
 *   ▼ (Downward): node, node+1 in same row, node above-right
 *      → root (top-left), minor 3rd (bottom), perfect 5th (top-right)
 *      → This spells a MINOR triad
 */
const triangles = computed<TonnetzTriangle[]>( () => {
  const result: TonnetzTriangle[] = [];
  const nodeMap = new Map<string, TonnetzNode>();

  // Build a lookup map keyed by "row,col" for fast neighbor access
  for ( const node of nodes.value ) {
    nodeMap.set( `${node.row},${node.col}`, node );
  }

  const radius = props.visibleRadius;
  const gridSize = radius * 2 + 1; // Total rows/cols in the grid

  // Normalize the highlight triad for comparison
  const highlightSet = new Set( props.highlightTriad );

  for ( let row = 0; row < gridSize; row++ ) {
    for ( let col = 0; col < gridSize - 1; col++ ) {
      const a = nodeMap.get( `${row},${col}` );
      const b = nodeMap.get( `${row},${col + 1}` );

      // ▼ Downward triangle: current row nodes + node below-right
      const cDown = nodeMap.get( `${row + 1},${col}` );
      if ( a && b && cDown ) {
        const notes = [a.name, b.name, cDown.name];
        const isHighlighted = notes.every( n => highlightSet.has( n ) );
        result.push( {
          notes,
          points: [{ x: a.x, y: a.y }, { x: b.x, y: b.y }, { x: cDown.x, y: cDown.y }],
          type: 'minor',
          isHighlighted
        } );
      }

      // ▲ Upward triangle: current row nodes + node above-right
      const cUp = nodeMap.get( `${row - 1},${col + 1}` );
      if ( a && b && cUp ) {
        const notes = [a.name, b.name, cUp.name];
        const isHighlighted = notes.every( n => highlightSet.has( n ) );
        result.push( {
          notes,
          points: [{ x: a.x, y: a.y }, { x: b.x, y: b.y }, { x: cUp.x, y: cUp.y }],
          type: 'major',
          isHighlighted
        } );
      }
    }
  }

  return result;
} );

// ─── INTERACTION HANDLERS ───────────────────────────────────────────

/**
 * Handles clicking a node on the lattice.
 * Only fires when `interactive` is true.
 *
 * @param note - The pitch class name of the clicked node
 */
const handleNodeClick = ( note: string ) => {
  if ( !props.interactive ) return;

  // Trigger "pop" animation by bumping the animation key
  selectedAnimNode.value = note;
  animationKey.value++;

  emit( 'select-note', note );
};

/**
 * Handles clicking a triangle (triad) on the lattice.
 * This allows selecting both Major and Minor chords directly.
 * 
 * @param notes - The pitch class names of the triad
 * @param type - Whether it's a major or minor triangle
 */
const handleTriadClick = ( notes: string[], type: 'major' | 'minor' ) => {
  if ( !props.interactive ) return;
  emit( 'select-triad', notes, type );
};

// ─── SVG HELPERS ────────────────────────────────────────────────────

/**
 * Converts a triangle's points to an SVG polygon "points" attribute string.
 * Format: "x1,y1 x2,y2 x3,y3"
 */
const trianglePointsStr = ( tri: TonnetzTriangle ): string => {
  return tri.points.map( p => `${p.x},${p.y}` ).join( ' ' );
};

/**
 * Determines the fill color for a node based on whether it's
 * part of the highlighted triad, hovered, or default.
 *
 * @param name - The pitch class name of the node
 * @returns CSS fill color string
 */
const getNodeFill = ( name: string ): string => {
  const isHighlighted = props.highlightTriad.includes( name );
  const isSuggested = props.suggestedNotes?.includes( name );
  const isHovered = hoveredNode.value === name;

  if ( isHighlighted ) return '#818cf8'; // Indigo-400 (bright, selected)
  if ( isSuggested ) return 'rgba(167, 139, 250, 0.4)'; // Violet-400 (softer glow)
  if ( isHovered ) return 'rgba(129, 140, 248, 0.6)'; // Indigo-400 at 60%
  return 'rgba(255, 255, 255, 0.15)'; // Subtle default
};

/**
 * Returns the node circle radius, enlarged for highlighted or hovered states.
 *
 * @param name - The pitch class name of the node
 * @returns Radius in pixels
 */
const getNodeRadius = ( name: string ): number => {
  const isHighlighted = props.highlightTriad.includes( name );
  const isSuggested = props.suggestedNotes?.includes( name );
  if ( isHighlighted ) return 18;
  if ( isSuggested ) return 15;
  if ( hoveredNode.value === name ) return 16;
  return 13;
};

// ─── FLIP + RIPPLE WAVE ANIMATION ───────────────────────────────────

/**
 * FLIP = First, Last, Invert, Play.
 *
 * When the lattice re-centers on a new note, we:
 *   1. FIRST:  Remember where every node WAS (old positions)
 *   2. LAST:   Let Vue calculate where every node WILL BE (new positions)
 *   3. INVERT: Apply a CSS translate() that puts each node back at its old spot
 *   4. PLAY:   Remove the translate with a smooth transition → nodes slide to new spots
 *
 * The "Ripple" part: nodes closer to the center get a shorter transition-delay,
 * while nodes farther out get a longer delay. This creates a wave effect that
 * radiates outward from the new center, like dropping a stone in water.
 */

/**
 * Non-reactive snapshot of node positions from the PREVIOUS center.
 * We keep this as a plain JS variable (not ref) so it doesn't update
 * reactively — we control WHEN it updates manually.
 *
 * Keyed by pitch class name → array of positions (because the same
 * pitch class can appear at multiple grid positions on the Tonnetz).
 */
let prevSnapshot: Map<string, Array<{ x: number; y: number }>> = new Map();

/**
 * Whether a FLIP animation is currently playing.
 * While true, grid lines and triangles fade out so the sliding nodes
 * are the visual focus.
 */
const isFlipping = ref( false );

/**
 * Per-node inline styles that drive the FLIP animation.
 * Keyed by the unique node key ("name-row-col").
 *
 * During INVERT phase: { transform: 'translate(dx, dy)', transition: 'none' }
 * During PLAY phase:   { transform: 'translate(0, 0)', transition: '...' }
 */
const flipStyles = ref<Record<string, Record<string, string>>>( {} );

/**
 * Generates a unique key for a node by combining its name and grid position.
 * This must match the :key used in the v-for template below.
 *
 * @param node - The TonnetzNode to key
 * @returns A unique string like "C-2-2"
 */
const nodeKey = ( node: TonnetzNode ): string =>
  `${node.name}-${node.row}-${node.col}`;

/**
 * Returns the current FLIP inline style for a node, or empty object if
 * no animation is active. Used as :style binding in the template.
 *
 * @param node - The node to get the style for
 * @returns CSS style object (transform, transition, opacity)
 */
const getFlipStyle = ( node: TonnetzNode ): Record<string, string> => {
  if ( !isFlipping.value ) return {};
  return flipStyles.value[nodeKey( node )] || {};
};

/**
 * Takes a snapshot of where every node currently is.
 * Called once on mount, and again after each FLIP animation completes.
 */
const snapshotPositions = () => {
  prevSnapshot = new Map();
  for ( const node of nodes.value ) {
    if ( !prevSnapshot.has( node.name ) ) {
      prevSnapshot.set( node.name, [] );
    }
    prevSnapshot.get( node.name )!.push( { x: node.x, y: node.y } );
  }
};

// Take the initial snapshot once the component mounts
onMounted( () => snapshotPositions() );

/**
 * The main FLIP + Ripple animation, triggered whenever centerNote changes.
 *
 * Flow:
 *   1. nodes.value already has NEW positions (Vue recomputed them)
 *   2. prevSnapshot still has OLD positions (plain JS, not reactive)
 *   3. For each new node, find the closest old position of the same pitch class
 *   4. Apply inverse translate → nodes visually "stay" at old positions
 *   5. Next frame: transition to translate(0,0) with staggered delay → ripple wave
 */
watch( () => props.centerNote, async ( newVal, oldVal ) => {
  // Skip if not interactive (mini preview doesn't re-center)
  // or if this is the initial render (oldVal undefined)
  if ( !oldVal || newVal === oldVal || !props.interactive ) return;

  // === PHASE 1: INVERT ===
  // Calculate how far each node needs to "travel back" to its old position
  const cx = props.width / 2;
  const cy = props.height / 2;
  const styles: Record<string, Record<string, string>> = {};
  const distances: Record<string, number> = {};

  for ( const node of nodes.value ) {
    const key = nodeKey( node );
    const oldPositions = prevSnapshot.get( node.name );

    if ( oldPositions && oldPositions.length > 0 ) {
      // Find the closest old position for this pitch class.
      // (Multiple instances of 'C' may exist on the grid — pick the nearest one
      //  so the slide distance is minimal and looks natural.)
      let bestOld = oldPositions[0]!;
      let bestDist = Infinity;
      for ( const op of oldPositions ) {
        const d = Math.sqrt( ( op.x - node.x ) ** 2 + ( op.y - node.y ) ** 2 );
        if ( d < bestDist ) {
          bestDist = d;
          bestOld = op;
        }
      }

      // The delta: how far to translate BACK to reach the old position
      const dx = bestOld.x - node.x;
      const dy = bestOld.y - node.y;

      // Distance from the new center — used for ripple stagger delay
      const distFromCenter = Math.sqrt(
        ( node.x - cx ) ** 2 + ( node.y - cy ) ** 2
      );

      styles[key] = {
        transform: `translate(${dx}px, ${dy}px)`,
        transition: 'none',
        opacity: '1'
      };
      distances[key] = distFromCenter;
    } else {
      // This pitch class wasn't on the old grid — it's a new node entering.
      // Start it scaled down and invisible, then pop it in.
      styles[key] = {
        transform: 'scale(0.5)',
        transition: 'none',
        opacity: '0'
      };
      distances[key] = Math.sqrt(
        ( node.x - cx ) ** 2 + ( node.y - cy ) ** 2
      );
    }
  }

  // Apply the inverse transforms and hide grid/triangles
  isFlipping.value = true;
  flipStyles.value = styles;

  // Wait for Vue to apply the inverse transforms to the DOM
  await nextTick();

  // === PHASE 2: PLAY ===
  // On the next animation frame, switch to identity transforms with transitions.
  // The browser sees the transform change from translate(dx,dy) → translate(0,0)
  // and animates it smoothly. The staggered delay creates the ripple wave.
  requestAnimationFrame( () => {
    const maxDist = Math.max( props.width, props.height ) * 0.6;
    const playStyles: Record<string, Record<string, string>> = {};

    for ( const node of nodes.value ) {
      const key = nodeKey( node );
      const dist = distances[key] ?? 0;

      // Ripple delay: center nodes move first (0ms), edge nodes last (~150ms)
      const delay = Math.round( ( dist / maxDist ) * 150 );

      playStyles[key] = {
        // cubic-bezier(0.22, 1, 0.36, 1) is a smooth "ease-out" with slight overshoot
        transform: 'translate(0, 0) scale(1)',
        transition: `transform 0.45s cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms, `
          + `opacity 0.3s ease ${delay}ms`,
        opacity: '1'
      };
    }

    flipStyles.value = playStyles;

    // Clean up after all nodes have finished animating
    // (450ms animation + 150ms max delay + 50ms buffer = 650ms)
    setTimeout( () => {
      isFlipping.value = false;
      flipStyles.value = {};
      snapshotPositions(); // Cache new positions for next flip
    }, 650 );
  } );
} );
// ─── PATH RENDERING ─────────────────────────────────────────────────

/**
 * Converts the abstract harmonic path into SVG polyline coordinates.
 * We start from the end of the path (assumed to be near the center)
 * and walk backwards, unwrapping the toroidal coordinates to find
 * valid visual neighbors.
 */
/**
 * TOROIDAL UNWRAP (Helper)
 * Finds the visually shortest path between an array of TonnetzPoints
 * on a 3x4 toroidal grid.
 *
 * @param path - The sequence of points to unwrap
 */
function unwrapPath ( path: TonnetzPoint[] ) {
  if ( path.length < 2 ) return [];

  const visualPoints: { x: number; y: number }[] = [];
  const start = path[path.length - 1]!;

  // Starting visual position (Center of lattice)
  const cx = props.width / 2;
  const cy = props.height / 2;

  visualPoints.push( { x: cx, y: cy } );

  let walkerCol = 0;
  let walkerRow = 0;

  for ( let i = path.length - 1; i > 0; i-- ) {
    const curr = path[i]!;
    const prev = path[i - 1]!;

    // Raw delta in Mapper coordinates
    const dX = prev.x - curr.x;
    const dY = prev.y - curr.y;

    /**
     * TOROIDAL UNWRAP (Pitch-Preserving)
     * On our (3x4) Tonnetz torus, shifting by the basis cycle vectors
     * preserves the pitch class mod 12:
     * V1 = (3, 1)  -> 3*7 + 1*3 = 24 = 0 mod 12
     * V2 = (0, 4)  -> 0*7 + 4*3 = 12 = 0 mod 12
     *
     * We search for n, m in {-1, 0, 1} to find the shortest visual path
     * that reaches the SAME pitch class.
     */
    let bestDX = dX;
    let bestDY = dY;
    let minDist = Infinity;

    for ( let n = -1; n <= 1; n++ ) {
      for ( let m = -1; m <= 1; m++ ) {
        // Apply wrap vectors
        const candidateDX = dX + ( n * 3 );
        const candidateDY = dY + ( n * 1 ) + ( m * 4 );

        // Visual distance check (accounting for skewed grid x = col + row*0.5)
        const visualX = candidateDX * COL_SPACING + candidateDY * COL_SPACING * 0.5;
        const visualY = candidateDY * ROW_SPACING;
        const dist = Math.sqrt( visualX * visualX + visualY * visualY );

        if ( dist < minDist ) {
          minDist = dist;
          bestDX = candidateDX;
          bestDY = candidateDY;
        }
      }
    }

    walkerCol += bestDX;
    walkerRow += bestDY;

    const px = cx + ( walkerCol * COL_SPACING ) + ( walkerRow * COL_SPACING * 0.5 );
    const py = cy + ( walkerRow * ROW_SPACING );

    visualPoints.push( { x: px, y: py } );
  }
  return visualPoints;
}

const pathPoints = computed( () => unwrapPath( props.path ) );
const comparisonPathPoints = computed( () => unwrapPath( props.comparisonPath || [] ) );
</script>

<template>
  <!--
    The main SVG container for the Tonnetz lattice.
    preserveAspectRatio="xMidYMid meet" keeps it centered and scaled.
  -->
  <svg
    :viewBox="`0 0 ${width} ${height}`"
    :width="width"
    class="tonnetz-lattice select-none"
    :class="{ 'is-flipping': isFlipping }"
    preserveAspectRatio="xMidYMid meet"
  >
    <!-- SVG Filters for glow effects -->
    <defs>
      <!--
        Gaussian blur filter for the "glow" effect.
        Applied to highlighted nodes and triangles.
        stdDeviation controls how wide/soft the glow is.
      -->
      <filter
        id="tonnetz-glow"
        x="-50%"
        y="-50%"
        width="200%"
        height="200%"
      >
        <feGaussianBlur
          stdDeviation="4"
          result="blur"
        />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      <!-- Stronger glow for selected/highlighted elements -->
      <filter
        id="tonnetz-glow-strong"
        x="-50%"
        y="-50%"
        width="200%"
        height="200%"
      >
        <feGaussianBlur
          stdDeviation="8"
          result="blur"
        />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      <!-- Ripple animation (expanding ring on selection) -->
      <radialGradient id="ripple-gradient">
        <stop
          offset="0%"
          stop-color="rgba(129, 140, 248, 0.4)"
        />
        <stop
          offset="100%"
          stop-color="rgba(129, 140, 248, 0)"
        />
      </radialGradient>
    </defs>

    <!--
      LAYER 1: Grid Lines (faint connecting edges)
      These show the structural relationships between nodes.
      Drawn first so they appear BEHIND everything else.
    -->
    <g
      class="tonnetz-edges"
      opacity="0.15"
    >
      <template
        v-for=" ( tri, i ) in triangles "
        :key="'edge-' + i"
      >
        <line
          :x1="tri.points[0]!.x"
          :y1="tri.points[0]!.y"
          :x2="tri.points[1]!.x"
          :y2="tri.points[1]!.y"
          stroke="white"
          stroke-width="1"
        />
        <line
          :x1="tri.points[1]!.x"
          :y1="tri.points[1]!.y"
          :x2="tri.points[2]!.x"
          :y2="tri.points[2]!.y"
          stroke="white"
          stroke-width="1"
        />
        <line
          :x1="tri.points[2]!.x"
          :y1="tri.points[2]!.y"
          :x2="tri.points[0]!.x"
          :y2="tri.points[0]!.y"
          stroke="white"
          stroke-width="1"
        />
      </template>
    </g>

    <!--
      LAYER 2: Highlighted Triangle Fill
      When a triad is highlighted, its triangle gets a filled polygon
      with a glow effect and animated edges.
    -->
    <g class="tonnetz-triangles">
      <template
        v-for=" ( tri, i ) in triangles "
        :key="'tri-' + i"
      >
        <!-- Background interactive triangle area (Hit area) -->
        <polygon
          :points="trianglePointsStr( tri )"
          class="tonnetz-triangle-hit-area"
          :class="{ 'is-interactive': interactive }"
          @click="handleTriadClick( tri.notes, tri.type )"
        />

        <polygon
          v-if=" tri.isHighlighted "
          :points="trianglePointsStr( tri )"
          class="tonnetz-triangle-highlight"
          :class="{ 'is-major': tri.type === 'major', 'is-minor': tri.type === 'minor' }"
          filter="url(#tonnetz-glow-strong)"
        />

        <!--
          Animated edge draw-on for highlighted triangles.
          Uses stroke-dasharray/dashoffset to create a
          "drawing" animation when the triad is selected.
        -->
        <polygon
          v-if=" tri.isHighlighted "
          :points="trianglePointsStr( tri )"
          class="tonnetz-triangle-edge"
          :key="'edge-anim-' + animationKey"
        />
      </template>
    </g>

    <!--
      LAYER 2.5: Harmonic Path
      Visualizes the user's journey through the Tonnetz.
    -->
    <g class="tonnetz-path">
      <!-- User Progression Path -->
      <polyline
        v-if=" pathPoints.length > 0 "
        :points="pathPoints.map( p => `${p.x},${p.y}` ).join( ' ' )"
        fill="none"
        stroke="white"
        stroke-width="3"
        stroke-dasharray="1 6"
        stroke-linecap="round"
        class="drop-shadow-lg opacity-40 animate-in fade-in duration-700"
      />

      <!-- Comparison Path (Matched Song) -->
      <polyline
        v-if=" comparisonPathPoints.length > 0 "
        :points="comparisonPathPoints.map( p => `${p.x},${p.y}` ).join( ' ' )"
        fill="none"
        stroke="#10b981"
        stroke-width="4"
        stroke-dasharray="4 8"
        stroke-linecap="round"
        class="drop-shadow-[0_0_8px_rgba(16,185,129,0.5)] opacity-60 animate-in fade-in slide-in-from-top-4 duration-500"
      />
    </g>

    <!--
      LAYER 3: Nodes ...
    -->
    <g class="tonnetz-nodes">
      <g
        v-for=" node in nodes "
        :key="node.name + '-' + node.row + '-' + node.col"
        class="tonnetz-node-group"
        :class="{
          'is-highlighted': highlightTriad.includes( node.name ),
          'is-hovered': hoveredNode === node.name,
          'is-interactive': interactive,
          'is-selected-anim': selectedAnimNode === node.name
        }"
        :style="getFlipStyle( node )"
        @mouseenter="hoveredNode = node.name"
        @mouseleave="hoveredNode = null"
        @click="handleNodeClick( node.name )"
      >
        <!-- Outer glow ring (visible on highlight and hover) -->
        <circle
          v-if=" highlightTriad.includes( node.name ) || hoveredNode === node.name "
          :cx="node.x"
          :cy="node.y"
          :r="getNodeRadius( node.name ) + 6"
          class="tonnetz-node-glow"
          :class="{ 'glow-highlight': highlightTriad.includes( node.name ) }"
        />

        <!-- Main node circle -->
        <circle
          :cx="node.x"
          :cy="node.y"
          :r="getNodeRadius( node.name )"
          :fill="getNodeFill( node.name )"
          class="tonnetz-node-circle"
          stroke="rgba(255,255,255,0.3)"
          stroke-width="1.5"
        />

        <!-- Pitch class label -->
        <text
          :x="node.x"
          :y="node.y"
          text-anchor="middle"
          dominant-baseline="central"
          class="tonnetz-node-label"
          :class="{ 'label-highlighted': highlightTriad.includes( node.name ) }"
        >
          {{ node.name }}
        </text>
      </g>
    </g>

    <!--
      LAYER 4: Selection ripple animation
      An expanding ring that plays when a node is clicked.
    -->
    <circle
      v-if=" selectedAnimNode "
      v-for=" node in nodes.filter( n => n.name === selectedAnimNode ) "
      :key="'ripple-' + animationKey + '-' + node.row"
      :cx="node.x"
      :cy="node.y"
      r="15"
      class="tonnetz-ripple"
      fill="url(#ripple-gradient)"
    />
  </svg>
</template>

<style scoped>
@reference "tailwindcss";

/* ================================================================
   NODE STYLES & ANIMATIONS
   ================================================================ */

/* Base node group — all transitions happen here */
.tonnetz-node-group {
  transition: transform 0.2s ease-out;
}

/* Interactive nodes get a pointer cursor */
.tonnetz-node-group.is-interactive {
  cursor: pointer;
}

/* Node circle has smooth transitions for fill, radius, and stroke */
.tonnetz-node-circle {
  transition: all 0.2s ease-out;
  /* Ensure scale transforms pivot from the circle's center, not the SVG origin */
  transform-box: fill-box;
  transform-origin: center;
}

/* Hover: subtle scale-up via the circle radius (handled in JS) */
.tonnetz-node-group.is-hovered .tonnetz-node-circle {
  stroke: rgba(129, 140, 248, 0.6);
  stroke-width: 2;
}

/* Highlighted node: bright stroke */
.tonnetz-node-group.is-highlighted .tonnetz-node-circle {
  stroke: #818cf8;
  stroke-width: 2.5;
}

/* Node label styling */
.tonnetz-node-label {
  fill: rgba(255, 255, 255, 0.9);
  font-size: 13px;
  font-weight: 800;
  transition: all 0.2s ease-out;
  pointer-events: none;
  /* Let clicks pass through to the circle */
}

/* Highlighted label: brighter */
.tonnetz-node-label.label-highlighted {
  fill: white;
  font-size: 15px;
}

/* ================================================================
   GLOW EFFECTS
   ================================================================ */

/* Soft outer glow ring around nodes */
.tonnetz-node-glow {
  fill: rgba(129, 140, 248, 0.1);
  animation: glow-pulse 2s ease-in-out infinite;
  /*
   * SVG elements transform from the SVG viewport origin by default!
   * transform-box: fill-box → use the element's own bounding box instead
   * transform-origin: center → pivot from the circle's center point
   */
  transform-box: fill-box;
  transform-origin: center;
}

/* Highlighted glow is brighter */
.tonnetz-node-glow.glow-highlight {
  fill: rgba(129, 140, 248, 0.2);
}

/* Pulsing glow animation — subtle size oscillation */
@keyframes glow-pulse {

  0%,
  100% {
    opacity: 0.6;
    transform: scale(1);
  }

  50% {
    opacity: 1;
    transform: scale(1.1);
  }
}

/* ================================================================
   TRIANGLE STYLES & ANIMATIONS
   ================================================================ */

/* Highlighted triangle fill — sweeping gradient wipe */
.tonnetz-triangle-highlight {
  fill: rgba(129, 140, 248, 0.12);
  animation: triangle-fill-in 0.5s ease-out forwards;
}

.tonnetz-triangle-highlight.is-major {
  fill: rgba(129, 140, 248, 0.15);
}

.tonnetz-triangle-highlight.is-minor {
  fill: rgba(244, 63, 94, 0.12);
  /* Rose tint for minor */
}

/* Triangle fill fade-in animation */
@keyframes triangle-fill-in {
  from {
    fill-opacity: 0;
  }

  to {
    fill-opacity: 1;
  }
}

/* Animated edge "draw-on" effect using stroke-dashoffset */
.tonnetz-triangle-edge {
  fill: none;
  stroke: #818cf8;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;

  /*
   * stroke-dasharray: defines the pattern of dashes.
   * We set it to a large value so one "dash" covers the entire perimeter.
   *
   * stroke-dashoffset: starts at the full perimeter (invisible) and
   * animates to 0 (fully drawn). This creates the "drawing" effect.
   */
  stroke-dasharray: 500;
  stroke-dashoffset: 500;
  animation: edge-draw-on 0.6s ease-out 0.1s forwards;
}

@keyframes edge-draw-on {
  to {
    stroke-dashoffset: 0;
  }
}

/* ================================================================
   SELECTION RIPPLE ANIMATION
   ================================================================ */

/* Expanding ring when a node is clicked */
.tonnetz-ripple {
  pointer-events: none;
  animation: ripple-expand 0.6s ease-out forwards;
}

@keyframes ripple-expand {
  from {
    r: 15;
    opacity: 0.6;
  }

  to {
    r: 45;
    opacity: 0;
  }
}

/* ================================================================
   IDLE SHIMMER — selected triad's subtle living pulse
   ================================================================ */

.tonnetz-triangle-highlight {
  animation: triangle-fill-in 0.5s ease-out forwards,
    triangle-shimmer 3s ease-in-out 0.5s infinite;
}

@keyframes triangle-shimmer {

  0%,
  100% {
    fill-opacity: 0.8;
  }

  50% {
    fill-opacity: 1;
  }
}

/* ================================================================
   NODE POSITION TRANSITIONS (for center reposition)
   ================================================================ */

.tonnetz-node-group {
  /* Smooth position changes when center note changes */
  transition: transform 0.4s ease-in-out, opacity 0.3s ease;
}

/* Selection "pop" spring effect */
.tonnetz-node-group.is-selected-anim .tonnetz-node-circle {
  animation: node-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

@keyframes node-pop {
  0% {
    transform: scale(1);
  }

  40% {
    transform: scale(1.4);
  }

  100% {
    transform: scale(1);
  }
}

/* ================================================================
   FLIP ANIMATION — Grid & Triangle Fade
   ================================================================ */

/*
 * During the FLIP re-centering animation, we fade out the grid lines
 * and triangle fills so the user's eye follows the sliding nodes
 * without visual clutter. They fade back in after nodes settle.
 */
.tonnetz-lattice.is-flipping .tonnetz-edges {
  opacity: 0 !important;
  transition: opacity 0.15s ease;
}

.tonnetz-lattice.is-flipping .tonnetz-triangles {
  opacity: 0;
  transition: opacity 0.15s ease;
}

/* Fade edges and triangles back in when animation ends */
.tonnetz-edges,
.tonnetz-triangles {
  transition: opacity 0.3s ease 0.3s;
  /* 300ms delay so nodes settle first */
}
.tonnetz-triangle-hit-area {
  fill: transparent;
  stroke: transparent;
  pointer-events: none;
  transition: fill 0.2s ease;
}

.tonnetz-triangle-hit-area.is-interactive {
  pointer-events: all;
  cursor: pointer;
}

.tonnetz-triangle-hit-area.is-interactive:hover {
  fill: rgba(255, 255, 255, 0.05);
}
</style>
