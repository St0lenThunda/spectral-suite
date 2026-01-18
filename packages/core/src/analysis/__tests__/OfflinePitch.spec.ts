import { describe, it, expect } from 'vitest';
import { OfflinePitch } from '../OfflinePitch';

describe('OfflinePitch', () => {
  it('should detect a sine wave peak correctly', () => {
    const sampleRate = 44100;
    const fftSize = 4096; // This means 2048 bins
    const frequencyData = new Float32Array(fftSize / 2).fill(-100);
    
    // Create a peak at ~440Hz (A4)
    // Bin resolution = 44100 / 4096 = 10.76 Hz per bin
    // 440 / 10.76 = bin 41
    const targetBin = 41;
    frequencyData[targetBin] = -10; // Strong peak
    frequencyData[targetBin - 1] = -30;
    frequencyData[targetBin + 1] = -30;

    const detected = OfflinePitch.detectPolyphonicNotes(frequencyData, sampleRate, -50);
    
    // Note.fromFreq(441.2) is 'A4' (440Hz + error margin)
    // 41 * 10.76 = 441.16 Hz
    expect(detected).toContain('A4');
  });

  it('should handles polyphony (detect multiple peaks)', () => {
      const sampleRate = 44100;
      const fftSize = 4096;
      const frequencyData = new Float32Array(fftSize / 2).fill(-100);
      
      // C4 (261.63 Hz) -> Bin 24.3
      const binC = 24;
      frequencyData[binC] = -10;
      frequencyData[binC-1] = -30;
      frequencyData[binC+1] = -30;

      // E4 (329.63 Hz) -> Bin 30.6
      const binE = 31;
      frequencyData[binE] = -12;
      frequencyData[binE-1] = -30;
      frequencyData[binE+1] = -30;

      const detected = OfflinePitch.detectPolyphonicNotes(frequencyData, sampleRate, -50);
      
      expect(detected).toContain('C4');
      expect(detected).toContain('E4');
  });
});
