export class Harmonograph {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private analyser: AnalyserNode;
  private dataArray: Uint8Array;

  private angle: number = 0;

  constructor( canvas: HTMLCanvasElement, analyser: AnalyserNode ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext( '2d' )!;
    this.analyser = analyser;
    this.dataArray = new Uint8Array( analyser.frequencyBinCount );

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
    this.analyser.getByteFrequencyData( this.dataArray as any );

    const width = this.canvas.width / ( window.devicePixelRatio || 1 );
    const height = this.canvas.height / ( window.devicePixelRatio || 1 );

    // Subtle fade for motion trails
    this.ctx.fillStyle = 'rgba(10, 10, 12, 0.1)';
    this.ctx.fillRect( 0, 0, width, height );

    // Extract some "energy" values
    let lowEnergy = 0;
    let highEnergy = 0;

    const mid = Math.floor( this.dataArray.length / 4 );
    for ( let i = 0; i < mid; i++ ) lowEnergy += this.dataArray[i];
    for ( let i = mid; i < mid * 2; i++ ) highEnergy += this.dataArray[i];

    lowEnergy /= mid;
    highEnergy /= mid;

    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min( width, height ) * 0.4;

    this.angle += 0.05 + ( highEnergy / 255 ) * 0.1;

    this.ctx.strokeStyle = '#ff00ff';
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();

    // Draw a Lissajous-like curve modulated by energy
    for ( let t = 0; t < Math.PI * 2; t += 0.1 ) {
      const x = centerX + Math.sin( t * 3 + this.angle ) * radius * ( lowEnergy / 255 );
      const y = centerY + Math.cos( t * 2 + this.angle * 0.5 ) * radius * ( highEnergy / 255 );

      if ( t === 0 ) this.ctx.moveTo( x, y );
      else this.ctx.lineTo( x, y );
    }

    this.ctx.stroke();
  }
}
