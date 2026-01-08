export class Spectrogram {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private analyser: AnalyserNode;
  private dataArray: Uint8Array;

  private tempCanvas: HTMLCanvasElement;
  private tempCtx: CanvasRenderingContext2D;

  constructor( canvas: HTMLCanvasElement, analyser: AnalyserNode ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext( '2d', { alpha: false } )!;
    this.analyser = analyser;
    this.dataArray = new Uint8Array( analyser.frequencyBinCount );

    this.tempCanvas = document.createElement( 'canvas' );
    this.tempCtx = this.tempCanvas.getContext( '2d', { alpha: false } )!;

    this.resize();
  }

  public resize () {
    const dpr = 1; // Spectrogram better at 1:1 for performance
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;

    this.tempCanvas.width = this.canvas.width;
    this.tempCanvas.height = this.canvas.height;
  }

  public draw () {
    this.analyser.getByteFrequencyData( this.dataArray as any );

    const width = this.canvas.width;
    const height = this.canvas.height;

    // 1. Copy current canvas to temp
    this.tempCtx.drawImage( this.canvas, 0, 0 );

    // 2. Draw new frequency line at top (y=0)
    // We'll use an ImageData for high performance
    const imageData = this.ctx.createImageData( width, 1 );
    const data = imageData.data;

    // Map frequencies to width
    for ( let x = 0; x < width; x++ ) {
      // Logarithmic index mapping would be better, but let's start linear
      const index = Math.floor( ( x / width ) * ( this.dataArray.length * 0.5 ) ); // focus on lower half
      const value = this.dataArray[index];

      const pixelIndex = x * 4;

      // Cyberpunk/Hot palette
      data[pixelIndex] = value > 128 ? 255 : value * 2;     // R
      data[pixelIndex + 1] = value > 128 ? ( value - 128 ) * 2 : 0; // G
      data[pixelIndex + 2] = value * 0.5;                  // B
      data[pixelIndex + 3] = 255;                          // A
    }

    // 3. Draw shifted history
    this.ctx.drawImage( this.tempCanvas, 0, 1 );

    // 4. Put new line
    this.ctx.putImageData( imageData, 0, 0 );
  }
}
