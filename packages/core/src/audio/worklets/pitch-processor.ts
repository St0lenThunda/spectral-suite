
import { PitchDetector } from 'pitchy';

// Stub types for AudioWorklet scope
declare class AudioWorkletProcessor {
  readonly port: MessagePort;
  process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: Record<string, Float32Array>): boolean;
}
declare function registerProcessor(name: string, processorCtor: new () => AudioWorkletProcessor): void;
declare const sampleRate: number; // Global in AudioWorkletScope

class PitchProcessor extends AudioWorkletProcessor {
  private _bufferSize: number = 4096; // 4096 samples typically good for bass ~10Hz resolution
  private _buffer: Float32Array;
  private _bufferIndex: number = 0;
  private _detector: PitchDetector<Float32Array>;

  static get parameterDescriptors() {
    return [];
  }

  constructor() {
    super();
    this._buffer = new Float32Array(this._bufferSize);
    // Initialize pitchy detector
    this._detector = PitchDetector.forFloat32Array(this._bufferSize);
  }

  process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: Record<string, Float32Array>) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const channelData = input[0];
    const length = channelData.length;

    // Circular buffer fill? 
    // Ideally we want overlapping windows or just contiguous chunks.
    // For simplicity/perf, let's just fill the buffer, process, then reset (contiguous).
    // Or simpler: Sliding window? Sliding window is expensive to copy.
    // Let's use: Fill buffer, Process, Shift half? (Overlap 50%).
    // For now: Contiguous chunks to ensure 1:1 speed.
    
    // Actually, filling buffer contiguous results in updates every (4096 / 44100) = ~92ms. 
    // That's ~10fps. A bit slow for UI.
    // We want 60fps? ~735 samples per frame.
    // We should maintain a rolling buffer.

    // Rolling Buffer Implementation:
    // 1. Shift existing data back by 'length'.
    // 2. Append new data at end.
    // 3. Process every X frames (to save CPU) or every frame?
    // Processing 4096-sample FFT every 128 samples is VERY HEAVY.
    // Let's target ~30fps - 60fps updates.
    // 128 samples @ 44.1k = 2.9ms.
    // Update every ~16ms (approx 5-6 blocks).

    // Optimization: Write to ring buffer position.
    
    // Copy new data into buffer
    // To implement a simple sliding window without massive copying:
    // We can just keep a pointer? But Pitchy expects a contiguous Float32Array.
    // So distinct copy is needed.
    
    // Let's do a shift-and-append approach but only process every N blocks.
    
    // Optimization: Just copy the new 128 samples into a 'staging' buffer.
    // When enough staged, shift the main buffer?
    
    // Simple approach:
    // this._buffer.copyWithin(0, length); // Shift left by length (expensive for 4096?)
    // Actually `copyWithin` is fast.
    
    // But verify: copyWithin(target, start, end).
    // We want to move (length...end) to (0...end-length).
    // this._buffer.copyWithin(0, length);
    // Then set (buffer.length - length) with new data.
    
    this._buffer.copyWithin(0, length);
    this._buffer.set(channelData, this._bufferSize - length);
    
    this._bufferIndex += length; // Count samples processed since last emit

    // Decimation/Throttling: Process update every ~1024 samples (approx 23ms / 43fps)
    if (this._bufferIndex >= 1024) {
        this.analyze();
        this._bufferIndex = 0;
    }

    return true;
  }

  analyze() {
    // Current sampleRate is available globally in AudioWorkletScope
    const [pitch, clarity] = this._detector.findPitch(this._buffer, sampleRate);
    
    // RMS Calculation (Volume)
    let sumSquares = 0;
    for (let i = 0; i < this._bufferSize; i++) {
        sumSquares += this._buffer[i]! * this._buffer[i]!;
    }
    const volume = Math.sqrt(sumSquares / this._bufferSize);

    this.port.postMessage({
        pitch,
        clarity,
        volume
    });
  }
}

registerProcessor('pitch-processor', PitchProcessor);
