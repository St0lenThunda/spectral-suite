<script setup lang="ts">
import { computed } from 'vue';
import type { TonnetzPoint } from '@spectralsuite/core';

/**
 * HarmonicDNA - Visualizing the "Geometric Signature" of a progression.
 * This component renders a small SVG sparkline from a series of Tonnetz points.
 */
const props = defineProps<{
  path: TonnetzPoint[];
  width?: number;
  height?: number;
  color?: string;
  glow?: boolean;
}>();

const w = props.width || 80;
const h = props.height || 30;
const strokeColor = props.color || '#10b981'; // Default emerald-500

const svgPath = computed( () => {
  if ( props.path.length < 2 ) return '';

  // 1. Find bounds to normalize the path to the small SVG box
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  props.path.forEach( p => {
    if ( p.x < minX ) minX = p.x;
    if ( p.x > maxX ) maxX = p.x;
    if ( p.y < minY ) minY = p.y;
    if ( p.y > maxY ) maxY = p.y;
  } );

  const rangeX = ( maxX - minX ) || 1;
  const rangeY = ( maxY - minY ) || 1;

  // 2. Generate polyline points
  const points = props.path.map( p => {
    const nx = ( ( p.x - minX ) / rangeX ) * ( w - 4 ) + 2;
    const ny = ( ( ( p.y - minY ) / rangeY ) * ( h - 4 ) + 2 );
    return `${nx},${ny}`;
  } );

  return points.join( ' ' );
} );

const firstPoint = computed( () => {
  if ( !svgPath.value ) return { x: 0, y: 0 };
  const parts = svgPath.value.split( ' ' );
  if ( !parts[0] ) return { x: 0, y: 0 };
  const coords = parts[0].split( ',' );
  return { x: parseFloat( coords[0] || '0' ), y: parseFloat( coords[1] || '0' ) };
} );
</script>

<template>
  <div
    class="harmonic-dna"
    :style="{ width: `${w}px`, height: `${h}px` }"
  >
    <svg
      :viewBox="`0 0 ${w} ${h}`"
      class="w-full h-full overflow-visible"
    >
      <!-- Glow Filter -->
      <defs v-if=" glow ">
        <filter
          id="dnaGlow"
          x="-20%"
          y="-20%"
          width="140%"
          height="140%"
        >
          <feGaussianBlur
            stdDeviation="1.5"
            result="blur"
          />
          <feComposite
            in="SourceGraphic"
            in2="blur"
            operator="over"
          />
        </filter>
      </defs>

      <!-- The DNA Line -->
      <polyline
        v-if=" svgPath "
        fill="none"
        :stroke="strokeColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        :points="svgPath"
        :filter="glow ? 'url(#dnaGlow)' : ''"
        class="drop-shadow-sm opacity-80"
      />

      <!-- Start Anchor -->
      <circle
        v-if=" svgPath "
        :cx="firstPoint.x"
        :cy="firstPoint.y"
        r="1.5"
        :fill="strokeColor"
      />
    </svg>
  </div>
</template>

<style scoped>
.harmonic-dna {
  display: flex;
  align-items: center;
  justify-content: center;
}

polyline {
  transition: all 0.5s ease;
}
</style>
