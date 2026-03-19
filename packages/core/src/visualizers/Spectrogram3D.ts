/**
 * 3D Scrolling Spectrogram Visualizer.
 * 
 * This class creates a "Mountain Range" style 3D visualization where
 * time scrolls from Bottom-to-Back, and frequency is mapped across the width (X-axis).
 * 
 * Educational Physics Note:
 * To create a 3D effect on a 2D canvas, we use perspective projection. 
 * As time progresses, older "slices" of audio data are shifted upwards (Y-axis) 
 * and narrowed (X-axis scale) to simulate depth (Z-axis).
 */
export class Spectrogram3D {
  private canvas: HTMLCanvasElement | OffscreenCanvas;

  // History of frequency snapshots
  private history: Uint8Array[] = [];

  // Configurable parameters for the "Feel" of the 3D terrain
  private maxHistory: number = 60;     // How many "moments" of history to show
  private depthStep: number = 4;       // Vertical distance between slices

  constructor( canvas: HTMLCanvasElement | OffscreenCanvas ) {
    this.canvas = canvas;
  }

  /**
   * Main draw call, executed every animation frame.
   * 
   * @param isFrozen - If true, stop recording new data but keep drawing history
   * @param verticalScale - Multiplier for peak height (0.5 to 3.0)
   * @param perspective - How much the terrain "leans" back (0.1 to 1.0)
   * @param hueShift - Base hue for the heatmap (not used in rainbow mode, but kept for API)
   */
  draw (
    dataArray: Uint8Array,
    nyquist: number,
    isFrozen: boolean = false,
    verticalScale: number = 1.5,
    perspective: number = 0.8,
    hueShift: number = 200
  ) {
    const ctx = this.canvas.getContext( '2d' ) as unknown as CanvasRenderingContext2D;
    if ( !ctx ) return;

    // 1. Update History
    if ( !isFrozen ) {
      // Create a fresh clone so we don't hold references to a mutable buffer
      const dataCopy = new Uint8Array( dataArray );

      // We unshift to put newest at index 0 (Front)
      this.history.unshift( dataCopy );
      if ( this.history.length > this.maxHistory ) {
        this.history.pop();
      }
    }

    // 2. Render
    ctx.clearRect( 0, 0, this.canvas.width, this.canvas.height );

    // We draw from BACK-TO-FRONT (Last index to first)
    // This ensures that newer audio data (front) covers older data (back) correctly.
    for ( let i = this.history.length - 1; i >= 0; i-- ) {
      const slice = this.history[i];
      if ( slice ) {
        this.drawSlice( ctx, slice, nyquist, i, verticalScale, perspective, hueShift );
      }
    }
  }

  /**
   * Draws a single "Mountain Ridge" representing one moment in time.
   * 
   * @param ctx - Canvas context
   * @param data - The frequency buffer for this slice
   * @param index - Where this slice sits in time history
   * @param vScale - Vertical multiplier for peak height
   * @param pScale - Perspective factor (narrowing of back slices)
   * @param hBase - Base hue (unused in rainbow mode)
   */
  private drawSlice (
    ctx: CanvasRenderingContext2D,
    data: Uint8Array,
    nyquist: number,
    index: number,
    vScale: number,
    pScale: number,
    hBase: number
  ) {
    const width = this.canvas.width;
    const height = this.canvas.height;

    // Depth effect calculations
    const depth = index / this.maxHistory;

    // Narrow the width of the slice as it moves into the distance
    const sliceWidth = width * ( 1 - ( depth * pScale * 0.5 ) );
    const xOffset = ( width - sliceWidth ) / 2;

    // Move the slice UP the screen as it moves into the distance. 
    // We use a dynamic depthStep so the terrain fills ~75% of the canvas height regardless of window size.
    const dynamicDepthStep = ( height * 0.7 ) / this.maxHistory;
    const yBaseline = height - ( index * dynamicDepthStep );

    // Frequency sampling setup (Logarithmic)
    // We use logarithmic sampling because musical notes (octaves) are logarithmic.
    // This ensures that bass, mids, and highs occupy an even amount of visual space.
    const samples = 128;
    const samplePoints: number[] = [];
    const minFreq = 20;
    const maxFreq = 10000;

    for ( let j = 0; j < samples; j++ ) {
      const percent = j / ( samples - 1 );
      // Logarithmic frequency distribution
      const freq = minFreq * Math.pow( maxFreq / minFreq, percent );
      const bin = Math.round( freq / ( nyquist / data.length ) );
      samplePoints.push( bin );
    }

    ctx.beginPath();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    for ( let j = 0; j < samples; j++ ) {
      const bin = samplePoints[j]!;
      const val = ( data[bin] ?? 0 ) / 255;

      const x = xOffset + ( j / ( samples - 1 ) ) * sliceWidth;
      // Subtract yHeight because Y increases downwards in Canvas
      const yHeight = val * 100 * vScale * ( 1 - ( depth * 0.5 ) );
      const y = yBaseline - yHeight;

      if ( j === 0 ) ctx.moveTo( x, y );
      else ctx.lineTo( x, y );
    }

    // --- Styling: Rainbow Heatmap ---
    // The "Rainbow" effect maps frequency (X position) to Hue.
    // Low frequencies (left) are Red, high frequencies (right) are Indigo/Violet.
    const alpha = Math.max( 0.1, 1 - depth );

    // Create a gradient for the stroke that changes hue based on X position.
    // We add hBase (hueShift) to "rotate" the entire rainbow for customization.
    const gradient = ctx.createLinearGradient( xOffset, 0, xOffset + sliceWidth, 0 );
    gradient.addColorStop( 0, `hsla(${( 0 + hBase ) % 360}, 80%, 60%, ${alpha})` );      // Red/Shifted
    gradient.addColorStop( 0.2, `hsla(${( 45 + hBase ) % 360}, 80%, 60%, ${alpha})` );    // Orange/Shifted
    gradient.addColorStop( 0.4, `hsla(${( 90 + hBase ) % 360}, 80%, 60%, ${alpha})` );    // Green/Shifted
    gradient.addColorStop( 0.6, `hsla(${( 180 + hBase ) % 360}, 80%, 60%, ${alpha})` );   // Cyan/Shifted
    gradient.addColorStop( 0.8, `hsla(${( 240 + hBase ) % 360}, 80%, 60%, ${alpha})` );   // Blue/Shifted
    gradient.addColorStop( 1, `hsla(${( 280 + hBase ) % 360}, 80%, 60%, ${alpha})` );     // Purple/Shifted

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2 * ( 1 - ( depth * 0.6 ) );
    ctx.stroke();

    // Solid fill for the "mountain" body to hide slices behind it
    ctx.lineTo( xOffset + sliceWidth, yBaseline );
    ctx.lineTo( xOffset, yBaseline );
    ctx.closePath();

    // Deep dark fill for the terrain volume
    ctx.fillStyle = `rgba(10, 15, 25, ${alpha * 0.9})`;
    ctx.fill();
  }
}
