import { vi } from 'vitest';

// Global AudioContext Mock for all tests
const mockOscillator = {
  connect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  frequency: { value: 0 }
};

const mockGain = {
  connect: vi.fn(),
  gain: {
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn()
  }
};

const mockAnalyser = {
  connect: vi.fn(),
  fftSize: 2048,
  frequencyBinCount: 1024,
  getByteFrequencyData: vi.fn(),
  getFloatFrequencyData: vi.fn(),
  getFloatTimeDomainData: vi.fn(),
  smoothingTimeConstant: 0.8,
  context: { sampleRate: 44100 }
};

const mockAudioContext = {
  createOscillator: vi.fn( () => mockOscillator ),
  createGain: vi.fn( () => mockGain ),
  createAnalyser: vi.fn( () => mockAnalyser ),
  createMediaStreamSource: vi.fn( () => ( { connect: vi.fn() } ) ),
  decodeAudioData: vi.fn().mockResolvedValue( {
    duration: 300,
    length: 44100 * 300,
    sampleRate: 44100,
    numberOfChannels: 2,
    getChannelData: vi.fn( () => new Float32Array( 44100 * 300 ) )
  } ),
  currentTime: 0,
  state: 'suspended',
  resume: vi.fn().mockResolvedValue( undefined ),
  close: vi.fn().mockResolvedValue( undefined ),
  sampleRate: 44100
};

// Use Function for Constructor compatibility
const MockAudioContext = vi.fn( function () { return mockAudioContext; } );

vi.stubGlobal( 'AudioContext', MockAudioContext );

// Mock OfflineAudioContext
class MockOfflineAudioContext {
  destination: any;
  sampleRate: number;
  length: number;

  constructor( numberOfChannels: number, length: number, sampleRate: number ) {
    this.sampleRate = sampleRate;
    this.length = length;
    this.destination = {};
  }

  createBuffer ( channels: number, length: number, sampleRate: number ) {
    return {
      copyToChannel: vi.fn(),
      getChannelData: vi.fn( () => new Float32Array( length ) ),
      duration: length / sampleRate,
      length: length,
      sampleRate: sampleRate,
      numberOfChannels: channels
    };
  }

  createAnalyser () {
    return mockAnalyser;
  }

  createBufferSource () {
    return {
      buffer: null,
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      onended: null
    };
  }

  startRendering () {
    return Promise.resolve( {
      getChannelData: vi.fn( () => new Float32Array( this.length ) ),
      duration: this.length / this.sampleRate
    } );
  }
}

vi.stubGlobal( 'OfflineAudioContext', MockOfflineAudioContext );


// Assign to window directly to preserve prototype methods like addEventListener
if ( typeof window !== 'undefined' ) {
  ( window as any ).AudioContext = MockAudioContext;
  ( window as any ).webkitAudioContext = MockAudioContext;
  ( window as any ).OfflineAudioContext = MockOfflineAudioContext;

  // Mock navigator.mediaDevices
  if ( !window.navigator ) {
    ( window as any ).navigator = {};
  }
  if ( !window.navigator.mediaDevices ) {
    ( window.navigator as any ).mediaDevices = {};
  }
  ( window.navigator.mediaDevices as any ).getUserMedia = vi.fn().mockResolvedValue( {
    getTracks: () => [],
    dummyStream: true
  } );

  // Mock Canvas context to prevent Oscilloscope errors
  if ( typeof HTMLCanvasElement !== 'undefined' ) {
    HTMLCanvasElement.prototype.getContext = vi.fn( ( contextId: string ) => {
      if ( contextId === '2d' ) {
        return {
          scale: vi.fn(),
          clearRect: vi.fn(),
          beginPath: vi.fn(),
          moveTo: vi.fn(),
          lineTo: vi.fn(),
          stroke: vi.fn(),
          fill: vi.fn(),
          closePath: vi.fn(),
          drawImage: vi.fn(),
          getImageData: vi.fn(),
          putImageData: vi.fn(),
          createImageData: vi.fn( ( w, h ) => ( {
            width: w,
            height: h,
            data: new Uint8ClampedArray( w * h * 4 )
          } ) ),
          fillRect: vi.fn(),
          fillText: vi.fn(),
          font: '',
          lineWidth: 1,
          strokeStyle: '#000',
          fillStyle: '#000'
        } as any; /* CanvasRenderingContext2D */
      }
      return null;
    } ) as any;
  }
}

// Mock ResizeObserver (used by some UI components)
vi.stubGlobal( 'ResizeObserver', vi.fn( () => ( {
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
} ) ) );
