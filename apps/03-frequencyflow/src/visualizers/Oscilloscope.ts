export class Oscilloscope {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private analyser: AnalyserNode;
  private dataArray: Float32Array;

  constructor( canvas: HTMLCanvasElement, analyser: AnalyserNode ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext( '2d' )!;
    this.analyser = analyser;
    this.dataArray = new Float32Array( new ArrayBuffer( analyser.fftSize * 4 ) );

    // Set initial canvas size
    this.resize();
  }

  public resize () {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale( dpr, dpr );
  }

  public draw () {
    this.analyser.getFloatTimeDomainData( this.dataArray as any );

    const width = this.canvas.width / ( window.devicePixelRatio || 1 );
    const height = this.canvas.height / ( window.devicePixelRatio || 1 );

    this.ctx.clearRect( 0, 0, width, height );

    // Draw Grid
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    // Horizontal center
    this.ctx.moveTo( 0, height / 2 );
    this.ctx.lineTo( width, height / 2 );
    // Vertical center
    this.ctx.moveTo( width / 2, 0 );
    this.ctx.lineTo( width / 2, height );
    this.ctx.stroke();

    // Draw Waveform
    this.ctx.strokeStyle = '#00f3ff';
    this.ctx.lineWidth = 2;
    this.ctx.shadowBlur = 10;
    this.ctx.shadowColor = '#00f3ff';
    this.ctx.beginPath();

    const sliceWidth = width / this.dataArray.length;
    let x = 0;

    for ( let i = 0; i < this.dataArray.length; i++ ) {
      const v = this.dataArray[i];
      const y = ( v + 1 ) * height / 2;

      if ( i === 0 ) {
        this.ctx.moveTo( x, y );
      } else {
        this.ctx.lineTo( x, y );
      }

      x += sliceWidth;
    }

    this.ctx.stroke();
    this.ctx.shadowBlur = 0; // Reset for next frame
  }
}
